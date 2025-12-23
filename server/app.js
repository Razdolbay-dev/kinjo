const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { testConnection } = require('./config/database');
const contentRoutes = require('./routes/contentRoutes');
const errorHandler = require('./middlewares/errorHandler');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// Проверка подключения к БД
testConnection();

// Middleware
app.use(helmet());
app.use(cors());

// Лимитер запросов
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 минут
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100, // максимум 100 запросов
    message: {
        success: false,
        error: 'Слишком много запросов с этого IP. Пожалуйста, попробуйте позже.'
    }
});
app.use('/api/', limiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Логирование запросов
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.url}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });
    next();
});

// Маршруты
app.use('/api', contentRoutes);

// Главная страница
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Movie Search API',
        version: '1.0.0',
        endpoints: {
            search: '/api/search?title=название',
            advancedSearch: '/api/advanced-search?title=название&year=2023',
            getById: '/api/content/:id',
            popular: '/api/popular'
        }
    });
});

// Обработка 404
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Маршрут не найден'
    });
});

// Обработчик ошибок
app.use(errorHandler);

// Запуск сервера
app.listen(PORT, () => {
    logger.info(`🚀 Server running on port ${PORT}`);
    logger.info(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Обработка необработанных исключений
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
});

module.exports = app;