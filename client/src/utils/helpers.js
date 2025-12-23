// Форматирование длительности
export const formatDuration = (minutes) => {
    if (!minutes) return null;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours} ч ${mins} мин` : `${mins} мин`;
};

// Форматирование даты
export const formatDate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
};

// Сокращение текста
export const truncateText = (text, maxLength = 100) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return `${text.substring(0, maxLength)}...`;
};

// Форматирование чисел (1000 -> 1K)
export const formatNumber = (num) => {
    if (num >= 1000000) {
        return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
        return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
};

// Извлечение года из даты
export const extractYear = (dateString) => {
    if (!dateString) return null;
    return new Date(dateString).getFullYear();
};

// Генерация цвета по строке (для аватаров)
export const stringToColor = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }

    const colors = [
        '#3B82F6', // blue-500
        '#10B981', // emerald-500
        '#8B5CF6', // violet-500
        '#EF4444', // red-500
        '#F59E0B', // amber-500
        '#EC4899', // pink-500
        '#06B6D4', // cyan-500
        '#84CC16', // lime-500
    ];

    return colors[Math.abs(hash) % colors.length];
};

// Проверка, является ли контент сериалом
export const isSeries = (contentTypeId) => {
    return contentTypeId === 2; // Предполагаем, что 2 = сериал
};

// Получение иконки для типа контента
export const getContentTypeIcon = (typeId) => {
    const icons = {
        1: '🎬', // Фильм
        2: '📺', // Сериал
        3: '🎨', // Мультфильм
        4: '🇯🇵', // Аниме
    };

    return icons[typeId] || '🎬';
};