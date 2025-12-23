import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiShare2, FiBookmark } from 'react-icons/fi';
import { Helmet } from 'react-helmet-async';

import { MovieDetail } from '../components/Content/MovieDetail';
import { LoadingSpinner, SkeletonLoader } from '../components/UI/LoadingSpinner';
import { ErrorMessage } from '../components/UI/ErrorMessage';
import { movieAPI } from '../services/api';
import toast from 'react-hot-toast';

export const MovieDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [movie, setMovie] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [similarMovies, setSimilarMovies] = useState([]);

    useEffect(() => {
        loadMovie();
    }, [id]);

    const loadMovie = async () => {
        if (!id) return;

        setLoading(true);
        setError(null);

        try {
            const response = await movieAPI.getMovieById(id);

            if (response.success) {
                setMovie(response.data);
                loadSimilarMovies(response.data);
            } else {
                setError('Фильм не найден');
            }
        } catch (err) {
            setError(err.message);
            toast.error('Ошибка при загрузке фильма');
        } finally {
            setLoading(false);
        }
    };

    const loadSimilarMovies = async (currentMovie) => {
        try {
            const response = await movieAPI.advancedSearch({
                year: currentMovie.year,
                limit: 5,
                has_poster: true,
            });

            if (response.success) {
                // Исключаем текущий фильм
                const filtered = response.data.filter(m => m.id !== currentMovie.id);
                setSimilarMovies(filtered.slice(0, 4));
            }
        } catch (error) {
            console.error('Ошибка при загрузке похожих фильмов:', error);
        }
    };

    const handleShare = () => {
        if (navigator.share) {
            navigator.share({
                title: movie.title,
                text: movie.description?.substring(0, 100),
                url: window.location.href,
            });
        } else {
            navigator.clipboard.writeText(window.location.href);
            toast.success('Ссылка скопирована в буфер обмена');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen container-custom py-8">
                <SkeletonLoader type="detail" count={1} />
            </div>
        );
    }

    if (error || !movie) {
        return (
            <div className="min-h-screen container-custom py-12">
                <ErrorMessage
                    message={error || 'Фильм не найден'}
                    onRetry={() => navigate('/')}
                />
            </div>
        );
    }

    return (
        <>
            <Helmet>
                <title>{movie.title} | MovieHub</title>
                <meta name="description" content={movie.description?.substring(0, 160)} />
                <meta property="og:title" content={movie.title} />
                <meta property="og:description" content={movie.description?.substring(0, 200)} />
                <meta property="og:image" content={movie.poster_url} />
                <meta property="og:type" content="video.movie" />
            </Helmet>

            <div className="min-h-screen">
                {/* Кнопки навигации */}
                <div className="sticky top-16 z-40 glass-effect border-b border-gray-800/50">
                    <div className="container-custom py-4">
                        <div className="flex items-center justify-between">
                            <button
                                onClick={() => navigate(-1)}
                                className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
                            >
                                <FiArrowLeft className="w-5 h-5" />
                                <span>Назад</span>
                            </button>

                            <div className="flex items-center gap-4">
                                <button
                                    onClick={handleShare}
                                    className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
                                >
                                    <FiShare2 className="w-5 h-5" />
                                    <span className="hidden sm:inline">Поделиться</span>
                                </button>

                                <button className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors">
                                    <FiBookmark className="w-5 h-5" />
                                    <span className="hidden sm:inline">В избранное</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Детали фильма */}
                <div className="container-custom py-8">
                    <MovieDetail movie={movie} />
                </div>

                {/* Похожие фильмы */}
                {similarMovies.length > 0 && (
                    <div className="container-custom py-12 border-t border-gray-800/50">
                        <h2 className="text-2xl font-bold mb-8">Похожие фильмы</h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {similarMovies.map((similarMovie) => (
                                <MovieCard key={similarMovie.id} movie={similarMovie} />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};