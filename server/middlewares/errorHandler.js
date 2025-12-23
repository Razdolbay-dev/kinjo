const errorHandler = (err, req, res, next) => {
    console.error(err.stack);

    // Ошибки Sequelize
    if (err.name === 'SequelizeDatabaseError' || err.name === 'SequelizeConnectionError') {
        return res.status(503).json({
            success: false,
            error: 'Ошибка базы данных',
            message: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }

    // Ошибки валидации
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            error: 'Ошибка валидации',
            details: err.details
        });
    }

    // Ошибка 404
    if (err.status === 404) {
        return res.status(404).json({
            success: false,
            error: 'Ресурс не найден'
        });
    }

    // Ошибка по умолчанию
    res.status(err.status || 500).json({
        success: false,
        error: 'Внутренняя ошибка сервера',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
};

module.exports = errorHandler;