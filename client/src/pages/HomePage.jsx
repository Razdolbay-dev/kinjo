import { useEffect, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Navigation, Pagination } from 'swiper/modules';
import {
    FiPlay,
    FiTrendingUp,
    FiStar,
    FiCalendar,
    FiChevronRight, FiFilm
} from 'react-icons/fi';
import { Link } from 'react-router-dom';

import { MovieCard } from '../components/Content/MovieCard';
import { SearchBar } from '../components/Search/SearchBar';
import { LoadingSpinner, SkeletonLoader } from '../components/UI/LoadingSpinner';
import { movieAPI } from '../services/api';
import toast from 'react-hot-toast';

export const HomePage = () => {
    const [featuredMovies, setFeaturedMovies] = useState([]);
    const [popularMovies, setPopularMovies] = useState([]);
    const [newReleases, setNewReleases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadData();
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

    const handleSearch = (query) => {
        if (query.trim()) {
            window.location.href = `/search?q=${encodeURIComponent(query)}`;
        }
    };

    if (loading) {
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
                    <h2 className="text-3xl font-bold mb-6">Найдите свой идеальный фильм</h2>
                    <p className="text-gray-400 mb-8">
                        Поиск по тысячам фильмов и сериалов. Находите новые шедевры или пересматривайте классику.
                    </p>
                    <SearchBar
                        onSearch={handleSearch}
                        placeholder="Начните вводить название фильма..."
                        className="max-w-2xl mx-auto"
                    />
                </div>
            </section>

            {/* Популярные фильмы */}
            <section className="container-custom py-12">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-2xl font-bold flex items-center gap-3">
                            <FiTrendingUp className="w-6 h-6 text-primary-400" />
                            Популярное сейчас
                        </h2>
                        <p className="text-gray-400 mt-2">Самые просматриваемые фильмы</p>
                    </div>
                    <Link
                        to="/popular"
                        className="text-primary-400 hover:text-primary-300 flex items-center gap-2"
                    >
                        Все популярные
                        <FiChevronRight className="w-4 h-4" />
                    </Link>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                    {popularMovies.map((movie) => (
                        <MovieCard key={movie.id} movie={movie} />
                    ))}
                </div>
            </section>

            {/* Новинки */}
            <section className="container-custom py-12">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-2xl font-bold flex items-center gap-3">
                            <FiStar className="w-6 h-6 text-primary-400" />
                            Новинки
                        </h2>
                        <p className="text-gray-400 mt-2">Свежие релизы этого года</p>
                    </div>
                    <Link
                        to="/new"
                        className="text-primary-400 hover:text-primary-300 flex items-center gap-2"
                    >
                        Все новинки
                        <FiChevronRight className="w-4 h-4" />
                    </Link>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                    {newReleases.map((movie) => (
                        <MovieCard key={movie.id} movie={movie} />
                    ))}
                </div>
            </section>

            {/* Категории */}
            <section className="container-custom py-12">
                <h2 className="text-2xl font-bold mb-8">Популярные категории</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {['Боевики', 'Комедии', 'Драмы', 'Триллеры', 'Фантастика', 'Ужасы'].map((category) => (
                        <Link
                            key={category}
                            to={`/category/${category.toLowerCase()}`}
                            className="glass-effect rounded-xl p-6 text-center hover:bg-gray-800/50 transition-colors group"
                        >
                            <div className="w-12 h-12 bg-primary-600/20 rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:bg-primary-600/30 transition-colors">
                                <FiFilm className="w-6 h-6 text-primary-400" />
                            </div>
                            <span className="font-medium">{category}</span>
                        </Link>
                    ))}
                </div>
            </section>
        </div>
    );
};