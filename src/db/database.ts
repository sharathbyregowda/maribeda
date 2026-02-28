import initSqlJs, { Database } from 'sql.js';
import { Note, NoteInput, LinkPreview } from '../types';

let db: Database | null = null;

// Load SQL.js WASM from CDN
const SQL_JS_CDN = 'https://sql.js.org/dist/';

/**
 * Initialize the SQLite database
 * Data is persisted to IndexedDB for durability
 */
export async function initDatabase(): Promise<Database> {
    if (db) return db;

    const SQL = await initSqlJs({
        locateFile: (file: string) => `${SQL_JS_CDN}${file}`,
    });

    // Try to load existing database from IndexedDB
    const savedData = await loadFromIndexedDB();

    if (savedData) {
        db = new SQL.Database(savedData);
    } else {
        db = new SQL.Database();
    }

    // Ensure schema exists (idempotent)
    createSchema(db);

    return db;
}

/**
 * Create the database schema
 * Note: Search is handled by FlexSearch, not SQLite FTS
 */
function createSchema(database: Database): void {
    // Notes table with title, content, timestamps, pin status, and last viewed timestamp
    database.run(`
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      content TEXT NOT NULL,
      isPinned INTEGER DEFAULT 0,
      lastViewedAt TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `);

    // Migration: Add isPinned column if it doesn't exist (for existing databases)
    try {
        database.run(`ALTER TABLE notes ADD COLUMN isPinned INTEGER DEFAULT 0`);
    } catch {
        // Column already exists, ignore
    }

    // Migration: Add lastViewedAt column if it doesn't exist (for Rediscover feature)
    try {
        database.run(`ALTER TABLE notes ADD COLUMN lastViewedAt TEXT`);
    } catch {
        // Column already exists, ignore
    }

    // Link previews table for Rich Link Previews feature
    database.run(`
    CREATE TABLE IF NOT EXISTS link_previews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      noteId INTEGER NOT NULL,
      url TEXT NOT NULL,
      title TEXT,
      description TEXT,
      siteName TEXT,
      fetchedAt TEXT NOT NULL,
      FOREIGN KEY (noteId) REFERENCES notes(id) ON DELETE CASCADE
    )
    `);

    // Create indexes for faster standard access
    database.run(`CREATE INDEX IF NOT EXISTS idx_notes_createdAt ON notes(createdAt DESC)`);
    database.run(`CREATE INDEX IF NOT EXISTS idx_notes_isPinned ON notes(isPinned DESC)`);
    database.run(`CREATE INDEX IF NOT EXISTS idx_notes_lastViewedAt ON notes(lastViewedAt ASC)`);
    database.run(`CREATE INDEX IF NOT EXISTS idx_link_previews_noteId ON link_previews(noteId)`);
}

/**
 * Get the current database instance
 */
export function getDatabase(): Database {
    if (!db) {
        throw new Error('Database not initialized. Call initDatabase() first.');
    }
    return db;
}

/**
 * Add a new note
 */
export function addNote(input: NoteInput): Note {
    const database = getDatabase();
    const now = new Date().toISOString();

    database.run(
        'INSERT INTO notes (title, content, isPinned, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)',
        [input.title || null, input.content, 0, now, now]
    );

    const result = database.exec('SELECT last_insert_rowid() as id');
    const id = result[0].values[0][0] as number;

    persistToIndexedDB();

    return {
        id,
        title: input.title || null,
        content: input.content,
        isPinned: false,
        lastViewedAt: null,
        createdAt: now,
        updatedAt: now,
    };
}

/**
 * Update an existing note
 */
export function updateNote(id: number, input: NoteInput): Note | null {
    const database = getDatabase();
    const now = new Date().toISOString();

    database.run(
        'UPDATE notes SET title = ?, content = ?, updatedAt = ? WHERE id = ?',
        [input.title || null, input.content, now, id]
    );

    const result = database.exec('SELECT id, title, content, isPinned, lastViewedAt, createdAt, updatedAt FROM notes WHERE id = ?', [id]);

    if (result.length === 0 || result[0].values.length === 0) {
        return null;
    }

    persistToIndexedDB();

    const row = result[0].values[0];
    return {
        id: row[0] as number,
        title: row[1] as string | null,
        content: row[2] as string,
        isPinned: Boolean(row[3]),
        lastViewedAt: row[4] as string | null,
        createdAt: row[5] as string,
        updatedAt: row[6] as string,
    };
}

/**
 * Delete a note by ID
 */
export function deleteNote(id: number): boolean {
    const database = getDatabase();
    database.run('DELETE FROM notes WHERE id = ?', [id]);
    persistToIndexedDB();
    return true;
}

/**
 * Get all notes with pinned notes first, then by reverse chronological order
 */
