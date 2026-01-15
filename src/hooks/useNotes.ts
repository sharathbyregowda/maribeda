import { useState, useEffect, useCallback } from 'react';
import { Database } from 'sql.js';
import {
    initDatabase,
    getAllNotes,
    addNote as dbAddNote,
    updateNote as dbUpdateNote,
    deleteNote as dbDeleteNote,
    searchNotes as dbSearchNotes,
    clearAllNotes,
    importNotesFromJson,
} from '../db/database';
import { Note, NoteInput } from '../types';

export function useNotes() {
    const [db, setDb] = useState<Database | null>(null);
    const [notes, setNotes] = useState<Note[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Initialize database on mount
    useEffect(() => {
        initDatabase()
            .then((database) => {
                setDb(database);
                setNotes(getAllNotes());
                setIsLoading(false);
            })
            .catch((err) => {
                setError('Failed to initialize database');
                console.error(err);
                setIsLoading(false);
            });
    }, []);

    const addNote = useCallback((input: NoteInput) => {
        if (!db) return null;
        const note = dbAddNote(input);
        setNotes(getAllNotes());
        return note;
    }, [db]);

    const updateNote = useCallback((id: number, input: NoteInput) => {
        if (!db) return null;
        const note = dbUpdateNote(id, input);
        setNotes(getAllNotes());
        return note;
    }, [db]);

    const deleteNoteById = useCallback((id: number) => {
        if (!db) return false;
        const result = dbDeleteNote(id);
        setNotes(getAllNotes());
        return result;
    }, [db]);

    const search = useCallback((query: string) => {
        if (!db) return [];
        return dbSearchNotes(query);
    }, [db]);

    const refreshNotes = useCallback(() => {
        if (!db) return;
        setNotes(getAllNotes());
    }, [db]);

    const restoreFromBackup = useCallback((notesData: Note[]) => {
        if (!db) return 0;
        clearAllNotes();
        const count = importNotesFromJson(JSON.stringify(notesData));
        setNotes(getAllNotes());
        return count;
    }, [db]);

    return {
        notes,
        isLoading,
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
