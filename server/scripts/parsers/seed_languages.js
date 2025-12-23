// seed_languages.js
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

const API_URL = 'https://catalog-sync-api.rstprgapipt.com/v1/filters/languages';

// ===== 2. ФУНКЦИЯ ДЛЯ ЗАПРОСА К API =====
async function fetchLanguagesFromApi() {
    console.log(`Запрашиваю данные с API: ${API_URL}`);

    try {
        const response = await axios.get(API_URL, {
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${API_TOKEN}`
            },
            timeout: 10000
        });

        console.log(`✅ Данные успешно получены. Записей: ${response.data.length}`);

        // Выводим пример для проверки структуры
        if (response.data.length > 0) {
            console.log('Пример записи:', JSON.stringify(response.data[0]));
        }

        return response.data; // Ожидаем массив объектов [{id, name, slug}, ...]

    } catch (error) {
        console.error('❌ Ошибка при запросе к API:');
        if (error.response) {
            console.error(`   Статус: ${error.response.status}`);

            if (error.response.status === 401) {
                console.error('   Ошибка 401: Неавторизованный доступ.');
                console.error('   Проверьте правильность Bearer токена.');
            }
        } else if (error.request) {
            console.error('   Не удалось получить ответ от сервера.');
        } else {
            console.error('   Ошибка настройки запроса:', error.message);
        }
        throw error;
    }
}

// ===== 3. ФУНКЦИЯ ДЛЯ ВСТАВКИ ДАННЫХ В MYSQL =====
async function insertLanguagesIntoDB(languages) {
    if (!languages || languages.length === 0) {
        console.log('⚠️ Нет данных для вставки');
        return { total: 0, added: 0, skipped: 0 };
    }

    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Подключение к базе данных установлено');

        // Убираем дубликаты на уровне приложения
        const uniqueMap = new Map();
        languages.forEach(lang => {
            const key = `${lang.id}-${lang.name}-${lang.slug}`;
            uniqueMap.set(key, lang);
        });

        const uniqueLanguages = Array.from(uniqueMap.values());
        console.log(`   Уникальных записей: ${uniqueLanguages.length}`);

        // Подготавливаем данные для массовой вставки
        const languagesData = uniqueLanguages.map(lang => [lang.id, lang.name, lang.slug]);

        // Используем INSERT IGNORE для защиты от дубликатов
        const sql = `
            INSERT IGNORE INTO languages (id, name, slug)
            VALUES ?
        `;

        const [result] = await connection.query(sql, [languagesData]);

        console.log(`\n📊 Результат:`);
        console.log(`   Получено из API: ${languages.length}`);
        console.log(`   Уникальных: ${uniqueLanguages.length}`);
        console.log(`   Успешно добавлено: ${result.affectedRows}`);
        console.log(`   Уже существовало: ${uniqueLanguages.length - result.affectedRows}`);

        return {
            total: languages.length,
            unique: uniqueLanguages.length,
            added: result.affectedRows,
            skipped: uniqueLanguages.length - result.affectedRows
        };

    } catch (error) {
        console.error('❌ Ошибка при вставке данных в базу:');

        if (error.code === 'ER_NO_SUCH_TABLE') {
            console.error('   Таблица "languages" не найдена!');
            console.error('   Создайте таблицу командой:');
            console.error(`
                CREATE TABLE languages (
                    id INT PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    slug VARCHAR(255) NOT NULL UNIQUE
                );
            `);
        }

        console.error(`   Детали: ${error.message}`);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Соединение с базой данных закрыто');
        }
    }
}

// ===== 4. ПРОВЕРКА СТРУКТУРЫ ТАБЛИЦЫ =====
async function checkTableStructure() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);

        // Проверяем существование таблицы
        const [tables] = await connection.query(
            "SHOW TABLES LIKE 'languages'"
        );

        if (tables.length === 0) {
            console.log('⚠️ Таблица "languages" не существует.');
            console.log('   Создаю таблицу...');

            await connection.query(`
                CREATE TABLE IF NOT EXISTS languages (
                    id INT PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    slug VARCHAR(255) NOT NULL UNIQUE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            `);

            console.log('✅ Таблица "languages" создана.');
        } else {
            console.log('✅ Таблица "languages" существует.');

            // Проверяем структуру
            const [structure] = await connection.query('DESCRIBE languages');
            console.log('Структура таблицы:');
            structure.forEach(column => {
                console.log(`   ${column.Field}: ${column.Type} ${column.Key ? `(${column.Key})` : ''}`);
            });
        }

        return true;
    } catch (error) {
        console.error('Ошибка при проверке структуры таблицы:', error.message);
        return false;
    } finally {
        if (connection) await connection.end();
    }
}

// ===== 5. ОСНОВНАЯ ЛОГИКА СКРИПТА =====
async function main() {
    console.log('=== Начинаю процесс заполнения таблицы languages ===\n');

    try {
        // 0. Проверяем и создаем таблицу при необходимости
        console.log('Проверяю структуру базы данных...');
        await checkTableStructure();

        // 1. Получаем данные с внешнего API
        const languages = await fetchLanguagesFromApi();

        // 2. Вставляем данные в локальную базу данных MySQL
        const stats = await insertLanguagesIntoDB(languages);

        console.log('\n=== Готово! ===');
        console.log(`Итог: обработано ${stats.total} записей, добавлено ${stats.added} новых.`);

    } catch (error) {
        console.error('\n❌ Скрипт завершился с ошибкой.');
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
    fetchLanguagesFromApi,
    insertLanguagesIntoDB,
    checkTableStructure
};