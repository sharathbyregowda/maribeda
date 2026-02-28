import { Note } from '../types';

export type NoteAge = 'fresh' | 'settling' | 'dormant' | 'forgotten';

/**
 * Calculate the number of days between two dates
 */
function daysBetween(dateStr: string, now: Date): number {
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Determine the aging tier of a note based on:
 * - How old the note is (createdAt)
 * - Whether it has ever been viewed (lastViewedAt)
 * - How recently it was viewed
 * 
 * Viewing or editing a note resets the clock.
 * 
 * Tiers:
 * - fresh: < 7 days old, OR has been viewed/edited recently (within 7 days)
 * - settling: 7–30 days old with no recent activity
 * - dormant: 30–90 days old with no recent activity
 * - forgotten: > 90 days old with no recent activity
 */
export function getNoteAge(note: Note, now: Date = new Date()): NoteAge {
    const daysSinceCreated = daysBetween(note.createdAt, now);

    // Notes less than 7 days old are always fresh
    if (daysSinceCreated < 7) return 'fresh';

    // Check for recent activity: lastViewedAt or updatedAt (editing resets the clock)
    const lastActivity = getLastActivity(note);
    if (lastActivity) {
        const daysSinceActivity = daysBetween(lastActivity, now);
        if (daysSinceActivity < 7) return 'fresh';
    }

    // No recent activity — classify by age
    if (daysSinceCreated < 30) return 'settling';
    if (daysSinceCreated < 90) return 'dormant';
    return 'forgotten';
}

/**
 * Get the most recent activity date for a note
 * (latest of lastViewedAt and updatedAt, if different from createdAt)
 */
function getLastActivity(note: Note): string | null {
    const candidates: string[] = [];

    if (note.lastViewedAt) {
        candidates.push(note.lastViewedAt);
    }

    // updatedAt counts as activity only if different from createdAt
    // (i.e., the note was actually edited after creation)
    if (note.updatedAt && note.updatedAt !== note.createdAt) {
        candidates.push(note.updatedAt);
    }

    if (candidates.length === 0) return null;

    // Return the most recent activity
    return candidates.sort().reverse()[0];
}

/**
 * Generate a human-readable aging label for a note
 * Returns null for fresh notes (no label needed)
 */
export function getAgingLabel(note: Note, now: Date = new Date()): string | null {
    const age = getNoteAge(note, now);
    const daysSinceCreated = daysBetween(note.createdAt, now);

    switch (age) {
        case 'fresh':
            return null;

        case 'settling': {
            const weeks = Math.floor(daysSinceCreated / 7);
            const timeLabel = weeks === 1 ? '1 week' : `${weeks} weeks`;
            return `💤 Saved ${timeLabel} ago · never opened`;
        }

        case 'dormant': {
            const months = Math.floor(daysSinceCreated / 30);
            const timeLabel = months === 1 ? '1 month' : `${months} months`;
            return `💤 Saved ${timeLabel} ago · never opened`;
        }

        case 'forgotten': {
            const months = Math.floor(daysSinceCreated / 30);
            const timeLabel = months === 1 ? '1 month' : `${months} months`;
            return `🕸️ Saved ${timeLabel} ago · never opened`;
        }
    }
}
