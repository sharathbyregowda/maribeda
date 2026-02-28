import React, { useState, useMemo, useEffect } from 'react';
import { Note, LinkPreview } from '../types';
import { linkifyText } from '../utils/urlDetector';
import { formatRelativeTime, formatFullDate } from '../utils/dateFormatter';
import { extractSnippet, highlightMatches, linkifyAndHighlight } from '../utils/snippetExtractor';
import { getNoteAge, getAgingLabel } from '../utils/noteAging';
import { SeeAlso } from './SeeAlso';
import './NoteCard.css';

interface NoteCardProps {
    note: Note;
    onEdit: (note: Note) => void;
    onDelete: (id: number) => void;
    onTogglePin: (id: number) => void;
    onMarkAsViewed?: (id: number) => void;
    searchQuery?: string;
    isRediscovered?: boolean;
    getRelatedNotes?: (note: Note) => Promise<Note[]>;
    onRelatedNoteClick?: (note: Note) => void;
    linkPreviews?: LinkPreview[];
}

export function NoteCard({ note, onEdit, onDelete, onTogglePin, onMarkAsViewed, searchQuery, isRediscovered, getRelatedNotes, onRelatedNoteClick, linkPreviews }: NoteCardProps) {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [relatedNotes, setRelatedNotes] = useState<Note[]>([]);
    const [isLoadingRelated, setIsLoadingRelated] = useState(false);

    // Load related notes when expanded (lazy loading)
    useEffect(() => {
        if (isExpanded && getRelatedNotes && relatedNotes.length === 0 && !isLoadingRelated) {
            setIsLoadingRelated(true);
            getRelatedNotes(note).then((notes) => {
                setRelatedNotes(notes);
                setIsLoadingRelated(false);
            }).catch(() => {
                setIsLoadingRelated(false);
            });
        }
    }, [isExpanded, getRelatedNotes, note, relatedNotes.length, isLoadingRelated]);

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

    // Extract snippet and count when searching
    const snippetResult = useMemo(() => {
        if (!searchQuery?.trim()) return null;
        return extractSnippet(note.content, searchQuery);
    }, [note.content, searchQuery]);

    // Build a URL-to-preview lookup map
    const previewByUrl = useMemo(() => {
        const map = new Map<string, LinkPreview>();
        if (linkPreviews) {
            for (const p of linkPreviews) {
                map.set(p.url, p);
            }
        }
        return map;
    }, [linkPreviews]);

    // Check if a line is purely a URL (with optional whitespace)
    const isUrlOnlyLine = (line: string): string | null => {
        const trimmed = line.trim();
        if (!trimmed) return null;
        const URL_REGEX = /^(https?:\/\/[^\s]+|www\.[^\s]+)$/i;
        return URL_REGEX.test(trimmed) ? trimmed : null;
    };

    // Render a single line — URL lines get a subtitle annotation, others render normally
    const renderLine = (line: string, index: number) => {
        const url = isUrlOnlyLine(line);
        if (url && previewByUrl.has(url)) {
            const preview = previewByUrl.get(url)!;
            return (
                <div key={index} className="note-url-enriched">
                    <p>{linkifyText(line)}</p>
                    {preview.title && (
                        <span className="note-url-subtitle">
                            {preview.title}
                            {preview.siteName && <span className="note-url-site"> · {preview.siteName}</span>}
                        </span>
                    )}
                </div>
            );
        }
        // Normal text line with linkification
        return (
            <p key={index}>
                {linkifyText(line)}
            </p>
        );
    };

    // Render content: snippet with highlights when searching, full content otherwise
    const renderContent = () => {
        // When searching and we have matches
        if (snippetResult && snippetResult.matchCount > 0) {
            // Expanded mode: show full content with all matches highlighted
            if (isExpanded) {
                return (
                    <div className="search-expanded">
                        {note.content.split('\n').map((line, index) => (
                            <p key={index}>
                                {linkifyAndHighlight(line, searchQuery!)}
                            </p>
                        ))}
                        <button
                            className="collapse-button"
                            onClick={() => setIsExpanded(false)}
                        >
                            Show less
                        </button>
                    </div>
                );
            }

            // Snippet mode: show contextual snippet
            return (
                <div className="search-snippet">
                    <p>{linkifyAndHighlight(snippetResult.snippet, searchQuery!)}</p>
                    <button
                        className="match-count-badge"
                        onClick={() => setIsExpanded(true)}
                        title="Click to see full note"
                    >
                        {snippetResult.matchCount > 1
                            ? `+${snippetResult.matchCount - 1} more`
                            : 'View full'}
                    </button>
                </div>
            );
        }

        // Default: show full content, enriching URL-only lines with preview subtitles
        return note.content.split('\n').map((line, index) => renderLine(line, index));
    };

    const noteAge = getNoteAge(note);
    const agingLabel = getAgingLabel(note);

    return (
        <div className={`note-card ${note.isPinned ? 'is-pinned' : ''} ${isRediscovered ? 'rediscovered' : ''} ${noteAge !== 'fresh' ? `note-age-${noteAge}` : ''}`}>
            <div className="note-card-header">
                <div className="note-card-title-row">
                    {note.title && <h3 className="note-card-title">{highlightMatches(note.title, searchQuery || '')}</h3>}
                    <button
                        className={`note-pin-btn ${note.isPinned ? 'pinned' : ''}`}
                        onClick={() => onTogglePin(note.id)}
                        aria-label={note.isPinned ? 'Unpin note' : 'Pin note'}
                        title={note.isPinned ? 'Unpin note' : 'Pin note'}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill={note.isPinned ? 'currentColor' : 'none'}
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M12 17v5" />
                            <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76z" />
                        </svg>
                    </button>
                </div>
                <time
                    className="note-card-time"
                    title={formatFullDate(note.createdAt)}
                >
                    {formatRelativeTime(note.createdAt)}
                </time>
                {agingLabel && (
                    <div className="note-aging-indicator">
                        <span className="note-aging-label">{agingLabel}</span>
                        {onMarkAsViewed && (
                            <button
                                className="note-aging-action"
                                onClick={(e) => { e.stopPropagation(); onMarkAsViewed(note.id); }}
                                title="Mark as still useful"
                            >
                                ✓ Still useful
                            </button>
                        )}
                    </div>
                )}
            </div>

            <div className="note-card-content">
                {renderContent()}
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

            {/* See Also section - shown when expanded */}
            {isExpanded && getRelatedNotes && (
                <SeeAlso
                    relatedNotes={relatedNotes}
                    onNoteClick={onRelatedNoteClick || (() => { })}
                    isLoading={isLoadingRelated}
                />
            )}
        </div>
    );
}
