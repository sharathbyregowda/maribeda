import React from 'react';

export interface SnippetResult {
    /** The extracted snippet with ellipses if truncated */
    snippet: string;
    /** Total number of matches found in the content */
    matchCount: number;
    /** Index position of the first match */
    matchIndex: number;
}

/**
 * Extracts a contextual snippet around the first match of a query in content.
 * Returns the snippet with surrounding context and total match count.
 * URLs within the snippet are preserved in full (not truncated).
 * 
 * @param content - The full text content to search in
 * @param query - The search term to find
 * @param contextChars - Number of characters to include before/after match (default: 40)
 * @returns SnippetResult with snippet, matchCount, and matchIndex
 */
export function extractSnippet(
    content: string,
    query: string,
    contextChars: number = 40
): SnippetResult {
    if (!query.trim()) {
        return { snippet: content, matchCount: 0, matchIndex: -1 };
    }

    const lowerContent = content.toLowerCase();
    const lowerQuery = query.toLowerCase().trim();

    // Find first match position
    const matchIndex = lowerContent.indexOf(lowerQuery);

    if (matchIndex === -1) {
        return { snippet: content, matchCount: 0, matchIndex: -1 };
    }

    // Count total matches
    let matchCount = 0;
    let searchPos = 0;
    while (searchPos < lowerContent.length) {
        const pos = lowerContent.indexOf(lowerQuery, searchPos);
        if (pos === -1) break;
        matchCount++;
        searchPos = pos + 1;
    }

    // Calculate initial snippet boundaries
    let start = Math.max(0, matchIndex - contextChars);
    let end = Math.min(content.length, matchIndex + lowerQuery.length + contextChars);

    // IMPORTANT: Don't cross newlines going backwards - stay on the same line as the match
    // Find the last newline before the match
    const lastNewlineBeforeMatch = content.lastIndexOf('\n', matchIndex);
    let adjustedToLineBoundary = false;
    if (lastNewlineBeforeMatch >= 0 && lastNewlineBeforeMatch >= start) {
        // There's a newline between our calculated start and the match
        // Start from just after the newline to stay on the match's line
        start = lastNewlineBeforeMatch + 1;
        adjustedToLineBoundary = true;
    }

    // URL regex to find URLs in content
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;

    // Find URLs that START within our snippet and extend END boundary to include full URLs
    // We do NOT extend START backwards - that would pull in unrelated URLs before the match
    let match;
    while ((match = urlRegex.exec(content)) !== null) {
        const urlStart = match.index;
        const urlEnd = match.index + match[0].length;

        // Only extend if URL STARTS within our snippet (not before it)
        // This ensures we only include URLs that are contextually relevant to the match
        if (urlStart >= start && urlStart < end && urlEnd > end) {
            // URL starts in snippet but extends beyond - include the full URL
            end = urlEnd;
        }
    }

    // Extract snippet with extended boundaries
    let snippet = content.substring(start, end);

    // Add ellipses if truncated at the start
    // BUT: skip word-boundary trimming if we already adjusted to a line boundary (we're at a clean start)
    if (start > 0) {
        if (!adjustedToLineBoundary) {
            // Only do word boundary trimming if we didn't adjust to a line boundary
            const spaceIndex = snippet.indexOf(' ');
            const firstWord = snippet.substring(0, spaceIndex > 0 ? spaceIndex : snippet.length);
            const firstWordIsUrl = firstWord.includes('http://') || firstWord.includes('https://') || firstWord.startsWith('www.');
            if (spaceIndex > 0 && spaceIndex < 15 && !firstWordIsUrl) {
                snippet = snippet.substring(spaceIndex + 1);
            }
        }
        snippet = '...' + snippet;
    }
    if (end < content.length) {
        // Find a word boundary to end at (but not if it would cut a URL)
        const lastSpaceIndex = snippet.lastIndexOf(' ');
        if (lastSpaceIndex > 0) {
            const lastWord = snippet.substring(lastSpaceIndex + 1);
            const lastWordIsUrl = lastWord.includes('http://') || lastWord.includes('https://') || lastWord.startsWith('www.');
            // Only trim if it's not a URL and it's near the end
            if (!lastWordIsUrl && lastSpaceIndex > snippet.length - 15) {
                snippet = snippet.substring(0, lastSpaceIndex);
            }
        }
        snippet = snippet + '...';
    }

    return { snippet, matchCount, matchIndex };
}

