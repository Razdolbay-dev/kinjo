// seed_content_types.js
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

const API_URL = 'https://catalog-sync-api.rstprgapipt.com/v1/filters/content-types';

// ===== 2. ФУНКЦИЯ ДЛЯ ЗАПРОСА К API =====
async function fetchContentTypesFromApi() {
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

        // Выводим все записи для анализа (обычно их немного)
        if (response.data.length > 0) {
            console.log('Полученные типы контента:');
            response.data.forEach((type, index) => {
                console.log(`   ${index + 1}. ID: ${type.id}, Name: "${type.name}", Slug: "${type.slug}"`);
            });

            // Проверяем наличие обязательных полей
            const missingFields = response.data.filter(type =>
                !type.id && type.id !== 0 ||
                !type.name ||
                !type.slug
            );

            if (missingFields.length > 0) {
                console.warn(`⚠️ Найдены записи с отсутствующими полями: ${missingFields.length}`);
                missingFields.forEach(type => {
                    console.warn(`   ID: ${type.id}, Name: "${type.name}", Slug: "${type.slug}"`);
                });
            }
        }

        return response.data;

    } catch (error) {
        console.error('❌ Ошибка при запросе к API:');
        if (error.response) {
            console.error(`   Статус: ${error.response.status}`);

            if (error.response.status === 401) {
                console.error('   Ошибка 401: Неавторизованный доступ.');
                console.error('   Проверьте правильность Bearer токена.');
            } else if (error.response.status === 404) {
                console.error('   Ошибка 404: Эндпоинт не найден.');
                console.error('   Проверьте URL: /v1/filters/content-types');
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
async function insertContentTypesIntoDB(contentTypes) {
    if (!contentTypes || contentTypes.length === 0) {
        console.log('⚠️ Нет данных для вставки');
        return { total: 0, added: 0, skipped: 0, invalid: 0 };
    }

    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Подключение к базе данных установлено');

        // Фильтруем и валидируем данные
        const validTypes = [];
        const invalidTypes = [];

        contentTypes.forEach(type => {
            // Проверяем обязательные поля
            const hasId = type.id !== undefined && type.id !== null;
            const hasName = type.name && typeof type.name === 'string' && type.name.trim() !== '';
            const hasSlug = type.slug && typeof type.slug === 'string' && type.slug.trim() !== '';

            if (hasId && hasName && hasSlug) {
                validTypes.push({
                    id: type.id,
                    name: type.name.trim(),
                    slug: type.slug.trim()
                });
            } else {
                invalidTypes.push(type);
            }
        });

        console.log(`   Валидных записей: ${validTypes.length}`);
        if (invalidTypes.length > 0) {
            console.log(`   Невалидных записей: ${invalidTypes.length}`);
        }

        // Убираем дубликаты
        const uniqueMap = new Map();
        validTypes.forEach(type => {
            const key = `${type.id}-${type.slug}`;
            uniqueMap.set(key, type);
        });

        const uniqueTypes = Array.from(uniqueMap.values());
        console.log(`   Уникальных записей: ${uniqueTypes.length}`);

        // Подготавливаем данные для массовой вставки
        const typesData = uniqueTypes.map(type => [type.id, type.name, type.slug]);

        // Используем INSERT IGNORE для защиты от дубликатов
        const sql = `
            INSERT IGNORE INTO content_types (id, name, slug)
            VALUES ?
        `;

        const [result] = await connection.query(sql, [typesData]);

        console.log(`\n📊 Результат:`);
        console.log(`   Получено из API: ${contentTypes.length}`);
        console.log(`   Валидных: ${validTypes.length}`);
        console.log(`   Уникальных: ${uniqueTypes.length}`);
        console.log(`   Успешно добавлено: ${result.affectedRows}`);
        console.log(`   Уже существовало: ${uniqueTypes.length - result.affectedRows}`);
        if (invalidTypes.length > 0) {
            console.log(`   Пропущено (невалидные): ${invalidTypes.length}`);
        }

        // Проверяем, что добавлены основные типы контента
        if (result.affectedRows > 0) {
            const [allTypes] = await connection.query(
                'SELECT id, name, slug FROM content_types ORDER BY id'
            );
            console.log('\n📋 Все типы контента в базе:');
            allTypes.forEach(type => {
                console.log(`   ${type.id}: "${type.name}" (${type.slug})`);
            });
        }

        return {
            total: contentTypes.length,
            valid: validTypes.length,
            unique: uniqueTypes.length,
            added: result.affectedRows,
            skipped: uniqueTypes.length - result.affectedRows,
            invalid: invalidTypes.length
        };

    } catch (error) {
        console.error('❌ Ошибка при вставке данных в базу:');

        if (error.code === 'ER_NO_SUCH_TABLE') {
            console.error('   Таблица "content_types" не найдена!');
            console.error('   Создайте таблицу командой:');
            console.error(`
                CREATE TABLE content_types (
                                               id INT PRIMARY KEY,
                                               name VARCHAR(50) NOT NULL,
                                               slug VARCHAR(50) NOT NULL UNIQUE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            `);
        } else if (error.code === 'ER_DUP_ENTRY') {
            console.error('   Обнаружены дубликаты записей.');
        } else if (error.code === 'ER_DATA_TOO_LONG') {
            console.error('   Данные слишком длинные для полей таблицы.');
            console.error('   Максимальная длина: name=50, slug=50');
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

        console.log('Проверяю таблицу content_types...');

        // Проверяем существование таблицы
        const [tables] = await connection.query(
            "SHOW TABLES LIKE 'content_types'"
        );

        if (tables.length === 0) {
            console.log('⚠️ Таблица "content_types" не существует.');
            console.log('   Создаю таблицу...');

            await connection.query(`
                CREATE TABLE IF NOT EXISTS content_types (
                                                             id INT PRIMARY KEY,
                                                             name VARCHAR(50) NOT NULL,
                    slug VARCHAR(50) NOT NULL UNIQUE
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            `);

            console.log('✅ Таблица "content_types" создана.');

        } else {
            console.log('✅ Таблица "content_types" существует.');

            // Проверяем структуру
            const [structure] = await connection.query('DESCRIBE content_types');
            console.log('Структура таблицы:');
            structure.forEach(column => {
                const keyInfo = column.Key ? `(${column.Key})` : '';
                const nullInfo = column.Null === 'NO' ? 'NOT NULL' : 'NULL';
                console.log(`   ${column.Field}: ${column.Type} ${nullInfo} ${keyInfo}`);
            });

            // Проверяем существующие данные
            const [countResult] = await connection.query('SELECT COUNT(*) as count FROM content_types');
            console.log(`   Существующих записей: ${countResult[0].count}`);

            if (countResult[0].count > 0) {
                const [existingTypes] = await connection.query(
                    'SELECT id, name, slug FROM content_types ORDER BY id'
                );
                console.log('   Существующие типы контента:');
                existingTypes.forEach(type => {
                    console.log(`     ${type.id}: "${type.name}" (${type.slug})`);
                });
            }
        }

        return true;
    } catch (error) {
        console.error('Ошибка при проверке структуры таблицы:', error.message);
        return false;
    } finally {
        if (connection) await connection.end();
    }
}

// ===== 5. ПРОВЕРКА СВЯЗЕЙ С ТАБЛИЦЕЙ CONTENTS =====
async function checkContentsRelations() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);

        console.log('\n🔗 Проверяю связи с таблицей contents...');

        // Проверяем существование таблицы contents
        const [tables] = await connection.query(
            "SHOW TABLES LIKE 'contents'"
        );

        if (tables.length === 0) {
            console.log('⚠️ Таблица "contents" не существует.');
            console.log('   Связь content_types → contents пока невозможна.');
            return false;
        }

        // Проверяем внешний ключ
        const [foreignKeys] = await connection.query(`
            SELECT 
                TABLE_NAME,
                COLUMN_NAME,
                CONSTRAINT_NAME,
                REFERENCED_TABLE_NAME,
                REFERENCED_COLUMN_NAME
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
            WHERE TABLE_NAME = 'contents' 
                AND REFERENCED_TABLE_NAME = 'content_types'
        `);

        if (foreignKeys.length > 0) {
            console.log('✅ Внешний ключ content_type_id → content_types(id) существует.');
            foreignKeys.forEach(fk => {
                console.log(`   ${fk.COLUMN_NAME} → ${fk.REFERENCED_TABLE_NAME}.${fk.REFERENCED_COLUMN_NAME}`);
            });

            // Проверяем, есть ли записи в contents с несуществующими content_type_id
            const [orphanedRecords] = await connection.query(`
                SELECT c.id, c.title, c.content_type_id
                FROM contents c
                LEFT JOIN content_types ct ON c.content_type_id = ct.id
                WHERE ct.id IS NULL
                LIMIT 10
            `);

            if (orphanedRecords.length > 0) {
                console.warn(`⚠️ Найдены записи в contents с несуществующими content_type_id: ${orphanedRecords.length}`);
                orphanedRecords.forEach(record => {
                    console.warn(`   ID: ${record.id}, Title: "${record.title}", content_type_id: ${record.content_type_id}`);
                });
            } else {
                console.log('✅ Все записи в contents имеют валидные content_type_id.');
            }

        } else {
            console.log('⚠️ Внешний ключ content_type_id → content_types(id) не найден.');
            console.log('   Проверьте, есть ли в таблице contents поле content_type_id');
        }

        return true;
    } catch (error) {
        console.error('Ошибка при проверке связей:', error.message);
        return false;
    } finally {
        if (connection) await connection.end();
    }
}

