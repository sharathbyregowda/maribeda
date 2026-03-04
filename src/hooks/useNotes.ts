import { useState, useEffect, useCallback } from 'react';
import { Database } from 'sql.js';
import {
    initDatabase,
    getAllNotes,
    addNote as dbAddNote,
    updateNote as dbUpdateNote,
    deleteNote as dbDeleteNote,
    toggleNotePin as dbToggleNotePin,
    getRandomOldNote as dbGetRandomOldNote,
    getOldNotes as dbGetOldNotes,
    markNoteAsViewed as dbMarkNoteAsViewed,
    findNoteByUrl as dbFindNoteByUrl,
    clearAllNotes,
    importNotesFromJson,
    mergeNotesFromJson,
    MergeResult,
} from '../db/database';
import {
    initSearchIndex,
    buildSearchIndex,
    addToSearchIndex,
    updateInSearchIndex,
    removeFromSearchIndex,
    searchInIndex,
    clearSearchIndex
} from '../search/searchIndex';
import { getRelatedNotes as findRelatedNotes, findSimilarNoteIds } from '../utils/seeAlso';
import {
    fetchAndSaveLinkPreviews,
    loadLinkPreviewsForNotes,
    removeLinkPreviewsForNote,
    hasPreviewableUrls,
} from '../utils/linkPreviewService';
import { Note, NoteInput, LinkPreview } from '../types';

