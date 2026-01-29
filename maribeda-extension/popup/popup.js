/**
 * Maribeda Extension - Popup Logic
 * Handles save, export, and keyboard shortcuts
 */

// DOM Elements
const urlInput = document.getElementById('urlInput');
const titleInput = document.getElementById('titleInput');
const noteInput = document.getElementById('noteInput');
const saveBtn = document.getElementById('saveBtn');
const exportBtn = document.getElementById('exportBtn');
const saveCount = document.getElementById('saveCount');
const saveForm = document.getElementById('saveForm');

/**
 * Initialize popup - auto-fill from active tab
 */
async function init() {
    try {
        // Get active tab info
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (tab) {
            // Auto-fill URL and title (editable for fallback)
            urlInput.value = tab.url || '';
            titleInput.value = tab.title || '';

            // If on a restricted page, focus URL input for manual entry
            if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('about:')) {
                urlInput.value = '';
                urlInput.placeholder = 'Paste URL here...';
                urlInput.focus();
            } else {
                // Focus note input for quick annotation
                noteInput.focus();
            }
        }

        // Update save count
        await updateCount();

        // Initialize badge
        const count = await Storage.getCount();
        await Storage.updateBadge(count);

    } catch (error) {
        console.error('Failed to initialize:', error);
        // Fallback: allow manual entry
        urlInput.placeholder = 'Paste URL here...';
        urlInput.focus();
    }
}

/**
 * Update the save count display
 */
async function updateCount() {
    const count = await Storage.getCount();
    saveCount.textContent = `${count} save${count !== 1 ? 's' : ''}`;
}

/**
 * Save the current note
 */
async function saveNote() {
    const url = urlInput.value.trim();
    const title = titleInput.value.trim();
    const note = noteInput.value.trim();

    // Validate
    if (!url) {
        urlInput.focus();
        return;
    }

    if (!title) {
        titleInput.focus();
        return;
    }

    try {
        // Save to storage
        await Storage.saveNote({ url, title, note });

        // Close popup immediately (badge already updated)
        window.close();

    } catch (error) {
        console.error('Failed to save:', error);
        alert('Failed to save. Please try again.');
    }
}

/**
 * Export all notes as JSON file (via Blob, no permissions needed)
 */
async function exportNotes() {
    try {
        const json = await Storage.exportToJSON();
        const notes = await Storage.getNotes();

        if (notes.length === 0) {
            alert('No notes to export!');
            return;
        }

        // Create download via Blob (no chrome.downloads permission needed)
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `maribeda-export-${Date.now()}.json`;
        a.click();

        // Cleanup
        URL.revokeObjectURL(url);

    } catch (error) {
        console.error('Failed to export:', error);
        alert('Failed to export. Please try again.');
    }
}

/**
 * Handle keyboard shortcuts
 */
function handleKeydown(event) {
    // Cmd/Ctrl + Enter = Save
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        saveNote();
        return;
    }

    // Escape = Close
    if (event.key === 'Escape') {
        event.preventDefault();
        window.close();
        return;
    }
}

// Event Listeners
saveForm.addEventListener('submit', (e) => {
    e.preventDefault();
    saveNote();
});

exportBtn.addEventListener('click', exportNotes);
document.addEventListener('keydown', handleKeydown);

// Initialize on load
document.addEventListener('DOMContentLoaded', init);
