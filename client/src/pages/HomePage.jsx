import { useEffect, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Navigation, Pagination } from 'swiper/modules';
import {
    FiPlay,
    FiTrendingUp,
    FiStar,
    FiCalendar,
    FiChevronRight,
    FiFilm,
    FiTv,
    FiGlobe,
    FiMusic,
    FiVideo
} from 'react-icons/fi';
import { Link } from 'react-router-dom';

import { MovieCard } from '../components/Content/MovieCard';
import { SearchBar } from '../components/Search/SearchBar';
import { LoadingSpinner, SkeletonLoader } from '../components/UI/LoadingSpinner';
import { movieAPI } from '../services/api';
import toast from 'react-hot-toast';

// Иконки для типов контента
const TYPE_ICONS = {
    'movie': '🎬',
    'serial': '📺',
    'anime': '🇯🇵',
    'multfilm': '🐰',
    'multserial': '🐭',
    '3d': '👓',
    'docmovie': '📽️',
    'docserial': '📼',
    'concert': '🎤',
    'tvshow': '🎥'
};

// Основные типы для главной страницы
const MAIN_CONTENT_TYPES = [
    { id: 4, name: 'Фильмы', slug: 'movie', icon: '🎬' },
    { id: 2, name: 'Сериалы', slug: 'serial', icon: '📺' },
    { id: 11, name: 'Аниме', slug: 'anime', icon: '🇯🇵' },
    { id: 12, name: 'Мультфильмы', slug: 'multfilm', icon: '🐰' },
    { id: 10, name: 'Мультсериалы', slug: 'multserial', icon: '🐭' },
    { id: 1, name: '3D', slug: '3d', icon: '👓' },
    { id: 3, name: 'Докуфильмы', slug: 'docmovie', icon: '📽️' },
    { id: 5, name: 'Докусериалы', slug: 'docserial', icon: '📼' },
    { id: 6, name: 'Концерты', slug: 'concert', icon: '🎤' },
    { id: 7, name: 'ТВ Шоу', slug: 'tvshow', icon: '🎥' }
];

// Компонент для секции типа контента
const ContentTypeSection = ({ type }) => {
    const [typeContent, setTypeContent] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadTypeContent();
    }, [type.slug]);

    const loadTypeContent = async () => {
        try {
            const response = await movieAPI.getPopularByType(type.slug, 8);
            if (response.success && response.data.length > 0) {
                setTypeContent(response.data);
            }
        } catch (error) {
            console.error(`Error loading ${type.name}:`, error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <section className="container-custom py-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-bold flex items-center gap-3">
                            <span className="text-2xl">{type.icon}</span>
                            {type.name}
                        </h2>
                    </div>
                    <div className="animate-pulse bg-gray-800 h-4 w-24 rounded"></div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                    <SkeletonLoader type="card" count={5} />
                </div>
            </section>
        );
    }

    if (typeContent.length === 0) return null;

    return (
        <section className="container-custom py-8">
            <div className="flex items-center justify-between mb-6">
                <Link to={`/type/${type.slug}`} className="group">
                    <h2 className="text-2xl font-bold flex items-center gap-3 group-hover:text-primary-400 transition-colors">
                        <span className="text-2xl">{type.icon}</span>
                        {type.name}
                    </h2>
                    <p className="text-gray-400 text-sm mt-1">
                        Популярные {type.name.toLowerCase()}
                    </p>
                </Link>
                <Link
                    to={`/type/${type.slug}`}
                    className="text-primary-400 hover:text-primary-300 flex items-center gap-2 text-sm font-medium"
                >
                    Все {type.name.toLowerCase()}
                    <FiChevronRight className="w-4 h-4" />
                </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {typeContent.map((movie) => (
                    <MovieCard key={movie.id} movie={movie} />
                ))}
            </div>
        </section>
    );
};

