import { useState } from 'react';
import { FiImage } from 'react-icons/fio';

export const PosterImage = ({
                                src,
                                alt,
                                className = '',
                                fallbackText = 'Нет изображения'
                            }) => {
    const [error, setError] = useState(false);
    const [loading, setLoading] = useState(true);

    const handleError = () => {
        setError(true);
        setLoading(false);
    };

    const handleLoad = () => {
        setLoading(false);
    };

    if (error || !src) {
        return (
            <div className={`${className} bg-gray-800 flex items-center justify-center`}>
                <div className="text-center p-4">
                    <FiImage className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                    <span className="text-gray-500 text-sm">{fallbackText}</span>
                </div>
            </div>
        );
    }

    return (
        <div className={`${className} relative overflow-hidden`}>
            {loading && (
                <div className="absolute inset-0 bg-gray-800 animate-pulse" />
            )}
            <img
                src={src}
                alt={alt}
                loading="lazy"
                className={`w-full h-full object-cover transition-opacity duration-300 ${
                    loading ? 'opacity-0' : 'opacity-100'
                }`}
                onError={handleError}
                onLoad={handleLoad}
            />
        </div>
    );
};