const express = require('express');
const router = express.Router();
const contentController = require('../controllers/contentController');

/**
 * @route   GET /api/search
 * @desc    Поиск контента по названию
 * @access  Public
 * @query   {string} title - Название для поиска
 * @query   {number} [limit=20] - Лимит результатов
 * @query   {number} [offset=0] - Смещение
 * @query   {boolean} [exact=false] - Точное совпадение
 */
router.get('/search', contentController.searchByTitle);

/**
 * @route   GET /api/advanced-search
 * @desc    Расширенный поиск с фильтрами
 * @access  Public
 */
router.get('/advanced-search', contentController.advancedSearch);

/**
 * @route   GET /api/content/:id
 * @desc    Получение контента по ID
 * @access  Public
 */
router.get('/content/:id', contentController.getById);

/**
 * @route   GET /api/popular
 * @desc    Получение популярного контента
 * @access  Public
 */
router.get('/popular', contentController.getPopular);

module.exports = router;