import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NoteInputComponent } from './NoteInputComponent';
import { Note } from '../types';

describe('NoteInputComponent UI', () => {
    it('should render input fields correctly', () => {
        render(<NoteInputComponent onSave={vi.fn()} />);

        expect(screen.getByPlaceholderText('Title (optional)')).toBeInTheDocument();
        expect(screen.getByPlaceholderText("What's on your mind? Type your note here...")).toBeInTheDocument();
        expect(screen.getByText('Save')).toBeInTheDocument();
    });

    it('should default to 3 rows for textarea', () => {
        render(<NoteInputComponent onSave={vi.fn()} />);
        const textarea = screen.getByPlaceholderText("What's on your mind? Type your note here...");
        expect(textarea).toHaveAttribute('rows', '3');
    });

    it('should expand to 15 rows when editing a note', () => {
        const mockNote: Note = {
            id: 1,
            title: 'Test Note',
            content: 'Test content',
            isPinned: false,
            createdAt: '2023-01-01',
            updatedAt: '2023-01-01'
        };

        render(<NoteInputComponent onSave={vi.fn()} editingNote={mockNote} />);

        const textarea = screen.getByPlaceholderText("What's on your mind? Type your note here...");
        expect(textarea).toHaveAttribute('rows', '15');
        expect(screen.getByText('Update')).toBeInTheDocument();
    });

    it('should disable save button when content is empty', () => {
        render(<NoteInputComponent onSave={vi.fn()} />);
        const saveBtn = screen.getByText('Save');
        expect(saveBtn).toBeDisabled();
    });

    it('should enable save button when content is entered', () => {
        render(<NoteInputComponent onSave={vi.fn()} />);
        const textarea = screen.getByPlaceholderText("What's on your mind? Type your note here...");

        fireEvent.change(textarea, { target: { value: 'New note content' } });

        const saveBtn = screen.getByText('Save');
        expect(saveBtn).not.toBeDisabled();
    });

    it('should call onSave when save button is clicked', () => {
        const handleSave = vi.fn();
        render(<NoteInputComponent onSave={handleSave} />);

        const textarea = screen.getByPlaceholderText("What's on your mind? Type your note here...");
        fireEvent.change(textarea, { target: { value: 'My cool note' } });

        fireEvent.click(screen.getByText('Save'));

        expect(handleSave).toHaveBeenCalledWith({
            title: undefined, // Optional title was skipped
            content: 'My cool note'
        });
    });
});
