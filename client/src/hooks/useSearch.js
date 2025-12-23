import { useState, useEffect, useCallback } from 'react';
import { movieAPI } from '../services/api';
import { useDebounce } from './useDebounce';

export const useSearch = (initialQuery = '', options = {}) => {
    const [query, setQuery] = useState(initialQuery);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState({
        total: 0,
        page: 1,
        limit: options.limit || 20,
        hasMore: false,
    });

    const debouncedQuery = useDebounce(query, 500);

    const searchMovies = useCallback(async (searchQuery, page = 1) => {
        if (!searchQuery.trim()) {
            setResults([]);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const offset = (page - 1) * pagination.limit;
            const response = await movieAPI.searchMovies(searchQuery, {
                limit: pagination.limit,
                offset,
                exact: options.exact || false,
            });

            if (response.success) {
                if (page === 1) {
                    setResults(response.data);
                } else {
                    setResults(prev => [...prev, ...response.data]);
                }

                setPagination(prev => ({
                    ...prev,
                    page,
                    total: response.count,
                    hasMore: response.data.length === pagination.limit,
                }));
            }
        } catch (err) {
            setError(err.message);
            toast.error('Ошибка при поиске фильмов');
        } finally {
            setLoading(false);
        }
    }, [pagination.limit, options.exact]);

    // Автоматический поиск при изменении запроса
    useEffect(() => {
        if (debouncedQuery) {
            searchMovies(debouncedQuery, 1);
        } else {
            setResults([]);
        }
    }, [debouncedQuery, searchMovies]);

    const loadMore = () => {
        if (!loading && pagination.hasMore) {
            searchMovies(query, pagination.page + 1);
        }
    };

    const resetSearch = () => {
        setQuery('');
        setResults([]);
        setPagination({
            total: 0,
            page: 1,
            limit: options.limit || 20,
            hasMore: false,
        });
    };

    return {
        query,
        setQuery,
        results,
        loading,
        error,
        pagination,
        searchMovies,
        loadMore,
        resetSearch,
    };
};