import React from 'react';
import './RediscoverButton.css';

interface RediscoverButtonProps {
    onClick: () => void;
    disabled?: boolean;
}

export function RediscoverButton({ onClick, disabled }: RediscoverButtonProps) {
    return (
        <button
            className="rediscover-btn"
            onClick={onClick}
            disabled={disabled}
            title="🎲 Rediscover: Surface a forgotten note from your past"
            aria-label="Rediscover a random old note"
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                {/* Dice face - front */}
                <rect x="3" y="3" width="18" height="18" rx="2" />
                {/* Dice dots for "5" - most recognizable */}
                <circle cx="8" cy="8" r="1.5" fill="currentColor" stroke="none" />
                <circle cx="16" cy="8" r="1.5" fill="currentColor" stroke="none" />
                <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
                <circle cx="8" cy="16" r="1.5" fill="currentColor" stroke="none" />
                <circle cx="16" cy="16" r="1.5" fill="currentColor" stroke="none" />
            </svg>
        </button>
    );
}
