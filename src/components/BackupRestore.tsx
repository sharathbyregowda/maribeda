import React, { useRef } from 'react';
import { Note } from '../types';
import './BackupRestore.css';

interface BackupRestoreProps {
    notes: Note[];
    onRestore: (notes: Note[]) => void;
}

export function BackupRestore({ notes, onRestore }: BackupRestoreProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleBackup = () => {
        const jsonString = JSON.stringify(notes, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `maribeda-backup-${timestamp}.json`;

        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleRestoreClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
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
        } catch (error) {
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
                    disabled={notes.length === 0}
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
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Backup ({notes.length} notes)
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
                    accept=".json"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                />
            </div>
        </div>
    );
}
