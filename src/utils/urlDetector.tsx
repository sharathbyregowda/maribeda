import React from 'react';

const URL_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;

/**
 * Parse text and convert URLs to clickable links
 */
export function linkifyText(text: string): React.ReactNode[] {
    const parts = text.split(URL_REGEX);

    return parts.map((part, index) => {
        if (URL_REGEX.test(part)) {
            // Reset regex lastIndex
            URL_REGEX.lastIndex = 0;

            const href = part.startsWith('www.') ? `https://${part}` : part;
            return (
                <a
                    key={index}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="note-link"
                    onClick={(e) => e.stopPropagation()}
                >
                    {part}
                </a>
            );
        }
        return part;
    });
}

/**
 * Check if a string contains a URL
 */
export function containsUrl(text: string): boolean {
    URL_REGEX.lastIndex = 0;
    return URL_REGEX.test(text);
}

/**
 * Extract all URLs from text
 */
export function extractUrls(text: string): string[] {
    URL_REGEX.lastIndex = 0;
    return text.match(URL_REGEX) || [];
}
