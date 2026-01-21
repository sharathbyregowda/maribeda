import { describe, it, expect, beforeEach } from 'vitest';
import {
    initSearchIndex,
    addToSearchIndex,
    searchInIndex,
    clearSearchIndex,
    getSearchIndex
} from '../search/searchIndex';
import { Note } from '../types';

// Mock Note data
const mockNotes: Note[] = [
    {
        id: 1,
        title: 'JavaScript Basics',
        content: 'JavaScript is a versatile scripting language.',
        isPinned: false,
        lastViewedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 2,
        title: 'Python for Data Science',
        content: 'Python is great for machine learning and data analysis.',
        isPinned: false,
        lastViewedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 3,
        title: 'React Components',
        content: 'React makes building user interfaces easy with components.',
        isPinned: false,
        lastViewedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    }
];

describe('FlexSearch Integration', () => {
    beforeEach(() => {
        // Clear index before each test
        clearSearchIndex();
        initSearchIndex();
    });

    it('should initialize the search index', () => {
        const index = getSearchIndex();
        expect(index).toBeDefined();
    });

    it('should add notes and find them by exact match', async () => {
        for (const note of mockNotes) {
            await addToSearchIndex(note);
        }

        const results = await searchInIndex('JavaScript');
        expect(results).toContain(1);
        expect(results).not.toContain(2);
    });

    it('should find notes by content match', async () => {
        for (const note of mockNotes) {
            await addToSearchIndex(note);
        }

        const results = await searchInIndex('machine learning');
        expect(results).toContain(2);
    });

    it('should handle prefix matching (partial words)', async () => {
        for (const note of mockNotes) {
            await addToSearchIndex(note);
        }

        // "inter" should find "interfaces" in note 3
        const results = await searchInIndex('inter');
        expect(results).toContain(3);
    });

    it.skip('should handle typos (fuzzy search)', async () => {
        for (const note of mockNotes) {
            await addToSearchIndex(note);
        }

        // "scipting" (missing 'r') should find "scripting" in note 1
        const results = await searchInIndex('scipting');
        expect(results).toContain(1);
    });

    it('should return empty array for empty query', async () => {
        const results = await searchInIndex('   ');
        expect(results).toEqual([]);
    });

    it('should return empty array when no matches found', async () => {
        for (const note of mockNotes) {
            await addToSearchIndex(note);
        }

        const results = await searchInIndex('Cobol');
        expect(results).toEqual([]);
    });
});
