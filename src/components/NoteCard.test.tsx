import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NoteCard } from './NoteCard';
import { Note } from '../types';

// Mock note for testing
const mockNote: Note = {
    id: 1,
    title: 'Test Note Title',
    content: 'This is the note content with some text.',
    isPinned: false,
    lastViewedAt: null,
    createdAt: '2024-01-15T12:00:00.000Z',
    updatedAt: '2024-01-15T12:00:00.000Z',
};

const mockPinnedNote: Note = {
    ...mockNote,
    id: 2,
    isPinned: true,
};

const mockNoteWithUrl: Note = {
    ...mockNote,
    id: 3,
    content: 'Check out https://example.com for more info',
};

const mockNoteWithSearchMatch: Note = {
    ...mockNote,
    id: 4,
    content: 'This is about programming and JavaScript programming tutorials',
};

describe('NoteCard', () => {
    const defaultProps = {
        note: mockNote,
        onEdit: vi.fn(),
        onDelete: vi.fn(),
        onTogglePin: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Basic Rendering', () => {
        it('should render note title', () => {
            render(<NoteCard {...defaultProps} />);
            expect(screen.getByText('Test Note Title')).toBeInTheDocument();
        });

        it('should render note content', () => {
            render(<NoteCard {...defaultProps} />);
            expect(screen.getByText(/This is the note content/)).toBeInTheDocument();
        });

        it('should render relative time', () => {
            render(<NoteCard {...defaultProps} />);
            // Should have a time element
            expect(screen.getByRole('time')).toBeInTheDocument();
        });

        it('should render edit button', () => {
            render(<NoteCard {...defaultProps} />);
            expect(screen.getByText('Edit')).toBeInTheDocument();
        });

        it('should render delete button', () => {
            render(<NoteCard {...defaultProps} />);
            expect(screen.getByText('Delete')).toBeInTheDocument();
        });
    });

    describe('Pin Functionality', () => {
        it('should call onTogglePin when pin button is clicked', () => {
            const onTogglePin = vi.fn();
            render(<NoteCard {...defaultProps} onTogglePin={onTogglePin} />);

            const pinButton = screen.getByRole('button', { name: /pin note/i });
            fireEvent.click(pinButton);

            expect(onTogglePin).toHaveBeenCalledWith(mockNote.id);
        });

        it('should show pinned styling when note is pinned', () => {
            render(<NoteCard {...defaultProps} note={mockPinnedNote} />);

            const card = document.querySelector('.note-card');
            expect(card).toHaveClass('is-pinned');
        });

        it('should have unpin label when already pinned', () => {
            render(<NoteCard {...defaultProps} note={mockPinnedNote} />);

            expect(screen.getByRole('button', { name: /unpin note/i })).toBeInTheDocument();
        });
    });

    describe('Edit Functionality', () => {
        it('should call onEdit when edit button is clicked', () => {
            const onEdit = vi.fn();
            render(<NoteCard {...defaultProps} onEdit={onEdit} />);

            fireEvent.click(screen.getByText('Edit'));

            expect(onEdit).toHaveBeenCalledWith(mockNote);
        });
    });

    describe('Delete Functionality', () => {
        it('should show confirmation dialog when delete is clicked', () => {
            render(<NoteCard {...defaultProps} />);

            fireEvent.click(screen.getByText('Delete'));

            expect(screen.getByText('Delete this note?')).toBeInTheDocument();
            expect(screen.getByText('Yes')).toBeInTheDocument();
            expect(screen.getByText('No')).toBeInTheDocument();
        });

        it('should call onDelete when Yes is clicked', () => {
            const onDelete = vi.fn();
            render(<NoteCard {...defaultProps} onDelete={onDelete} />);

            fireEvent.click(screen.getByText('Delete'));
            fireEvent.click(screen.getByText('Yes'));

            expect(onDelete).toHaveBeenCalledWith(mockNote.id);
        });

        it('should hide confirmation when No is clicked', () => {
            render(<NoteCard {...defaultProps} />);

            fireEvent.click(screen.getByText('Delete'));
            expect(screen.getByText('Delete this note?')).toBeInTheDocument();

            fireEvent.click(screen.getByText('No'));
            expect(screen.queryByText('Delete this note?')).not.toBeInTheDocument();
        });
    });

    describe('Rediscovered State', () => {
        it('should apply rediscovered class when isRediscovered is true', () => {
            render(<NoteCard {...defaultProps} isRediscovered={true} />);

            const card = document.querySelector('.note-card');
            expect(card).toHaveClass('rediscovered');
        });

        it('should not have rediscovered class by default', () => {
            render(<NoteCard {...defaultProps} />);

            const card = document.querySelector('.note-card');
            expect(card).not.toHaveClass('rediscovered');
        });
    });

    describe('URL Linkification', () => {
        it('should render URLs as clickable links', () => {
            render(<NoteCard {...defaultProps} note={mockNoteWithUrl} />);

            const link = screen.getByRole('link');
            expect(link).toHaveAttribute('href', 'https://example.com');
            expect(link).toHaveAttribute('target', '_blank');
        });
    });

    describe('Search Results', () => {
        it('should show View full button when search matches exist', () => {
            render(
                <NoteCard
                    {...defaultProps}
                    note={mockNoteWithSearchMatch}
                    searchQuery="programming"
                />
            );

            // Should show a snippet with View full option
            expect(screen.getByText(/View full|\+\d+ more/)).toBeInTheDocument();
        });

        it('should expand to show all matches when View full is clicked', () => {
            render(
                <NoteCard
                    {...defaultProps}
                    note={mockNoteWithSearchMatch}
                    searchQuery="programming"
                />
            );

            const expandButton = screen.getByText(/View full|\+\d+ more/);
            fireEvent.click(expandButton);

            // Should now show Show less button
            expect(screen.getByText('Show less')).toBeInTheDocument();
        });
    });

    describe('Note Without Title', () => {
        it('should not render title element when title is null', () => {
            const noteWithoutTitle: Note = {
                ...mockNote,
                title: null,
            };

            render(<NoteCard {...defaultProps} note={noteWithoutTitle} />);

            // Should not have h3 element
            expect(screen.queryByRole('heading', { level: 3 })).not.toBeInTheDocument();
        });
    });
});
