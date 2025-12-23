import { useState, useEffect, useCallback } from 'react';
import { movieAPI } from '../services/api';
import { useDebounce } from './useDebounce';

export const useContentByType = (slug, options = {}) => {
    const [content, setContent] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState({
        total: 0,
        page: 1,
        limit: options.limit || 20,
        hasMore: false,
    });
    const [filters, setFilters] = useState({
        year: options.year || '',
        sort_by: options.sort_by || 'year',
        sort_order: options.sort_order || 'desc',
    });

    const debouncedFilters = useDebounce(filters, 500);

    const loadContent = useCallback(async (page = 1) => {
        if (!slug) return;

        setLoading(true);
        setError(null);

        try {
            const offset = (page - 1) * pagination.limit;
            const response = await movieAPI.getContentByType(slug, {
                ...debouncedFilters,
                limit: pagination.limit,
                offset,
            });

            if (response.success) {
                if (page === 1) {
                    setContent(response.data);
                } else {
                    setContent(prev => [...prev, ...response.data]);
                }

                setPagination(prev => ({
                    ...prev,
                    page,
                    total: response.total,
                    hasMore: response.data.length === pagination.limit,
                }));
            }
        } catch (err) {
            setError(err.message);
            console.error('Error loading content by type:', err);
        } finally {
            setLoading(false);
        }
    }, [slug, pagination.limit, debouncedFilters]);

    useEffect(() => {
        if (slug) {
            loadContent(1);
        }
    }, [slug, loadContent]);

    const loadMore = () => {
        if (!loading && pagination.hasMore) {
            loadContent(pagination.page + 1);
        }
    };

    const updateFilters = (newFilters) => {
        setFilters(prev => ({ ...prev, ...newFilters }));
    };

    const resetFilters = () => {
        setFilters({
            year: '',
            sort_by: 'year',
            sort_order: 'desc',
        });
    };

    return {
        content,
        loading,
        error,
        pagination,
        filters,
        loadContent,
        loadMore,
        updateFilters,
        resetFilters,
    };
};