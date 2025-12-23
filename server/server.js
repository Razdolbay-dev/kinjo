// server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const contentRoutes = require('./routes/content');
const db = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Безопасность
app.use(helmet());
app.use(cors());

// Парсинг JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Маршруты
app.use('/api/content', contentRoutes);

// Проверка здоровья
app.get('/health', async (req, res) => {
    try {
        await db.execute('SELECT 1');
        res.json({
            status: 'healthy',
            database: 'connected',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            database: 'disconnected',
            error: error.message
        });
    }
});

// Тестовые данные
app.get('/api/test/content', async (req, res) => {
    try {
        const data = await db.execute('SELECT id, title, year FROM contents LIMIT 10');
        res.json({
            success: true,
            data,
            total: data.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Тестовая фильтрация
app.post('/api/test/filter', async (req, res) => {
    try {
        const { filters = {}, page = 1, limit = 20 } = req.body;

        let sql = 'SELECT id, title, year, poster_url FROM contents WHERE 1=1';
        const params = [];

        if (filters.year) {
            sql += ' AND year = ?';
            params.push(filters.year);
        }

        if (filters.title) {
            sql += ' AND title LIKE ?';
            params.push(`%${filters.title}%`);
        }

        const offset = (page - 1) * limit;
        sql += ' LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const data = await db.execute(sql, params);

        // Получаем общее количество
        const countSql = 'SELECT COUNT(*) as total FROM contents WHERE 1=1';
        const countParams = params.slice(0, -2);
        const [countResult] = await db.execute(countSql, countParams);

        res.json({
            success: true,
            data,
            meta: {
                page,
                limit,
                total: countResult[0]?.total || 0,
                total_pages: Math.ceil((countResult[0]?.total || 0) / limit)
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// 404 обработчик
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Обработчик ошибок
app.use((err, req, res, next) => {
    console.error(err.stack);

    res.status(err.status || 500).json({
        success: false,
        message: process.env.NODE_ENV === 'development'
            ? err.message
            : 'Internal server error'
    });
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 API available at http://localhost:${PORT}/api/content`);
    console.log(`🩺 Health check at http://localhost:${PORT}/health`);
    console.log(`🧪 Test endpoints:`);
    console.log(`   GET  http://localhost:${PORT}/api/test/content`);
    console.log(`   POST http://localhost:${PORT}/api/test/filter`);
});