// seed_voice_authors.js
const axios = require('axios');
const mysql = require('mysql2/promise'); // Изменено: используем промисную версию
require('dotenv').config();

// ===== 1. КОНФИГУРАЦИЯ =====
// Укажите ваш JWT-токен для доступа к API
const API_TOKEN = process.env.API_TOKEN;

// Конфигурация подключения к вашей базе данных MySQL
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

const API_URL = 'https://catalog-sync-api.rstprgapipt.com/v1/filters/voice-authors';

// ===== 2. ФУНКЦИЯ ДЛЯ ЗАПРОСА К API =====
async function fetchVoiceAuthorsFromApi() {
    console.log(`Запрашиваю данные с API: ${API_URL}`);

    try {
        const response = await axios.get(API_URL, {
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${API_TOKEN}`
            },
            timeout: 30000
        });

        console.log(`✅ Данные успешно получены. Записей: ${response.data.length}`);
        return response.data;

    } catch (error) {
        console.error('❌ Ошибка при запросе к API:');
        if (error.response) {
            console.error(`   Статус: ${error.response.status}`);
            console.error(`   Данные:`, error.response.data);
        } else if (error.request) {
            console.error('   Не удалось получить ответ от сервера.');
        } else {
            console.error('   Ошибка настройки запроса:', error.message);
        }
        throw error;
    }
}

// ===== 3. ФУНКЦИЯ ДЛЯ ВСТАВКИ ДАННЫХ В MYSQL =====
async function insertVoiceAuthorsIntoDB(authors) {
    if (!authors || authors.length === 0) {
        console.log('⚠️ Нет данных для вставки');
        return;
    }

    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Подключение к базе данных установлено');

        const authorsData = authors.map(author => [author.id, author.name]);

        // Вариант 1: Игнорировать полностью идентичные записи
        const sql = `
            INSERT IGNORE INTO voice_authors (id, name)
            VALUES ?
        `;

        // Вариант 2: Более строгий - проверять и id и name
        const sqlStrict = `
            INSERT INTO voice_authors (id, name)
            VALUES ?
            ON DUPLICATE KEY UPDATE 
                id = IF(VALUES(name) = name, id, VALUES(id))
        `;

        // Вариант 3: Самый надежный - проверять существование перед вставкой
        const sqlSafe = `
            INSERT INTO voice_authors (id, name)
            SELECT * FROM (
                SELECT ? as id, ? as name
            ) AS new_data
            WHERE NOT EXISTS (
                SELECT 1 FROM voice_authors 
                WHERE id = ? AND name = ?
            )
        `;

        // Используем вариант 1 - самый быстрый
        const [result] = await connection.query(sql, [authorsData]);

        console.log(`✅ Данные обработаны.`);
        console.log(`   Всего записей для обработки: ${authors.length}`);
        console.log(`   Добавлено новых записей: ${result.affectedRows}`);
        console.log(`   Пропущено (уже существуют): ${authors.length - result.affectedRows}`);

        return result;

    } catch (error) {
        console.error('❌ Ошибка при вставке данных в базу:');
        console.error(error.message);
        throw error;
    } finally {
        if (connection) await connection.end();
    }
}

// ===== 4. ПРОВЕРКА ПОДКЛЮЧЕНИЯ К БАЗЕ =====
async function testDatabaseConnection() {
    console.log('Проверяю подключение к базе данных...');

    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.query('SELECT 1 as test');
        console.log('✅ Подключение к базе данных успешно');
        return true;
    } catch (error) {
        console.error('❌ Ошибка подключения к базе данных:');
        console.error(`   Хост: ${dbConfig.host}:${dbConfig.port}`);
        console.error(`   База: ${dbConfig.database}`);
        console.error(`   Пользователь: ${dbConfig.user}`);
        console.error(`   Ошибка: ${error.message}`);
        return false;
    } finally {
        if (connection) await connection.end();
    }
}

// ===== 5. ОСНОВНАЯ ЛОГИКА СКРИПТА =====
async function main() {
    console.log('=== Начинаю процесс заполнения таблицы voice_authors ===\n');

    try {
        // 0. Проверяем подключение к базе
        const canConnect = await testDatabaseConnection();
        if (!canConnect) {
            throw new Error('Не удалось подключиться к базе данных');
        }

        // 1. Получаем данные с внешнего API
        const voiceAuthors = await fetchVoiceAuthorsFromApi();

        // 2. Вставляем данные в локальную базу данных MySQL
        await insertVoiceAuthorsIntoDB(voiceAuthors);

        console.log('\n=== Готово! ===');

    } catch (error) {
        console.error('\n❌ Скрипт завершился с ошибкой:');
        console.error(error.message);
        process.exit(1);
    }
}

// Запускаем основной процесс
if (require.main === module) {
    main().catch(error => {
        console.error('Непредвиденная ошибка:', error);
        process.exit(1);
    });
}

// Экспортируем функции для тестирования
module.exports = {
    fetchVoiceAuthorsFromApi,
    insertVoiceAuthorsIntoDB,
    testDatabaseConnection
};