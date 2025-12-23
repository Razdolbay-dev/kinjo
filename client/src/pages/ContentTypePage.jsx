import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiFilter, FiCalendar, FiGrid, FiList, FiChevronLeft } from 'react-icons/fi';
import { MovieCard } from '../components/Content/MovieCard';
import { LoadingSpinner, SkeletonLoader } from '../components/UI/LoadingSpinner';
import { ErrorMessage } from '../components/UI/ErrorMessage';
import { Pagination } from '../components/UI/Pagination';
import { movieAPI } from '../services/api';
import { useContentByType } from '../hooks/useContentByType';

export const ContentTypePage = () => {
    const { slug } = useParams();
    const navigate = useNavigate();

    const [contentType, setContentType] = useState(null);
    const [viewMode, setViewMode] = useState('grid'); // 'grid' или 'list'
    const [yearFilter, setYearFilter] = useState('');
    const [sortBy, setSortBy] = useState('year');
    const [sortOrder, setSortOrder] = useState('desc');

    const {
        content,
        loading,
        error,
        pagination,
        loadMore,
        updateFilters,
        resetFilters,
    } = useContentByType(slug, {
        year: yearFilter,
        sort_by: sortBy,
        sort_order: sortOrder,
    });

    useEffect(() => {
        loadContentTypeInfo();
    }, [slug]);

    const loadContentTypeInfo = async () => {
        try {
            const response = await movieAPI.getContentTypes();
            if (response.success) {
                const type = response.data.find(t => t.slug === slug);
                setContentType(type);
            }
        } catch (error) {
            console.error('Error loading content type:', error);
        }
    };

    const handleYearChange = (year) => {
        setYearFilter(year);
        updateFilters({ year: year || '' });
    };

    const handleSortChange = (field, order) => {
        setSortBy(field);
        setSortOrder(order);
        updateFilters({ sort_by: field, sort_order: order });
    };

    const handlePageChange = (page) => {
        navigate(`?page=${page}`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 30 }, (_, i) => currentYear - i);

    if (loading && !contentType) {
        return (
            <div className="min-h-screen container-custom py-12">
                <SkeletonLoader type="detail" count={1} />
            </div>
        );
    }

    if (error && !contentType) {
        return (
            <div className="min-h-screen container-custom py-12">
                <ErrorMessage
                    message={error}
                    onRetry={() => window.location.reload()}
                />
            </div>
        );
    }

    if (!contentType) {
        return (
            <div className="min-h-screen container-custom py-12">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">Тип контента не найден</h1>
                    <button
                        onClick={() => navigate('/')}
                        className="btn-primary"
                    >
                        Вернуться на главную
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            {/* Заголовок */}
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 border-b border-gray-800">
                <div className="container-custom py-8">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <button
                                onClick={() => navigate(-1)}
                                className="flex items-center gap-2 text-gray-400 hover:text-white mb-4"
                            >
                                <FiChevronLeft className="w-5 h-5" />
                                Назад
                            </button>

                            <h1 className="text-3xl md:text-4xl font-bold mb-2">
                                {contentType.name}
                            </h1>

                            <p className="text-gray-400">
                                {contentType.description || `Коллекция ${contentType.name.toLowerCase()}`}
                            </p>
                        </div>

                        <div className="hidden md:block">
              <span className="text-6xl opacity-20">
                {contentType.slug === 'movie' && '🎬'}
                  {contentType.slug === 'serial' && '📺'}
                  {contentType.slug === 'anime' && '🇯🇵'}
                  {contentType.slug === 'multfilm' && '🐰'}
                  {contentType.slug === '3d' && '👓'}
                  {contentType.slug === 'concert' && '🎤'}
              </span>
                        </div>
                    </div>

                    {/* Фильтры */}
                    <div className="flex flex-wrap items-center gap-4 mt-6">
                        <div className="flex items-center gap-2">
                            <FiFilter className="w-5 h-5 text-gray-400" />
                            <span className="text-sm font-medium">Фильтры:</span>
                        </div>

                        <select
                            value={yearFilter}
                            onChange={(e) => handleYearChange(e.target.value)}
                            className="input-field bg-gray-800 border-gray-700 py-2 text-sm"
                        >
                            <option value="">Все года</option>
                            {years.map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>

                        <select
                            value={sortBy}
                            onChange={(e) => handleSortChange(e.target.value, sortOrder)}
                            className="input-field bg-gray-800 border-gray-700 py-2 text-sm"
                        >
                            <option value="year">По году</option>
                            <option value="title">По названию</option>
                            <option value="created_at">По дате добавления</option>
                        </select>

                        <button
                            onClick={() => handleSortChange(sortBy, sortOrder === 'desc' ? 'asc' : 'desc')}
                            className="input-field bg-gray-800 border-gray-700 py-2 text-sm flex items-center gap-2"
                        >
                            <FiCalendar className="w-4 h-4" />
                            {sortOrder === 'desc' ? 'Новые' : 'Старые'}
                        </button>

                        <div className="flex items-center gap-2 ml-auto">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-primary-600' : 'bg-gray-800'}`}
                            >
                                <FiGrid className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-2 rounded ${viewMode === 'list' ? 'bg-primary-600' : 'bg-gray-800'}`}
                            >
                                <FiList className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Контент */}
            <div className="container-custom py-8">
                {loading && content.length === 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                        <SkeletonLoader type="card" count={10} />
                    </div>
                ) : error ? (
                    <ErrorMessage
                        message={error}
                        onRetry={() => window.location.reload()}
                    />
                ) : content.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FiFilter className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">Контент не найден</h3>
                        <p className="text-gray-400 mb-6">
                            Попробуйте изменить фильтры
                        </p>
                        <button
                            onClick={resetFilters}
                            className="btn-primary"
                        >
                            Сбросить фильтры
                        </button>
                    </div>
                ) : (
                    <>
                        <div className={`grid ${
                            viewMode === 'grid'
                                ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5'
                                : 'grid-cols-1'
                        } gap-6`}>
                            {content.map((item) => (
                                <MovieCard
                                    key={item.id}
                                    movie={item}
                                    showDetails={viewMode === 'list'}
                                />
                            ))}
                        </div>

                        {/* Пагинация */}
                        {pagination.total > pagination.limit && (
                            <div className="mt-12">
                                <Pagination
                                    currentPage={pagination.page}
                                    totalPages={Math.ceil(pagination.total / pagination.limit)}
                                    onPageChange={handlePageChange}
                                />

                                <div className="text-center mt-4 text-gray-400 text-sm">
                                    Показано {content.length} из {pagination.total}
                                </div>
                            </div>
                        )}

                        {/* Кнопка "Загрузить ещё" */}
                        {pagination.hasMore && (
                            <div className="text-center mt-8">
                                <button
                                    onClick={loadMore}
                                    disabled={loading}
                                    className="btn-secondary px-8 py-3"
                                >
                                    {loading ? 'Загрузка...' : 'Загрузить ещё'}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};