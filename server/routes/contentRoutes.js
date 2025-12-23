const express = require('express');
const router = express.Router();
const contentController = require('../controllers/contentController');
const { pool } = require('../config/db_mysql');
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


// GET /api/contents/by-type/:typeId - получить контент по типу (альтернативный endpoint)
router.get('/by-type/:typeId', async (req, res) => {
    let connection;
    try {
        const { typeId } = req.params;
        const { limit = 20, offset = 0 } = req.query;

        connection = await pool.getConnection();

        const [rows] = await connection.query(
            `SELECT c.*
             FROM contents c
             WHERE c.content_type_id = ?
             ORDER BY c.year DESC
                 LIMIT ? OFFSET ?`,
            [typeId, parseInt(limit), parseInt(offset)]
        );

        const [countResult] = await connection.query(
            'SELECT COUNT(*) as total FROM contents WHERE content_type_id = ?',
            [typeId]
        );

        res.json({
            success: true,
            data: rows,
            total: countResult[0].total
        });
    } catch (error) {
        console.error('Error fetching contents by type:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка при получении контента по типу'
        });
    } finally {
        if (connection) connection.release();
    }
});

module.exports = router;