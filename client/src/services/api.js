import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Интерцептор для обработки ошибок
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response) {
            switch (error.response.status) {
                case 400:
                    toast.error('Неверный запрос');
                    break;
                case 401:
                    toast.error('Требуется авторизация');
                    break;
                case 404:
                    toast.error('Ресурс не найден');
                    break;
                case 429:
                    toast.error('Слишком много запросов. Попробуйте позже');
                    break;
                case 500:
                    toast.error('Ошибка сервера');
                    break;
                default:
                    toast.error('Произошла ошибка');
            }
        } else if (error.request) {
            toast.error('Нет ответа от сервера');
        } else {
            toast.error('Ошибка при отправке запроса');
        }
        return Promise.reject(error);
    }
);

export const movieAPI = {
    // Поиск фильмов по названию
    searchMovies: async (title, options = {}) => {
        const params = {
            title,
            limit: options.limit || 20,
            offset: options.offset || 0,
            exact: options.exact || false,
        };

        const response = await api.get('/search', { params });
        return response.data;
    },

    // Расширенный поиск
    advancedSearch: async (filters = {}) => {
        const response = await api.get('/advanced-search', { params: filters });
        return response.data;
    },

    // Получить фильм по ID
    getMovieById: async (id) => {
        const response = await api.get(`/content/${id}`);
        return response.data;
    },

    // Получить популярные фильмы
    getPopularMovies: async (limit = 10) => {
        const response = await api.get('/popular', { params: { limit } });
        return response.data;
    },

    // Получить фильмы по годам
    getMoviesByYear: async (year) => {
        const response = await api.get('/advanced-search', {
            params: { year, has_poster: true }
        });
        return response.data;
    },

    // Получить все типы контента
    getContentTypes: async () => {
        const response = await api.get('/content-types');
        return response.data;
    },

    // Получить контент по типу (slug)
    getContentByType: async (slug, options = {}) => {
        const params = {
            limit: options.limit || 20,
            offset: options.offset || 0,
            year: options.year,
            sort_by: options.sort_by || 'year',
            sort_order: options.sort_order || 'desc',
        };

        const response = await api.get(`/content-types/${slug}/contents`, { params });
        return response.data;
    },

    // Получить популярные по типу
    getPopularByType: async (slug, limit = 10) => {
        const response = await api.get(`/content-types/${slug}/contents`, {
            params: {
                limit,
                sort_by: 'created_at',
                sort_order: 'desc'
            }
        });
        return response.data;
    },
};

export default api;