// ===== 6. ОСНОВНАЯ ЛОГИКА СКРИПТА =====
async function main() {
    console.log('=== Начинаю процесс заполнения таблицы content_types ===\n');

    try {
        // 0. Проверяем и создаем таблицу при необходимости
        console.log('🔍 Проверяю структуру базы данных...');
        await checkTableStructure();

        // Проверяем связи с contents (если таблица существует)
        await checkContentsRelations();

        // 1. Получаем данные с внешнего API
        console.log('\n🌐 Получаю данные с API...');
        const contentTypes = await fetchContentTypesFromApi();

        // 2. Вставляем данные в локальную базу данных MySQL
        console.log('\n💾 Загружаю данные в базу...');
        const stats = await insertContentTypesIntoDB(contentTypes);

        console.log('\n✅ === Готово! ===');
        console.log(`📈 Итоговая статистика:`);
        console.log(`   Всего получено: ${stats.total}`);
        console.log(`   Валидных записей: ${stats.valid}`);
        console.log(`   Добавлено новых: ${stats.added}`);
        console.log(`   Уже существовало: ${stats.skipped}`);

        if (stats.invalid > 0) {
            console.log(`   Пропущено (невалидные): ${stats.invalid}`);
        }

        // 3. Важная информация о типичных типах контента
        console.log('\n💡 Типичные типы контента (ожидаемые):');
        const expectedTypes = [
            { id: 1, name: 'Фильм', slug: 'movie' },
            { id: 2, name: 'Сериал', slug: 'series' },
            { id: 3, name: 'Мультфильм', slug: 'cartoon' },
            { id: 4, name: 'Документальный', slug: 'documentary' },
            { id: 5, name: 'Шоу', slug: 'show' },
            { id: 6, name: 'Аниме', slug: 'anime' }
        ];

        expectedTypes.forEach(expected => {
            console.log(`   • ${expected.name} (slug: "${expected.slug}")`);
        });

    } catch (error) {
        console.error('\n❌ Скрипт завершился с ошибкой.');
        console.error('Причина:', error.message);
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
    fetchContentTypesFromApi,
    insertContentTypesIntoDB,
    checkTableStructure,
    checkContentsRelations
};