import FlexSearch from 'flexsearch';
import { Note } from '../types';

// FlexSearch Document index for notes
// Using 'any' for the index type to avoid complex type constraints
let searchIndex: any | null = null;

/**
 * Initialize the FlexSearch index
 */
export function initSearchIndex(): any {
    searchIndex = new FlexSearch.Document({
        tokenize: 'forward',
        document: {
            id: 'id',
            index: ['title', 'content'],
            store: ['id', 'title', 'content', 'createdAt', 'updatedAt']
        },
        // Optimize for search speed and relevance
        context: {
            resolution: 9,
            depth: 2,
            bidirectional: true
        }
    });

    return searchIndex;
}

/**
 * Get the current search index instance
 */
export function getSearchIndex(): any {
    if (!searchIndex) {
        throw new Error('Search index not initialized. Call initSearchIndex() first.');
    }
    return searchIndex;
}

/**
 * Build the search index from all notes
 */
export async function buildSearchIndex(notes: Note[]): Promise<void> {
    const index = getSearchIndex();

    // Add all notes to the index
    for (const note of notes) {
        await index.addAsync(note.id, note);
    }
}

/**
 * Add a single note to the search index
 */
export async function addToSearchIndex(note: Note): Promise<void> {
    const index = getSearchIndex();
    await index.addAsync(note.id, note);
}

/**
 * Update a note in the search index
 */
export async function updateInSearchIndex(note: Note): Promise<void> {
    const index = getSearchIndex();
    // FlexSearch requires remove + add for updates
    await index.removeAsync(note.id);
    await index.addAsync(note.id, note);
}

/**
 * Remove a note from the search index
 */
export async function removeFromSearchIndex(id: number): Promise<void> {
    const index = getSearchIndex();
    await index.removeAsync(id);
}

/**
 * Search notes using FlexSearch
 * Returns array of note IDs matching the query
 */
export async function searchInIndex(query: string): Promise<number[]> {
    if (!query.trim()) {
        return [];
    }

    const index = getSearchIndex();

    // Search across both title and content
    const results = await index.searchAsync(query, {
        limit: 100,
        suggest: true // Enable typo tolerance
    });

    // FlexSearch returns results grouped by field
    // Combine and deduplicate IDs
    const idSet = new Set<number>();

    for (const fieldResults of results) {
        if (Array.isArray(fieldResults.result)) {
            fieldResults.result.forEach((id: number) => idSet.add(id));
        }
    }

    return Array.from(idSet);
}

/**
 * Clear the entire search index
 */
export function clearSearchIndex(): void {
    if (searchIndex) {
        // Re-initialize to clear
        initSearchIndex();
    }
}
