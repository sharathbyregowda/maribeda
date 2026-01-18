import React from 'react';
import './FloatingAddButton.css';

interface FloatingAddButtonProps {
    onClick: () => void;
    visible: boolean;
}

export function FloatingAddButton({ onClick, visible }: FloatingAddButtonProps) {
    if (!visible) return null;

    return (
        <button
            className="fab-add-note"
            onClick={onClick}
            aria-label="Create new note"
            title="Create new note"
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
        </button>
    );
}
