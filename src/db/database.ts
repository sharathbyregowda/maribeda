import initSqlJs, { Database } from 'sql.js';
import { Note, NoteInput } from '../types';

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
    // Notes table with title, content, and timestamps
    database.run(`
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      content TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `);

    // Create indexes for faster standard access
    database.run(`CREATE INDEX IF NOT EXISTS idx_notes_createdAt ON notes(createdAt DESC)`);
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
        'INSERT INTO notes (title, content, createdAt, updatedAt) VALUES (?, ?, ?, ?)',
        [input.title || null, input.content, now, now]
    );

    const result = database.exec('SELECT last_insert_rowid() as id');
    const id = result[0].values[0][0] as number;

    persistToIndexedDB();

    return {
        id,
        title: input.title || null,
        content: input.content,
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

    const result = database.exec('SELECT * FROM notes WHERE id = ?', [id]);

    if (result.length === 0 || result[0].values.length === 0) {
        return null;
    }

    persistToIndexedDB();

    const row = result[0].values[0];
    return {
        id: row[0] as number,
        title: row[1] as string | null,
        content: row[2] as string,
        createdAt: row[3] as string,
        updatedAt: row[4] as string,
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
 * Get all notes in reverse chronological order
 */
export function getAllNotes(): Note[] {
    const database = getDatabase();
    const result = database.exec('SELECT * FROM notes ORDER BY createdAt DESC');

    if (result.length === 0) return [];

    return result[0].values.map((row) => ({
        id: row[0] as number,
        title: row[1] as string | null,
        content: row[2] as string,
        createdAt: row[3] as string,
        updatedAt: row[4] as string,
    }));
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
            createdAt: row[3] as string,
            updatedAt: row[4] as string,
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
            createdAt: row[3] as string,
            updatedAt: row[4] as string,
        }));
    }
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