export const HomePage = () => {
    const [featuredMovies, setFeaturedMovies] = useState([]);
    const [popularMovies, setPopularMovies] = useState([]);
    const [newReleases, setNewReleases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [contentTypes, setContentTypes] = useState([]);

    useEffect(() => {
        loadData();
        loadContentTypes();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);

            // Загружаем популярные фильмы
            const popularResponse = await movieAPI.getPopularMovies(10);
            if (popularResponse.success) {
                setPopularMovies(popularResponse.data);
                setFeaturedMovies(popularResponse.data.slice(0, 5));
            }

            // Загружаем новинки (последние 5 лет)
            const currentYear = new Date().getFullYear();
            const newReleasesResponse = await movieAPI.getMoviesByYear(currentYear - 1);
            if (newReleasesResponse.success) {
                setNewReleases(newReleasesResponse.data.slice(0, 10));
            }

        } catch (error) {
            toast.error('Ошибка при загрузке данных');
        } finally {
            setLoading(false);
        }
    };

    const loadContentTypes = async () => {
        try {
            const response = await movieAPI.getContentTypes();
            if (response.success) {
                // Сортируем типы по популярности (фильмы и сериалы первые)
                const sortedTypes = response.data.sort((a, b) => {
                    const order = { 'movie': 1, 'serial': 2, 'anime': 3, 'multfilm': 4 };
                    return (order[a.slug] || 99) - (order[b.slug] || 99);
                });
                setContentTypes(sortedTypes);
            }
        } catch (error) {
            console.error('Error loading content types:', error);
        }
    };

    const handleSearch = (query) => {
        if (query.trim()) {
            window.location.href = `/search?q=${encodeURIComponent(query)}`;
        }
    };

    // Фильтруем типы для отображения на главной
    const displayTypes = contentTypes.filter(type =>
        MAIN_CONTENT_TYPES.some(mainType => mainType.slug === type.slug)
    );

    if (loading && !featuredMovies.length) {
        return (
            <div className="min-h-screen">
                <div className="container-custom py-8">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                        <SkeletonLoader type="card" count={10} />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            {/* Герой секция */}
            <section className="relative h-[70vh] min-h-[500px] overflow-hidden">
                {featuredMovies.length > 0 && (
                    <Swiper
                        modules={[Autoplay, Navigation, Pagination]}
                        spaceBetween={0}
                        slidesPerView={1}
                        autoplay={{ delay: 5000 }}
                        pagination={{ clickable: true }}
                        navigation
                        className="h-full"
                    >
                        {featuredMovies.slice(0, 5).map((movie) => (
                            <SwiperSlide key={movie.id}>
                                <div className="relative h-full">
                                    {/* Фоновое изображение */}
                                    <div
                                        className="absolute inset-0 bg-cover bg-center"
                                        style={{
                                            backgroundImage: `url(${movie.poster_url})`,
                                            filter: 'blur(10px) brightness(0.3)'
                                        }}
                                    />

                                    {/* Градиентный оверлей */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-900/80 to-transparent" />

                                    {/* Контент */}
                                    <div className="relative z-10 h-full container-custom flex items-center">
                                        <div className="max-w-2xl">
                                            <div className="flex items-center gap-3 mb-4">
                                                {movie.year && (
                                                    <span className="badge bg-primary-600 text-white">
                            <FiCalendar className="w-3 h-3 mr-1" />
                                                        {movie.year}
                          </span>
                                                )}
                                                {movie.age_restriction && (
                                                    <span className="badge bg-red-600 text-white">
                            {movie.age_restriction}+
                          </span>
                                                )}
                                                {movie.video_quality && (
                                                    <span className="badge bg-green-600 text-white">
                            {movie.video_quality}
                          </span>
                                                )}
                                            </div>

                                            <h1 className="text-5xl md:text-6xl font-bold mb-4">
                                                {movie.title}
                                            </h1>

                                            {movie.original_title && movie.original_title !== movie.title && (
                                                <p className="text-xl text-gray-300 mb-6">
                                                    {movie.original_title}
                                                </p>
                                            )}

                                            <p className="text-lg text-gray-300 mb-8 line-clamp-3">
                                                {movie.description?.substring(0, 200)}...
                                            </p>

                                            <div className="flex flex-wrap gap-4">
                                                <Link
                                                    to={`/movie/${movie.id}`}
                                                    className="btn-primary flex items-center gap-2 px-8 py-4 text-lg"
                                                >
                                                    <FiPlay className="w-5 h-5" />
                                                    <span>Смотреть</span>
                                                </Link>
                                                <Link
                                                    to={`/movie/${movie.id}`}
                                                    className="btn-secondary px-8 py-4 text-lg"
                                                >
                                                    Подробнее
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </SwiperSlide>
                        ))}
                    </Swiper>
                )}
            </section>

            {/* Поиск */}
            <section className="container-custom py-12">
                <div className="max-w-3xl mx-auto text-center">
                    <h2 className="text-3xl font-bold mb-6">Найдите свой идеальный контент</h2>
                    <p className="text-gray-400 mb-8">
                        Поиск по тысячам фильмов, сериалов, аниме и многого другого. Находите новые шедевры или пересматривайте классику.
                    </p>
                    <SearchBar
                        onSearch={handleSearch}
                        placeholder="Начните вводить название..."
                        className="max-w-2xl mx-auto"
                    />
                </div>
            </section>

            {/* Быстрые ссылки на типы контента */}
            <section className="container-custom py-8 border-t border-gray-800/50">
                <h2 className="text-2xl font-bold mb-6">Все категории</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                    {MAIN_CONTENT_TYPES.map((type) => (
                        <Link
                            key={type.slug}
                            to={`/type/${type.slug}`}
                            className="glass-effect rounded-xl p-4 text-center hover:bg-gray-800/50 transition-all duration-300 group hover:scale-[1.02]"
                        >
                            <div className="text-3xl mb-2 transform group-hover:scale-110 transition-transform">
                                {type.icon}
                            </div>
                            <span className="font-medium text-sm">{type.name}</span>
                        </Link>
                    ))}
                </div>
            </section>

            {/* Популярные фильмы */}
            {popularMovies.length > 0 && (
                <section className="container-custom py-8">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-2xl font-bold flex items-center gap-3">
                                <FiTrendingUp className="w-6 h-6 text-primary-400" />
                                Популярное сейчас
                            </h2>
                            <p className="text-gray-400 text-sm mt-1">Самые просматриваемые фильмы</p>
                        </div>
                        <Link
                            to="/search?sort=popular"
                            className="text-primary-400 hover:text-primary-300 flex items-center gap-2 text-sm font-medium"
                        >
                            Все популярные
                            <FiChevronRight className="w-4 h-4" />
                        </Link>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {popularMovies.slice(0, 10).map((movie) => (
                            <MovieCard key={movie.id} movie={movie} />
                        ))}
                    </div>
                </section>
            )}

            {/* Новинки */}
            {newReleases.length > 0 && (
                <section className="container-custom py-8">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-2xl font-bold flex items-center gap-3">
                                <FiStar className="w-6 h-6 text-primary-400" />
                                Новинки
                            </h2>
                            <p className="text-gray-400 text-sm mt-1">Свежие релизы этого года</p>
                        </div>
                        <Link
                            to="/search?year=2024"
                            className="text-primary-400 hover:text-primary-300 flex items-center gap-2 text-sm font-medium"
                        >
                            Все новинки
                            <FiChevronRight className="w-4 h-4" />
                        </Link>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {newReleases.slice(0, 10).map((movie) => (
                            <MovieCard key={movie.id} movie={movie} />
                        ))}
                    </div>
                </section>
            )}

            {/* Секции по типам контента */}
            {displayTypes.map((type) => (
                <ContentTypeSection
                    key={type.id}
                    type={{
                        ...type,
                        icon: TYPE_ICONS[type.slug] || '🎬'
                    }}
                />
            ))}

            {/* Жанры */}
            <section className="container-custom py-8 border-t border-gray-800/50">
                <h2 className="text-2xl font-bold mb-6">Популярные жанры</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {[
                        { name: 'Боевики', icon: '💥', slug: 'action' },
                        { name: 'Комедии', icon: '😂', slug: 'comedy' },
                        { name: 'Драмы', icon: '🎭', slug: 'drama' },
                        { name: 'Триллеры', icon: '🔪', slug: 'thriller' },
                        { name: 'Фантастика', icon: '👽', slug: 'sci-fi' },
                        { name: 'Ужасы', icon: '👻', slug: 'horror' },
                        { name: 'Мелодрамы', icon: '❤️', slug: 'romance' },
                        { name: 'Детективы', icon: '🕵️', slug: 'mystery' },
                        { name: 'Приключения', icon: '🗺️', slug: 'adventure' },
                        { name: 'Фэнтези', icon: '🧙', slug: 'fantasy' },
                        { name: 'Исторические', icon: '🏛️', slug: 'historical' },
                        { name: 'Биографии', icon: '📖', slug: 'biography' },
                    ].map((genre) => (
                        <Link
                            key={genre.slug}
                            to={`/search?genre=${genre.slug}`}
                            className="glass-effect rounded-xl p-4 text-center hover:bg-gray-800/50 transition-all duration-300 group"
                        >
                            <div className="text-2xl mb-2">{genre.icon}</div>
                            <span className="font-medium text-sm">{genre.name}</span>
                        </Link>
                    ))}
                </div>
            </section>

            {/* Призыв к действию */}
            <section className="container-custom py-12">
                <div className="glass-effect rounded-2xl p-8 md:p-12 text-center">
                    <h2 className="text-3xl font-bold mb-4">Начните смотреть прямо сейчас</h2>
                    <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
                        Присоединяйтесь к миллионам пользователей, которые уже наслаждаются лучшими фильмами и сериалами на MovieHub
                    </p>
                    <div className="flex flex-wrap justify-center gap-4">
                        <button className="btn-primary px-8 py-3">
                            Начать бесплатно
                        </button>
                        <Link to="/search" className="btn-secondary px-8 py-3">
                            Исследовать каталог
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
};