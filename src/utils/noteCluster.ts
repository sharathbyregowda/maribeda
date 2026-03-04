import { Note } from '../types';
import { extractDomains, extractKeywords } from './seeAlso';

export interface NoteCluster {
    type: 'domain' | 'time' | 'content';
    label: string;
    notes: Note[];
}

const MIN_CLUSTER_SIZE = 3;

/**
 * Find clusters among a list of old notes.
 * Returns the best cluster found (largest), or null if none qualify.
 *
 * Strategies tried in order:
 * 1. Domain clustering — notes sharing the same URL domain
 * 2. Time clustering — notes created within the same 7-day window
 * 3. Content clustering — notes sharing common keywords
 */
export function findClusters(notes: Note[]): NoteCluster | null {
    if (notes.length < MIN_CLUSTER_SIZE) return null;

    // Try each strategy, return the best (largest) cluster
    const candidates: NoteCluster[] = [];

    const domainCluster = findDomainClusters(notes);
    if (domainCluster) candidates.push(domainCluster);

    const timeCluster = findTimeClusters(notes);
    if (timeCluster) candidates.push(timeCluster);

    const contentCluster = findContentClusters(notes);
    if (contentCluster) candidates.push(contentCluster);

    if (candidates.length === 0) return null;

    // Return the largest cluster
    candidates.sort((a, b) => b.notes.length - a.notes.length);
    return candidates[0];
}

/**
 * Group notes by URL domain, return the largest group if it meets minimum size.
 */
function findDomainClusters(notes: Note[]): NoteCluster | null {
    const domainMap = new Map<string, Note[]>();

    for (const note of notes) {
        const fullText = `${note.title || ''} ${note.content}`;
        const domains = extractDomains(fullText);
        for (const domain of domains) {
            const existing = domainMap.get(domain) || [];
            existing.push(note);
            domainMap.set(domain, existing);
        }
    }

    // Find the largest domain group
    let best: { domain: string; notes: Note[] } | null = null;
    for (const [domain, grouped] of domainMap) {
        // Deduplicate notes (a note with multiple URLs from same domain appears once)
        const unique = [...new Map(grouped.map(n => [n.id, n])).values()];
        if (unique.length >= MIN_CLUSTER_SIZE && (!best || unique.length > best.notes.length)) {
            best = { domain, notes: unique };
        }
    }

    if (!best) return null;

    return {
        type: 'domain',
        label: `${best.notes.length} notes linking to ${best.domain}`,
        notes: best.notes,
    };
}

/**
 * Group notes by creation week (7-day windows), return the largest group.
 */
function findTimeClusters(notes: Note[]): NoteCluster | null {
    // Bucket notes by week (using start-of-week as key)
    const weekMap = new Map<string, Note[]>();

    for (const note of notes) {
        const date = new Date(note.createdAt);
        // Start of week (Monday)
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        const weekStart = new Date(date);
        weekStart.setDate(diff);
        const weekKey = weekStart.toISOString().split('T')[0];

        const existing = weekMap.get(weekKey) || [];
        existing.push(note);
        weekMap.set(weekKey, existing);
    }

    // Find the largest week group
    let best: { weekKey: string; notes: Note[] } | null = null;
    for (const [weekKey, grouped] of weekMap) {
        if (grouped.length >= MIN_CLUSTER_SIZE && (!best || grouped.length > best.notes.length)) {
            best = { weekKey, notes: grouped };
        }
    }

    if (!best) return null;

    const weekDate = new Date(best.weekKey);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const label = `${best.notes.length} notes from the week of ${monthNames[weekDate.getMonth()]} ${weekDate.getDate()}`;

    return {
        type: 'time',
        label,
        notes: best.notes,
    };
}

/**
 * Group notes by shared keywords, return the largest group.
 */
function findContentClusters(notes: Note[]): NoteCluster | null {
    // Extract keywords per note
    const noteKeywords = notes.map(note => ({
        note,
        keywords: extractKeywords(`${note.title || ''} ${note.content}`),
    }));

    // Count keyword frequency across notes
    const keywordToNotes = new Map<string, Note[]>();
    for (const { note, keywords } of noteKeywords) {
        for (const kw of keywords) {
            const existing = keywordToNotes.get(kw) || [];
            existing.push(note);
            keywordToNotes.set(kw, existing);
        }
    }

    // Find the keyword that groups the most notes
    let best: { keyword: string; notes: Note[] } | null = null;
    for (const [keyword, grouped] of keywordToNotes) {
        const unique = [...new Map(grouped.map(n => [n.id, n])).values()];
        if (unique.length >= MIN_CLUSTER_SIZE && (!best || unique.length > best.notes.length)) {
            best = { keyword, notes: unique };
        }
    }

    if (!best) return null;

    return {
        type: 'content',
        label: `${best.notes.length} notes mentioning "${best.keyword}"`,
        notes: best.notes,
    };
}
