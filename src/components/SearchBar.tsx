import React from 'react';
import './SearchBar.css';

interface SearchBarProps {
    query: string;
    onChange: (query: string) => void;
    resultCount?: number;
}

export function SearchBar({ query, onChange, resultCount }: SearchBarProps) {
    return (
        <div className="search-bar-container">
            <div className="search-bar-wrapper">
                <svg
                    className="search-icon"
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                    type="text"
                    className="search-input"
                    placeholder="Search your notes..."
                    value={query}
                    onChange={(e) => onChange(e.target.value)}
                />
                {query && (
                    <button
                        className="search-clear"
                        onClick={() => onChange('')}
                        aria-label="Clear search"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                )}
            </div>
            {query && resultCount !== undefined && (
                <div className="search-results-count">
                    {resultCount} {resultCount === 1 ? 'note' : 'notes'} found
                </div>
            )}
        </div>
    );
}
