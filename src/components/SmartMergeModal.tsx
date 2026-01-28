import React, { useState } from 'react';
import { Note } from '../types';
import { formatRelativeTime } from '../utils/dateFormatter';
import './SmartMergeModal.css';

export type SmartMergeMode = 'duplicate' | 'single' | 'multiple';

interface SmartMergeModalProps {
    mode: SmartMergeMode;
    incomingContent: string;
    matchedNotes: Note[];  // Sorted by relevance (first = best match)
    onAppend: (targetNote: Note) => void;
    onCreateNew: (content: string) => void;
    onOpenNote: (note: Note) => void;
    onClose: () => void;
}

export function SmartMergeModal({
    mode,
    incomingContent,
    matchedNotes,
    onAppend,
    onCreateNew,
    onOpenNote,
    onClose
}: SmartMergeModalProps) {
    // For multiple matches, track which note is selected (default: first = best match)
    const [selectedNoteId, setSelectedNoteId] = useState<number>(
        matchedNotes.length > 0 ? matchedNotes[0].id : -1
    );

    const selectedNote = matchedNotes.find(n => n.id === selectedNoteId);

    // Truncate content for preview
    const getPreview = (text: string, maxLength: number = 100): string => {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength).trim() + '...';
    };

    // Get note display title (title or first line of content)
    const getNoteTitle = (note: Note): string => {
        if (note.title) return note.title;
        const firstLine = note.content.split('\n')[0];
        return getPreview(firstLine, 50);
    };

    const handleAppend = () => {
        if (selectedNote) {
            onAppend(selectedNote);
        }
    };

    const handleCreateNew = () => {
        onCreateNew(incomingContent);
    };

    // Render content based on mode
    const renderContent = () => {
        switch (mode) {
            case 'duplicate':
                return renderDuplicateMode();
            case 'single':
                return renderSingleMode();
            case 'multiple':
                return renderMultipleMode();
        }
    };

    // Mode: Exact duplicate found
    const renderDuplicateMode = () => {
        const note = matchedNotes[0];
        return (
            <>
                <div className="smart-merge-icon">⚠️</div>
                <h2 className="smart-merge-title">Already Saved!</h2>
                <p className="smart-merge-subtitle">
                    This link is already in your notes.
                </p>

                <div className="smart-merge-note-preview">
                    <div className="note-preview-title">{getNoteTitle(note)}</div>
                    <div className="note-preview-date">{formatRelativeTime(note.createdAt)}</div>
                    <div className="note-preview-content">{getPreview(note.content)}</div>
                </div>

                <div className="smart-merge-actions">
                    <button
                        className="smart-merge-btn primary"
                        onClick={() => onOpenNote(note)}
                    >
                        📂 Open Note
                    </button>
                    <button
                        className="smart-merge-btn secondary"
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                </div>
            </>
        );
    };

    // Mode: Single similar match
    const renderSingleMode = () => {
        const note = matchedNotes[0];
        return (
            <>
                <div className="smart-merge-icon">💡</div>
                <h2 className="smart-merge-title">Did you mean...?</h2>
                <p className="smart-merge-subtitle">
                    We found a similar note.
                </p>

                <div className="smart-merge-incoming">
                    <div className="incoming-label">Incoming:</div>
                    <div className="incoming-content">{getPreview(incomingContent, 80)}</div>
                </div>

                <div className="smart-merge-note-preview">
                    <div className="note-preview-title">{getNoteTitle(note)}</div>
                    <div className="note-preview-date">{formatRelativeTime(note.createdAt)}</div>
                    <div className="note-preview-content">{getPreview(note.content)}</div>
                </div>

                <div className="smart-merge-actions">
                    <button
                        className="smart-merge-btn primary"
                        onClick={handleAppend}
                    >
                        📥 Append to This Note
                    </button>
                    <button
                        className="smart-merge-btn secondary"
                        onClick={handleCreateNew}
                    >
                        ➕ Create New Note
                    </button>
                </div>
            </>
        );
    };

    // Mode: Multiple matches - show radio list
    const renderMultipleMode = () => {
        return (
            <>
                <div className="smart-merge-icon">🤔</div>
                <h2 className="smart-merge-title">We found a few matches...</h2>
                <p className="smart-merge-subtitle">
                    Where should we save this?
                </p>

                <div className="smart-merge-incoming">
                    <div className="incoming-label">Incoming:</div>
                    <div className="incoming-content">{getPreview(incomingContent, 80)}</div>
                </div>

                <div className="smart-merge-radio-list">
                    {matchedNotes.map((note, index) => (
                        <label
                            key={note.id}
                            className={`radio-item ${selectedNoteId === note.id ? 'selected' : ''}`}
                        >
                            <input
                                type="radio"
                                name="mergeTarget"
                                checked={selectedNoteId === note.id}
                                onChange={() => setSelectedNoteId(note.id)}
                            />
                            <div className="radio-content">
                                <div className="radio-title">
                                    {getNoteTitle(note)}
                                    {index === 0 && <span className="best-match-badge">Best Match</span>}
                                </div>
                                <div className="radio-date">{formatRelativeTime(note.createdAt)}</div>
                            </div>
                        </label>
                    ))}
                </div>

                <div className="smart-merge-actions">
                    <button
                        className="smart-merge-btn primary"
                        onClick={handleAppend}
                        disabled={!selectedNote}
                    >
                        📥 Append to Selected
                    </button>
                    <button
                        className="smart-merge-btn secondary"
                        onClick={handleCreateNew}
                    >
                        ➕ Create New Note
                    </button>
                </div>
            </>
        );
    };

    return (
        <div className="smart-merge-overlay" onClick={onClose}>
            <div className="smart-merge-modal" onClick={e => e.stopPropagation()}>
                {renderContent()}
            </div>
        </div>
    );
}
