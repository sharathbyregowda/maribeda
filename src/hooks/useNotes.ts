import { useState, useEffect, useCallback } from 'react';
import { Database } from 'sql.js';
import {
    initDatabase,
    getAllNotes,
    addNote as dbAddNote,
    updateNote as dbUpdateNote,
    deleteNote as dbDeleteNote,
    clearAllNotes,
    importNotesFromJson,
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
import { Note, NoteInput } from '../types';

export function useNotes() {
    const [db, setDb] = useState<Database | null>(null);
    const [notes, setNotes] = useState<Note[]>([]);
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

        return note;
    }, [db]);

    const updateNote = useCallback((id: number, input: NoteInput) => {
        if (!db) return null;
        const note = dbUpdateNote(id, input);
        setNotes(getAllNotes());

        // Update search index
        if (note) {
            updateInSearchIndex(note);
        }

        return note;
    }, [db]);

    const deleteNoteById = useCallback((id: number) => {
        if (!db) return false;
        const result = dbDeleteNote(id);
        setNotes(getAllNotes());

        // Remove from search index
        removeFromSearchIndex(id);

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

    return {
        notes,
        isLoading,
        isSearchReady,
        error,
        addNote,
        updateNote,
        deleteNote: deleteNoteById,
        search,
        refreshNotes,
        restoreFromBackup,
        isReady: db !== null,
    };
}
