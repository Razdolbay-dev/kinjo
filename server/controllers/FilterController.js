// controllers/FilterController.js
const ContentService = require('../services/ContentService');
const FilterService = require('../services/FilterService');
const { validationResult } = require('express-validator');

class FilterController {
    /**
     * Получение фильтрованного контента
     */
    async getFilteredContent(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    errors: errors.array()
                });
            }

            const filters = req.body.filters || {};
            const search = req.body.search;
            const sort = req.body.sort;
            const pagination = req.body.pagination;

            const result = await ContentService.getFilteredContent({
                ...filters,
                search,
                sort,
                pagination
            });

            res.json({
                success: true,
                data: result.data,
                meta: result.meta
            });

        } catch (error) {
            console.error('Filter error:', error);
            res.status(500).json({
                success: false,
                message: 'Ошибка при фильтрации контента',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Получение доступных фильтров
     */
    async getAvailableFilters(req, res) {
        try {
            const filters = await FilterService.getAvailableFilters();

            res.json({
                success: true,
                data: filters
            });

        } catch (error) {
            console.error('Get filters error:', error);
            res.status(500).json({
                success: false,
                message: 'Ошибка при получении фильтров'
            });
        }
    }

    /**
     * Быстрый поиск
     */
    async quickSearch(req, res) {
        try {
            const { query, limit = 10 } = req.query;

            if (!query || query.length < 2) {
                return res.json({
                    success: true,
                    data: [],
                    meta: { total: 0 }
                });
            }

            const sql = `
                SELECT 
                    c.id, 
                    c.title, 
                    c.original_title,
                    c.poster_url,
                    c.year,
                    c.description,
                    MATCH(c.title, c.original_title, c.description) AGAINST(?) as relevance
                FROM contents c
                WHERE MATCH(c.title, c.original_title, c.description) AGAINST(? IN BOOLEAN MODE)
                ORDER BY relevance DESC
                LIMIT ?
            `;

            const [results] = await db.execute(sql, [query, `*${query}*`, limit]);

            res.json({
                success: true,
                data: results,
                meta: { total: results.length }
            });

        } catch (error) {
            console.error('Quick search error:', error);
            res.status(500).json({
                success: false,
                message: 'Ошибка при поиске'
            });
        }
    }

    /**
     * Получение контента по ID
     */
    async getContentById(req, res) {
        try {
            const { id } = req.params;

            const content = await ContentService.getContentById(id);

            if (!content) {
                return res.status(404).json({
                    success: false,
                    message: 'Контент не найден'
                });
            }

            res.json({
                success: true,
                data: content
            });

        } catch (error) {
            console.error('Get content error:', error);
            res.status(500).json({
                success: false,
                message: 'Ошибка при получении контента'
            });
        }
    }

    /**
     * Получение похожего контента
     */
    async getSimilarContent(req, res) {
        try {
            const { id } = req.params;
            const { limit = 10 } = req.query;

            const similar = await ContentService.getSimilarContent(id, limit);

            res.json({
                success: true,
                data: similar,
                meta: { total: similar.length }
            });

        } catch (error) {
            console.error('Get similar error:', error);
            res.status(500).json({
                success: false,
                message: 'Ошибка при получении похожего контента'
            });
        }
    }
}

module.exports = new FilterController();