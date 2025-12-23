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
// URL эндпоинта API для получения списка субтитров
const API_URL = 'https://catalog-sync-api.rstprgapipt.com/v1/filters/subtitles';

// ===== 2. ФУНКЦИЯ ДЛЯ ЗАПРОСА К API =====
async function fetchSubtitlesFromApi() {
    console.log(`Запрашиваю данные с API: ${API_URL}`);

    try {
        const response = await axios.get(API_URL, {
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${API_TOKEN}` // Используем тот же токен
            },
            timeout: 10000
        });

        console.log(`✅ Данные успешно получены. Записей: ${response.data.length}`);

        // Проверяем структуру данных, если API может вернуть другой формат
        // Пример обработки если данные приходят в другом формате
        if (response.data.length > 0) {
            console.log('Пример первой записи:', JSON.stringify(response.data[0]));
        }

        return response.data; // Ожидаем массив объектов [{id, name}, ...]

    } catch (error) {
        console.error('❌ Ошибка при запросе к API:');
        if (error.response) {
            console.error(`   Статус: ${error.response.status}`);
            console.error(`   Данные:`, error.response.data);

            // Обработка специфичных ошибок
            if (error.response.status === 401) {
                console.error('   Ошибка 401: Неавторизованный доступ.');
                console.error('   Проверьте правильность Bearer токена в переменной API_TOKEN.');
                console.error('   Убедитесь, что токен имеет доступ к эндпоинту /v1/filters/subtitles');
            } else if (error.response.status === 403) {
                console.error('   Ошибка 403: Доступ запрещен.');
                console.error('   У вашего токена нет прав для доступа к этому ресурсу.');
            } else if (error.response.status === 404) {
                console.error('   Ошибка 404: Ресурс не найден.');
                console.error('   Проверьте правильность URL эндпоинта.');
            }
        } else if (error.request) {
            console.error('   Не удалось получить ответ от сервера. Проверьте сеть или URL.');
        } else {
            console.error('   Ошибка настройки запроса:', error.message);
        }
        throw error;
    }
}

// ===== 3. ФУНКЦИЯ ДЛЯ ВСТАВКИ ДАННЫХ В MYSQL =====
async function insertSubtitlesIntoDB(subtitles) {
    if (!subtitles || subtitles.length === 0) {
        console.log('⚠️ Нет данных для вставки');
        return { total: 0, added: 0, skipped: 0 };
    }

    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Подключение к базе данных установлено');

        // Убираем дубликаты на уровне приложения (дополнительная защита)
        const uniqueMap = new Map();
        subtitles.forEach(subtitle => {
            // Используем комбинацию id и name как ключ
            const key = `${subtitle.id}-${subtitle.name}`;
            uniqueMap.set(key, subtitle);
        });

        const uniqueSubtitles = Array.from(uniqueMap.values());
        console.log(`   Уникальных записей: ${uniqueSubtitles.length}`);

        // Подготавливаем данные для массовой вставки
        const subtitlesData = uniqueSubtitles.map(subtitle => [subtitle.id, subtitle.name]);

        // Используем INSERT IGNORE для защиты от дубликатов по PRIMARY KEY (id)
        const sql = `
            INSERT IGNORE INTO subtitles (id, name)
            VALUES ?
        `;

        const [result] = await connection.query(sql, [subtitlesData]);

        console.log(`\n📊 Результат:`);
        console.log(`   Получено из API: ${subtitles.length}`);
        console.log(`   Уникальных: ${uniqueSubtitles.length}`);
        console.log(`   Успешно добавлено: ${result.affectedRows}`);
        console.log(`   Уже существовало: ${uniqueSubtitles.length - result.affectedRows}`);

        // Возвращаем статистику
        return {
            total: subtitles.length,
            unique: uniqueSubtitles.length,
            added: result.affectedRows,
            skipped: uniqueSubtitles.length - result.affectedRows
        };

    } catch (error) {
        console.error('❌ Ошибка при вставке данных в базу:');

        // Обработка специфичных ошибок базы данных
        if (error.code === 'ER_NO_SUCH_TABLE') {
            console.error('   Таблица "subtitles" не найдена!');
            console.error('   Создайте таблицу командой:');
            console.error(`
                CREATE TABLE subtitles (
                    id INT PRIMARY KEY,
                    name VARCHAR(255) NOT NULL
                );
            `);
        } else if (error.code === 'ER_DUP_ENTRY') {
            console.error('   Обнаружены дубликаты по первичному ключу.');
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
            "SHOW TABLES LIKE 'subtitles'"
        );

        if (tables.length === 0) {
            console.log('⚠️ Таблица "subtitles" не существует.');
            console.log('   Создаю таблицу...');

            await connection.query(`
                CREATE TABLE IF NOT EXISTS subtitles (
                    id INT PRIMARY KEY,
                    name VARCHAR(255) NOT NULL
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            `);

            console.log('✅ Таблица "subtitles" создана.');
        } else {
            console.log('✅ Таблица "subtitles" существует.');

            // Проверяем структуру
            const [structure] = await connection.query('DESCRIBE subtitles');
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
    console.log('=== Начинаю процесс заполнения таблицы subtitles ===\n');

    try {
        // 0. Проверяем и создаем таблицу при необходимости
        console.log('Проверяю структуру базы данных...');
        await checkTableStructure();

        // 1. Получаем данные с внешнего API
        const subtitles = await fetchSubtitlesFromApi();

        // 2. Вставляем данные в локальную базу данных MySQL
        const stats = await insertSubtitlesIntoDB(subtitles);

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
    fetchSubtitlesFromApi,
    insertSubtitlesIntoDB,
    checkTableStructure
};