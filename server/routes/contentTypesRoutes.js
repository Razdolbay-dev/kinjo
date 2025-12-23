const express = require('express');
const router = express.Router();
const { pool } = require('../config/db_mysql');

// GET /api/content-types - получить все типы контента
router.get('/', async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const [rows] = await connection.query('SELECT * FROM content_types ORDER BY id');

        res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error('Error fetching content types:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка при получении типов контента'
        });
    } finally {
        if (connection) connection.release();
    }
});

// GET /api/content-types/:slug - получить тип контента по slug
router.get('/:slug', async (req, res) => {
    let connection;
    try {
        const { slug } = req.params;
        connection = await pool.getConnection();

        const [rows] = await connection.query(
            'SELECT * FROM content_types WHERE slug = ?',
            [slug]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Тип контента не найден'
            });
        }

        res.json({
            success: true,
            data: rows[0]
        });
    } catch (error) {
        console.error('Error fetching content type:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка при получении типа контента'
        });
    } finally {
        if (connection) connection.release();
    }
});

// GET /api/content-types/:slug/contents - получить контент по типу
router.get('/:slug/contents', async (req, res) => {
    let connection;
    try {
        const { slug } = req.params;
        const {
            limit = 20,
            offset = 0,
            year,
            sort_by = 'year',
            sort_order = 'desc'
        } = req.query;

        connection = await pool.getConnection();

        // Получаем ID типа контента по slug
        const [typeRows] = await connection.query(
            'SELECT id, name FROM content_types WHERE slug = ?',
            [slug]
        );

        if (typeRows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Тип контента не найден'
            });
        }

        const contentTypeId = typeRows[0].id;
        const contentTypeName = typeRows[0].name;

        // Формируем запрос
        let query = `
            SELECT c.*
            FROM contents c
            WHERE c.content_type_id = ?
        `;
        const params = [contentTypeId];

        // Фильтр по году
        if (year) {
            query += ' AND c.year = ?';
            params.push(year);
        }

        // Сортировка
        const allowedSortFields = ['year', 'title', 'created_at'];
        const sortField = allowedSortFields.includes(sort_by) ? sort_by : 'year';
        const sortDir = sort_order === 'asc' ? 'ASC' : 'DESC';

        query += ` ORDER BY c.${sortField} ${sortDir}`;

        // Лимит и оффсет
        query += ' LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        // Запрос на общее количество
        let countQuery = 'SELECT COUNT(*) as total FROM contents WHERE content_type_id = ?';
        const countParams = [contentTypeId];

        if (year) {
            countQuery += ' AND year = ?';
            countParams.push(year);
        }

        const [contents] = await connection.query(query, params);
        const [countResult] = await connection.query(countQuery, countParams);

        res.json({
            success: true,
            data: contents,
            total: countResult[0].total,
            contentType: {
                id: contentTypeId,
                name: contentTypeName,
                slug: slug
            }
        });
    } catch (error) {
        console.error('Error fetching contents by type:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка при получении контента'
        });
    } finally {
        if (connection) connection.release();
    }
});

module.exports = router;