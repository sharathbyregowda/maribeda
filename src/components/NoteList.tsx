import React from 'react';
import { Note } from '../types';
import { NoteCard } from './NoteCard';
import './NoteList.css';

interface NoteListProps {
    notes: Note[];
    onEdit: (note: Note) => void;
    onDelete: (id: number) => void;
    onTogglePin: (id: number) => void;
    isSearching?: boolean;
    searchQuery?: string;
}

export function NoteList({ notes, onEdit, onDelete, onTogglePin, isSearching, searchQuery }: NoteListProps) {
    if (notes.length === 0) {
        return (
            <div className="note-list-empty">
                <div className="empty-icon">
                    {isSearching ? (
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="48"
                            height="48"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            <line x1="8" y1="11" x2="14" y2="11" />
                        </svg>
                    ) : (
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="48"
                            height="48"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="12" y1="18" x2="12" y2="12" />
                            <line x1="9" y1="15" x2="15" y2="15" />
                        </svg>
                    )}
                </div>
                <h3>{isSearching ? 'No matches found' : 'No notes yet'}</h3>
                <p>
                    {isSearching
                        ? 'Try a different search term'
                        : 'Start capturing your thoughts above'}
                </p>
            </div>
        );
    }

    return (
        <div className="note-list">
            {notes.map((note) => (
                <NoteCard
                    key={note.id}
                    note={note}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onTogglePin={onTogglePin}
                    searchQuery={searchQuery}
                />
            ))}
        </div>
    );
}