export function useNotes() {
    const [db, setDb] = useState<Database | null>(null);
    const [notes, setNotes] = useState<Note[]>([]);
    const [linkPreviews, setLinkPreviews] = useState<Map<number, LinkPreview[]>>(new Map());
    const [isLoading, setIsLoading] = useState(true);
    const [isSearchReady, setIsSearchReady] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Initialize database and search index on mount
    useEffect(() => {
        const init = async () => {
            try {
                const database = await initDatabase();
                setDb(database);

                // Initialize FlexSearch
                initSearchIndex();

                const allNotes = getAllNotes();
                setNotes(allNotes);

                // Load link previews for all notes
                const noteIds = allNotes.map(n => n.id);
                if (noteIds.length > 0) {
                    const previews = loadLinkPreviewsForNotes(noteIds);
                    setLinkPreviews(previews);
                }

                // Build search index
                await buildSearchIndex(allNotes);
                setIsSearchReady(true);

                setIsLoading(false);
            } catch (err) {
                setError('Failed to initialize database');
                console.error(err);
                setIsLoading(false);
            }
        };

        init();
    }, []);

    const addNote = useCallback((input: NoteInput) => {
        if (!db) return null;
        const note = dbAddNote(input);
        setNotes(getAllNotes());

        // Add to search index
        addToSearchIndex(note);

        // Fetch link previews in the background
        if (hasPreviewableUrls(input.content)) {
            fetchAndSaveLinkPreviews(note.id, input.content)
                .then(previews => {
                    if (previews.length > 0) {
                        setLinkPreviews(prev => {
                            const next = new Map(prev);
                            next.set(note.id, previews);
                            return next;
                        });
                    }
                })
                .catch(console.error);
        }

        return note;
    }, [db]);

    const updateNote = useCallback((id: number, input: NoteInput) => {
        if (!db) return null;
        const note = dbUpdateNote(id, input);
        setNotes(getAllNotes());

        // Update search index
        if (note) {
            updateInSearchIndex(note);

            // Re-fetch link previews for updated content
            if (hasPreviewableUrls(input.content)) {
                fetchAndSaveLinkPreviews(note.id, input.content)
                    .then(previews => {
                        setLinkPreviews(prev => {
                            const next = new Map(prev);
                            if (previews.length > 0) {
                                next.set(note.id, previews);
                            } else {
                                next.delete(note.id);
                            }
                            return next;
                        });
                    })
                    .catch(console.error);
            } else {
                // Content no longer has URLs, remove existing previews
                removeLinkPreviewsForNote(id);
                setLinkPreviews(prev => {
                    const next = new Map(prev);
                    next.delete(id);
                    return next;
                });
            }
        }

        return note;
    }, [db]);

    const deleteNoteById = useCallback((id: number) => {
        if (!db) return false;
        const result = dbDeleteNote(id);
        setNotes(getAllNotes());

        // Remove from search index
        removeFromSearchIndex(id);

        // Clean up link previews
        setLinkPreviews(prev => {
            const next = new Map(prev);
            next.delete(id);
            return next;
        });

        return result;
    }, [db]);

    const search = useCallback(async (query: string) => {
        if (!db || !isSearchReady) return [];
        if (!query.trim()) return notes;

        // Get IDs from FlexSearch
        const matchingIds = await searchInIndex(query);

        // Return notes in the order FlexSearch ranked them
        return matchingIds
            .map(id => notes.find(n => n.id === id))
            .filter((n): n is Note => n !== undefined);
    }, [db, isSearchReady, notes]);

    const refreshNotes = useCallback(() => {
        if (!db) return;
        setNotes(getAllNotes());
    }, [db]);

    const togglePin = useCallback((id: number) => {
        if (!db) return null;
        const note = dbToggleNotePin(id);
        setNotes(getAllNotes());
        return note;
    }, [db]);

    const restoreFromBackup = useCallback(async (notesData: Note[]) => {
        if (!db) return 0;
        clearAllNotes();
        const count = importNotesFromJson(JSON.stringify(notesData));
        const allNotes = getAllNotes();
        setNotes(allNotes);

        // Rebuild search index
        clearSearchIndex();
        initSearchIndex();
        await buildSearchIndex(allNotes);

        return count;
    }, [db]);

    // Safe merge from backup (doesn't delete existing notes)
    // Returns { added, skipped } statistics
    const mergeFromBackup = useCallback(async (jsonString: string): Promise<MergeResult> => {
        if (!db) return { added: 0, skipped: 0, newNotes: [] };

        // Merge notes (database handles deduplication)
        const result = mergeNotesFromJson(jsonString);

        // Update React state
        setNotes(getAllNotes());

        // Add new notes to FlexSearch index
        for (const note of result.newNotes) {
            await addToSearchIndex(note);
        }

        return result;
    }, [db]);

    // Rediscover feature: get a random old note
    const rediscoverNote = useCallback((minAgeDays: number = 7) => {
        if (!db) return null;
        return dbGetRandomOldNote(minAgeDays);
    }, [db]);

    // Get all old notes for clustering analysis
    const fetchOldNotes = useCallback((minAgeDays: number = 30) => {
        if (!db) return [];
        return dbGetOldNotes(minAgeDays);
    }, [db]);

    // Mark a note as viewed (for Rediscover feature)
    const markAsViewed = useCallback((id: number) => {
        if (!db) return;
        dbMarkNoteAsViewed(id);
    }, [db]);

    // Get related notes for See Also feature
    const getRelatedNotes = useCallback(async (note: Note, limit: number = 3) => {
        if (!db) return [];
        return await findRelatedNotes(note, notes, limit);
    }, [db, notes]);

    // Smart Merge Intent: Find note by exact URL (duplicate detection)
    const findByUrl = useCallback((url: string): Note | null => {
        if (!db) return null;
        return dbFindNoteByUrl(url);
    }, [db]);

    // Smart Merge Intent: Find similar notes (returns Note objects, sorted by relevance)
    const findSimilar = useCallback(async (text: string, limit: number = 5): Promise<Note[]> => {
        if (!db) return [];
        const ids = await findSimilarNoteIds(text, undefined, limit);
        // Map IDs to Note objects, preserving relevance order
        return ids
            .map(id => notes.find(n => n.id === id))
            .filter((n): n is Note => n !== undefined);
    }, [db, notes]);

    // Smart Merge Intent: Append content to existing note with visual separator
    const appendToNote = useCallback(async (noteId: number, content: string): Promise<Note | null> => {
        const note = notes.find(n => n.id === noteId);
        if (!note) return null;

        const separator = '\n\n---\n\n';
        const updatedNote = await updateNote(noteId, {
            title: note.title || undefined,
            content: note.content + separator + content
        });
        return updatedNote;
    }, [notes, updateNote]);

    return {
        notes,
        linkPreviews,
        isLoading,
        isSearchReady,
        error,
        addNote,
        updateNote,
        deleteNote: deleteNoteById,
        togglePin,
        rediscoverNote,
        fetchOldNotes,
        markAsViewed,
        getRelatedNotes,
        findByUrl,
        findSimilar,
        appendToNote,
        search,
        refreshNotes,
        restoreFromBackup,
        mergeFromBackup,
        isReady: db !== null,
    };
}
