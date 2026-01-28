import { Note } from '../types';
import { extractUrls, getDomain } from './urlDetector';
import { searchInIndex } from '../search/searchIndex';

// Common English stop words to filter out (no semantic value)
const STOP_WORDS = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought',
    'used', 'it', 'its', 'this', 'that', 'these', 'those', 'i', 'you', 'he',
    'she', 'we', 'they', 'what', 'which', 'who', 'whom', 'whose', 'where',
    'when', 'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more',
    'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
    'same', 'so', 'than', 'too', 'very', 'just', 'also', 'now', 'here',
    'there', 'then', 'once', 'if', 'my', 'your', 'his', 'her', 'our', 'their',
    'am', 'about', 'into', 'through', 'during', 'before', 'after', 'above',
    'below', 'up', 'down', 'out', 'off', 'over', 'under', 'again', 'further',
    'http', 'https', 'www', 'com', 'org', 'net', 'io', 'co', 'html', 'htm'
]);

// Minimum keyword length to consider
const MIN_KEYWORD_LENGTH = 3;

// Minimum useful keywords needed for Tier 1 matching
const MIN_USEFUL_KEYWORDS = 2;

/**
 * Extract meaningful keywords from text
 * Removes URLs, stop words, and short tokens
 */
export function extractKeywords(text: string): string[] {
    // Remove URLs from text first
    const urls = extractUrls(text);
    let cleanText = text;
    for (const url of urls) {
        cleanText = cleanText.replace(url, ' ');
    }

    // Tokenize: lowercase, split on non-alphanumeric
    const tokens = cleanText
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter(token =>
            token.length >= MIN_KEYWORD_LENGTH &&
            !STOP_WORDS.has(token) &&
            !/^\d+$/.test(token) // Exclude pure numbers
        );

    // Deduplicate while preserving order
    return [...new Set(tokens)];
}

/**
 * Extract unique domains from URLs in text
 */
export function extractDomains(text: string): string[] {
    const urls = extractUrls(text);
    const domains = urls
        .map(url => getDomain(url))
        .filter((domain): domain is string => domain !== null);

    return [...new Set(domains)];
}

/**
 * Find related notes using two-tier logic:
 * Tier 1: Semantic keyword matching
 * Tier 2: Platform/domain fallback for URL-only notes
 */
export async function getRelatedNotes(
    note: Note,
    allNotes: Note[],
    limit: number = 3
): Promise<Note[]> {
    const otherNotes = allNotes.filter(n => n.id !== note.id);

    if (otherNotes.length === 0) {
        return [];
    }

    // Combine title and content for analysis
    const fullText = `${note.title || ''} ${note.content}`;

    // Tier 1: Try semantic keyword matching
    const keywords = extractKeywords(fullText);

    if (keywords.length >= MIN_USEFUL_KEYWORDS) {
        // Build a search query from top keywords (limit to prevent overly broad search)
        const searchQuery = keywords.slice(0, 5).join(' ');

        try {
            const matchingIds = await searchInIndex(searchQuery);

            // Filter out current note and get Note objects
            const matches = matchingIds
                .filter(id => id !== note.id)
                .slice(0, limit)
                .map(id => otherNotes.find(n => n.id === id))
                .filter((n): n is Note => n !== undefined);

            if (matches.length > 0) {
                return matches;
            }
        } catch (error) {
            console.warn('See Also search failed:', error);
        }
    }

    // Tier 2: Platform fallback - match by URL domain
    const domains = extractDomains(fullText);

    if (domains.length > 0) {
        // Find other notes that contain URLs from the same domains
        const domainMatches = otherNotes.filter(otherNote => {
            const otherFullText = `${otherNote.title || ''} ${otherNote.content}`;
            const otherDomains = extractDomains(otherFullText);
            return domains.some(domain => otherDomains.includes(domain));
        });

        // Sort by most recent first
        domainMatches.sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        return domainMatches.slice(0, limit);
    }

    // No matches found
    return [];
}

/**
 * Check if a note is URL-only (minimal text content besides URLs)
 */
export function isUrlOnlyNote(text: string): boolean {
    const keywords = extractKeywords(text);
    const urls = extractUrls(text);
    return urls.length > 0 && keywords.length < MIN_USEFUL_KEYWORDS;
}

/**
 * Find similar note IDs for incoming content (Smart Merge Intent)
 * Returns IDs in FlexSearch relevance order (first = best match)
 * 
 * Pure function: returns only IDs, hook maps to Note objects
 */
export async function findSimilarNoteIds(
    text: string,
    excludeId?: number,
    limit: number = 5
): Promise<number[]> {
    const keywords = extractKeywords(text);

    if (keywords.length < 1) {
        // Not enough keywords to search
        return [];
    }

    // Build search query from keywords
    const searchQuery = keywords.slice(0, 5).join(' ');

    try {
        const matchingIds = await searchInIndex(searchQuery);

        // Filter out excluded ID and limit results
        return matchingIds
            .filter(id => id !== excludeId)
            .slice(0, limit);
    } catch (error) {
        console.warn('findSimilarNoteIds search failed:', error);
        return [];
    }
}
