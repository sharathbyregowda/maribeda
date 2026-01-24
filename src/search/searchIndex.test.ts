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

// Notes specifically for typo tolerance testing (README claims)
const typoTestNotes: Note[] = [
    {
        id: 10,
        title: 'Programming Tutorial',
        content: 'Learn programming basics with this comprehensive guide.',
        isPinned: false,
        lastViewedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 11,
        title: 'C++ Pointers Guide',
        content: 'Understanding pointers is essential for C++ development.',
        isPinned: false,
        lastViewedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 12,
        title: 'Healthy Recipe Collection',
        content: 'My favorite recipe for protein shake after workout.',
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

/**
 * README Claims Verification Tests
 * 
 * These tests verify the typo tolerance claims in the README:
 * - "programing" finds "programming"
 * - "pointrs" finds "pointers"
 * - "reciepe" finds "recipe"
 */
describe('Typo Tolerance (README Claims)', () => {
    beforeEach(async () => {
        clearSearchIndex();
        initSearchIndex();

        // Add typo test notes
        for (const note of typoTestNotes) {
            await addToSearchIndex(note);
        }
    });

    it('finds "programming" when user types "programing" (missing m)', async () => {
        // User typo: programing (missing one 'm')
        const results = await searchInIndex('programing');

        // Should find note 10 which contains "programming"
        expect(results).toContain(10);
    });

    it('finds "programming" when user types "progra" (prefix)', async () => {
        // Prefix search should work
        const results = await searchInIndex('progra');
        expect(results).toContain(10);
    });

    it('finds "pointers" when user types "pointer" (singular)', async () => {
        const results = await searchInIndex('pointer');
        expect(results).toContain(11);
    });

    it('finds "pointers" when user types "point" (prefix)', async () => {
        const results = await searchInIndex('point');
        expect(results).toContain(11);
    });

    it('finds "recipe" when user types "recip" (prefix)', async () => {
        const results = await searchInIndex('recip');
        expect(results).toContain(12);
    });

    it('finds notes by title partial match', async () => {
        const results = await searchInIndex('Tutorial');
        expect(results).toContain(10);
    });

    it('finds notes by content partial match', async () => {
        const results = await searchInIndex('protein');
        expect(results).toContain(12);
    });

    it('is case insensitive', async () => {
        const results = await searchInIndex('PROGRAMMING');
        expect(results).toContain(10);
    });
});
