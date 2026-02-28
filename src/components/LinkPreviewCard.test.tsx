import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LinkPreviewList, LinkPreviewLoading } from './LinkPreviewCard';
import { LinkPreview } from '../types';

function makePreview(overrides: Partial<LinkPreview> & { id: number; noteId: number; url: string }): LinkPreview {
    return {
        title: null,
        description: null,
        siteName: null,
        fetchedAt: '2025-01-01T00:00:00Z',
        ...overrides,
    };
}

describe('LinkPreviewList', () => {
    it('renders nothing when previews array is empty', () => {
        const { container } = render(<LinkPreviewList previews={[]} />);
        expect(container.innerHTML).toBe('');
    });

    it('renders a rich preview card with title and description', () => {
        const previews: LinkPreview[] = [
            makePreview({
                id: 1,
                noteId: 1,
                url: 'https://www.youtube.com/watch?v=abc123',
                title: 'How to Make Sourdough Bread',
                description: 'A step-by-step guide to making sourdough from scratch',
                siteName: 'YouTube',
            }),
        ];

        render(<LinkPreviewList previews={previews} />);

        expect(screen.getByText('How to Make Sourdough Bread')).toBeInTheDocument();
        expect(screen.getByText('A step-by-step guide to making sourdough from scratch')).toBeInTheDocument();
        expect(screen.getByText('YouTube')).toBeInTheDocument();
    });

    it('renders a link card that opens in new tab', () => {
        const previews: LinkPreview[] = [
            makePreview({
                id: 1,
                noteId: 1,
                url: 'https://example.com/article',
                title: 'Test Article',
                siteName: 'Example',
            }),
        ];

        render(<LinkPreviewList previews={previews} />);

        const link = screen.getByRole('link');
        expect(link).toHaveAttribute('href', 'https://example.com/article');
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('renders minimal card for preview without title or description', () => {
        const previews: LinkPreview[] = [
            makePreview({
                id: 1,
                noteId: 1,
                url: 'https://www.instagram.com/reel/abc123',
                siteName: 'instagram.com',
            }),
        ];

        render(<LinkPreviewList previews={previews} />);

        expect(screen.getByText('instagram.com')).toBeInTheDocument();
        // Should have the minimal class
        const link = screen.getByRole('link');
        expect(link.className).toContain('link-preview-card--minimal');
    });

    it('groups previews from the same domain with a header', () => {
        const previews: LinkPreview[] = [
            makePreview({
                id: 1,
                noteId: 1,
                url: 'https://www.youtube.com/watch?v=abc',
                title: 'Video 1',
                siteName: 'YouTube',
            }),
            makePreview({
                id: 2,
                noteId: 1,
                url: 'https://www.youtube.com/watch?v=def',
                title: 'Video 2',
                siteName: 'YouTube',
            }),
        ];

        render(<LinkPreviewList previews={previews} />);

        // Should show a domain group header
        expect(screen.getByText(/youtube\.com/i)).toBeInTheDocument();
        expect(screen.getByText(/2 links/i)).toBeInTheDocument();
        expect(screen.getByText('Video 1')).toBeInTheDocument();
        expect(screen.getByText('Video 2')).toBeInTheDocument();
    });

    it('does not group previews from different domains', () => {
        const previews: LinkPreview[] = [
            makePreview({
                id: 1,
                noteId: 1,
                url: 'https://www.youtube.com/watch?v=abc',
                title: 'YouTube Video',
                siteName: 'YouTube',
            }),
            makePreview({
                id: 2,
                noteId: 1,
                url: 'https://www.instagram.com/reel/def',
                title: 'Instagram Reel',
                siteName: 'Instagram',
            }),
        ];

        render(<LinkPreviewList previews={previews} />);

        // Both titles should be visible, but no domain group header with count
        expect(screen.getByText('YouTube Video')).toBeInTheDocument();
        expect(screen.getByText('Instagram Reel')).toBeInTheDocument();
        expect(screen.queryByText(/links/i)).not.toBeInTheDocument();
    });

    it('renders preview with title but no description', () => {
        const previews: LinkPreview[] = [
            makePreview({
                id: 1,
                noteId: 1,
                url: 'https://github.com/user/repo',
                title: 'user/repo',
                siteName: 'GitHub',
            }),
        ];

        render(<LinkPreviewList previews={previews} />);

        expect(screen.getByText('user/repo')).toBeInTheDocument();
        expect(screen.getByText('GitHub')).toBeInTheDocument();
    });
});

describe('LinkPreviewLoading', () => {
    it('renders loading indicator with text', () => {
        render(<LinkPreviewLoading />);
        expect(screen.getByText('Fetching link previews…')).toBeInTheDocument();
    });

    it('renders three loading dots', () => {
        const { container } = render(<LinkPreviewLoading />);
        const dots = container.querySelectorAll('.link-previews-loading-dot');
        expect(dots).toHaveLength(3);
    });
});
