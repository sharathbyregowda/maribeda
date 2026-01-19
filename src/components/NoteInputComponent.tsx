import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Note, NoteInput } from '../types';
import './NoteInputComponent.css';

interface NoteInputProps {
    onSave: (input: NoteInput) => void;
    editingNote?: Note | null;
    onCancelEdit?: () => void;
    sharedContent?: string | null;
    onSharedContentConsumed?: () => void;
}

export function NoteInputComponent({ onSave, editingNote, onCancelEdit, sharedContent, onSharedContentConsumed }: NoteInputProps) {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const contentRef = useRef<HTMLTextAreaElement>(null);
    const isEditing = !!editingNote;

    // Pre-fill when editing
    useEffect(() => {
        if (editingNote) {
            setTitle(editingNote.title || '');
            setContent(editingNote.content);
            contentRef.current?.focus();
        }
    }, [editingNote]);

    // Handle shared content from Web Share Target
    useEffect(() => {
        if (sharedContent) {
            setContent(prev => prev ? `${prev}\n\n${sharedContent}` : sharedContent);
            contentRef.current?.focus();
            onSharedContentConsumed?.();
        }
    }, [sharedContent, onSharedContentConsumed]);

    const handleSave = () => {
        if (!content.trim()) return;

        onSave({
            title: title.trim() || undefined,
            content: content.trim(),
        });

        // Clear inputs after save
        setTitle('');
        setContent('');
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            handleSave();
        }
    };

    const handleCancel = () => {
        setTitle('');
        setContent('');
        onCancelEdit?.();
    };

    return (
        <div className={`note-input-container ${isEditing ? 'editing' : ''}`}>
            <input
                type="text"
                className="note-input-title"
                placeholder="Title (optional)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
            />
            <textarea
                ref={contentRef}
                className="note-input-content"
                placeholder="What's on your mind? Type your note here..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={isEditing ? 15 : 3}
            />
            <div className="note-input-actions">
                <span className="note-input-hint">
                    Press <kbd>Ctrl</kbd>+<kbd>Enter</kbd> to save
                </span>
                <div className="note-input-buttons">
                    {isEditing && (
                        <button
                            type="button"
                            className="note-input-cancel"
                            onClick={handleCancel}
                        >
                            Cancel
                        </button>
                    )}
                    <button
                        type="button"
                        className="note-input-save"
                        onClick={handleSave}
                        disabled={!content.trim()}
                    >
                        {isEditing ? 'Update' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
}