/**
 * Highlights all occurrences of query in text by wrapping them in <mark> tags.
 * Case-insensitive matching, preserves original casing.
 * 
 * @param text - The text to highlight
 * @param query - The search term to highlight
 * @returns Array of React nodes with highlighted matches
 */
export function highlightMatches(
    text: string,
    query: string
): React.ReactNode[] {
    if (!query.trim()) {
        return [text];
    }

    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase().trim();
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    let searchPos = 0;
    while (searchPos < lowerText.length) {
        const matchIndex = lowerText.indexOf(lowerQuery, searchPos);
        if (matchIndex === -1) break;

        // Add text before match
        if (matchIndex > lastIndex) {
            parts.push(text.substring(lastIndex, matchIndex));
        }

        // Add highlighted match (preserving original case)
        parts.push(
            <mark key={matchIndex} className="search-highlight">
                {text.substring(matchIndex, matchIndex + lowerQuery.length)}
            </mark>
        );

        lastIndex = matchIndex + lowerQuery.length;
        searchPos = lastIndex;
    }

    // Add remaining text
    if (lastIndex < text.length) {
        parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : [text];
}

const URL_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;

/**
 * Clean a URL by removing trailing punctuation that may have been captured
 */
function cleanUrl(url: string): string {
    // Remove trailing ellipsis, periods, commas, etc. that may be captured from snippets
    return url.replace(/\.{2,}$/, '').replace(/[.,;:!?)]+$/, '');
}

/**
 * Combines URL linkification and search term highlighting.
 * URLs are made clickable, and search terms are highlighted even within URLs.
 * 
 * @param text - The text to process
 * @param query - The search term to highlight
 * @returns Array of React nodes with links and highlights
 */
export function linkifyAndHighlight(
    text: string,
    query: string
): React.ReactNode[] {
    if (!text) return [];

    // First, split by URLs
    const urlParts = text.split(URL_REGEX);
    const result: React.ReactNode[] = [];
    let keyCounter = 0;

    urlParts.forEach((part, index) => {
        if (!part) return;

        URL_REGEX.lastIndex = 0;
        if (URL_REGEX.test(part)) {
            URL_REGEX.lastIndex = 0;

            // Clean the URL for href (remove trailing punctuation)
            const cleanedUrl = cleanUrl(part);
            const href = cleanedUrl.startsWith('www.') ? `https://${cleanedUrl}` : cleanedUrl;

            // Highlight the query within the URL text
            const highlightedContent = query?.trim()
                ? highlightMatches(part, query)
                : [part];

            result.push(
                <a
                    key={`url-${keyCounter++}`}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="note-link"
                    onClick={(e) => e.stopPropagation()}
                >
                    {highlightedContent}
                </a>
            );
        } else {
            // Regular text - just highlight matches
            if (query?.trim()) {
                const highlighted = highlightMatches(part, query);
                highlighted.forEach((node, i) => {
                    if (typeof node === 'string') {
                        result.push(<React.Fragment key={`text-${keyCounter++}`}>{node}</React.Fragment>);
                    } else {
                        result.push(React.cloneElement(node as React.ReactElement, { key: `mark-${keyCounter++}` }));
                    }
                });
            } else {
                result.push(<React.Fragment key={`text-${keyCounter++}`}>{part}</React.Fragment>);
            }
        }
    });

    return result;
}
