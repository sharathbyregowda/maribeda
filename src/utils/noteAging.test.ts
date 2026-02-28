import { describe, it, expect } from 'vitest';
import { getNoteAge, getAgingLabel } from './noteAging';
import { Note } from '../types';

function makeNote(overrides: Partial<Note> = {}): Note {
    const now = new Date();
    return {
        id: 1,
        title: null,
        content: 'Test note',
        isPinned: false,
        lastViewedAt: null,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        ...overrides,
    };
}

// Use a fixed "now" at noon to avoid time-of-day rounding issues
const NOW = new Date();
NOW.setHours(12, 0, 0, 0);

function daysAgo(days: number): string {
    const d = new Date(NOW);
    d.setDate(d.getDate() - days);
    return d.toISOString();
}

describe('getNoteAge', () => {
    it('returns "fresh" for notes less than 7 days old', () => {
        expect(getNoteAge(makeNote({ createdAt: daysAgo(0) }), NOW)).toBe('fresh');
        expect(getNoteAge(makeNote({ createdAt: daysAgo(3) }), NOW)).toBe('fresh');
        expect(getNoteAge(makeNote({ createdAt: daysAgo(6) }), NOW)).toBe('fresh');
    });

    it('returns "settling" for notes 7-29 days old with no activity', () => {
        const note = makeNote({
            createdAt: daysAgo(7),
            updatedAt: daysAgo(7),
        });
        expect(getNoteAge(note, NOW)).toBe('settling');

        const note14 = makeNote({
            createdAt: daysAgo(14),
            updatedAt: daysAgo(14),
        });
        expect(getNoteAge(note14, NOW)).toBe('settling');

        const note29 = makeNote({
            createdAt: daysAgo(29),
            updatedAt: daysAgo(29),
        });
        expect(getNoteAge(note29, NOW)).toBe('settling');
    });

    it('returns "dormant" for notes 30-89 days old with no activity', () => {
        const note30 = makeNote({
            createdAt: daysAgo(30),
            updatedAt: daysAgo(30),
        });
        expect(getNoteAge(note30, NOW)).toBe('dormant');

        const note60 = makeNote({
            createdAt: daysAgo(65),
            updatedAt: daysAgo(65),
        });
        expect(getNoteAge(note60, NOW)).toBe('dormant');

        const note89 = makeNote({
            createdAt: daysAgo(89),
            updatedAt: daysAgo(89),
        });
        expect(getNoteAge(note89, NOW)).toBe('dormant');
    });

    it('returns "forgotten" for notes 90+ days old with no activity', () => {
        const note90 = makeNote({
            createdAt: daysAgo(90),
            updatedAt: daysAgo(90),
        });
        expect(getNoteAge(note90, NOW)).toBe('forgotten');

        const note365 = makeNote({
            createdAt: daysAgo(365),
            updatedAt: daysAgo(365),
        });
        expect(getNoteAge(note365, NOW)).toBe('forgotten');
    });

    it('returns "fresh" if note was viewed recently, regardless of age', () => {
        const note = makeNote({
            createdAt: daysAgo(200),
            updatedAt: daysAgo(200),
            lastViewedAt: daysAgo(2),
        });
        expect(getNoteAge(note, NOW)).toBe('fresh');
    });

    it('returns "fresh" if note was edited recently, regardless of age', () => {
        const note = makeNote({
            createdAt: daysAgo(120),
            updatedAt: daysAgo(3),
        });
        expect(getNoteAge(note, NOW)).toBe('fresh');
    });

    it('does NOT treat updatedAt == createdAt as activity', () => {
        const created = daysAgo(45);
        const note = makeNote({
            createdAt: created,
            updatedAt: created,
        });
        expect(getNoteAge(note, NOW)).toBe('dormant');
    });

    it('uses the most recent activity when both lastViewedAt and updatedAt exist', () => {
        // Old view, recent edit → fresh
        const note1 = makeNote({
            createdAt: daysAgo(100),
            updatedAt: daysAgo(2),
            lastViewedAt: daysAgo(50),
        });
        expect(getNoteAge(note1, NOW)).toBe('fresh');

        // Recent view, old edit → fresh
        const note2 = makeNote({
            createdAt: daysAgo(100),
            updatedAt: daysAgo(100),
            lastViewedAt: daysAgo(1),
        });
        expect(getNoteAge(note2, NOW)).toBe('fresh');
    });

    it('classifies correctly when activity is old but present', () => {
        // Viewed 50 days ago, created 100 days ago → still forgotten
        const note = makeNote({
            createdAt: daysAgo(100),
            updatedAt: daysAgo(100),
            lastViewedAt: daysAgo(50),
        });
        expect(getNoteAge(note, NOW)).toBe('forgotten');
    });

    it('pinned notes age the same as unpinned', () => {
        const note = makeNote({
            createdAt: daysAgo(60),
            updatedAt: daysAgo(60),
            isPinned: true,
        });
        expect(getNoteAge(note, NOW)).toBe('dormant');
    });
});

describe('getAgingLabel', () => {
    it('returns null for fresh notes', () => {
        expect(getAgingLabel(makeNote({ createdAt: daysAgo(3) }), NOW)).toBeNull();
    });

    it('returns label for settling notes', () => {
        const note = makeNote({
            createdAt: daysAgo(14),
            updatedAt: daysAgo(14),
        });
        const label = getAgingLabel(note, NOW);
        expect(label).toContain('💤');
        expect(label).toContain('never opened');
    });

    it('returns label for 7-13 day old notes', () => {
        const note = makeNote({
            createdAt: daysAgo(10),
            updatedAt: daysAgo(10),
        });
        const label = getAgingLabel(note, NOW);
        expect(label).toContain('never opened');
    });

    it('returns label for dormant notes', () => {
        const note = makeNote({
            createdAt: daysAgo(65),
            updatedAt: daysAgo(65),
        });
        const label = getAgingLabel(note, NOW);
        expect(label).toContain('💤');
        expect(label).toContain('never opened');
    });

    it('returns cobweb emoji for forgotten notes', () => {
        const note = makeNote({
            createdAt: daysAgo(180),
            updatedAt: daysAgo(180),
        });
        const label = getAgingLabel(note, NOW);
        expect(label).toContain('🕸️');
        expect(label).toContain('never opened');
    });

    it('returns null for old note that was recently viewed', () => {
        const note = makeNote({
            createdAt: daysAgo(180),
            updatedAt: daysAgo(180),
            lastViewedAt: daysAgo(1),
        });
        expect(getAgingLabel(note, NOW)).toBeNull();
    });
});
