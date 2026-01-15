import React, { useState } from 'react';
import { Note } from '../types';
import { linkifyText } from '../utils/urlDetector';
import { formatRelativeTime, formatFullDate } from '../utils/dateFormatter';
import './NoteCard.css';

interface NoteCardProps {
    note: Note;
    onEdit: (note: Note) => void;
    onDelete: (id: number) => void;
}

export function NoteCard({ note, onEdit, onDelete }: NoteCardProps) {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const handleDeleteClick = () => {
        setShowDeleteConfirm(true);
    };

    const handleConfirmDelete = () => {
        onDelete(note.id);
        setShowDeleteConfirm(false);
    };

    const handleCancelDelete = () => {
        setShowDeleteConfirm(false);
    };

    return (
        <div className="note-card">
            <div className="note-card-header">
                {note.title && <h3 className="note-card-title">{note.title}</h3>}
                <time
                    className="note-card-time"
                    title={formatFullDate(note.createdAt)}
                >
                    {formatRelativeTime(note.createdAt)}
                </time>
            </div>

            <div className="note-card-content">
                {note.content.split('\n').map((line, index) => (
                    <p key={index}>
                        {linkifyText(line)}
                    </p>
                ))}
            </div>

            <div className="note-card-actions">
                <button
                    className="note-card-edit"
                    onClick={() => onEdit(note)}
                    aria-label="Edit note"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    Edit
                </button>

                {!showDeleteConfirm ? (
                    <button
                        className="note-card-delete"
                        onClick={handleDeleteClick}
                        aria-label="Delete note"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                        Delete
                    </button>
                ) : (
                    <div className="note-card-delete-confirm">
                        <span>Delete this note?</span>
                        <button
                            className="confirm-yes"
                            onClick={handleConfirmDelete}
                        >
                            Yes
                        </button>
                        <button
                            className="confirm-no"
                            onClick={handleCancelDelete}
                        >
                            No
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
