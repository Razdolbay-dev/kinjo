import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { FiFilter, FiX, FiSearch } from 'react-icons/fi';

import { MovieCard } from '../components/Content/MovieCard';
import { SearchBar } from '../components/Search/SearchBar';
import { Filters } from '../components/Search/Filters';
import { LoadingSpinner, SkeletonLoader } from '../components/UI/LoadingSpinner';
import { ErrorMessage } from '../components/UI/ErrorMessage';
import { Pagination } from '../components/UI/Pagination';
import { movieAPI } from '../services/api';
import toast from 'react-hot-toast';

export const SearchPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();

    const [movies, setMovies] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [totalResults, setTotalResults] = useState(0);
    const [showFilters, setShowFilters] = useState(false);
    const [activeFilters, setActiveFilters] = useState({});

    const query = searchParams.get('q') || '';
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = 20;

    useEffect(() => {
        if (query) {
            performSearch();
        }
    }, [query, page, activeFilters]);

    const performSearch = async () => {
        if (!query.trim()) return;

        setLoading(true);
        setError(null);

        try {
            const filters = { ...activeFilters };
            const response = await movieAPI.advancedSearch({
                title: query,
                limit,
                offset: (page - 1) * limit,
                ...filters,
            });

            if (response.success) {
                setMovies(response.data);
                setTotalResults(response.count);
            }
        } catch (err) {
            setError(err.message);
            toast.error('Ошибка при поиске');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (searchQuery) => {
        if (searchQuery.trim()) {
            setSearchParams({ q: searchQuery, page: '1' });
        }
    };

    const handleFilterChange = (filters) => {
        setActiveFilters(filters);
        setSearchParams({ q: query, page: '1', ...filters });
    };

    const handlePageChange = (newPage) => {
        setSearchParams({ q: query, page: newPage.toString() });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const clearFilters = () => {
        setActiveFilters({});
        setSearchParams({ q: query, page: '1' });
    };

    if (!query) {
        return (
            <div className="min-h-screen container-custom py-12">
                <div className="max-w-2xl mx-auto text-center">
                    <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                        <FiSearch className="w-10 h-10 text-gray-400" />
                    </div>
                    <h2 className="text-2xl font-bold mb-4">Начните поиск</h2>
                    <p className="text-gray-400 mb-8">
                        Введите название фильма или сериала в поле поиска
                    </p>
                    <SearchBar
                        onSearch={handleSearch}
                        placeholder="Например: Интерстеллар"
                        className="max-w-lg mx-auto"
                        autoFocus
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen container-custom py-8">
            {/* Поисковая строка */}
            <div className="mb-8">
                <SearchBar
                    onSearch={handleSearch}
                    initialValue={query}
                    placeholder="Поиск фильмов..."
                    className="mb-4"
                />

                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">
                            Результаты поиска: "{query}"
                        </h1>
                        {totalResults > 0 && (
                            <p className="text-gray-400 mt-2">
                                Найдено {totalResults} фильмов
                            </p>
                        )}
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="btn-secondary flex items-center gap-2"
                        >
                            <FiFilter className="w-4 h-4" />
                            Фильтры
                        </button>

                        {Object.keys(activeFilters).length > 0 && (
                            <button
                                onClick={clearFilters}
                                className="text-gray-400 hover:text-white flex items-center gap-2"
                            >
                                <FiX className="w-4 h-4" />
                                Очистить фильтры
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Активные фильтры */}
            {Object.keys(activeFilters).length > 0 && (
                <div className="mb-6 p-4 bg-gray-800/50 rounded-lg">
                    <div className="flex flex-wrap gap-2">
                        {Object.entries(activeFilters).map(([key, value]) => {
                            if (!value) return null;
                            return (
                                <span
                                    key={key}
                                    className="badge bg-primary-600/20 text-primary-400 flex items-center gap-2"
                                >
                  {key}: {value.toString()}
                                    <button
                                        onClick={() => {
                                            const newFilters = { ...activeFilters };
                                            delete newFilters[key];
                                            handleFilterChange(newFilters);
                                        }}
                                        className="hover:text-primary-300"
                                    >
                    <FiX className="w-3 h-3" />
                  </button>
                </span>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Контент */}
            <div className="flex gap-8">
                {/* Фильтры (сайдбар) */}
                {showFilters && (
                    <div className="w-64 flex-shrink-0">
                        <div className="sticky top-24">
                            <Filters
                                onFilterChange={handleFilterChange}
                                initialFilters={activeFilters}
                            />
                        </div>
                    </div>
                )}

                {/* Результаты */}
                <div className="flex-1">
                    {loading ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            <SkeletonLoader type="card" count={8} />
                        </div>
                    ) : error ? (
                        <ErrorMessage
                            message={error}
                            onRetry={performSearch}
                        />
                    ) : movies.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FiSearch className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Ничего не найдено</h3>
                            <p className="text-gray-400">
                                Попробуйте изменить поисковый запрос или фильтры
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                {movies.map((movie) => (
                                    <MovieCard key={movie.id} movie={movie} showDetails />
                                ))}
                            </div>

                            {/* Пагинация */}
                            {totalResults > limit && (
                                <div className="mt-12">
                                    <Pagination
                                        currentPage={page}
                                        totalPages={Math.ceil(totalResults / limit)}
                                        onPageChange={handlePageChange}
                                    />
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};