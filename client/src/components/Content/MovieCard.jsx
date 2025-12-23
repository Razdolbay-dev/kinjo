import { Link } from 'react-router-dom';
import { FiStar, FiCalendar, FiClock, FiEye } from 'react-icons/fi';
import { PosterImage } from '../Common/PosterImage';
import { QualityBadge } from './QualityBadge';

export const MovieCard = ({ movie, showDetails = false }) => {
    const formatDuration = (minutes) => {
        if (!minutes) return null;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return hours > 0 ? `${hours} ч ${mins} мин` : `${mins} мин`;
    };

    return (
        <Link
            to={`/movie/${movie.id}`}
            className="block group card-hover"
        >
            <div className="glass-effect rounded-xl overflow-hidden h-full">
                {/* Постер */}
                <div className="relative aspect-[2/3] overflow-hidden">
                    <PosterImage
                        src={movie.poster_url}
                        alt={movie.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />

                    {/* Наложение с градиентом */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    {/* Качество видео */}
                    {movie.video_quality && (
                        <div className="absolute top-3 right-3">
                            <QualityBadge quality={movie.video_quality} />
                        </div>
                    )}

                    {/* Возрастное ограничение */}
                    {movie.age_restriction && (
                        <div className="absolute top-3 left-3">
              <span className="badge bg-red-600/90 text-white">
                {movie.age_restriction}+
              </span>
                        </div>
                    )}

                    {/* Кнопка просмотра */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="bg-primary-600/90 text-white p-4 rounded-full transform -translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                            <FiEye className="w-6 h-6" />
                        </div>
                    </div>
                </div>

                {/* Информация */}
                <div className="p-4">
                    {/* Заголовок */}
                    <h3 className="font-semibold text-lg mb-2 line-clamp-1 group-hover:text-primary-400 transition-colors">
                        {movie.title}
                    </h3>

                    {/* Оригинальное название */}
                    {movie.original_title && movie.original_title !== movie.title && (
                        <p className="text-sm text-gray-400 mb-2 line-clamp-1">
                            {movie.original_title}
                        </p>
                    )}

                    {/* Мета-информация */}
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400 mb-3">
                        {/* Год */}
                        {movie.year && (
                            <span className="flex items-center gap-1">
                <FiCalendar className="w-3 h-3" />
                                {movie.year}
                                {movie.end_year && movie.end_year !== movie.year && `-${movie.end_year}`}
              </span>
                        )}

                        {/* Длительность */}
                        {movie.duration && (
                            <span className="flex items-center gap-1">
                <FiClock className="w-3 h-3" />
                                {formatDuration(movie.duration)}
              </span>
                        )}

                        {/* Для сериалов */}
                        {movie.seasons_count > 0 && (
                            <span className="badge bg-blue-600/20 text-blue-400">
                {movie.seasons_count} сезонов
              </span>
                        )}
                    </div>

                    {/* Описание (только при showDetails) */}
                    {showDetails && movie.description && (
                        <p className="text-sm text-gray-300 line-clamp-3 mb-3">
                            {movie.description}
                        </p>
                    )}

                    {/* Рейтинг (если есть) */}
                    {movie.rating && (
                        <div className="flex items-center space-x-2">
                            <FiStar className="w-4 h-4 text-yellow-500 fill-current" />
                            <span className="font-semibold">{movie.rating.toFixed(1)}</span>
                            <span className="text-gray-400 text-sm">IMDb</span>
                        </div>
                    )}
                </div>
            </div>
        </Link>
    );
};