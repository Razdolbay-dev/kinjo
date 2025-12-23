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

const API_URL = 'https://catalog-sync-api.rstprgapipt.com/v1/filters/countries';

// ===== 2. ФУНКЦИЯ ДЛЯ ЗАПРОСА К API =====
async function fetchCountriesFromApi() {
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
            const sample = response.data[0];
            console.log('Пример записи:', {
                id: sample.id,
                name: sample.name,
                slug: sample.slug,
                'name length': sample.name?.length || 0,
                'slug length': sample.slug?.length || 0
            });

            // Проверяем наличие полей в первых 5 записях
            const firstFive = response.data.slice(0, 5);
            const missingFields = [];
            firstFive.forEach((item, index) => {
                if (!item.id && item.id !== 0) missingFields.push(`[${index}].id`);
                if (!item.name) missingFields.push(`[${index}].name`);
                if (!item.slug) missingFields.push(`[${index}].slug`);
            });

            if (missingFields.length > 0) {
                console.warn(`⚠️ Отсутствующие поля в первых записях: ${missingFields.join(', ')}`);
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
                console.error('   Тот же токен должен работать для всех /v1/filters/ endpoints.');
            } else if (error.response.status === 403) {
                console.error('   Ошибка 403: Доступ запрещен.');
                console.error('   Токен не имеет прав доступа к этому ресурсу.');
            } else if (error.response.status === 429) {
                console.error('   Ошибка 429: Слишком много запросов.');
                console.error('   Подождите несколько минут и попробуйте снова.');
            } else {
                console.error('   Ответ сервера:', error.response.data);
            }
        } else if (error.request) {
            console.error('   Не удалось получить ответ от сервера.');
            console.error('   Проверьте подключение к интернету.');
        } else {
            console.error('   Ошибка настройки запроса:', error.message);
        }
        throw error;
    }
}

