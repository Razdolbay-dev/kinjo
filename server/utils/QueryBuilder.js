// utils/QueryBuilder.js
class QueryBuilder {
    constructor() {
        this.query = {
            select: [],
            from: 'contents c',
            joins: [],
            where: [],
            groupBy: [],
            having: [],
            orderBy: [],
            limit: null,
            offset: null,
            params: []
        };
    }

    /**
     * Добавляет фильтр по жанрам
     */
    filterByGenres(genreIds) {
        if (!genreIds || !Array.isArray(genreIds) || genreIds.length === 0) {
            return this;
        }

        // Для фильтрации по нескольким жанрам (логическое И)
        if (genreIds.length === 1) {
            this.query.joins.push({
                type: 'INNER',
                table: 'content_genres cg',
                condition: 'c.id = cg.content_id AND cg.genre_id = ?'
            });
            this.query.params.push(genreIds[0]);
        } else {
            // Для нескольких жанров используем подзапрос
            const subquery = `
                SELECT content_id 
                FROM content_genres 
                WHERE genre_id IN (${genreIds.map(() => '?').join(',')})
                GROUP BY content_id 
                HAVING COUNT(DISTINCT genre_id) = ?
            `;

            this.query.joins.push({
                type: 'INNER',
                table: `(${subquery}) genres_filter`,
                condition: 'c.id = genres_filter.content_id'
            });

            this.query.params.push(...genreIds, genreIds.length);
        }

        return this;
    }

    /**
     * Фильтр по рейтингу
     */
    filterByRating(source, minRating, maxRating) {
        if (!source) return this;

        const ratingAlias = `r_${source}`;

        this.query.joins.push({
            type: 'LEFT',
            table: `ratings ${ratingAlias}`,
            condition: `c.id = ${ratingAlias}.content_id AND ${ratingAlias}.source = ?`
        });

        this.query.params.push(source);

        const conditions = [];
        if (minRating !== undefined) {
            conditions.push(`${ratingAlias}.rating >= ?`);
            this.query.params.push(minRating);
        }
        if (maxRating !== undefined) {
            conditions.push(`${ratingAlias}.rating <= ?`);
            this.query.params.push(maxRating);
        }

        if (conditions.length > 0) {
            this.query.where.push(`(${conditions.join(' AND ')})`);
        }

        return this;
    }

    /**
     * Фильтр по странам
     */
    filterByCountries(countryIds) {
        if (!countryIds || countryIds.length === 0) return this;

        this.query.joins.push({
            type: 'INNER',
            table: 'content_countries cc',
            condition: 'c.id = cc.content_id'
        });

        this.query.where.push(`cc.country_id IN (${countryIds.map(() => '?').join(',')})`);
        this.query.params.push(...countryIds);

        return this;
    }

    /**
     * Фильтр по годам
     */
    filterByYears(minYear, maxYear) {
        const conditions = [];

        if (minYear) {
            conditions.push('c.year >= ?');
            this.query.params.push(minYear);
        }

        if (maxYear) {
            conditions.push('c.year <= ?');
            this.query.params.push(maxYear);
        }

        if (conditions.length > 0) {
            this.query.where.push(`(${conditions.join(' AND ')})`);
        }

        return this;
    }

    /**
     * Фильтр по авторам озвучки
     */
    filterByVoiceAuthors(authorIds) {
        if (!authorIds || authorIds.length === 0) return this;

        this.query.joins.push({
            type: 'INNER',
            table: 'content_voice_authors cva',
            condition: 'c.id = cva.content_id'
        });

        this.query.where.push(`cva.voice_author_id IN (${authorIds.map(() => '?').join(',')})`);
        this.query.params.push(...authorIds);

        return this;
    }

    /**
     * Фильтр по типу контента
     */
    filterByContentTypes(typeIds) {
        if (!typeIds || typeIds.length === 0) return this;

        this.query.where.push(`c.content_type_id IN (${typeIds.map(() => '?').join(',')})`);
        this.query.params.push(...typeIds);

        return this;
    }

    /**
     * Фильтр по длительности
     */
    filterByDuration(minMinutes, maxMinutes) {
        const conditions = [];

        if (minMinutes) {
            conditions.push('c.duration >= ?');
            this.query.params.push(minMinutes);
        }

        if (maxMinutes) {
            conditions.push('c.duration <= ?');
            this.query.params.push(maxMinutes);
        }

        if (conditions.length > 0) {
            this.query.where.push(`(${conditions.join(' AND ')})`);
        }

        return this;
    }

    /**
     * Фильтр по LGBT
     */
    filterByLgbt(isLgbt) {
        if (isLgbt === undefined) return this;

        this.query.where.push('c.is_lgbt = ?');
        this.query.params.push(Boolean(isLgbt));

        return this;
    }

    /**
     * Поиск по тексту
     */
    search(query, fields = ['title', 'original_title', 'description']) {
        if (!query || !fields.length) return this;

        const searchConditions = fields.map(field => {
            this.query.params.push(`%${query}%`);
            return `c.${field} LIKE ?`;
        });

        this.query.where.push(`(${searchConditions.join(' OR ')})`);

        return this;
    }

    /**
     * Сортировка
     */
    sort(field, order = 'DESC') {
        const validFields = ['year', 'created_at', 'updated_at', 'title'];
        const validOrders = ['ASC', 'DESC'];

        if (validFields.includes(field) && validOrders.includes(order.toUpperCase())) {
            this.query.orderBy.push(`c.${field} ${order}`);
        }

        return this;
    }

    /**
     * Пагинация
     */
    paginate(page = 1, perPage = 20) {
        const offset = (page - 1) * perPage;
        this.query.limit = perPage;
        this.query.offset = offset;

        return this;
    }

    /**
     * Сборка конечного SQL запроса
     */
    build() {
        let sql = 'SELECT ';

        // SELECT часть
        sql += this.query.select.length > 0
            ? this.query.select.join(', ')
            : 'c.*';

        // FROM часть
        sql += ` FROM ${this.query.from}`;

        // JOIN части
        this.query.joins.forEach(join => {
            sql += ` ${join.type} JOIN ${join.table} ON ${join.condition}`;
        });

        // WHERE часть
        if (this.query.where.length > 0) {
            sql += ' WHERE ' + this.query.where.join(' AND ');
        }

        // GROUP BY
        if (this.query.groupBy.length > 0) {
            sql += ' GROUP BY ' + this.query.groupBy.join(', ');
        }

        // HAVING
        if (this.query.having.length > 0) {
            sql += ' HAVING ' + this.query.having.join(' AND ');
        }

        // ORDER BY
        if (this.query.orderBy.length > 0) {
            sql += ' ORDER BY ' + this.query.orderBy.join(', ');
        }

        // LIMIT и OFFSET
        if (this.query.limit !== null) {
            sql += ` LIMIT ${this.query.limit}`;
            if (this.query.offset !== null) {
                sql += ` OFFSET ${this.query.offset}`;
            }
        }

        return {
            sql,
            params: this.query.params
        };
    }

    /**
     * Сборка запроса для подсчета общего количества
     */
    buildCount() {
        let sql = 'SELECT COUNT(DISTINCT c.id) as total ';
        sql += ` FROM ${this.query.from}`;

        this.query.joins.forEach(join => {
            sql += ` ${join.type} JOIN ${join.table} ON ${join.condition}`;
        });

        if (this.query.where.length > 0) {
            sql += ' WHERE ' + this.query.where.join(' AND ');
        }

        return {
            sql,
            params: this.query.params
        };
    }
}