export function getAllNotes(): Note[] {
    const database = getDatabase();
    // Use explicit column list to handle migration where columns may be added at different positions
    const result = database.exec('SELECT id, title, content, isPinned, lastViewedAt, createdAt, updatedAt FROM notes ORDER BY isPinned DESC, createdAt DESC');

    if (result.length === 0) return [];

    return result[0].values.map((row) => ({
        id: row[0] as number,
        title: row[1] as string | null,
        content: row[2] as string,
        isPinned: Boolean(row[3]),
        lastViewedAt: row[4] as string | null,
        createdAt: row[5] as string,
        updatedAt: row[6] as string,
    }));
}

/**
 * Toggle the pinned status of a note
 */
export function toggleNotePin(id: number): Note | null {
    const database = getDatabase();

    // Get current pin status
    const current = database.exec('SELECT isPinned FROM notes WHERE id = ?', [id]);
    if (current.length === 0 || current[0].values.length === 0) {
        return null;
    }

    const currentPinned = Boolean(current[0].values[0][0]);
    const newPinned = currentPinned ? 0 : 1;

    database.run('UPDATE notes SET isPinned = ? WHERE id = ?', [newPinned, id]);

    const result = database.exec('SELECT id, title, content, isPinned, lastViewedAt, createdAt, updatedAt FROM notes WHERE id = ?', [id]);
    if (result.length === 0 || result[0].values.length === 0) {
        return null;
    }

    persistToIndexedDB();

    const row = result[0].values[0];
    return {
        id: row[0] as number,
        title: row[1] as string | null,
        content: row[2] as string,
        isPinned: Boolean(row[3]),
        lastViewedAt: row[4] as string | null,
        createdAt: row[5] as string,
        updatedAt: row[6] as string,
    };
}

/**
 * Find a note containing an exact URL (for duplicate detection)
 * Uses LIKE with escaped special characters for safe matching
 */
export function findNoteByUrl(url: string): Note | null {
    const database = getDatabase();

    // Escape SQL LIKE special characters
    const escaped = url.replace(/%/g, '\\%').replace(/_/g, '\\_');

    const result = database.exec(
        `SELECT id, title, content, isPinned, lastViewedAt, createdAt, updatedAt 
         FROM notes 
         WHERE content LIKE ? ESCAPE '\\'
         LIMIT 1`,
        [`%${escaped}%`]
    );

    if (result.length === 0 || result[0].values.length === 0) {
        return null;
    }

    const row = result[0].values[0];
    return {
        id: row[0] as number,
        title: row[1] as string | null,
        content: row[2] as string,
        isPinned: Boolean(row[3]),
        lastViewedAt: row[4] as string | null,
        createdAt: row[5] as string,
        updatedAt: row[6] as string,
    };
}

/**
 * Search notes using FTS5 (Full-Text Search)
 */
export function searchNotes(query: string): Note[] {
    const database = getDatabase();

    if (!query.trim()) {
        return getAllNotes();
    }

    try {
        // Prepare FTS query: split terms and append * for prefix matching
        // e.g. "hello wor" -> "hello* wor*"
        const ftsQuery = query
            .trim()
            .replace(/"/g, '') // Remove quotes to prevent syntax errors
            .split(/\s+/)
            .map(term => `"${term}"*`) // Quote terms and add wildcard
            .join(' AND '); // Explicit AND

        const result = database.exec(`
            SELECT notes.* 
            FROM notes 
            JOIN notes_fts ON notes.id = notes_fts.rowid 
            WHERE notes_fts MATCH ? 
            ORDER BY notes_fts.rank
        `, [ftsQuery]);

        if (result.length === 0) return [];

        return result[0].values.map((row) => ({
            id: row[0] as number,
            title: row[1] as string | null,
            content: row[2] as string,
            isPinned: Boolean(row[3]),
            lastViewedAt: row[4] as string | null,
            createdAt: row[5] as string,
            updatedAt: row[6] as string,
        }));
    } catch (e) {
        console.warn("FTS search failed, falling back to LIKE:", e);
        // Fallback to LIKE if FTS fails or module missing
        const likeQuery = `%${query.toLowerCase()}%`;
        const result = database.exec(`
            SELECT * FROM notes 
            WHERE LOWER(title) LIKE ? OR LOWER(content) LIKE ?
            ORDER BY createdAt DESC
        `, [likeQuery, likeQuery]);

        if (result.length === 0) return [];

        return result[0].values.map((row) => ({
            id: row[0] as number,
            title: row[1] as string | null,
            content: row[2] as string,
            isPinned: Boolean(row[3]),
            lastViewedAt: row[4] as string | null,
            createdAt: row[5] as string,
            updatedAt: row[6] as string,
        }));
    }
}

/**
 * Get a random "old" note for rediscovery (Serendipity Mode)
 * Uses time-weighted selection: prioritizes notes not viewed recently and created >7 days ago
 * @param minAgeDays - Minimum age of notes to consider (default: 7 days)
 * @returns A random old note, or null if no qualifying notes exist
 */
export function getRandomOldNote(minAgeDays: number = 7): Note | null {
    const database = getDatabase();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - minAgeDays);
    const cutoffISO = cutoffDate.toISOString();

    // Time-weighted selection: prefer notes with older/null lastViewedAt
    // Falls back to random if all notes have been viewed recently
    const result = database.exec(`
        SELECT id, title, content, isPinned, lastViewedAt, createdAt, updatedAt 
        FROM notes 
        WHERE createdAt < ?
        ORDER BY 
            CASE WHEN lastViewedAt IS NULL THEN 0 ELSE 1 END,
            lastViewedAt ASC,
            RANDOM()
        LIMIT 1
    `, [cutoffISO]);

    if (result.length === 0 || result[0].values.length === 0) {
        return null;
    }

    const row = result[0].values[0];
    return {
        id: row[0] as number,
        title: row[1] as string | null,
        content: row[2] as string,
        isPinned: Boolean(row[3]),
        lastViewedAt: row[4] as string | null,
        createdAt: row[5] as string,
        updatedAt: row[6] as string,
    };
}

