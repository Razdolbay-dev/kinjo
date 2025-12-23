// seed_contents.js
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

const API_URL = 'https://catalog-sync-api.rstprgapipt.com/v1/contents/details';
const PAGE_SIZE = 100;

// ===== ФУНКЦИИ ДЛЯ ОБРАБОТКИ ДАННЫХ =====

function parseCustomDate(dateString) {
    if (!dateString || typeof dateString !== 'string') return null;

    try {
        const parts = dateString.split(' ');
        if (parts.length !== 2) return null;

        const dateParts = parts[0].split('.');
        const timeParts = parts[1].split(':');

        if (dateParts.length !== 3) return null;

        const day = parseInt(dateParts[0], 10);
        const month = parseInt(dateParts[1], 10) - 1;
        const year = parseInt(dateParts[2], 10);

        const hours = parseInt(timeParts[0], 10);
        const minutes = parseInt(timeParts[1], 10);
        const seconds = timeParts.length > 2 ? parseInt(timeParts[2], 10) : 0;

        return new Date(year, month, day, hours, minutes, seconds);
    } catch (error) {
        return null;
    }
}

/**
 * Вставляет новую запись в таблицу contents
 */
async function insertNewContent(connection, content) {
    const contentId = content.id;

    try {
        const sql = `
            INSERT INTO contents (
                id, title, original_title, description, poster_url, year,
                end_year, kinopoisk_id, imdb_id, content_type_id,
                age_restriction, cast, directors, screenwriters, producers,
                operators, composers, artists, editors, audio_tracks,
                video_quality, seasons_count, episodes_count, duration,
                created_at, updated_at, premiere_at, last_season_premiere_at,
                exclusive_start_at, exclusive_end_at, is_lgbt, player_url
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            contentId,
            content.title || '',
            content.originalTitle || '',
            content.description || '',
            content.posterUrl || '',
            content.year || null,
            content.endYear || null,
            content.kinopoiskId || null,
            content.imdbId || null,
            content.contentType?.id || null,
            content.ageRestriction || null,
            content.cast || null,
            content.directors || null,
            content.screenwriters || null,
            content.producers || null,
            content.operators || null,
            content.composers || null,
            content.artists || null,
            content.editors || null,
            content.audioTracks || null,
            content.videoQuality || null,
            content.seasonsCount || null,
            content.episodesCount || null,
            content.duration || null,
            parseCustomDate(content.createdAt),
            parseCustomDate(content.updatedAt),
            parseCustomDate(content.premiereAt),
            parseCustomDate(content.lastSeasonPremiereAt),
            parseCustomDate(content.exclusiveStartAt),
            parseCustomDate(content.exclusiveEndAt),
            content.isLgbt || false,
            content.playerUrl || null
        ];

        await connection.execute(sql, values);
        console.log(`   ✅ Добавлена новая запись: ID ${contentId}, "${content.title}"`);
        return { inserted: true, contentId };

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            console.log(`   ⚠️ Запись ${contentId} уже существует (дубликат)`);
            return { inserted: false, reason: 'duplicate' };
        }
        console.error(`   ❌ Ошибка вставки ${contentId}:`, error.message);
        return { inserted: false, error: error.message };
    }
}

/**
 * Обновляет существующую запись
 */
async function updateExistingContent(connection, existing, content) {
    const contentId = content.id;
    const updates = [];
    const values = [];

    // Функция проверки изменений
    const checkUpdate = (field, newValue, oldValue) => {
        // Если новое значение null/undefined - не обновляем
        if (newValue === null || newValue === undefined) return false;

        // Если старое значение пустое (null, '', 0), а новое нет - обновляем
        if (!oldValue && oldValue !== 0 && newValue) return true;

        // Для строк: проверяем на отличия
        if (typeof oldValue === 'string' && typeof newValue === 'string') {
            return oldValue.trim() !== newValue.trim();
        }

        // Для чисел
        if (typeof oldValue === 'number' && typeof newValue === 'number') {
            return oldValue !== newValue;
        }

        // Для дат
        if (oldValue instanceof Date && newValue instanceof Date) {
            return oldValue.getTime() !== newValue.getTime();
        }

        // По умолчанию
        return oldValue !== newValue;
    };

    // Проверяем все поля
    const fields = {
        title: content.title,
        original_title: content.originalTitle,
        description: content.description,
        poster_url: content.posterUrl,
        year: content.year,
        end_year: content.endYear,
        kinopoisk_id: content.kinopoiskId,
        imdb_id: content.imdbId,
        content_type_id: content.contentType?.id,
        age_restriction: content.ageRestriction,
        cast: content.cast,
        directors: content.directors,
        screenwriters: content.screenwriters,
        producers: content.producers,
        operators: content.operators,
        composers: content.composers,
        artists: content.artists,
        editors: content.editors,
        audio_tracks: content.audioTracks,
        video_quality: content.videoQuality,
        seasons_count: content.seasonsCount,
        episodes_count: content.episodesCount,
        duration: content.duration,
        created_at: parseCustomDate(content.createdAt),
        updated_at: parseCustomDate(content.updatedAt),
        premiere_at: parseCustomDate(content.premiereAt),
        last_season_premiere_at: parseCustomDate(content.lastSeasonPremiereAt),
        exclusive_start_at: parseCustomDate(content.exclusiveStartAt),
        exclusive_end_at: parseCustomDate(content.exclusiveEndAt),
        is_lgbt: content.isLgbt || false,
        player_url: content.playerUrl
    };

    // Собираем изменения
    let hasUpdates = false;
    for (const [field, newValue] of Object.entries(fields)) {
        const oldValue = existing[field];

        if (checkUpdate(field, newValue, oldValue)) {
            updates.push(`${field} = ?`);
            values.push(newValue);
            hasUpdates = true;

            // Логируем изменения для ключевых полей
            const importantFields = ['title', 'description', 'duration', 'premiere_at', 'cast', 'directors'];
            if (importantFields.includes(field)) {
                console.log(`     🔄 ${field}: "${oldValue}" → "${newValue}"`);
            }
        }
    }

    if (hasUpdates) {
        try {
            values.push(contentId);
            const sql = `UPDATE contents SET ${updates.join(', ')} WHERE id = ?`;
            await connection.execute(sql, values);
            console.log(`   ✅ Обновлено ${updates.length} полей для ID ${contentId}`);
            return { updated: true, fields: updates.length };
        } catch (error) {
            console.error(`   ❌ Ошибка обновления ID ${contentId}:`, error.message);
            return { updated: false, error: error.message };
        }
    }

    return { updated: false, reason: 'no changes' };
}

/**
 * Обрабатывает рейтинги
 */
async function processRatings(connection, contentId, ratings) {
    if (!ratings || typeof ratings !== 'object') return;

    try {
        // Вставляем рейтинги (используем INSERT IGNORE для защиты от дубликатов)
        const ratingValues = [];
        for (const [source, data] of Object.entries(ratings)) {
            if (data && typeof data === 'object' && (data.rating !== undefined || data.votes !== undefined)) {
                ratingValues.push([
                    contentId,
                    source,
                    data.rating || 0,
                    data.votes || 0
                ]);
            }
        }

        if (ratingValues.length > 0) {
            const sql = `
                INSERT IGNORE INTO ratings (content_id, source, rating, votes)
                VALUES ?
                ON DUPLICATE KEY UPDATE
                    rating = VALUES(rating),
                    votes = VALUES(votes)
            `;
            await connection.query(sql, [ratingValues]);
        }
    } catch (error) {
        console.error(`   ⚠️ Ошибка обработки рейтингов ${contentId}:`, error.message);
    }
}

/**
 * Обрабатывает связи многие-ко-многим
 */
async function processManyToMany(connection, contentId, items, tableName, idField) {
    if (!Array.isArray(items) || items.length === 0) return;

    try {
        const values = items.map(item => [contentId, item.id]);
        const sql = `
            INSERT IGNORE INTO ${tableName} (content_id, ${idField}_id)
            VALUES ?
        `;
        await connection.query(sql, [values]);
    } catch (error) {
        console.error(`   ⚠️ Ошибка обработки ${tableName} ${contentId}:`, error.message);
    }
}

/**
 * Обрабатывает один элемент контента
 */
async function processContentItem(connection, content) {
    const contentId = content.id;

    try {
        await connection.beginTransaction();

        // 1. Проверяем существование записи
        const [existingRows] = await connection.execute(
            'SELECT * FROM contents WHERE id = ?',
            [contentId]
        );
        const existing = existingRows[0];

        let result;
        if (existing) {
            // Обновляем существующую запись
            console.log(`   🔄 Обновляю существующую запись: ID ${contentId}`);
            result = await updateExistingContent(connection, existing, content);
        } else {
            // Вставляем новую запись
            console.log(`   ➕ Добавляю новую запись: ID ${contentId}`);
            result = await insertNewContent(connection, content);
        }

        // 2. Обрабатываем связанные данные (только если запись добавлена/обновлена)
        if (result.inserted !== false || result.updated !== false) {
            // Рейтинги
            await processRatings(connection, contentId, content.ratings);

            // Жанры
            await processManyToMany(connection, contentId, content.genres, 'content_genres', 'genre');

            // Страны
            await processManyToMany(connection, contentId, content.countries, 'content_countries', 'country');

            // Авторы озвучки
            await processManyToMany(connection, contentId, content.voiceAuthorsV2, 'content_voice_authors', 'voice_author');

            // Языки (если есть таблица)
            if (content.languages && Array.isArray(content.languages)) {
                await processManyToMany(connection, contentId, content.languages, 'content_languages', 'language');
            }

            // Субтитры (если есть таблица и данные)
            if (content.subtitles && Array.isArray(content.subtitles) && content.subtitles.length > 0) {
                await processManyToMany(connection, contentId, content.subtitles, 'content_subtitles', 'subtitle');
            }

            // Эпизоды по сезонам
            if (content.episodesBySeason && typeof content.episodesBySeason === 'object') {
                const seasonValues = [];
                for (const [seasonNumber, episodesCount] of Object.entries(content.episodesBySeason)) {
                    const seasonNum = parseInt(seasonNumber, 10);
                    if (!isNaN(seasonNum) && episodesCount !== undefined) {
                        seasonValues.push([contentId, seasonNum, episodesCount]);
                    }
                }

                if (seasonValues.length > 0) {
                    const sql = `
                        INSERT IGNORE INTO content_seasons (content_id, season_ordering, episodes_count)
                        VALUES ?
                        ON DUPLICATE KEY UPDATE
                            episodes_count = VALUES(episodes_count)
                    `;
                    await connection.query(sql, [seasonValues]);
                }
            }
        }

        await connection.commit();

        return {
            success: true,
            action: existing ? 'updated' : 'inserted',
            contentId,
            fields: result.fields || 0
        };

    } catch (error) {
        await connection.rollback();
        console.error(`   ❌ Ошибка обработки ${contentId}:`, error.message);
        return { success: false, error: error.message, contentId };
    }
}

/**
 * Основная функция обработки
 */
async function processAllContentDetails() {
    console.log('🚀 Начинаю обработку детальной информации о контенте...\n');
    console.log(`📊 Размер страницы: ${PAGE_SIZE} элементов\n`);

    let connection;
    let totalPages = 0;
    let stats = {
        processed: 0,
        inserted: 0,
        updated: 0,
        skipped: 0,
        errors: 0,
        fieldsUpdated: 0
    };

    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Подключение к базе данных установлено\n');

        // Получаем первую страницу для метаданных
        console.log('📊 Получаю информацию о количестве страниц...');
        const firstResponse = await fetchContentDetailsPage(1);

        totalPages = firstResponse.meta.pages;
        const totalItems = firstResponse.meta.total;

        console.log(`📊 Всего элементов: ${totalItems}`);
        console.log(`📊 Всего страниц: ${totalPages}\n`);

        // Проверяем текущее количество записей
        const [currentCount] = await connection.execute('SELECT COUNT(*) as count FROM contents');
        console.log(`📊 Текущее количество записей в базе: ${currentCount[0].count}\n`);

        // Обрабатываем все страницы
        for (let page = 1; page <= totalPages; page++) {
            console.log(`\n📖 Страница ${page} из ${totalPages} (${Math.round((page / totalPages) * 100)}%)`);

            const response = await fetchContentDetailsPage(page);
            const pageData = response.data;

            const pageStats = {
                processed: 0,
                inserted: 0,
                updated: 0,
                skipped: 0,
                errors: 0,
                fieldsUpdated: 0
            };

            // Обрабатываем каждый элемент
            for (const content of pageData) {
                console.log(`   🔍 Обрабатываю: "${content.title}" (ID: ${content.id})`);

                const result = await processContentItem(connection, content);

                pageStats.processed++;
                stats.processed++;

                if (result.success) {
                    if (result.action === 'inserted') {
                        pageStats.inserted++;
                        stats.inserted++;
                    } else if (result.action === 'updated') {
                        pageStats.updated++;
                        stats.updated++;
                        pageStats.fieldsUpdated += result.fields || 0;
                        stats.fieldsUpdated += result.fields || 0;
                    }
                } else {
                    pageStats.errors++;
                    stats.errors++;
                }

                // Пауза между элементами
                await new Promise(resolve => setTimeout(resolve, 50));
            }

            console.log(`   📈 Итог страницы:`);
            console.log(`     Обработано: ${pageStats.processed}`);
            if (pageStats.inserted > 0) console.log(`     Добавлено новых: ${pageStats.inserted}`);
            if (pageStats.updated > 0) console.log(`     Обновлено: ${pageStats.updated} (${pageStats.fieldsUpdated} полей)`);
            if (pageStats.errors > 0) console.log(`     Ошибок: ${pageStats.errors}`);

            // Пауза между страницами
            if (page < totalPages) {
                await new Promise(resolve => setTimeout(resolve, 1500));
            }

            // Выводим промежуточную статистику каждые 10 страниц
            if (page % 10 === 0) {
                console.log(`\n📊 Промежуточная статистика после ${page} страниц:`);
                console.log(`   Всего обработано: ${stats.processed}`);
                console.log(`   Добавлено новых: ${stats.inserted}`);
                console.log(`   Обновлено: ${stats.updated}`);
                console.log(`   Поля обновлено: ${stats.fieldsUpdated}`);
                console.log(`   Ошибок: ${stats.errors}`);
                console.log(`   Прогресс: ${Math.round((page / totalPages) * 100)}%\n`);
            }
        }

        // Финальная статистика
        console.log('\n' + '='.repeat(60));
        console.log('✅ ОБРАБОТКА ЗАВЕРШЕНА!');
        console.log('='.repeat(60));
        console.log(`📈 ИТОГОВАЯ СТАТИСТИКА:`);
        console.log(`   Страниц обработано: ${totalPages}`);
        console.log(`   Всего элементов в API: ${totalItems}`);
        console.log(`   Обработано записей: ${stats.processed}`);
        console.log(`   Добавлено новых: ${stats.inserted}`);
        console.log(`   Обновлено существующих: ${stats.updated}`);
        console.log(`   Всего полей изменено: ${stats.fieldsUpdated}`);
        console.log(`   Ошибок: ${stats.errors}`);

        if (stats.updated > 0) {
            console.log(`   Среднее полей на обновление: ${Math.round(stats.fieldsUpdated / stats.updated)}`);
        }

        // Проверяем итоговое количество
        const [finalCount] = await connection.execute('SELECT COUNT(*) as count FROM contents');
        console.log(`\n📊 Итоговое количество записей в базе: ${finalCount[0].count}`);
        console.log(`📊 Добавлено записей за сессию: ${finalCount[0].count - currentCount[0].count}`);

        // Примеры добавленных записей
        await printRecentChanges(connection, stats.inserted);

    } catch (error) {
        console.error('\n💥 Критическая ошибка:');
        console.error(error.message);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n🔌 Соединение с базой данных закрыто');
        }
    }
}

async function fetchContentDetailsPage(page = 1) {
    console.log(`📄 Запрашиваю страницу ${page}...`);

    try {
        const response = await axios.post(API_URL, {
            pagination: {
                type: "page",
                order: "DESC",
                sortBy: "year",
                pageSize: PAGE_SIZE,
                page: page
            }
        }, {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_TOKEN}`
            },
            timeout: 30000
        });

        console.log(`✅ Страница ${page} получена: ${response.data.data.length} элементов`);
        return response.data;
    } catch (error) {
        console.error(`❌ Ошибка страницы ${page}:`, error.message);
        throw error;
    }
}

