import { Note } from '../types';

/**
 * Export notes to a downloadable JSON file
 */
export function downloadBackup(notes: Note[]): void {
    const jsonString = JSON.stringify(notes, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `nenasu-backup-${timestamp}.json`;

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
}

/**
 * Read a backup file and parse its contents
 */
export function readBackupFile(file: File): Promise<Note[]> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (event) => {
            try {
                const content = event.target?.result as string;
                const notes = JSON.parse(content) as Note[];

                // Validate the structure
                if (!Array.isArray(notes)) {
                    throw new Error('Invalid backup file: expected an array of notes');
                }

                for (const note of notes) {
                    if (typeof note.content !== 'string') {
                        throw new Error('Invalid backup file: each note must have content');
                    }
                }

                resolve(notes);
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = () => {
            reject(new Error('Failed to read backup file'));
        };

        reader.readAsText(file);
    });
}
