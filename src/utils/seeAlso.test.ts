import { describe, it, expect } from 'vitest';
import { extractKeywords, extractDomains, isUrlOnlyNote } from './seeAlso';

describe('See Also Utilities', () => {
    describe('extractKeywords', () => {
        it('extracts meaningful words from text', () => {
            const keywords = extractKeywords('Learn JavaScript programming basics');
            expect(keywords).toContain('learn');
            expect(keywords).toContain('javascript');
            expect(keywords).toContain('programming');
            expect(keywords).toContain('basics');
        });

        it('removes stop words', () => {
            const keywords = extractKeywords('The quick brown fox is a great animal');
            expect(keywords).not.toContain('the');
            expect(keywords).not.toContain('is');
            expect(keywords).not.toContain('a');
            expect(keywords).toContain('quick');
            expect(keywords).toContain('brown');
            expect(keywords).toContain('fox');
        });

        it('removes URLs from keyword extraction', () => {
            const keywords = extractKeywords('Check this link https://youtube.com/watch?v=abc123');
            expect(keywords).not.toContain('youtube');
            expect(keywords).not.toContain('https');
            expect(keywords).not.toContain('com');
            expect(keywords).toContain('check');
            expect(keywords).toContain('link');
        });

        it('filters out short words', () => {
            const keywords = extractKeywords('I am so ok at it');
            // All these are either stop words or < 3 chars
            expect(keywords).toHaveLength(0);
        });

        it('deduplicates keywords', () => {
            const keywords = extractKeywords('React is great. React components are great.');
            const reactCount = keywords.filter(k => k === 'react').length;
            expect(reactCount).toBe(1);
        });

        it('returns empty array for URL-only content', () => {
            const keywords = extractKeywords('https://youtube.com/watch?v=abc123');
            expect(keywords).toHaveLength(0);
        });
    });

    describe('extractDomains', () => {
        it('extracts domain from URLs', () => {
            const domains = extractDomains('Check https://youtube.com/watch?v=abc');
            expect(domains).toContain('youtube.com');
        });

        it('extracts multiple domains', () => {
            const domains = extractDomains(
                'YouTube: https://youtube.com/watch Pinterest: https://pinterest.com/pin/123'
            );
            expect(domains).toContain('youtube.com');
            expect(domains).toContain('pinterest.com');
        });

        it('removes www prefix', () => {
            const domains = extractDomains('https://www.example.com/page');
            expect(domains).toContain('example.com');
            expect(domains).not.toContain('www.example.com');
        });

        it('deduplicates domains', () => {
            const domains = extractDomains(
                'https://youtube.com/a https://youtube.com/b'
            );
            expect(domains.filter(d => d === 'youtube.com')).toHaveLength(1);
        });

        it('returns empty for text without URLs', () => {
            const domains = extractDomains('Just some regular text here');
            expect(domains).toHaveLength(0);
        });
    });

    describe('isUrlOnlyNote', () => {
        it('returns true for URL-only content', () => {
            expect(isUrlOnlyNote('https://youtube.com/watch?v=abc123')).toBe(true);
        });

        it('returns true for content with minimal text and URL', () => {
            expect(isUrlOnlyNote('A link: https://example.com')).toBe(true);
        });

        it('returns false for content with meaningful text', () => {
            expect(isUrlOnlyNote('Check this amazing tutorial about React https://youtube.com')).toBe(false);
        });

        it('returns false for text without URLs', () => {
            expect(isUrlOnlyNote('Just regular text without links')).toBe(false);
        });
    });
});