/**
 * Mark a note as viewed (update lastViewedAt timestamp)
 * Used to prevent the same note from appearing repeatedly in Rediscover
 */
export function markNoteAsViewed(id: number): void {
    const database = getDatabase();
    const now = new Date().toISOString();
    database.run('UPDATE notes SET lastViewedAt = ? WHERE id = ?', [now, id]);
    persistToIndexedDB();
}

/**
 * Save link previews for a note
 * Replaces any existing previews for the note
 */
export function saveLinkPreviews(noteId: number, previews: Array<{ url: string; title: string | null; description: string | null; siteName: string | null }>): LinkPreview[] {
    const database = getDatabase();
    const now = new Date().toISOString();

    // Delete existing previews for this note
    database.run('DELETE FROM link_previews WHERE noteId = ?', [noteId]);

    const saved: LinkPreview[] = [];

    for (const preview of previews) {
        database.run(
            'INSERT INTO link_previews (noteId, url, title, description, siteName, fetchedAt) VALUES (?, ?, ?, ?, ?, ?)',
            [noteId, preview.url, preview.title, preview.description, preview.siteName, now]
        );

        const result = database.exec('SELECT last_insert_rowid() as id');
        const id = result[0].values[0][0] as number;

        saved.push({
            id,
            noteId,
            url: preview.url,
            title: preview.title,
            description: preview.description,
            siteName: preview.siteName,
            fetchedAt: now,
        });
    }

    persistToIndexedDB();
    return saved;
}

/**
 * Get link previews for multiple notes (batch query)
 * Returns a map of noteId -> LinkPreview[]
 */
export function getLinkPreviewsForNotes(noteIds: number[]): Map<number, LinkPreview[]> {
    const database = getDatabase();
    const result = new Map<number, LinkPreview[]>();

    if (noteIds.length === 0) return result;

    // Use a single query with IN clause for batch efficiency
    const placeholders = noteIds.map(() => '?').join(',');
    const queryResult = database.exec(
        `SELECT id, noteId, url, title, description, siteName, fetchedAt FROM link_previews WHERE noteId IN (${placeholders}) ORDER BY id`,
        noteIds
    );

    if (queryResult.length === 0) return result;

    for (const row of queryResult[0].values) {
        const preview: LinkPreview = {
            id: row[0] as number,
            noteId: row[1] as number,
            url: row[2] as string,
            title: row[3] as string | null,
            description: row[4] as string | null,
            siteName: row[5] as string | null,
            fetchedAt: row[6] as string,
        };

        const existing = result.get(preview.noteId) || [];
        existing.push(preview);
        result.set(preview.noteId, existing);
    }

    return result;
}

/**
 * Delete link previews for a specific note
 */
export function deleteLinkPreviewsForNote(noteId: number): void {
    const database = getDatabase();
    database.run('DELETE FROM link_previews WHERE noteId = ?', [noteId]);
    persistToIndexedDB();
}

/**
 * Export all notes as JSON
 */
export function exportNotesToJson(): string {
    const notes = getAllNotes();
    return JSON.stringify(notes, null, 2);
}

/**
 * Import notes from JSON
 */
export function importNotesFromJson(jsonString: string): number {
    const database = getDatabase();
    const notes: Note[] = JSON.parse(jsonString);

    let importedCount = 0;

    for (const note of notes) {
        database.run(
            'INSERT INTO notes (title, content, createdAt, updatedAt) VALUES (?, ?, ?, ?)',
            [note.title, note.content, note.createdAt, note.updatedAt]
        );
        importedCount++;
    }

    persistToIndexedDB();
    return importedCount;
}

