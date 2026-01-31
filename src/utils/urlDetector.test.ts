import { describe, it, expect } from 'vitest';
import { containsUrl, extractUrls, getDomain } from './urlDetector';

describe('urlDetector', () => {
    describe('containsUrl', () => {
        it('should detect https URLs', () => {
            expect(containsUrl('Check out https://example.com for details')).toBe(true);
        });

        it('should detect http URLs', () => {
            expect(containsUrl('Visit http://example.com today')).toBe(true);
        });

        it('should detect www URLs', () => {
            expect(containsUrl('Go to www.example.com')).toBe(true);
        });

        it('should return false for plain text', () => {
            expect(containsUrl('This is just plain text')).toBe(false);
        });

        it('should return false for email addresses', () => {
            expect(containsUrl('Contact me at user@example.com')).toBe(false);
        });

        it('should handle multiple URLs', () => {
            expect(containsUrl('Visit https://a.com and https://b.com')).toBe(true);
        });
    });

    describe('extractUrls', () => {
        it('should extract single https URL', () => {
            const urls = extractUrls('Check https://example.com/path');
            expect(urls).toEqual(['https://example.com/path']);
        });

        it('should extract multiple URLs', () => {
            const urls = extractUrls('Visit https://a.com and https://b.com/page');
            expect(urls).toHaveLength(2);
            expect(urls).toContain('https://a.com');
            expect(urls).toContain('https://b.com/page');
        });

        it('should extract www URLs', () => {
            const urls = extractUrls('Go to www.example.com now');
            expect(urls).toEqual(['www.example.com']);
        });

        it('should return empty array for no URLs', () => {
            const urls = extractUrls('No links here');
            expect(urls).toEqual([]);
        });

        it('should handle YouTube URLs with query params', () => {
            const urls = extractUrls('Watch https://www.youtube.com/watch?v=abc123');
            expect(urls[0]).toContain('youtube.com');
            expect(urls[0]).toContain('v=abc123');
        });

        it('should handle URLs with hash fragments', () => {
            const urls = extractUrls('See https://example.com/page#section');
            expect(urls[0]).toContain('#section');
        });
    });

    describe('getDomain', () => {
        it('should extract domain from https URL', () => {
            expect(getDomain('https://example.com/path')).toBe('example.com');
        });

        it('should extract domain from http URL', () => {
            expect(getDomain('http://example.com')).toBe('example.com');
        });

        it('should remove www prefix', () => {
            expect(getDomain('https://www.youtube.com/watch?v=abc')).toBe('youtube.com');
        });

        it('should handle www URLs without protocol', () => {
            expect(getDomain('www.example.com')).toBe('example.com');
        });

        it('should handle subdomains', () => {
            expect(getDomain('https://blog.example.com')).toBe('blog.example.com');
        });

        it('should return null for invalid URLs', () => {
            expect(getDomain('not a url')).toBe(null);
        });

        it('should return null for empty string', () => {
            expect(getDomain('')).toBe(null);
        });

        it('should handle complex URLs', () => {
            expect(getDomain('https://www.reddit.com/r/programming/comments/abc')).toBe('reddit.com');
        });
    });
});