async function printRecentChanges(connection, insertedCount) {
    console.log('\n📋 Примеры изменений:');

    try {
        if (insertedCount > 0) {
            // Примеры новых записей
            const [newRecords] = await connection.execute(`
                SELECT id, title, year, content_type_id, duration
                FROM contents 
                ORDER BY created_at DESC 
                LIMIT 5
            `);

            console.log('   Последние добавленные записи:');
            newRecords.forEach(record => {
                console.log(`     ${record.id}: "${record.title}" (${record.year})`);
                console.log(`        Тип: ${record.content_type_id}, Длительность: ${record.duration} мин`);
            });
        }

        // Статистика заполненности
        const [fieldStats] = await connection.execute(`
            SELECT 
                COUNT(*) as total,
                COUNT(duration) as duration_filled,
                COUNT(premiere_at) as premiere_filled,
                COUNT(cast) as cast_filled,
                COUNT(directors) as directors_filled
            FROM contents
        `);

        if (fieldStats[0]) {
            console.log('\n📊 Заполненность полей:');
            const stats = fieldStats[0];
            console.log(`   Продолжительность: ${stats.duration_filled}/${stats.total} (${Math.round(stats.duration_filled * 100 / stats.total)}%)`);
            console.log(`   Дата премьеры: ${stats.premiere_filled}/${stats.total} (${Math.round(stats.premiere_filled * 100 / stats.total)}%)`);
            console.log(`   Актёры: ${stats.cast_filled}/${stats.total} (${Math.round(stats.cast_filled * 100 / stats.total)}%)`);
            console.log(`   Режиссёры: ${stats.directors_filled}/${stats.total} (${Math.round(stats.directors_filled * 100 / stats.total)}%)`);
        }

    } catch (error) {
        console.log('   Ошибка при получении примеров:', error.message);
    }
}

// ===== ОСНОВНАЯ ЛОГИКА =====
async function main() {
    console.log('='.repeat(60));
    console.log('   ПОЛНАЯ ОБРАБОТКА КОНТЕНТА С ДЕТАЛЬНОЙ ИНФОРМАЦИЕЙ');
    console.log('='.repeat(60));
    console.log(`   API: ${API_URL}`);
    console.log(`   PageSize: ${PAGE_SIZE}`);
    console.log('='.repeat(60) + '\n');

    try {
        await processAllContentDetails();
        console.log('\n🎉 Все операции завершены успешно!');

    } catch (error) {
        console.error('\n💥 Скрипт завершился с ошибкой:');
        console.error(error.message);
        process.exit(1);
    }
}

// Запуск
if (require.main === module) {
    main();
}

module.exports = {
    processContentItem,
    processAllContentDetails
};