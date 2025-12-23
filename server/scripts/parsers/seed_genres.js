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

const API_URL = 'https://catalog-sync-api.rstprgapipt.com/v1/filters/genres';

// ===== 2. ФУНКЦИЯ ДЛЯ ЗАПРОСА К API =====
async function fetchGenresFromApi() {
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

        // Проверяем структуру данных
        if (response.data.length > 0) {
            console.log('Пример первой записи:', JSON.stringify(response.data[0]));

            // Проверяем обязательные поля
            const sample = response.data[0];
            if (!sample.id && sample.id !== 0) {
                console.warn('⚠️ Внимание: поле id отсутствует или равно null в примере');
            }
            if (!sample.name) {
                console.warn('⚠️ Внимание: поле name отсутствует в примере');
            }
            if (!sample.slug) {
                console.warn('⚠️ Внимание: поле slug отсутствует в примере');
            }
        }

        return response.data;

    } catch (error) {
        console.error('❌ Ошибка при запросе к API:');
        if (error.response) {
            console.error(`   Статус: ${error.response.status}`);
            console.error(`   Ответ сервера:`, error.response.data);

            if (error.response.status === 401) {
                console.error('   Ошибка 401: Требуется авторизация.');
                console.error('   Проверьте:');
                console.error('   1. Правильность токена в переменной API_TOKEN');
                console.error('   2. Не истек ли срок действия токена');
                console.error('   3. Имеет ли токен доступ к /v1/filters/genres');
            }
        } else if (error.request) {
            console.error('   Не удалось получить ответ от сервера.');
            console.error('   Проверьте подключение к интернету и доступность API.');
        } else {
            console.error('   Ошибка настройки запроса:', error.message);
        }
        throw error;
    }
}

