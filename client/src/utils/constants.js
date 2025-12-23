// Типы контента
export const CONTENT_TYPES = {
    MOVIE: 1,
    SERIES: 2,
    CARTOON: 3,
    ANIME: 4,
};

// Источники рейтингов
export const RATING_SOURCES = {
    KINOPOISK: 'kp',
    IMDB: 'imdb',
    TMDB: 'tmdb',
    METACRITIC: 'metacritic',
};

// Качества видео
export const VIDEO_QUALITIES = {
    '4K': '4K',
    FHD: 'Full HD',
    HD: 'HD',
    SD: 'SD',
};

// Возрастные ограничения
export const AGE_RESTRICTIONS = ['0+', '6+', '12+', '16+', '18+'];

// Сортировка
export const SORT_OPTIONS = [
    { value: 'year_desc', label: 'По году (сначала новые)' },
    { value: 'year_asc', label: 'По году (сначала старые)' },
    { value: 'title_asc', label: 'По названию (А-Я)' },
    { value: 'title_desc', label: 'По названию (Я-А)' },
    { value: 'rating_desc', label: 'По рейтингу (высокий)' },
    { value: 'rating_asc', label: 'По рейтингу (низкий)' },
];

// Жанры (предопределенные)
export const GENRES = [
    { id: 1, name: 'Боевик', slug: 'action' },
    { id: 2, name: 'Комедия', slug: 'comedy' },
    { id: 3, name: 'Драма', slug: 'drama' },
    { id: 4, name: 'Триллер', slug: 'thriller' },
    { id: 5, name: 'Фантастика', slug: 'sci-fi' },
    { id: 6, name: 'Ужасы', slug: 'horror' },
    { id: 7, name: 'Мелодрама', slug: 'romance' },
    { id: 8, name: 'Детектив', slug: 'mystery' },
    { id: 9, name: 'Приключения', slug: 'adventure' },
    { id: 10, name: 'Аниме', slug: 'anime' },
];

// Количество элементов на странице
export const ITEMS_PER_PAGE = [10, 20, 30, 50];