/**
 * Merge result type for tracking import statistics
 */
export interface MergeResult {
    added: number;
    skipped: number;
    newNotes: Note[];
}

/**
 * Merge notes from JSON without losing existing data
 * Uses content-based deduplication to prevent duplicates
 * Optimized: Loads existing content hashes into memory first (batch check)
 * 
 * @param jsonString - JSON string containing notes array (PWA or Extension format)
 * @returns MergeResult with count of added/skipped and newly added notes (for FlexSearch)
 */
export function mergeNotesFromJson(jsonString: string): MergeResult {
    const database = getDatabase();

    // Parse incoming data - support both PWA and Extension export formats
    let incomingNotes: Array<{ title?: string | null; content: string; createdAt: string; updatedAt?: string }>;

    try {
        const parsed = JSON.parse(jsonString);
        // Extension format: { notes: [...] } or PWA format: [...]
        incomingNotes = Array.isArray(parsed) ? parsed : (parsed.notes || []);
    } catch {
        throw new Error('Invalid JSON format');
    }

    // Batch optimization: Load all existing content+createdAt pairs into a Set
    // This avoids N individual SELECT queries
    const existingResult = database.exec('SELECT content, createdAt FROM notes');
    const existingHashes = new Set<string>();

    if (existingResult.length > 0) {
        for (const row of existingResult[0].values) {
            const content = row[0] as string;
            const createdAt = row[1] as string;
            // Create a simple hash: content|createdAt
            existingHashes.add(`${content}|${createdAt}`);
        }
    }

    let added = 0;
    let skipped = 0;
    const newNotes: Note[] = [];
    const now = new Date().toISOString();

    for (const note of incomingNotes) {
        const content = note.content || '';
        const createdAt = note.createdAt || now;
        const hash = `${content}|${createdAt}`;

        // Check if this note already exists
        if (existingHashes.has(hash)) {
            skipped++;
            continue;
        }

        // Insert new note
        const updatedAt = note.updatedAt || createdAt;
        database.run(
            'INSERT INTO notes (title, content, isPinned, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)',
            [note.title || null, content, 0, createdAt, updatedAt]
        );

        // Get the inserted note's ID
        const result = database.exec('SELECT last_insert_rowid() as id');
        const id = result[0].values[0][0] as number;

        // Track the new note for FlexSearch indexing
        newNotes.push({
            id,
            title: note.title || null,
            content,
            isPinned: false,
            lastViewedAt: null,
            createdAt,
            updatedAt,
        });

        // Add to hash set to prevent duplicates within the same import
        existingHashes.add(hash);
        added++;
    }

    persistToIndexedDB();
    return { added, skipped, newNotes };
}

/**
 * Clear all notes (for restore functionality)
 */
export function clearAllNotes(): void {
    const database = getDatabase();
    database.run('DELETE FROM notes');
    persistToIndexedDB();
}

// IndexedDB persistence helpers
const DB_NAME = 'nenasu-db';
const STORE_NAME = 'sqlite';
const KEY = 'database';

async function loadFromIndexedDB(): Promise<Uint8Array | null> {
    return new Promise((resolve) => {
        const request = indexedDB.open(DB_NAME, 1);

        request.onerror = () => resolve(null);

        request.onupgradeneeded = (event) => {
            const idb = (event.target as IDBOpenDBRequest).result;
            if (!idb.objectStoreNames.contains(STORE_NAME)) {
                idb.createObjectStore(STORE_NAME);
            }
        };

        request.onsuccess = (event) => {
            const idb = (event.target as IDBOpenDBRequest).result;
            const transaction = idb.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const getRequest = store.get(KEY);

            getRequest.onsuccess = () => {
                resolve(getRequest.result || null);
            };

            getRequest.onerror = () => resolve(null);
        };
    });
}

function persistToIndexedDB(): void {
    if (!db) return;

    const data = db.export();
    const request = indexedDB.open(DB_NAME, 1);

    request.onsuccess = (event) => {
        const idb = (event.target as IDBOpenDBRequest).result;
        const transaction = idb.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        store.put(data, KEY);
    };
}

/**
 * Export the raw SQLite database as a Uint8Array
 */
export function exportDatabase(): Uint8Array {
    const database = getDatabase();
    return database.export();
}

/**
 * Restore database from a SQLite binary (Uint8Array)
 * Used for restoring from .sqlite backup files
 */
export async function restoreFromBinary(data: Uint8Array): Promise<void> {
    const SQL = await initSqlJs({
        locateFile: (file: string) => `${SQL_JS_CDN}${file}`,
    });

    db = new SQL.Database(data);
    createSchema(db); // Safe: uses IF NOT EXISTS
    persistToIndexedDB();
}
