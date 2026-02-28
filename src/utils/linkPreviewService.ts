/**
 * Link Preview Service
 * 
 * Fetches Open Graph metadata for URLs via the OG proxy endpoint,
 * and manages caching in the local SQLite database.
 */

import { LinkPreview } from '../types';
import {
    saveLinkPreviews,
    getLinkPreviewsForNotes,
    deleteLinkPreviewsForNote,
} from '../db/database';
import { extractUrls, getDomain } from './urlDetector';

// Proxy endpoint — relative URL works in both dev and production on Vercel
const OG_PROXY_URL = '/api/og-proxy';

interface OGResponse {
    url: string;
    title: string | null;
    description: string | null;
    siteName: string | null;
    error?: string;
}

/**
 * Fetch OG metadata for a single URL via the proxy
 * Returns null on failure (graceful degradation)
 */
async function fetchOGMetadata(url: string): Promise<OGResponse | null> {
    try {
        const response = await fetch(
            `${OG_PROXY_URL}?url=${encodeURIComponent(url)}`,
            { signal: AbortSignal.timeout(8000) }
        );

        if (!response.ok) return null;

        const data: OGResponse = await response.json();
        if (data.error) return null;

        return data;
    } catch {
        // Network error, timeout, etc. — fail silently
        return null;
    }
}

/**
 * Fetch and store link previews for a note
 * 
 * Extracts URLs from the note content, fetches OG metadata for each,
 * and stores the results in the database.
 * 
 * @param noteId - The ID of the note
 * @param content - The note content text
 * @returns Array of saved LinkPreviews (may be empty on failure)
 */
export async function fetchAndSaveLinkPreviews(
    noteId: number,
    content: string
): Promise<LinkPreview[]> {
    const urls = extractUrls(content);
    if (urls.length === 0) return [];

    // Limit to first 5 URLs to avoid excessive requests
    const urlsToFetch = urls.slice(0, 5);

    // Fetch all URLs in parallel
    const results = await Promise.all(
        urlsToFetch.map(url => fetchOGMetadata(url))
    );

    // Filter successful results and build preview data
    const previews: Array<{
        url: string;
        title: string | null;
        description: string | null;
        siteName: string | null;
    }> = [];

    for (let i = 0; i < urlsToFetch.length; i++) {
        const result = results[i];
        const url = urlsToFetch[i];

        if (result && (result.title || result.description || result.siteName)) {
            previews.push({
                url,
                title: result.title,
                description: result.description,
                siteName: result.siteName,
            });
        } else {
            // Even if OG fetch fails, store a preview with the domain as siteName
            // so we at least show a domain badge
            const domain = getDomain(url);
            if (domain) {
                previews.push({
                    url,
                    title: null,
                    description: null,
                    siteName: domain,
                });
            }
        }
    }

    if (previews.length === 0) return [];

    // Save to database
    return saveLinkPreviews(noteId, previews);
}

/**
 * Load all link previews for a set of notes (batch)
 */
export function loadLinkPreviewsForNotes(noteIds: number[]): Map<number, LinkPreview[]> {
    return getLinkPreviewsForNotes(noteIds);
}

/**
 * Remove all link previews for a note
 */
export function removeLinkPreviewsForNote(noteId: number): void {
    deleteLinkPreviewsForNote(noteId);
}

/**
 * Check if note content contains any URLs worth previewing
 */
export function hasPreviewableUrls(content: string): boolean {
    return extractUrls(content).length > 0;
}