// ===== 3. ФУНКЦИЯ ДЛЯ ВСТАВКИ ДАННЫХ В MYSQL =====
async function insertCountriesIntoDB(countries) {
    if (!countries || countries.length === 0) {
        console.log('⚠️ Нет данных для вставки');
        return { total: 0, added: 0, skipped: 0, invalid: 0 };
    }

    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Подключение к базе данных установлено');

        // Фильтруем и валидируем данные
        const validCountries = [];
        const invalidCountries = [];

        countries.forEach(country => {
            // Проверяем обязательные поля
            const hasId = country.id !== undefined && country.id !== null;
            const hasName = country.name && typeof country.name === 'string' && country.name.trim() !== '';
            const hasSlug = country.slug && typeof country.slug === 'string' && country.slug.trim() !== '';

            if (hasId && hasName && hasSlug) {
                validCountries.push({
                    id: country.id,
                    name: country.name.trim(),
                    slug: country.slug.trim()
                });
            } else {
                invalidCountries.push({
                    country,
                    reason: !hasId ? 'missing id' : !hasName ? 'missing name' : 'missing slug'
                });
            }
        });

        console.log(`   Валидных записей: ${validCountries.length}`);
        if (invalidCountries.length > 0) {
            console.log(`   Невалидных записей: ${invalidCountries.length}`);
            if (invalidCountries.length <= 3) {
                invalidCountries.forEach((item, index) => {
                    console.log(`     ${index + 1}. Причина: ${item.reason}, Данные:`, item.country);
                });
            }
        }

        // Убираем дубликаты на уровне приложения
        const uniqueMap = new Map();
        validCountries.forEach(country => {
            const key = `${country.id}-${country.slug}`;
            if (!uniqueMap.has(key)) {
                uniqueMap.set(key, country);
            } else {
                console.warn(`   Дубликат: ID=${country.id}, Slug=${country.slug}`);
            }
        });

        const uniqueCountries = Array.from(uniqueMap.values());
        console.log(`   Уникальных записей: ${uniqueCountries.length}`);

        // Проверяем на конфликты slug (одинаковый slug у разных id)
        const slugMap = new Map();
        const slugConflicts = [];

        uniqueCountries.forEach(country => {
            if (slugMap.has(country.slug)) {
                const existing = slugMap.get(country.slug);
                slugConflicts.push({
                    slug: country.slug,
                    existingId: existing.id,
                    newId: country.id
                });
            } else {
                slugMap.set(country.slug, country);
            }
        });

        if (slugConflicts.length > 0) {
            console.warn(`   ⚠️ Найдены конфликты slug: ${slugConflicts.length}`);
            slugConflicts.slice(0, 3).forEach(conflict => {
                console.warn(`     Slug "${conflict.slug}" используется ID ${conflict.existingId} и ${conflict.newId}`);
            });

            // Решаем конфликт: оставляем запись с меньшим ID
            const resolvedCountries = [];
            const finalSlugMap = new Map();

            uniqueCountries
                .sort((a, b) => a.id - b.id) // Сортируем по ID
                .forEach(country => {
                    if (!finalSlugMap.has(country.slug)) {
                        finalSlugMap.set(country.slug, country);
                        resolvedCountries.push(country);
                    } else {
                        console.log(`     Пропускаем дубликат slug "${country.slug}" (ID: ${country.id})`);
                    }
                });

            console.log(`   После разрешения конфликтов: ${resolvedCountries.length} записей`);
            uniqueCountries.length = 0;
            resolvedCountries.forEach(c => uniqueCountries.push(c));
        }

        // Подготавливаем данные для массовой вставки
        const countriesData = uniqueCountries.map(country => [country.id, country.name, country.slug]);

        // Используем INSERT IGNORE для защиты от дубликатов
        const sql = `
            INSERT IGNORE INTO countries (id, name, slug)
            VALUES ?
        `;

        const [result] = await connection.query(sql, [countriesData]);

        console.log(`\n📊 Результат:`);
        console.log(`   Получено из API: ${countries.length}`);
        console.log(`   Валидных: ${validCountries.length}`);
        console.log(`   Уникальных: ${uniqueCountries.length}`);
        console.log(`   Успешно добавлено: ${result.affectedRows}`);
        console.log(`   Уже существовало: ${uniqueCountries.length - result.affectedRows}`);
        if (invalidCountries.length > 0) {
            console.log(`   Пропущено (невалидные): ${invalidCountries.length}`);
        }
        if (slugConflicts.length > 0) {
            console.log(`   Конфликтов slug разрешено: ${slugConflicts.length}`);
        }

        // Выводим примеры добавленных стран
        if (result.affectedRows > 0 && result.affectedRows <= 10) {
            console.log('\nПримеры добавленных стран:');
            const [addedCountries] = await connection.query(
                'SELECT id, name, slug FROM countries ORDER BY id DESC LIMIT 5'
            );
            addedCountries.forEach(country => {
                console.log(`   ${country.id}: "${country.name}" (${country.slug})`);
            });
        }

        return {
            total: countries.length,
            valid: validCountries.length,
            unique: uniqueCountries.length,
            added: result.affectedRows,
            skipped: uniqueCountries.length - result.affectedRows,
            invalid: invalidCountries.length,
            slugConflicts: slugConflicts.length
        };

    } catch (error) {
        console.error('❌ Ошибка при вставке данных в базу:');

        if (error.code === 'ER_NO_SUCH_TABLE') {
            console.error('   Таблица "countries" не найдена!');
            console.error('   Создайте таблицу командой:');
            console.error(`
                CREATE TABLE countries (
                    id INT PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    slug VARCHAR(255) NOT NULL UNIQUE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            `);
        } else if (error.code === 'ER_DUP_ENTRY') {
            console.error('   Обнаружены дубликаты записей.');
            console.error('   Проверьте уникальность полей id и slug.');

            // Пытаемся выяснить, какие именно записи конфликтуют
            if (connection) {
                try {
                    const [duplicates] = await connection.query(`
                        SELECT slug, COUNT(*) as count 
                        FROM countries 
                        GROUP BY slug 
                        HAVING count > 1
                        LIMIT 5
                    `);
                    if (duplicates.length > 0) {
                        console.error('   Найденные дубликаты slug:');
                        duplicates.forEach(dup => {
                            console.error(`     "${dup.slug}": ${dup.count} записей`);
                        });
                    }
                } catch (e) {
                    // Игнорируем ошибку при проверке дубликатов
                }
            }
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

        console.log('Проверяю таблицу countries...');

        // Проверяем существование таблицы
        const [tables] = await connection.query(
            "SHOW TABLES LIKE 'countries'"
        );

        if (tables.length === 0) {
            console.log('⚠️ Таблица "countries" не существует.');
            console.log('   Создаю таблицу...');

            await connection.query(`
                CREATE TABLE IF NOT EXISTS countries (
                    id INT PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    slug VARCHAR(255) NOT NULL UNIQUE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            `);

            console.log('✅ Таблица "countries" создана.');

            // Создаем дополнительный индекс для быстрого поиска по slug
            await connection.query(`
                CREATE UNIQUE INDEX idx_countries_slug ON countries(slug)
            `);
            console.log('✅ Уникальный индекс для slug создан.');

        } else {
            console.log('✅ Таблица "countries" существует.');

            // Проверяем структуру
            const [structure] = await connection.query('DESCRIBE countries');
            console.log('Структура таблицы:');

            const expectedStructure = [
                { field: 'id', type: 'int', nullable: 'NO', key: 'PRI' },
                { field: 'name', type: 'varchar(255)', nullable: 'NO', key: '' },
                { field: 'slug', type: 'varchar(255)', nullable: 'NO', key: 'UNI' }
            ];

            structure.forEach(column => {
                const keyInfo = column.Key ? `(${column.Key})` : '';
                const nullInfo = column.Null === 'NO' ? 'NOT NULL' : 'NULL';
                console.log(`   ${column.Field}: ${column.Type} ${nullInfo} ${keyInfo}`);

                // Проверяем соответствие ожидаемой структуре
                const expected = expectedStructure.find(f => f.field === column.Field);
                if (expected) {
                    if (!column.Type.toLowerCase().includes(expected.type.toLowerCase())) {
                        console.warn(`   ⚠️ Поле ${column.Field}: ожидался тип ${expected.type}, получен ${column.Type}`);
                    }
                    if ((column.Key || '').toLowerCase() !== expected.key.toLowerCase()) {
                        console.warn(`   ⚠️ Поле ${column.Field}: ожидался ключ ${expected.key}, получен ${column.Key || 'нет'}`);
                    }
                }
            });

            // Проверяем существующие данные
            const [countResult] = await connection.query('SELECT COUNT(*) as count FROM countries');
            console.log(`   Существующих записей: ${countResult[0].count}`);

            if (countResult[0].count > 0) {
                const [sampleData] = await connection.query(
                    'SELECT id, name, slug FROM countries ORDER BY RAND() LIMIT 3'
                );
                console.log('   Примеры существующих записей:');
                sampleData.forEach(row => {
                    console.log(`     ${row.id}: "${row.name}" (${row.slug})`);
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

// ===== 5. ОСНОВНАЯ ЛОГИКА СКРИПТА =====
async function main() {
    console.log('=== Начинаю процесс заполнения таблицы countries ===\n');

    try {
        // 0. Проверяем и создаем таблицу при необходимости
        console.log('🔍 Проверяю структуру базы данных...');
        await checkTableStructure();

        // 1. Получаем данные с внешнего API
        console.log('\n🌐 Получаю данные с API...');
        const countries = await fetchCountriesFromApi();

        // 2. Вставляем данные в локальную базу данных MySQL
        console.log('\n💾 Загружаю данные в базу...');
        const stats = await insertCountriesIntoDB(countries);

        console.log('\n✅ === Готово! ===');
        console.log(`📈 Итоговая статистика:`);
        console.log(`   Всего получено: ${stats.total}`);
        console.log(`   Валидных записей: ${stats.valid}`);
        console.log(`   Уникальных записей: ${stats.unique}`);
        console.log(`   Добавлено новых: ${stats.added}`);
        console.log(`   Уже существовало: ${stats.skipped}`);

        if (stats.invalid > 0) {
            console.log(`   Пропущено (невалидные): ${stats.invalid}`);
        }
        if (stats.slugConflicts > 0) {
            console.log(`   Конфликтов slug: ${stats.slugConflicts}`);
        }

        // 3. Выводим итоговую информацию
        console.log('\n🌍 Итоговая информация:');

        let connection;
        try {
            connection = await mysql.createConnection(dbConfig);
            const [totalResult] = await connection.query('SELECT COUNT(*) as total FROM countries');
            const [topCountries] = await connection.query(`
                SELECT name, slug 
                FROM countries 
                ORDER BY name 
                LIMIT 5
            `);

            console.log(`   Всего стран в базе: ${totalResult[0].total}`);
            console.log('   Первые 5 стран по алфавиту:');
            topCountries.forEach(country => {
                console.log(`     • ${country.name} (${country.slug})`);
            });

        } catch (e) {
            // Игнорируем ошибки при выводе итогов
        } finally {
            if (connection) await connection.end();
        }

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
    fetchCountriesFromApi,
    insertCountriesIntoDB,
    checkTableStructure
};