const Content = require('../models/Content');
const { Op } = require('sequelize');

class ContentController {
    /**
     * Поиск контента по названию
     */
    async searchByTitle(req, res, next) {
        try {
            const { title, limit = 20, offset = 0, exact = false } = req.query;

            if (!title || title.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Параметр title обязателен для поиска'
                });
            }

            const searchTerm = title.trim();

            // Настройка условий поиска
            let whereCondition;
            if (exact === 'true') {
                // Точное совпадение
                whereCondition = {
                    [Op.or]: [
                        { title: searchTerm },
                        { original_title: searchTerm }
                    ]
                };
            } else {
                // Поиск по частичному совпадению
                whereCondition = {
                    [Op.or]: [
                        { title: { [Op.like]: `%${searchTerm}%` } },
                        { original_title: { [Op.like]: `%${searchTerm}%` } }
                    ]
                };
            }

            // Выполнение запроса
            const results = await Content.findAll({
                where: whereCondition,
                limit: Math.min(parseInt(limit), 100), // Максимум 100 результатов
                offset: parseInt(offset),
                order: [
                    ['year', 'DESC'],
                    ['title', 'ASC']
                ]
            });

            // Если ничего не найдено
            if (!results || results.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Контент с таким названием не найден',
                    data: []
                });
            }

            // Форматирование ответа
            const formattedResults = results.map(content => ({
                id: content.id,
                title: content.title,
                original_title: content.original_title,
                year: content.year,
                poster_url: content.poster_url,
                description: content.description ? content.description.substring(0, 200) + '...' : null,
                duration: content.duration,
                age_restriction: content.age_restriction,
                video_quality: content.video_quality,
                player_url: content.player_url
            }));

            res.json({
                success: true,
                count: results.length,
                data: formattedResults
            });

        } catch (error) {
            next(error);
        }
    }

    /**
     * Расширенный поиск с фильтрами
     */
    async advancedSearch(req, res, next) {
        try {
            const {
                title,
                year,
                min_year,
                max_year,
                content_type_id,
                has_poster = false,
                limit = 20,
                offset = 0
            } = req.query;

            let whereCondition = {};

            // Поиск по названию
            if (title) {
                whereCondition[Op.or] = [
                    { title: { [Op.like]: `%${title}%` } },
                    { original_title: { [Op.like]: `%${title}%` } }
                ];
            }

            // Фильтр по году
            if (year) {
                whereCondition.year = year;
            } else if (min_year || max_year) {
                whereCondition.year = {};
                if (min_year) whereCondition.year[Op.gte] = min_year;
                if (max_year) whereCondition.year[Op.lte] = max_year;
            }

            // Фильтр по типу контента
            if (content_type_id) {
                whereCondition.content_type_id = content_type_id;
            }

            // Только с постером
            if (has_poster === 'true') {
                whereCondition.poster_url = { [Op.not]: null };
            }

            // Выполнение запроса
            const results = await Content.findAll({
                where: whereCondition,
                limit: Math.min(parseInt(limit), 100),
                offset: parseInt(offset),
                order: [['year', 'DESC']]
            });

            res.json({
                success: true,
                count: results.length,
                data: results
            });

        } catch (error) {
            next(error);
        }
    }

    /**
     * Получение контента по ID
     */
    async getById(req, res, next) {
        try {
            const { id } = req.params;

            const content = await Content.findByPk(id);

            if (!content) {
                return res.status(404).json({
                    success: false,
                    error: 'Контент не найден'
                });
            }

            // Здесь можно добавить связанные данные (жанры, страны, рейтинги)
            // Например:
            // const ratings = await Rating.findAll({ where: { content_id: id } });

            res.json({
                success: true,
                data: content
            });

        } catch (error) {
            next(error);
        }
    }

    /**
     * Получение популярного контента
     */
    async getPopular(req, res, next) {
        try {
            const { limit = 10 } = req.query;

            const popularContent = await Content.findAll({
                where: {
                    year: { [Op.gte]: new Date().getFullYear() - 5 } // Фильмы последних 5 лет
                },
                limit: parseInt(limit),
                order: [
                    ['year', 'DESC'],
                    ['created_at', 'DESC']
                ]
            });

            res.json({
                success: true,
                count: popularContent.length,
                data: popularContent
            });

        } catch (error) {
            next(error);
        }
    }
}

module.exports = new ContentController();