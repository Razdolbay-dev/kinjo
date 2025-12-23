import { useState } from 'react';
import {
    FiCalendar,
    FiClock,
    FiGlobe,
    FiUsers,
    FiPlay,
    FiStar,
    FiBookmark,
    FiShare2,
    FiChevronDown,
    FiChevronUp
} from 'react-icons/fi';
import { PosterImage } from '../Common/PosterImage';
import { QualityBadge } from './QualityBadge';

export const MovieDetail = ({ movie }) => {
    const [showMore, setShowMore] = useState(false);

    const formatDuration = (minutes) => {
        if (!minutes) return null;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return hours > 0 ? `${hours} ч ${mins} мин` : `${mins} мин`;
    };

    const formatList = (text) => {
        if (!text) return [];
        return text.split(',').map(item => item.trim());
    };

    return (
        <div className="space-y-8">
            {/* Заголовочная секция */}
            <div className="relative rounded-2xl overflow-hidden">
                {/* Фоновое изображение */}
                <div className="absolute inset-0">
                    <PosterImage
                        src={movie.poster_url}
                        alt={movie.title}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/80 to-transparent" />
                </div>

                {/* Контент поверх фона */}
                <div className="relative z-10 p-8 md:p-12">
                    <div className="flex flex-col md:flex-row gap-8">
                        {/* Постер */}
                        <div className="w-full md:w-1/3 lg:w-1/4">
                            <div className="relative rounded-xl overflow-hidden shadow-2xl">
                                <PosterImage
                                    src={movie.poster_url}
                                    alt={movie.title}
                                    className="w-full aspect-[2/3] object-cover"
                                />
                                {movie.video_quality && (
                                    <div className="absolute top-3 right-3">
                                        <QualityBadge quality={movie.video_quality} size="lg" />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Информация */}
                        <div className="flex-1 space-y-6">
                            {/* Заголовок и год */}
                            <div>
                                <h1 className="text-4xl md:text-5xl font-bold mb-2">
                                    {movie.title}
                                </h1>
                                {movie.original_title && movie.original_title !== movie.title && (
                                    <p className="text-xl text-gray-300">
                                        {movie.original_title}
                                    </p>
                                )}

                                <div className="flex flex-wrap items-center gap-4 mt-4">
                                    {/* Год */}
                                    {movie.year && (
                                        <span className="flex items-center gap-2 text-lg">
                      <FiCalendar className="w-5 h-5 text-primary-400" />
                                            {movie.year}
                                            {movie.end_year && movie.end_year !== movie.year && (
                                                <span className="text-gray-400">— {movie.end_year}</span>
                                            )}
                    </span>
                                    )}

                                    {/* Длительность */}
                                    {movie.duration && (
                                        <span className="flex items-center gap-2 text-lg">
                      <FiClock className="w-5 h-5 text-primary-400" />
                                            {formatDuration(movie.duration)}
                    </span>
                                    )}

                                    {/* Возрастное ограничение */}
                                    {movie.age_restriction && (
                                        <span className="badge bg-red-600 text-white text-lg px-4 py-2">
                      {movie.age_restriction}+
                    </span>
                                    )}
                                </div>
                            </div>

                            {/* Кнопки действий */}
                            <div className="flex flex-wrap gap-4">
                                <button className="btn-primary flex items-center gap-3 px-8 py-4 text-lg">
                                    <FiPlay className="w-6 h-6" />
                                    <span>Смотреть сейчас</span>
                                </button>

                                <button className="btn-secondary flex items-center gap-3 px-6 py-4">
                                    <FiBookmark className="w-5 h-5" />
                                    <span>В избранное</span>
                                </button>

                                <button className="btn-secondary flex items-center gap-3 px-6 py-4">
                                    <FiShare2 className="w-5 h-5" />
                                    <span>Поделиться</span>
                                </button>
                            </div>

                            {/* Описание */}
                            {movie.description && (
                                <div className="space-y-4">
                                    <h3 className="text-xl font-semibold">Описание</h3>
                                    <div className="text-gray-300 leading-relaxed">
                                        {showMore ? movie.description : `${movie.description.substring(0, 300)}...`}
                                        {movie.description.length > 300 && (
                                            <button
                                                onClick={() => setShowMore(!showMore)}
                                                className="ml-2 text-primary-400 hover:text-primary-300 font-medium"
                                            >
                                                {showMore ? 'Скрыть' : 'Показать ещё'}
                                                {showMore ? (
                                                    <FiChevronUp className="inline ml-1" />
                                                ) : (
                                                    <FiChevronDown className="inline ml-1" />
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Детальная информация */}
            <div className="glass-effect rounded-2xl p-8">
                <h2 className="text-2xl font-bold mb-6">Детальная информация</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Актёры */}
                    {movie.cast && (
                        <div>
                            <h3 className="flex items-center gap-2 text-lg font-semibold mb-3">
                                <FiUsers className="w-5 h-5 text-primary-400" />
                                Актёры
                            </h3>
                            <div className="space-y-2">
                                {formatList(movie.cast).slice(0, 5).map((actor, index) => (
                                    <div key={index} className="text-gray-300">
                                        {actor}
                                    </div>
                                ))}
                                {formatList(movie.cast).length > 5 && (
                                    <div className="text-primary-400 text-sm">
                                        +{formatList(movie.cast).length - 5} ещё
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Режиссёры */}
                    {movie.directors && (
                        <div>
                            <h3 className="text-lg font-semibold mb-3">Режиссёры</h3>
                            <div className="space-y-2">
                                {formatList(movie.directors).map((director, index) => (
                                    <div key={index} className="text-gray-300">
                                        {director}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Сценаристы */}
                    {movie.screenwriters && (
                        <div>
                            <h3 className="text-lg font-semibold mb-3">Сценаристы</h3>
                            <div className="space-y-2">
                                {formatList(movie.screenwriters).map((writer, index) => (
                                    <div key={index} className="text-gray-300">
                                        {writer}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Страны */}
                    {movie.countries && (
                        <div>
                            <h3 className="flex items-center gap-2 text-lg font-semibold mb-3">
                                <FiGlobe className="w-5 h-5 text-primary-400" />
                                Страны
                            </h3>
                            <div className="space-y-2">
                                {formatList(movie.countries).map((country, index) => (
                                    <div key={index} className="text-gray-300">
                                        {country}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Жанры */}
                    {movie.genres && (
                        <div>
                            <h3 className="text-lg font-semibold mb-3">Жанры</h3>
                            <div className="flex flex-wrap gap-2">
                                {formatList(movie.genres).map((genre, index) => (
                                    <span
                                        key={index}
                                        className="badge bg-primary-600/20 text-primary-400"
                                    >
                    {genre}
                  </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Аудиодорожки */}
                    {movie.audio_tracks && (
                        <div>
                            <h3 className="text-lg font-semibold mb-3">Аудио</h3>
                            <div className="space-y-2">
                                {formatList(movie.audio_tracks).map((audio, index) => (
                                    <div key={index} className="text-gray-300">
                                        {audio}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Плеер (если есть ссылка) */}
            {movie.player_url && (
                <div className="glass-effect rounded-2xl p-8">
                    <h2 className="text-2xl font-bold mb-6">Просмотр</h2>
                    <div className="player-container rounded-xl overflow-hidden">
                        <iframe
                            src={movie.player_url}
                            title={`Плеер для ${movie.title}`}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />
                    </div>
                </div>
            )}
        </div>
    );
};