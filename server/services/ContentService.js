// services/ContentService.js
const QueryBuilder = require('../utils/QueryBuilder');
const db = require('../config/database');

class ContentService {
    /**
     * Получение контента с фильтрацией
     */
    async getFilteredContent(filters = {}) {
        const {
            genres,
            countries,
            years,
            content_types,
            rating,
            voice_authors,
            is_lgbt,
            duration,
            exclusive,
            search,
            sort,
            pagination
        } = filters;

        const queryBuilder = new QueryBuilder();

        // Применяем фильтры
        if (genres) queryBuilder.filterByGenres(genres);
        if (countries) queryBuilder.filterByCountries(countries);
        if (voice_authors) queryBuilder.filterByVoiceAuthors(voice_authors);
        if (content_types) queryBuilder.filterByContentTypes(content_types);

        if (years) {
            queryBuilder.filterByYears(years.min, years.max);
        }

        if (duration) {
            queryBuilder.filterByDuration(duration.min, duration.max);
        }

        if (rating) {
            queryBuilder.filterByRating(
                rating.source,
                rating.min,
                rating.max
            );
        }

        if (is_lgbt !== undefined) {
            queryBuilder.filterByLgbt(is_lgbt);
        }

        if (exclusive !== undefined) {
            queryBuilder.filterByExclusive(exclusive);
        }

        // Поиск
        if (search && search.query) {
            queryBuilder.search(
                search.query,
                search.fields || ['title', 'original_title', 'description']
            );
        }

        // Сортировка
        if (sort) {
            queryBuilder.sort(sort.field, sort.order);
        } else {
            queryBuilder.sort('year', 'DESC'); // Сортировка по умолчанию
        }

        // Пагинация
        const page = pagination?.page || 1;
        const perPage = pagination?.per_page || 20;
        queryBuilder.paginate(page, perPage);

        // Получаем данные
        const { sql, params } = queryBuilder.build();
        const { sql: countSql, params: countParams } = queryBuilder.buildCount();

        // Выполняем оба запроса параллельно
        const [content, countResult] = await Promise.all([
            db.execute(sql, params),
            db.execute(countSql, countParams)
        ]);

        const total = countResult[0][0]?.total || 0;
        const totalPages = Math.ceil(total / perPage);

        return {
            data: content[0],
            meta: {
                page,
                per_page: perPage,
                total,
                total_pages: totalPages,
                has_next_page: page < totalPages,
                has_prev_page: page > 1
            }
        };
    }

    /**
     * Получение контента по ID со всеми связями
     */
    async getContentById(id) {
        const sql = `
            SELECT 
                c.*,
                ct.name as content_type_name,
                ct.slug as content_type_slug,
                GROUP_CONCAT(DISTINCT g.name) as genres,
                GROUP_CONCAT(DISTINCT co.name) as countries,
                GROUP_CONCAT(DISTINCT va.name) as voice_authors,
                JSON_OBJECTAGG(
                    r.source, 
                    JSON_OBJECT('rating', r.rating, 'votes', r.votes)
                ) as ratings
            FROM contents c
            LEFT JOIN content_types ct ON c.content_type_id = ct.id
            LEFT JOIN content_genres cg ON c.id = cg.content_id
            LEFT JOIN genres g ON cg.genre_id = g.id
            LEFT JOIN content_countries cc ON c.id = cc.content_id
            LEFT JOIN countries co ON cc.country_id = co.id
            LEFT JOIN content_voice_authors cva ON c.id = cva.content_id
            LEFT JOIN voice_authors va ON cva.voice_author_id = va.id
            LEFT JOIN ratings r ON c.id = r.content_id
            WHERE c.id = ?
            GROUP BY c.id
        `;

        const [rows] = await db.execute(sql, [id]);

        if (rows.length === 0) {
            return null;
        }

        // Преобразуем результат в удобный формат
        const content = rows[0];

        // Парсим JSON рейтингов
        if (content.ratings) {
            try {
                content.ratings = JSON.parse(content.ratings);
            } catch (e) {
                content.ratings = {};
            }
        }

        // Преобразуем строки в массивы
        content.genres = content.genres ? content.genres.split(',') : [];
        content.countries = content.countries ? content.countries.split(',') : [];
        content.voice_authors = content.voice_authors ? content.voice_authors.split(',') : [];

        return content;
    }

    /**
     * Получение похожего контента
     */
    async getSimilarContent(contentId, limit = 10) {
        const sql = `
            SELECT 
                c.*,
                -- Подсчет совпадений по жанрам
                (
                    SELECT COUNT(*) 
                    FROM content_genres cg1
                    INNER JOIN content_genres cg2 ON cg1.genre_id = cg2.genre_id
                    WHERE cg1.content_id = c.id AND cg2.content_id = ?
                ) as genre_matches,
                -- Подсчет совпадений по странам
                (
                    SELECT COUNT(*) 
                    FROM content_countries cc1
                    INNER JOIN content_countries cc2 ON cc1.country_id = cc2.country_id
                    WHERE cc1.content_id = c.id AND cc2.content_id = ?
                ) as country_matches
            FROM contents c
            WHERE c.id != ?
            HAVING genre_matches > 0 OR country_matches > 0
            ORDER BY (genre_matches * 2 + country_matches) DESC, c.year DESC
            LIMIT ?
        `;

        const [rows] = await db.execute(sql, [contentId, contentId, contentId, limit]);
        return rows;
    }

    /**
     * Статистика контента
     */
    async getContentStats() {
        const stats = {};

        // Общее количество
        const [totalCount] = await db.execute('SELECT COUNT(*) as count FROM contents');
        stats.total = totalCount[0].count;

        // По годам
        const [byYear] = await db.execute(`
            SELECT year, COUNT(*) as count 
            FROM contents 
            WHERE year > 0 
            GROUP BY year 
            ORDER BY year DESC
        `);
        stats.by_year = byYear;

        // По типам контента
        const [byType] = await db.execute(`
            SELECT ct.name, COUNT(*) as count
            FROM contents c
            INNER JOIN content_types ct ON c.content_type_id = ct.id
            GROUP BY c.content_type_id
        `);
        stats.by_type = byType;

        return stats;
    }
}

module.exports = new ContentService();