// ===== 3. ФУНКЦИЯ ДЛЯ ВСТАВКИ ДАННЫХ В MYSQL =====
async function insertGenresIntoDB(genres) {
    if (!genres || genres.length === 0) {
        console.log('⚠️ Нет данных для вставки');
        return { total: 0, added: 0, skipped: 0, invalid: 0 };
    }

    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Подключение к базе данных установлено');

        // Фильтруем и валидируем данные
        const validGenres = [];
        const invalidGenres = [];

        genres.forEach(genre => {
            // Проверяем обязательные поля
            const hasId = genre.id !== undefined && genre.id !== null;
            const hasName = genre.name && typeof genre.name === 'string' && genre.name.trim() !== '';
            const hasSlug = genre.slug && typeof genre.slug === 'string' && genre.slug.trim() !== '';

            if (hasId && hasName && hasSlug) {
                validGenres.push({
                    id: genre.id,
                    name: genre.name.trim(),
                    slug: genre.slug.trim()
                });
            } else {
                invalidGenres.push(genre);
            }
        });

        console.log(`   Валидных записей: ${validGenres.length}`);
        if (invalidGenres.length > 0) {
            console.log(`   Невалидных записей: ${invalidGenres.length}`);
            if (invalidGenres.length <= 5) {
                console.log('   Примеры невалидных записей:', invalidGenres.slice(0, 3));
            }
        }

        // Убираем дубликаты на уровне приложения
        const uniqueMap = new Map();
        validGenres.forEach(genre => {
            const key = `${genre.id}-${genre.slug}`;
            uniqueMap.set(key, genre);
        });

        const uniqueGenres = Array.from(uniqueMap.values());
        console.log(`   Уникальных записей: ${uniqueGenres.length}`);

        // Подготавливаем данные для массовой вставки
        const genresData = uniqueGenres.map(genre => [genre.id, genre.name, genre.slug]);

        // Используем INSERT IGNORE для защиты от дубликатов
        const sql = `
            INSERT IGNORE INTO genres (id, name, slug)
            VALUES ?
        `;

        const [result] = await connection.query(sql, [genresData]);

        console.log(`\n📊 Результат:`);
        console.log(`   Получено из API: ${genres.length}`);
        console.log(`   Валидных: ${validGenres.length}`);
        console.log(`   Уникальных: ${uniqueGenres.length}`);
        console.log(`   Успешно добавлено: ${result.affectedRows}`);
        console.log(`   Уже существовало: ${uniqueGenres.length - result.affectedRows}`);
        if (invalidGenres.length > 0) {
            console.log(`   Пропущено (невалидные): ${invalidGenres.length}`);
        }

        return {
            total: genres.length,
            valid: validGenres.length,
            unique: uniqueGenres.length,
            added: result.affectedRows,
            skipped: uniqueGenres.length - result.affectedRows,
            invalid: invalidGenres.length
        };

    } catch (error) {
        console.error('❌ Ошибка при вставке данных в базу:');

        if (error.code === 'ER_NO_SUCH_TABLE') {
            console.error('   Таблица "genres" не найдена!');
            console.error('   Создайте таблицу командой:');
            console.error(`
                CREATE TABLE genres (
                                        id INT PRIMARY KEY,
                                        name VARCHAR(255) NOT NULL,
                                        slug VARCHAR(255) NOT NULL UNIQUE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            `);
        } else if (error.code === 'ER_DUP_ENTRY') {
            console.error('   Обнаружены дубликаты записей.');
            console.error('   Проверьте уникальность полей id и slug.');
        } else if (error.code === 'ER_DATA_TOO_LONG') {
            console.error('   Данные слишком длинные для полей таблицы.');
            console.error('   Проверьте длину полей name и slug.');
        }

        console.error(`   Код ошибки: ${error.code}`);
        console.error(`   Сообщение: ${error.message}`);
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
            "SHOW TABLES LIKE 'genres'"
        );

        if (tables.length === 0) {
            console.log('⚠️ Таблица "genres" не существует.');
            console.log('   Создаю таблицу...');

            await connection.query(`
                CREATE TABLE IF NOT EXISTS genres (
                                                      id INT PRIMARY KEY,
                                                      name VARCHAR(255) NOT NULL,
                    slug VARCHAR(255) NOT NULL UNIQUE
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            `);

            console.log('✅ Таблица "genres" создана.');

            // Создаем индекс для slug (уже уникальный, но на всякий случай)
            await connection.query(`
                CREATE UNIQUE INDEX idx_genres_slug ON genres(slug)
            `);
            console.log('✅ Индекс для поля slug создан.');

        } else {
            console.log('✅ Таблица "genres" существует.');

            // Проверяем структуру
            const [structure] = await connection.query('DESCRIBE genres');
            console.log('Структура таблицы:');
            structure.forEach(column => {
                const keyInfo = column.Key ? `(${column.Key})` : '';
                const nullInfo = column.Null === 'NO' ? 'NOT NULL' : 'NULL';
                console.log(`   ${column.Field}: ${column.Type} ${nullInfo} ${keyInfo}`);
            });

            // Проверяем индексы
            const [indexes] = await connection.query(`
                SHOW INDEX FROM genres
            `);
            console.log('Индексы таблицы:');
            indexes.forEach(index => {
                if (index.Key_name !== 'PRIMARY') {
                    console.log(`   ${index.Key_name}: ${index.Column_name} (${index.Non_unique ? 'Неуникальный' : 'Уникальный'})`);
                }
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

// ===== 5. ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ: ПРОВЕРКА СУЩЕСТВУЮЩИХ ДАННЫХ =====
async function checkExistingData() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);

        const [countResult] = await connection.query('SELECT COUNT(*) as count FROM genres');
        const count = countResult[0].count;

        console.log(`   В таблице genres уже существует записей: ${count}`);

        if (count > 0) {
            const [sampleData] = await connection.query('SELECT * FROM genres LIMIT 5');
            console.log('   Примеры существующих записей:');
            sampleData.forEach(row => {
                console.log(`     ID: ${row.id}, Name: "${row.name}", Slug: "${row.slug}"`);
            });
        }

        return count;
    } catch (error) {
        console.error('Ошибка при проверке существующих данных:', error.message);
        return 0;
    } finally {
        if (connection) await connection.end();
    }
}

// ===== 6. ОСНОВНАЯ ЛОГИКА СКРИПТА =====
async function main() {
    console.log('=== Начинаю процесс заполнения таблицы genres ===\n');

    try {
        // 0. Проверяем и создаем таблицу при необходимости
        console.log('Проверяю структуру базы данных...');
        await checkTableStructure();

        console.log('\nПроверяю существующие данные...');
        const existingCount = await checkExistingData();

        // 1. Получаем данные с внешнего API
        console.log('\nПолучаю данные с API...');
        const genres = await fetchGenresFromApi();

        // 2. Вставляем данные в локальную базу данных MySQL
        console.log('\nЗагружаю данные в базу...');
        const stats = await insertGenresIntoDB(genres);

        console.log('\n=== Готово! ===');
        console.log(`📈 Итоговая статистика:`);
        console.log(`   Всего получено: ${stats.total}`);
        console.log(`   Валидных: ${stats.valid}`);
        console.log(`   Добавлено новых: ${stats.added}`);
        console.log(`   Уже существовало: ${stats.skipped}`);
        if (stats.invalid > 0) {
            console.log(`   Пропущено (невалидные): ${stats.invalid}`);
        }
        console.log(`   Теперь всего в таблице: ${existingCount + stats.added} записей`);

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
    fetchGenresFromApi,
    insertGenresIntoDB,
    checkTableStructure,
    checkExistingData
};