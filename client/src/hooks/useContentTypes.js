import { useState, useEffect } from 'react';
import { movieAPI } from '../services/api';

export const useContentTypes = () => {
    const [types, setTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadContentTypes();
    }, []);

    const loadContentTypes = async () => {
        try {
            setLoading(true);
            const response = await movieAPI.getContentTypes();
            if (response.success) {
                setTypes(response.data);
            }
        } catch (err) {
            setError(err.message);
            console.error('Error loading content types:', err);
        } finally {
            setLoading(false);
        }
    };

    const getTypeBySlug = (slug) => {
        return types.find(type => type.slug === slug);
    };

    const getTypeById = (id) => {
        return types.find(type => type.id === id);
    };

    return {
        types,
        loading,
        error,
        getTypeBySlug,
        getTypeById,
        refetch: loadContentTypes,
    };
};