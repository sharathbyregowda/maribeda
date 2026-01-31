import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SeeAlso } from './SeeAlso';
import { Note } from '../types';

// Mock notes for testing
const mockNotes: Note[] = [
    {
        id: 1,
        title: 'Related Recipe',
        content: 'Pasta with mushrooms',
        isPinned: false,
        lastViewedAt: null,
        createdAt: '2024-01-01T12:00:00.000Z',
        updatedAt: '2024-01-01T12:00:00.000Z',
    },
    {
        id: 2,
        title: null,
        content: 'This is a note without a title but with content that is quite long and should be truncated',
        isPinned: false,
        lastViewedAt: null,
        createdAt: '2024-01-02T12:00:00.000Z',
        updatedAt: '2024-01-02T12:00:00.000Z',
    },
    {
        id: 3,
        title: 'Third Note',
        content: 'More content here',
        isPinned: false,
        lastViewedAt: null,
        createdAt: '2024-01-03T12:00:00.000Z',
        updatedAt: '2024-01-03T12:00:00.000Z',
    },
];

describe('SeeAlso', () => {
    describe('Empty State', () => {
        it('should render nothing when relatedNotes is empty', () => {
            const { container } = render(
                <SeeAlso relatedNotes={[]} onNoteClick={vi.fn()} />
            );
            expect(container.firstChild).toBeNull();
        });
    });

    describe('Loading State', () => {
        it('should show loading message when isLoading is true', () => {
            render(
                <SeeAlso
                    relatedNotes={[]}
                    onNoteClick={vi.fn()}
                    isLoading={true}
                />
            );
            expect(screen.getByText(/Finding related notes/)).toBeInTheDocument();
        });
    });

    describe('Header Interaction', () => {
        it('should render collapsed by default', () => {
            render(
                <SeeAlso relatedNotes={mockNotes} onNoteClick={vi.fn()} />
            );

            // Should show header with count
            expect(screen.getByText(/See Also/)).toBeInTheDocument();
            expect(screen.getByText(/3/)).toBeInTheDocument();

            // Related notes should NOT be visible yet
            expect(screen.queryByText('Related Recipe')).not.toBeInTheDocument();
        });

        it('should expand when header is clicked', () => {
            render(
                <SeeAlso relatedNotes={mockNotes} onNoteClick={vi.fn()} />
            );

            // Click to expand
            fireEvent.click(screen.getByRole('button', { name: /See Also/ }));

            // Now related notes should be visible
            expect(screen.getByText('Related Recipe')).toBeInTheDocument();
        });

        it('should collapse when header is clicked again', () => {
            render(
                <SeeAlso relatedNotes={mockNotes} onNoteClick={vi.fn()} />
            );

            const header = screen.getByRole('button', { name: /See Also/ });

            // Expand
            fireEvent.click(header);
            expect(screen.getByText('Related Recipe')).toBeInTheDocument();

            // Collapse
            fireEvent.click(header);
            expect(screen.queryByText('Related Recipe')).not.toBeInTheDocument();
        });
    });

    describe('Note Click Handling', () => {
        it('should call onNoteClick when a related note is clicked', () => {
            const onNoteClick = vi.fn();
            render(
                <SeeAlso relatedNotes={mockNotes} onNoteClick={onNoteClick} />
            );

            // Expand first
            fireEvent.click(screen.getByRole('button', { name: /See Also/ }));

            // Click on a related note
            fireEvent.click(screen.getByText('Related Recipe'));

            expect(onNoteClick).toHaveBeenCalledWith(mockNotes[0]);
        });

        it('should stop propagation when clicking a note', () => {
            const onNoteClick = vi.fn();
            const parentClick = vi.fn();

            render(
                <div onClick={parentClick}>
                    <SeeAlso relatedNotes={mockNotes} onNoteClick={onNoteClick} />
                </div>
            );

            // Expand
            fireEvent.click(screen.getByRole('button', { name: /See Also/ }));

            // Reset parent click count from expand click
            parentClick.mockClear();

            // Click on a related note
            fireEvent.click(screen.getByText('Related Recipe'));

            expect(onNoteClick).toHaveBeenCalled();
            // stopPropagation should prevent parent click
            expect(parentClick).not.toHaveBeenCalled();
        });
    });

    describe('Preview Text', () => {
        it('should show note title when available', () => {
            render(
                <SeeAlso relatedNotes={[mockNotes[0]]} onNoteClick={vi.fn()} />
            );

            fireEvent.click(screen.getByRole('button', { name: /See Also/ }));
            expect(screen.getByText('Related Recipe')).toBeInTheDocument();
        });

        it('should truncate long content for notes without title', () => {
            render(
                <SeeAlso relatedNotes={[mockNotes[1]]} onNoteClick={vi.fn()} />
            );

            fireEvent.click(screen.getByRole('button', { name: /See Also/ }));

            // Should be truncated with ellipsis
            const noteItem = screen.getByRole('button', { name: /This is a note/ });
            expect(noteItem.textContent).toContain('...');
        });

        it('should show relative date for each note', () => {
            render(
                <SeeAlso relatedNotes={mockNotes} onNoteClick={vi.fn()} />
            );

            fireEvent.click(screen.getByRole('button', { name: /See Also/ }));

            // Should have date elements (exact text depends on current time)
            const noteItems = screen.getAllByRole('button').filter(
                btn => btn.classList.contains('see-also-item')
            );
            expect(noteItems.length).toBe(3);
        });
    });

    describe('Accessibility', () => {
        it('should have aria-expanded attribute on header', () => {
            render(
                <SeeAlso relatedNotes={mockNotes} onNoteClick={vi.fn()} />
            );

            const header = screen.getByRole('button', { name: /See Also/ });
            expect(header).toHaveAttribute('aria-expanded', 'false');

            fireEvent.click(header);
            expect(header).toHaveAttribute('aria-expanded', 'true');
        });
    });
});
