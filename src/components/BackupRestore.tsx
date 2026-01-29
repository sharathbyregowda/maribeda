import React, { useRef, useState } from 'react';
import { zipSync, unzipSync } from 'fflate';
import { Note } from '../types';
import { exportDatabase, restoreFromBinary, MergeResult } from '../db/database';
import './BackupRestore.css';

interface BackupRestoreProps {
    notes: Note[];
    onRestore: (notes: Note[]) => void;
    onMerge?: (jsonString: string) => Promise<MergeResult>;
    onBinaryRestore?: () => void;
}

export function BackupRestore({ notes, onRestore, onMerge, onBinaryRestore }: BackupRestoreProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isSharing, setIsSharing] = useState(false);
    const [isReplaceMode, setIsReplaceMode] = useState(false);

    const triggerDownload = (data: Uint8Array, filename: string, mimeType: string) => {
        const blob = new Blob([data.buffer as ArrayBuffer], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleBackup = async () => {
        const timestamp = new Date().toISOString().split('T')[0];
        const zipFilename = `maribeda-backup-${timestamp}.zip`;
        const sqliteFilename = `maribeda.sqlite`;

        try {
            const binaryData = exportDatabase();

            // Wrap SQLite binary in a ZIP file
            const zipped = zipSync({
                [sqliteFilename]: binaryData
            });

            const file = new File([zipped.buffer as ArrayBuffer], zipFilename, { type: 'application/zip' });

            // Check if Web Share API with file support is available
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                setIsSharing(true);
                try {
                    await navigator.share({
                        files: [file],
                        title: 'Maribeda Backup',
                        text: `Backup of ${notes.length} notes from Maribeda`,
                    });
                } catch (err) {
                    // User cancelled share or error - fall back to download
                    if ((err as Error).name !== 'AbortError') {
                        triggerDownload(zipped, zipFilename, 'application/zip');
                    }
                } finally {
                    setIsSharing(false);
                }
            } else {
                // Desktop fallback: standard download
                triggerDownload(zipped, zipFilename, 'application/zip');
            }
        } catch (error) {
            console.error('Backup failed:', error);
            alert('Failed to create backup. Please try again.');
        }
    };

    const handleRestoreClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            if (file.name.endsWith('.zip')) {
                // ZIP file - extract and restore (always full replace for binary)
                const arrayBuffer = await file.arrayBuffer();
                const unzipped = unzipSync(new Uint8Array(arrayBuffer));

                // Find the SQLite file inside the ZIP
                const sqliteFile = Object.keys(unzipped).find(
                    name => name.endsWith('.sqlite') || name.endsWith('.db')
                );

                if (!sqliteFile) {
                    throw new Error('No SQLite database found in ZIP file');
                }

                const confirmRestore = window.confirm(
                    '⚠️ This will REPLACE all existing notes with the backup.\n\nThis is a full database restore. Continue?'
                );

                if (confirmRestore) {
                    await restoreFromBinary(unzipped[sqliteFile]);
                    alert('Database restored! The page will reload.');
                    window.location.reload();
                }
            } else if (file.name.endsWith('.sqlite') || file.name.endsWith('.db')) {
                // Direct SQLite binary restore (always full replace)
                const confirmRestore = window.confirm(
                    '⚠️ This will REPLACE all existing notes with the backup.\n\nThis is a full database restore. Continue?'
                );

                if (confirmRestore) {
                    const arrayBuffer = await file.arrayBuffer();
                    await restoreFromBinary(new Uint8Array(arrayBuffer));
                    alert('Database restored! The page will reload.');
                    window.location.reload();
                }
            } else if (file.name.endsWith('.json')) {
                // JSON import - can merge or replace
                const content = await file.text();

                // Try to parse and validate
                // Use flexible type since extension format has fewer fields than PWA format
                type PartialNote = { title?: string | null; content?: string; createdAt?: string };
                let importedNotes: PartialNote[];
                let isExtensionFormat = false;

                try {
                    const parsed = JSON.parse(content);
                    if (Array.isArray(parsed)) {
                        // PWA format: [...]
                        importedNotes = parsed;
                    } else if (parsed.notes && Array.isArray(parsed.notes)) {
                        // Extension format: { notes: [...], source: 'maribeda-extension' }
                        importedNotes = parsed.notes;
                        isExtensionFormat = true;
                    } else {
                        throw new Error('Invalid JSON format');
                    }

                    // Validate at least one note with content exists
                    if (importedNotes.length === 0) {
                        throw new Error('No notes found in backup');
                    }

                    // Basic validation: each note should have content
                    for (const note of importedNotes) {
                        if (!note.content && typeof note.content !== 'string') {
                            console.warn('Note missing content:', note);
                        }
                    }
                } catch (err) {
                    console.error('JSON parse error:', err);
                    throw new Error('Invalid backup file');
                }

                if (isReplaceMode) {
                    // Danger Zone: Full replace
                    // For replace mode, we need full Note objects, so convert partials
                    const fullNotes: Note[] = importedNotes.map((n, i) => ({
                        id: i + 1, // Temporary ID, will be reassigned
                        title: n.title || null,
                        content: n.content || '',
                        isPinned: false,
                        lastViewedAt: null,
                        createdAt: n.createdAt || new Date().toISOString(),
                        updatedAt: n.createdAt || new Date().toISOString(),
                    }));

                    const confirmRestore = window.confirm(
                        `⚠️ DANGER ZONE: This will DELETE all ${notes.length} existing notes and replace with ${fullNotes.length} notes.\n\nAre you absolutely sure?`
                    );

                    if (confirmRestore) {
                        onRestore(fullNotes);
                        alert(`Replaced with ${fullNotes.length} notes.`);
                    }
                } else {
                    // Safe merge mode (default)
                    // Pass raw JSON string to onMerge - it handles format detection
                    if (onMerge) {
                        const result = await onMerge(content);
                        alert(`✅ Merged successfully!\n\nAdded: ${result.added} new notes\nSkipped: ${result.skipped} duplicates\n\nYour existing notes are safe.`);
                    } else {
                        // Fallback if onMerge not provided
                        const confirmRestore = window.confirm(
                            `This will add ${importedNotes.length} notes to your collection. Continue?`
                        );
                        if (confirmRestore) {
                            // Convert to full Notes for legacy restore
                            const fullNotes: Note[] = importedNotes.map((n, i) => ({
                                id: i + 1,
                                title: n.title || null,
                                content: n.content || '',
                                isPinned: false,
                                lastViewedAt: null,
                                createdAt: n.createdAt || new Date().toISOString(),
                                updatedAt: n.createdAt || new Date().toISOString(),
                            }));
                            onRestore(fullNotes);
                        }
                    }
                }
            } else {
                throw new Error('Unsupported file format. Please use .zip, .sqlite, .db, or .json files.');
            }
        } catch (error) {
            console.error('Restore failed:', error);
            alert('Failed to restore backup. Please ensure the file is a valid Maribeda backup.');
        }

        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="backup-restore">
            <div className="backup-restore-info">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                <span>
                    Your data is stored locally in this browser. Use backup to save a copy.
                </span>
            </div>

            <div className="backup-restore-actions">
                <button
                    className="backup-btn"
                    onClick={handleBackup}
                    disabled={notes.length === 0 || isSharing}
                    title="On mobile: Opens share sheet (AirDrop, Nearby Share). On desktop: Downloads file."
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
                        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                        <polyline points="16 6 12 2 8 6" />
                        <line x1="12" y1="2" x2="12" y2="15" />
                    </svg>
                    {isSharing ? 'Sharing...' : `Backup / Transfer (${notes.length})`}
                </button>

                <button
                    className="restore-btn"
                    onClick={handleRestoreClick}
                    title={isReplaceMode ? "DANGER: Will replace all notes" : "Safe: Merges new notes"}
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
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    {isReplaceMode ? '⚠️ Replace All' : 'Merge Backup'}
                </button>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".zip,.json,.sqlite,.db"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                />
            </div>

            {/* Danger Zone Toggle */}
            <div className="backup-restore-danger-zone">
                <label className="danger-toggle">
                    <input
                        type="checkbox"
                        checked={isReplaceMode}
                        onChange={(e) => setIsReplaceMode(e.target.checked)}
                    />
                    <span className="danger-toggle-label">
                        🔴 Danger Zone: Replace all notes (factory reset)
                    </span>
                </label>
            </div>
        </div>
    );
}
