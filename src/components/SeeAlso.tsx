import React, { useState } from 'react';
import { Note } from '../types';
import { formatRelativeTime } from '../utils/dateFormatter';
import './SeeAlso.css';

interface SeeAlsoProps {
    relatedNotes: Note[];
    onNoteClick: (note: Note) => void;
    isLoading?: boolean;
}

export function SeeAlso({ relatedNotes, onNoteClick, isLoading }: SeeAlsoProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    if (isLoading) {
        return (
            <div className="see-also see-also-loading">
                <span className="see-also-header">
                    <span className="see-also-icon">💡</span>
                    Finding related notes...
                </span>
            </div>
        );
    }

    if (relatedNotes.length === 0) {
        return null; // Don't show anything if no related notes
    }

    // Truncate title/content for preview
    const getPreview = (note: Note): string => {
        const text = note.title || note.content;
        const maxLength = 50;
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength).trim() + '...';
    };

    return (
        <div className={`see-also ${isExpanded ? 'expanded' : ''}`}>
            <button
                className="see-also-header"
                onClick={() => setIsExpanded(!isExpanded)}
                aria-expanded={isExpanded}
            >
                <span className="see-also-title">
                    <span className="see-also-icon">💡</span>
                    See Also ({relatedNotes.length})
                </span>
                <span className={`see-also-chevron ${isExpanded ? 'rotated' : ''}`}>
                    ▼
                </span>
            </button>

            {isExpanded && (
                <div className="see-also-list">
                    {relatedNotes.map((note) => (
                        <button
                            key={note.id}
                            className="see-also-item"
                            onClick={(e) => {
                                e.stopPropagation();
                                onNoteClick(note);
                            }}
                        >
                            <span className="see-also-item-title">
                                {getPreview(note)}
                            </span>
                            <span className="see-also-item-date">
                                {formatRelativeTime(note.createdAt)}
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
