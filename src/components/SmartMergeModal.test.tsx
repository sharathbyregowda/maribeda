import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SmartMergeModal } from './SmartMergeModal';
import { Note } from '../types';

// Mock note for testing
const mockNote: Note = {
    id: 1,
    title: 'Movies to Avoid',
    content: '- Telugu Movies',
    isPinned: false,
    lastViewedAt: null,
    createdAt: '2024-01-01T12:00:00.000Z',
    updatedAt: '2024-01-01T12:00:00.000Z',
};

const mockNote2: Note = {
    id: 2,
    title: 'Movies to Watch',
    content: '- Action Movies',
    isPinned: false,
    lastViewedAt: null,
    createdAt: '2024-01-02T12:00:00.000Z',
    updatedAt: '2024-01-02T12:00:00.000Z',
};

describe('SmartMergeModal', () => {
    describe('Single Similar Match Mode', () => {
        it('should render both Append and Create New buttons', () => {
            const onAppend = vi.fn();
            const onCreateNew = vi.fn();
            const onOpenNote = vi.fn();
            const onClose = vi.fn();

            render(
                <SmartMergeModal
                    mode="single"
                    incomingContent="test 1 test 1"
                    matchedNotes={[mockNote]}
                    onAppend={onAppend}
                    onCreateNew={onCreateNew}
                    onOpenNote={onOpenNote}
                    onClose={onClose}
                />
            );

            expect(screen.getByText(/Append to This Note/)).toBeInTheDocument();
            expect(screen.getByText(/Create New Note/)).toBeInTheDocument();
        });

        it('should call onAppend when Append button is clicked', () => {
            const onAppend = vi.fn();
            const onCreateNew = vi.fn();
            const onOpenNote = vi.fn();
            const onClose = vi.fn();

            render(
                <SmartMergeModal
                    mode="single"
                    incomingContent="test 1 test 1"
                    matchedNotes={[mockNote]}
                    onAppend={onAppend}
                    onCreateNew={onCreateNew}
                    onOpenNote={onOpenNote}
                    onClose={onClose}
                />
            );

            fireEvent.click(screen.getByText(/Append to This Note/));
            expect(onAppend).toHaveBeenCalledWith(mockNote);
        });

        it('should call onCreateNew with content when Create New Note button is clicked', () => {
            const onAppend = vi.fn();
            const onCreateNew = vi.fn();
            const onOpenNote = vi.fn();
            const onClose = vi.fn();
            const incomingContent = 'test 1 test 1';

            render(
                <SmartMergeModal
                    mode="single"
                    incomingContent={incomingContent}
                    matchedNotes={[mockNote]}
                    onAppend={onAppend}
                    onCreateNew={onCreateNew}
                    onOpenNote={onOpenNote}
                    onClose={onClose}
                />
            );

            fireEvent.click(screen.getByText(/Create New Note/));
            expect(onCreateNew).toHaveBeenCalledWith(incomingContent);
        });

        it('should display the incoming content preview', () => {
            render(
                <SmartMergeModal
                    mode="single"
                    incomingContent="test 1 test 1"
                    matchedNotes={[mockNote]}
                    onAppend={vi.fn()}
                    onCreateNew={vi.fn()}
                    onOpenNote={vi.fn()}
                    onClose={vi.fn()}
                />
            );

            expect(screen.getByText('test 1 test 1')).toBeInTheDocument();
        });

        it('should display the matched note title', () => {
            render(
                <SmartMergeModal
                    mode="single"
                    incomingContent="test 1 test 1"
                    matchedNotes={[mockNote]}
                    onAppend={vi.fn()}
                    onCreateNew={vi.fn()}
                    onOpenNote={vi.fn()}
                    onClose={vi.fn()}
                />
            );

            expect(screen.getByText('Movies to Avoid')).toBeInTheDocument();
        });
    });

    describe('Duplicate Mode', () => {
        it('should show Open Note button and hide Create New', () => {
            render(
                <SmartMergeModal
                    mode="duplicate"
                    incomingContent="https://example.com"
                    matchedNotes={[mockNote]}
                    onAppend={vi.fn()}
                    onCreateNew={vi.fn()}
                    onOpenNote={vi.fn()}
                    onClose={vi.fn()}
                />
            );

            expect(screen.getByText(/Open Note/)).toBeInTheDocument();
            expect(screen.queryByText(/Create New Note/)).not.toBeInTheDocument();
        });

        it('should call onOpenNote when Open Note is clicked', () => {
            const onOpenNote = vi.fn();

            render(
                <SmartMergeModal
                    mode="duplicate"
                    incomingContent="https://example.com"
                    matchedNotes={[mockNote]}
                    onAppend={vi.fn()}
                    onCreateNew={vi.fn()}
                    onOpenNote={onOpenNote}
                    onClose={vi.fn()}
                />
            );

            fireEvent.click(screen.getByText(/Open Note/));
            expect(onOpenNote).toHaveBeenCalledWith(mockNote);
        });
    });

    describe('Multiple Matches Mode', () => {
        it('should render all matched notes as radio options', () => {
            render(
                <SmartMergeModal
                    mode="multiple"
                    incomingContent="movie content"
                    matchedNotes={[mockNote, mockNote2]}
                    onAppend={vi.fn()}
                    onCreateNew={vi.fn()}
                    onOpenNote={vi.fn()}
                    onClose={vi.fn()}
                />
            );

            expect(screen.getByText('Movies to Avoid')).toBeInTheDocument();
            expect(screen.getByText('Movies to Watch')).toBeInTheDocument();
        });

        it('should show Create New Note button in multiple mode', () => {
            const onCreateNew = vi.fn();

            render(
                <SmartMergeModal
                    mode="multiple"
                    incomingContent="movie content"
                    matchedNotes={[mockNote, mockNote2]}
                    onAppend={vi.fn()}
                    onCreateNew={onCreateNew}
                    onOpenNote={vi.fn()}
                    onClose={vi.fn()}
                />
            );

            const createNewBtn = screen.getByText(/Create New Note/);
            expect(createNewBtn).toBeInTheDocument();

            fireEvent.click(createNewBtn);
            expect(onCreateNew).toHaveBeenCalledWith('movie content');
        });

        it('should default select the first (best match) note', () => {
            const onAppend = vi.fn();

            render(
                <SmartMergeModal
                    mode="multiple"
                    incomingContent="movie content"
                    matchedNotes={[mockNote, mockNote2]}
                    onAppend={onAppend}
                    onCreateNew={vi.fn()}
                    onOpenNote={vi.fn()}
                    onClose={vi.fn()}
                />
            );

            // Click Append without changing selection
            fireEvent.click(screen.getByText(/Append to Selected/));
            expect(onAppend).toHaveBeenCalledWith(mockNote); // First note is default
        });
    });

    describe('Modal Interactions', () => {
        it('should call onClose when overlay is clicked', () => {
            const onClose = vi.fn();

            render(
                <SmartMergeModal
                    mode="single"
                    incomingContent="test"
                    matchedNotes={[mockNote]}
                    onAppend={vi.fn()}
                    onCreateNew={vi.fn()}
                    onOpenNote={vi.fn()}
                    onClose={onClose}
                />
            );

            // Click the overlay (not the modal content)
            fireEvent.click(screen.getByTestId ?
                document.querySelector('.smart-merge-overlay')! :
                document.querySelector('.smart-merge-overlay')!
            );

            expect(onClose).toHaveBeenCalled();
        });

        it('should NOT close when modal content is clicked', () => {
            const onClose = vi.fn();

            render(
                <SmartMergeModal
                    mode="single"
                    incomingContent="test"
                    matchedNotes={[mockNote]}
                    onAppend={vi.fn()}
                    onCreateNew={vi.fn()}
                    onOpenNote={vi.fn()}
                    onClose={onClose}
                />
            );

            // Click inside the modal content
            fireEvent.click(document.querySelector('.smart-merge-modal')!);

            expect(onClose).not.toHaveBeenCalled();
        });
    });
});
