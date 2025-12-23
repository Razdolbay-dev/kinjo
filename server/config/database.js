// config/database.js
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'veodb',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'veoveo_db',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

// Утилита для выполнения запросов
const db = {
    async execute(sql, params = []) {
        const connection = await pool.getConnection();
        try {
            const [rows] = await connection.execute(sql, params);
            return [rows];
        } finally {
            connection.release();
        }
    },

    async query(sql, params = []) {
        const connection = await pool.getConnection();
        try {
            const [rows] = await connection.query(sql, params);
            return rows;
        } finally {
            connection.release();
        }
    }
};

module.exports = db;