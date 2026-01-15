import { useState, useEffect, useCallback } from 'react';

interface UseSearchProps {
    debounceMs?: number;
}

export function useSearch({ debounceMs = 150 }: UseSearchProps = {}) {
    const [query, setQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(query);
        }, debounceMs);

        return () => clearTimeout(timer);
    }, [query, debounceMs]);

    const clearSearch = useCallback(() => {
        setQuery('');
        setDebouncedQuery('');
    }, []);

    return {
        query,
        setQuery,
        debouncedQuery,
        clearSearch,
        isSearching: query.length > 0,
    };
}
