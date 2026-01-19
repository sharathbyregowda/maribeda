import { describe, it, expect } from 'vitest';
import { extractSnippet } from './snippetExtractor';

describe('extractSnippet', () => {
    describe('Basic functionality', () => {
        it('returns full content when no query provided', () => {
            const content = 'Hello world';
            const result = extractSnippet(content, '');
            expect(result.snippet).toBe(content);
            expect(result.matchCount).toBe(0);
        });

        it('returns full content when query not found', () => {
            const content = 'Hello world';
            const result = extractSnippet(content, 'xyz');
            expect(result.snippet).toBe(content);
            expect(result.matchCount).toBe(0);
        });

        it('finds match and counts occurrences', () => {
            const content = 'test one test two test three';
            const result = extractSnippet(content, 'test');
            expect(result.matchCount).toBe(3);
            expect(result.matchIndex).toBe(0);
        });

        it('is case-insensitive', () => {
            const content = 'Hello World';
            const result = extractSnippet(content, 'hello');
            expect(result.matchCount).toBe(1);
            expect(result.snippet).toContain('Hello');
        });
    });

    describe('Snippet boundaries', () => {
        it('includes context around match', () => {
            const content = 'The quick brown fox jumps over the lazy dog';
            const result = extractSnippet(content, 'fox', 10);
            expect(result.snippet).toContain('fox');
            expect(result.snippet).toContain('brown');
        });

        it('adds ellipsis when truncated at start', () => {
            const content = 'Very long prefix text before the match keyword in the middle of the sentence';
            const result = extractSnippet(content, 'match', 10);
            expect(result.snippet.startsWith('...')).toBe(true);
        });

        it('adds ellipsis when truncated at end', () => {
            const content = 'The match keyword with very long suffix text after';
            const result = extractSnippet(content, 'match', 10);
            expect(result.snippet.endsWith('...')).toBe(true);
        });

        it('no ellipsis when match is at start of content', () => {
            const content = 'Match at the very beginning of text';
            const result = extractSnippet(content, 'Match', 5);
            expect(result.snippet.startsWith('...')).toBe(false);
            expect(result.snippet.startsWith('Match')).toBe(true);
        });
    });

    describe('Newline handling', () => {
        it('does not cross newlines going backwards', () => {
            const content = 'First line with some text\nSecond line starts here';
            const result = extractSnippet(content, 'Second', 40);
            // Should NOT include "text" from the first line
            expect(result.snippet).not.toContain('some text');
            expect(result.snippet).toContain('Second');
        });

        it('preserves first word when match is at start of new line', () => {
            const content = 'Previous line\nbroken ankle - http://example.com';
            const result = extractSnippet(content, 'broken', 40);
            // The word "broken" should not be trimmed
            expect(result.snippet).toContain('broken');
            // Should show ellipsis since it's not at content start
            expect(result.snippet.startsWith('...')).toBe(true);
        });

        it('handles match on line after empty line', () => {
            const content = 'First line\n\nThird line with match';
            const result = extractSnippet(content, 'Third', 40);
            expect(result.snippet).toContain('Third');
            expect(result.snippet).not.toContain('First');
        });

        it('stays on same line when match is at line start', () => {
            const content = 'URL1 - http://example.com/first\nMatch here with URL - http://example.com/second';
            const result = extractSnippet(content, 'Match', 30);
            // Should not include the first URL
            expect(result.snippet).not.toContain('first');
            expect(result.snippet).toContain('Match');
        });
    });

    describe('URL handling', () => {
        it('extends snippet to include full URL after match', () => {
            const content = 'Article - http://example.com/very/long/path/article';
            const result = extractSnippet(content, 'Article', 10);
            // Should extend to include the full URL
            expect(result.snippet).toContain('http://example.com/very/long/path/article');
        });

        it('does not extend backwards to include URL before match', () => {
            const content = 'http://previous.com/path\nMatch here';
            const result = extractSnippet(content, 'Match', 20);
            // Should NOT include the previous URL
            expect(result.snippet).not.toContain('previous.com');
            expect(result.snippet).toContain('Match');
        });

        it('preserves URL that starts within snippet', () => {
            const content = 'Some text with link https://www.bbc.co.uk/sport/football more text';
            const result = extractSnippet(content, 'link', 15);
            // Should extend to include the full URL since it starts in snippet
            expect(result.snippet).toContain('https://www.bbc.co.uk/sport/football');
        });

        it('does not cut partial URLs at word boundary', () => {
            const content = 'Check https://example.com for info';
            const result = extractSnippet(content, 'Check', 20);
            // URL should not be cut at a space that doesn't exist
            expect(result.snippet).toContain('https://');
        });
    });

    describe('Complex scenarios', () => {
        it('handles multi-line content with URLs correctly', () => {
            const content = `First article - https://example.com/first
broken ankle - https://example.com/second
Third article`;
            const result = extractSnippet(content, 'broken', 50);
            // Should show "broken" line with its URL
            expect(result.snippet).toContain('broken');
            expect(result.snippet).toContain('second');
            // Should NOT include the first URL
            expect(result.snippet).not.toContain('first');
        });

        it('handles search for partial word at line start', () => {
            const content = `Line one here
Partial word test`;
            const result = extractSnippet(content, 'Par', 20);
            expect(result.snippet).toContain('Partial');
            expect(result.snippet).not.toContain('one');
        });

        it('handles long URLs that extend beyond context', () => {
            const content = 'Title - https://www.bbc.co.uk/sport/football/articles/czjgp2x072po';
            const result = extractSnippet(content, 'Title', 20);
            // URL should be fully included
            expect(result.snippet).toContain('czjgp2x072po');
        });
    });
});
