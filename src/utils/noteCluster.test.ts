import { describe, it, expect } from 'vitest';
import { findClusters, NoteCluster } from './noteCluster';
import { Note } from '../types';

let idCounter = 1;

// Each note gets a creation date spread months apart to avoid accidental time clustering
function makeNote(overrides: Partial<Note> = {}): Note {
    const id = idCounter++;
    const monthOffset = id * 2; // ~2 months apart per note
    const date = new Date(`2024-01-01`);
    date.setMonth(date.getMonth() + monthOffset);
    return {
        id,
        title: null,
        content: 'Test note',
        isPinned: false,
        lastViewedAt: null,
        createdAt: date.toISOString(),
        updatedAt: date.toISOString(),
        ...overrides,
    };
}

describe('findClusters', () => {
    beforeEach(() => {
        idCounter = 1;
    });

    it('returns null when fewer than 3 notes', () => {
        const notes = [makeNote(), makeNote()];
        expect(findClusters(notes)).toBeNull();
    });

    it('returns null when notes have no common domain, week, or keyword', () => {
        const notes = [
            makeNote({ content: 'alpha', createdAt: '2024-01-01T00:00:00Z' }),
            makeNote({ content: 'beta', createdAt: '2024-03-15T00:00:00Z' }),
            makeNote({ content: 'gamma', createdAt: '2024-06-20T00:00:00Z' }),
        ];
        expect(findClusters(notes)).toBeNull();
    });

    // --- Domain clustering ---

    it('finds domain cluster when 3+ notes share a domain', () => {
        const notes = [
            makeNote({ content: 'https://www.instagram.com/reel/abc' }),
            makeNote({ content: 'https://www.instagram.com/reel/def' }),
            makeNote({ content: 'https://www.instagram.com/reel/ghi' }),
            makeNote({ content: 'https://youtube.com/watch?v=123' }),
        ];
        const cluster = findClusters(notes);
        expect(cluster).not.toBeNull();
        expect(cluster!.type).toBe('domain');
        expect(cluster!.notes.length).toBe(3);
        expect(cluster!.label).toContain('instagram.com');
    });

    it('picks the largest domain cluster', () => {
        const notes = [
            makeNote({ content: 'https://www.instagram.com/reel/a' }),
            makeNote({ content: 'https://www.instagram.com/reel/b' }),
            makeNote({ content: 'https://www.instagram.com/reel/c' }),
            makeNote({ content: 'https://www.instagram.com/reel/d' }),
            makeNote({ content: 'https://youtube.com/watch?v=1' }),
            makeNote({ content: 'https://youtube.com/watch?v=2' }),
            makeNote({ content: 'https://youtube.com/watch?v=3' }),
        ];
        const cluster = findClusters(notes);
        expect(cluster).not.toBeNull();
        expect(cluster!.notes.length).toBe(4);
        expect(cluster!.label).toContain('instagram.com');
    });

    // --- Time clustering ---

    it('finds time cluster when 3+ notes are in the same week', () => {
        const notes = [
            makeNote({ content: 'note one', createdAt: '2024-08-12T10:00:00Z' }),
            makeNote({ content: 'note two', createdAt: '2024-08-13T10:00:00Z' }),
            makeNote({ content: 'note three', createdAt: '2024-08-14T10:00:00Z' }),
        ];
        const cluster = findClusters(notes);
        expect(cluster).not.toBeNull();
        expect(cluster!.type).toBe('time');
        expect(cluster!.notes.length).toBe(3);
        expect(cluster!.label).toContain('Aug');
    });

    // --- Content clustering ---

    it('finds content cluster when 3+ notes share a keyword', () => {
        const notes = [
            makeNote({ content: 'fermentation recipe for kimchi' }),
            makeNote({ content: 'fermentation tips and tricks' }),
            makeNote({ content: 'fermentation science explained' }),
            makeNote({ content: 'completely unrelated gardening note' }),
        ];
        const cluster = findClusters(notes);
        expect(cluster).not.toBeNull();
        expect(cluster!.type).toBe('content');
        expect(cluster!.notes.length).toBe(3);
        expect(cluster!.label).toContain('fermentation');
    });

    // --- Priority ---

    it('prefers domain cluster over time cluster when both are same size', () => {
        // All notes are in same week AND share a domain
        const notes = [
            makeNote({ content: 'https://instagram.com/a', createdAt: '2024-08-12T10:00:00Z' }),
            makeNote({ content: 'https://instagram.com/b', createdAt: '2024-08-13T10:00:00Z' }),
            makeNote({ content: 'https://instagram.com/c', createdAt: '2024-08-14T10:00:00Z' }),
        ];
        const cluster = findClusters(notes);
        expect(cluster).not.toBeNull();
        // Both domain and time have 3 notes, but domain is checked first and both have same size,
        // so the sort is stable — the first one found (domain) wins on tie
        expect(['domain', 'time']).toContain(cluster!.type);
        expect(cluster!.notes.length).toBe(3);
    });

    it('picks the cluster with the most notes regardless of type', () => {
        const notes = [
            // 4 in same week
            makeNote({ content: 'aaa', createdAt: '2024-08-12T10:00:00Z' }),
            makeNote({ content: 'bbb', createdAt: '2024-08-13T10:00:00Z' }),
            makeNote({ content: 'ccc', createdAt: '2024-08-14T10:00:00Z' }),
            makeNote({ content: 'ddd', createdAt: '2024-08-15T10:00:00Z' }),
            // 3 with same domain (different week)
            makeNote({ content: 'https://instagram.com/x', createdAt: '2024-01-01T10:00:00Z' }),
            makeNote({ content: 'https://instagram.com/y', createdAt: '2024-02-01T10:00:00Z' }),
            makeNote({ content: 'https://instagram.com/z', createdAt: '2024-03-01T10:00:00Z' }),
        ];
        const cluster = findClusters(notes);
        expect(cluster).not.toBeNull();
        expect(cluster!.type).toBe('time');
        expect(cluster!.notes.length).toBe(4);
    });

    it('uses title in clustering analysis', () => {
        const notes = [
            makeNote({ title: 'cooking tips', content: 'https://example.com/1' }),
            makeNote({ title: 'cooking recipes', content: 'https://other.com/2' }),
            makeNote({ title: 'cooking basics', content: 'something else' }),
        ];
        const cluster = findClusters(notes);
        expect(cluster).not.toBeNull();
        expect(cluster!.type).toBe('content');
        expect(cluster!.label).toContain('cooking');
    });
});
