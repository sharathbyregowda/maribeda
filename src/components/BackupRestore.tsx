import React, { useRef, useState } from 'react';
import { Note } from '../types';
import { exportDatabase, restoreFromBinary, getAllNotes } from '../db/database';
import './BackupRestore.css';

interface BackupRestoreProps {
    notes: Note[];
    onRestore: (notes: Note[]) => void;
    onBinaryRestore?: () => void;
}

export function BackupRestore({ notes, onRestore, onBinaryRestore }: BackupRestoreProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isSharing, setIsSharing] = useState(false);

    const triggerDownload = (data: Uint8Array, filename: string) => {
        const blob = new Blob([data.buffer as ArrayBuffer], { type: 'application/octet-stream' });
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
        const filename = `maribeda-backup-${timestamp}.sqlite`;

        try {
            const binaryData = exportDatabase();
            const file = new File([binaryData.buffer as ArrayBuffer], filename, { type: 'application/octet-stream' });

            // Check if Web Share API with file support is available (mobile)
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
                        triggerDownload(binaryData, filename);
                    }
                } finally {
                    setIsSharing(false);
                }
            } else {
                // Desktop fallback: standard download
                triggerDownload(binaryData, filename);
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
            // Check file type: SQLite binary or legacy JSON
            if (file.name.endsWith('.sqlite') || file.name.endsWith('.db')) {
                // Binary restore
                const arrayBuffer = await file.arrayBuffer();
                const restoredNotes = await restoreFromBinary(new Uint8Array(arrayBuffer));

                const confirmRestore = window.confirm(
                    'Database restored successfully! The page will reload to apply changes.'
                );

                if (confirmRestore) {
                    window.location.reload();
                }
            } else {
                // Legacy JSON restore
                const content = await file.text();
                const importedNotes = JSON.parse(content) as Note[];

                if (!Array.isArray(importedNotes)) {
                    throw new Error('Invalid backup file');
                }

                const confirmRestore = window.confirm(
                    `This will replace all existing notes with ${importedNotes.length} notes from the backup. Continue?`
                );

                if (confirmRestore) {
                    onRestore(importedNotes);
                }
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
                    Restore
                </button>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,.sqlite,.db"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                />
            </div>
        </div>
    );
}
