const express = require('express');
const router = express.Router();
const FilterController = require('../controllers/FilterController');
const { body, query, param } = require('express-validator');

// Валидация для фильтров
const filterValidation = [
    body('filters.genres').optional().isArray(),
    body('filters.countries').optional().isArray(),
    body('filters.years.min').optional().isInt({ min: 1900, max: 2100 }),
    body('filters.years.max').optional().isInt({ min: 1900, max: 2100 }),
    body('filters.content_types').optional().isArray(),
    body('filters.rating.source').optional().isIn(['imdb', 'kinopoisk', 'tmdb']),
    body('filters.rating.min').optional().isFloat({ min: 0, max: 10 }),
    body('filters.rating.max').optional().isFloat({ min: 0, max: 10 }),
    body('filters.voice_authors').optional().isArray(),
    body('filters.is_lgbt').optional().isBoolean(),
    body('filters.duration.min').optional().isInt({ min: 1 }),
    body('filters.duration.max').optional().isInt({ min: 1 }),
    body('search.query').optional().isString().trim(),
    body('search.fields').optional().isArray(),
    body('sort.field').optional().isIn(['year', 'created_at', 'updated_at', 'title']),
    body('sort.order').optional().isIn(['ASC', 'DESC']),
    body('pagination.page').optional().isInt({ min: 1 }),
    body('pagination.per_page').optional().isInt({ min: 1, max: 100 })
];

// Основные эндпоинты
router.post('/filter', filterValidation, FilterController.getFilteredContent);
router.get('/filters/available', FilterController.getAvailableFilters);
router.get('/search/quick', FilterController.quickSearch);
router.get('/:id', param('id').isInt(), FilterController.getContentById);
router.get('/:id/similar', param('id').isInt(), FilterController.getSimilarContent);

module.exports = router;