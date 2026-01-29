/**
 * Chrome Storage Wrapper for Maribeda Extension
 * Provides a clean API for managing notes in chrome.storage.local
 */

const STORAGE_KEY = 'notes';

const Storage = {
    /**
     * Get all saved notes
     * @returns {Promise<Array>}
     */
    async getNotes() {
        const result = await chrome.storage.local.get(STORAGE_KEY);
        return result[STORAGE_KEY] || [];
    },

    /**
     * Save a new note
     * @param {Object} note - { url, title, note }
     * @returns {Promise<Object>} - The saved note with id and timestamp
     */
    async saveNote({ url, title, note }) {
        const notes = await this.getNotes();

        const newNote = {
            id: Date.now(),
            url: url.trim(),
            title: title.trim(),
            note: note?.trim() || '',
            createdAt: new Date().toISOString()
        };

        notes.unshift(newNote); // Add to beginning
        await chrome.storage.local.set({ [STORAGE_KEY]: notes });

        // Update badge
        await this.updateBadge(notes.length);

        return newNote;
    },

    /**
     * Get the count of saved notes
     * @returns {Promise<number>}
     */
    async getCount() {
        const notes = await this.getNotes();
        return notes.length;
    },

    /**
     * Update the extension badge with count
     * @param {number} count
     */
    async updateBadge(count) {
        const text = count > 0 ? String(count) : '';
        await chrome.action.setBadgeText({ text });
        await chrome.action.setBadgeBackgroundColor({ color: '#4a90a4' });
    },

    /**
     * Export all notes as JSON (PWA-compatible format)
     * @returns {Promise<string>} - JSON string
     */
    async exportToJSON() {
        const notes = await this.getNotes();

        // Convert to PWA-compatible format
        const exportData = {
            exportedAt: new Date().toISOString(),
            source: 'maribeda-extension',
            version: '1.0.0',
            notes: notes.map(n => ({
                title: n.title,
                // Combine URL + note for PWA compatibility
                content: n.note ? `${n.url}\n\n${n.note}` : n.url,
                createdAt: n.createdAt
            }))
        };

        return JSON.stringify(exportData, null, 2);
    },

    /**
     * Clear all notes (for testing/reset)
     * @returns {Promise<void>}
     */
    async clearAll() {
        await chrome.storage.local.remove(STORAGE_KEY);
        await this.updateBadge(0);
    }
};

// Make available globally
window.Storage = Storage;
