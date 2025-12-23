// seed_contents_details.js
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

/**
 * Преобразует строковую дату в объект Date
 */
function parseCustomDate(dateString) {
    if (!dateString || typeof dateString !== 'string') return null;

    try {
        // Формат: "23.12.2025 10:19:51"
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
        console.warn(`⚠️ Не удалось распарсить дату: "${dateString}"`);
        return null;
    }
}

/**
 * Сравнивает два значения и определяет, нужно ли обновление
 */
function needsUpdate(oldValue, newValue) {
    // Если новое значение null/undefined - не обновляем
    if (newValue === null || newValue === undefined) return false;

    // Если старое значение пустое, а новое нет - обновляем
    if (!oldValue && newValue) return true;

    // Для строк: если новая не пустая и отличается от старой
    if (typeof oldValue === 'string' && typeof newValue === 'string') {
        return newValue.trim() !== '' && oldValue.trim() !== newValue.trim();
    }

    // Для чисел
    if (typeof oldValue === 'number' && typeof newValue === 'number') {
        return newValue !== 0 && oldValue !== newValue;
    }

    // Для дат
    if (oldValue instanceof Date && newValue instanceof Date) {
        return oldValue.getTime() !== newValue.getTime();
    }

    // По умолчанию обновляем если значения разные
    return oldValue !== newValue;
}

/**
 * Получает страницу с детальной информацией
 */
async function fetchContentDetailsPage(page = 1) {
    console.log(`📄 Запрашиваю детальную страницу ${page}...`);

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

        console.log(`✅ Детальная страница ${page} получена: ${response.data.data.length} элементов`);

        if (response.data.data.length > 0) {
            const firstItem = response.data.data[0];
            console.log(`   Первый элемент: ID ${firstItem.id}, "${firstItem.title}"`);
        }

        return response.data;
    } catch (error) {
        console.error(`❌ Ошибка при запросе детальной страницы ${page}:`);
        if (error.response) {
            console.error(`   Статус: ${error.response.status}`);
            if (error.response.data) {
                console.error(`   Ответ:`, JSON.stringify(error.response.data, null, 2));
            }
        }
        throw error;
    }
}

/**
 * Получает существующую запись из базы
 */
async function getExistingContent(connection, contentId) {
    try {
        const [rows] = await connection.execute(
            'SELECT * FROM contents WHERE id = ?',
            [contentId]
        );
        return rows[0] || null;
    } catch (error) {
        console.error(`❌ Ошибка при получении записи ${contentId}:`, error.message);
        return null;
    }
}

/**
 * Обновляет запись в таблице contents
 */
async function updateContentRecord(connection, existing, newData) {
    const contentId = newData.id;
    const updates = {};

    // Собираем все поля для проверки
    const fieldsToCheck = {
        // Основные поля
        title: newData.title,
        original_title: newData.originalTitle,
        description: newData.description,
        poster_url: newData.posterUrl,
        year: newData.year,
        end_year: newData.endYear,
        kinopoisk_id: newData.kinopoiskId,
        imdb_id: newData.imdbId,
        age_restriction: newData.ageRestriction,
        cast: newData.cast,
        directors: newData.directors,
        screenwriters: newData.screenwriters,
        producers: newData.producers,
        operators: newData.operators,
        composers: newData.composers,
        artists: newData.artists,
        editors: newData.editors,
        audio_tracks: newData.audioTracks,
        video_quality: newData.videoQuality,
        seasons_count: newData.seasonsCount,
        episodes_count: newData.episodesCount,
        duration: newData.duration,

        // Даты
        created_at: parseCustomDate(newData.createdAt),
        updated_at: parseCustomDate(newData.updatedAt),
        premiere_at: parseCustomDate(newData.premiereAt),
        last_season_premiere_at: parseCustomDate(newData.lastSeasonPremiereAt),
        exclusive_start_at: parseCustomDate(newData.exclusiveStartAt),
        exclusive_end_at: parseCustomDate(newData.exclusiveEndAt),

        // Флаги
        is_lgbt: newData.isLgbt || false,

        // Ссылки
        player_url: newData.playerUrl,

        // Тип контента (нужно найти ID по slug)
        content_type_id: null // Заполним позже
    };

    // Проверяем каждое поле на необходимость обновления
    let hasUpdates = false;
    const updateFields = [];
    const updateValues = [];

    for (const [field, newValue] of Object.entries(fieldsToCheck)) {
        const oldValue = existing[field];

        if (needsUpdate(oldValue, newValue)) {
            console.log(`   🔄 ${field}: "${oldValue}" → "${newValue}"`);
            updateFields.push(`${field} = ?`);
            updateValues.push(newValue);
            hasUpdates = true;
        }
    }

    // Обрабатываем content_type
    if (newData.contentType && newData.contentType.id) {
        const contentTypeId = newData.contentType.id;
        if (existing.content_type_id !== contentTypeId) {
            console.log(`   🔄 content_type_id: ${existing.content_type_id} → ${contentTypeId}`);
            updateFields.push('content_type_id = ?');
            updateValues.push(contentTypeId);
            hasUpdates = true;
        }
    }

    // Если есть обновления - выполняем
    if (hasUpdates) {
        try {
            updateValues.push(contentId);
            const sql = `
                UPDATE contents 
                SET ${updateFields.join(', ')}
                WHERE id = ?
            `;

            await connection.execute(sql, updateValues);
            console.log(`   ✅ Обновлено ${updateFields.length} полей для ID ${contentId}`);
            return { updated: true, fields: updateFields.length };
        } catch (error) {
            console.error(`   ❌ Ошибка обновления ID ${contentId}:`, error.message);
            return { updated: false, error: error.message };
        }
    } else {
        console.log(`   ⏭️ Нет изменений для ID ${contentId}`);
        return { updated: false, reason: 'no changes' };
    }
}

/**
 * Обрабатывает рейтинги
 */
async function updateRatings(connection, contentId, ratings) {
    if (!ratings || typeof ratings !== 'object') return;

    try {
        // Удаляем старые рейтинги
        await connection.execute(
            'DELETE FROM ratings WHERE content_id = ?',
            [contentId]
        );

        // Вставляем новые
        const ratingValues = [];
        for (const [source, data] of Object.entries(ratings)) {
            if (data && typeof data === 'object' && (data.rating || data.votes)) {
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
                INSERT INTO ratings (content_id, source, rating, votes)
                VALUES ?
            `;
            await connection.query(sql, [ratingValues]);
        }
    } catch (error) {
        console.error(`   ❌ Ошибка обновления рейтингов ${contentId}:`, error.message);
    }
}

/**
 * Обрабатывает связи многие-ко-многим
 */
async function updateManyToManyRelations(connection, contentId, items, tableName, idField) {
    if (!Array.isArray(items) || items.length === 0) return;

    try {
        // Удаляем старые связи
        await connection.execute(
            `DELETE FROM ${tableName} WHERE content_id = ?`,
            [contentId]
        );

        // Вставляем новые
        const values = items.map(item => [contentId, item.id]);
        if (values.length > 0) {
            const sql = `
                INSERT IGNORE INTO ${tableName} (content_id, ${idField}_id)
                VALUES ?
            `;
            await connection.query(sql, [values]);
        }
    } catch (error) {
        console.error(`   ❌ Ошибка обновления ${tableName} ${contentId}:`, error.message);
    }
}

/**
 * Обрабатывает языки (отдельная таблица)
 */
async function updateLanguages(connection, contentId, languages) {
    if (!Array.isArray(languages) || languages.length === 0) return;

    try {
        // Удаляем старые языки
        await connection.execute(
            'DELETE FROM content_languages WHERE content_id = ?',
            [contentId]
        );

        // Вставляем новые
        const values = languages.map(lang => [contentId, lang.id]);
        if (values.length > 0) {
            const sql = `
                INSERT IGNORE INTO content_languages (content_id, language_id)
                VALUES ?
            `;
            await connection.query(sql, [values]);
        }
    } catch (error) {
        console.error(`   ❌ Ошибка обновления языков ${contentId}:`, error.message);
    }
}

/**
 * Обрабатывает субтитры
 */
async function updateSubtitles(connection, contentId, subtitles) {
    if (!Array.isArray(subtitles) || subtitles.length === 0) return;

    try {
        // Удаляем старые субтитры
        await connection.execute(
            'DELETE FROM content_subtitles WHERE content_id = ?',
            [contentId]
        );

        // Вставляем новые
        const values = subtitles.map(sub => [contentId, sub.id]);
        if (values.length > 0) {
            const sql = `
                INSERT IGNORE INTO content_subtitles (content_id, subtitle_id)
                VALUES ?
            `;
            await connection.query(sql, [values]);
        }
    } catch (error) {
        console.error(`   ❌ Ошибка обновления субтитров ${contentId}:`, error.message);
    }
}

/**
 * Обрабатывает эпизоды по сезонам
 */
async function updateEpisodesBySeason(connection, contentId, episodesBySeason) {
    if (!episodesBySeason || typeof episodesBySeason !== 'object') return;

    try {
        // Удаляем старые сезоны
        await connection.execute(
            'DELETE FROM content_seasons WHERE content_id = ?',
            [contentId]
        );

        // Вставляем новые
        const seasonValues = [];
        for (const [seasonNumber, episodesCount] of Object.entries(episodesBySeason)) {
            const seasonNum = parseInt(seasonNumber, 10);
            if (!isNaN(seasonNum) && episodesCount !== undefined) {
                seasonValues.push([
                    contentId,
                    seasonNum,
                    episodesCount
                ]);
            }
        }

        if (seasonValues.length > 0) {
            const sql = `
                INSERT INTO content_seasons (content_id, season_ordering, episodes_count)
                VALUES ?
            `;
            await connection.query(sql, [seasonValues]);
        }
    } catch (error) {
        console.error(`   ❌ Ошибка обновления сезонов ${contentId}:`, error.message);
    }
}

/**
 * Обрабатывает один элемент контента с детальной информацией
 */
async function processContentDetails(connection, content) {
    const contentId = content.id;

    try {
        // 1. Получаем существующую запись
        const existing = await getExistingContent(connection, contentId);

        if (!existing) {
            console.log(`   ⚠️ Запись ${contentId} не найдена в базе, пропускаю`);
            return { processed: false, reason: 'not found' };
        }

        await connection.beginTransaction();

        // 2. Обновляем основную запись
        const contentUpdate = await updateContentRecord(connection, existing, content);

        // 3. Обновляем рейтинги
        await updateRatings(connection, contentId, content.ratings);

        // 4. Обновляем жанры
        await updateManyToManyRelations(connection, contentId, content.genres, 'content_genres', 'genre');

        // 5. Обновляем страны
        await updateManyToManyRelations(connection, contentId, content.countries, 'content_countries', 'country');

        // 6. Обновляем авторов озвучки
        await updateManyToManyRelations(connection, contentId, content.voiceAuthorsV2, 'content_voice_authors', 'voice_author');

        // 7. Обновляем языки (новая связь)
        await updateLanguages(connection, contentId, content.languages);

        // 8. Обновляем субтитры (если есть)
        if (content.subtitles && content.subtitles.length > 0) {
            await updateSubtitles(connection, contentId, content.subtitles);
        }

        // 9. Обновляем эпизоды по сезонам
        await updateEpisodesBySeason(connection, contentId, content.episodesBySeason);

        await connection.commit();

        return {
            processed: true,
            updated: contentUpdate.updated,
            fieldsUpdated: contentUpdate.fields || 0
        };

    } catch (error) {
        await connection.rollback();
        console.error(`   ❌ Ошибка обработки деталей ${contentId}:`, error.message);
        return { processed: false, error: error.message };
    }
}

/**
 * Основная функция для обновления всех записей
 */
async function updateAllContentDetails() {
    console.log('🚀 Начинаю обновление контента детальной информацией...\n');
    console.log(`📊 Размер страницы: ${PAGE_SIZE} элементов\n`);

    let connection;
    let currentPage = 1;
    let totalPages = 0;
    let totalProcessed = 0;
    let totalUpdated = 0;
    let totalFieldsUpdated = 0;

    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Подключение к базе данных установлено\n');

        // 1. Получаем первую страницу для определения общего количества
        console.log('📊 Получаю информацию о количестве страниц...');
        const firstResponse = await fetchContentDetailsPage(1);

        totalPages = firstResponse.meta.pages;
        const totalItems = firstResponse.meta.total;

        console.log(`📊 Всего элементов: ${totalItems}`);
        console.log(`📊 Всего страниц: ${totalPages}\n`);

        if (totalPages === 0) {
            console.log('❌ API вернул 0 страниц');
            return;
        }

        // 2. Проверяем, сколько записей уже в базе
        const [existingCount] = await connection.execute('SELECT COUNT(*) as count FROM contents');
        console.log(`📊 Записей в базе: ${existingCount[0].count}\n`);

        // 3. Обрабатываем ВСЕ страницы
        for (currentPage = 1; currentPage <= totalPages; currentPage++) {
            console.log(`\n📖 Обработка страницы ${currentPage} из ${totalPages} (${Math.round((currentPage / totalPages) * 100)}%)`);

            const response = await fetchContentDetailsPage(currentPage);
            const pageData = response.data;

            let pageProcessed = 0;
            let pageUpdated = 0;
            let pageFieldsUpdated = 0;

            // Обрабатываем каждый элемент на странице
            for (const content of pageData) {
                console.log(`   🔍 Проверяю: "${content.title}" (ID: ${content.id})`);

                const result = await processContentDetails(connection, content);

                if (result.processed) {
                    pageProcessed++;
                    totalProcessed++;

                    if (result.updated) {
                        pageUpdated++;
                        totalUpdated++;
                        pageFieldsUpdated += result.fieldsUpdated || 0;
                        totalFieldsUpdated += result.fieldsUpdated || 0;
                    }
                }

                // Небольшая пауза между элементами
                await new Promise(resolve => setTimeout(resolve, 50));
            }

            console.log(`   📈 Итог страницы: ${pageProcessed} проверено, ${pageUpdated} обновлено, ${pageFieldsUpdated} полей изменено`);

            // Пауза между страницами (2 секунды)
            if (currentPage < totalPages) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }

            // Каждые 10 страниц выводим промежуточную статистику
            if (currentPage % 10 === 0) {
                console.log(`\n📊 Промежуточная статистика после ${currentPage} страниц:`);
                console.log(`   Обработано: ${totalProcessed} записей`);
                console.log(`   Обновлено: ${totalUpdated} записей`);
                console.log(`   Всего полей изменено: ${totalFieldsUpdated}`);
                console.log(`   Прогресс: ${Math.round((currentPage / totalPages) * 100)}%\n`);
            }
        }

        // Финальная статистика
        console.log('\n' + '='.repeat(60));
        console.log('✅ ОБНОВЛЕНИЕ ЗАВЕРШЕНО!');
        console.log('='.repeat(60));
        console.log(`📈 Итоговая статистика:`);
        console.log(`   Страниц обработано: ${currentPage - 1}`);
        console.log(`   Всего элементов в API: ${totalItems}`);
        console.log(`   Проверено записей: ${totalProcessed}`);
        console.log(`   Обновлено записей: ${totalUpdated}`);
        console.log(`   Всего полей изменено: ${totalFieldsUpdated}`);

        if (totalUpdated > 0) {
            console.log(`   Среднее количество полей на запись: ${Math.round(totalFieldsUpdated / totalUpdated)}`);
        }

        // Выводим примеры обновленных полей
        await printUpdateExamples(connection);

    } catch (error) {
        console.error('\n💥 Критическая ошибка:');
        console.error(error.message);

        if (connection) {
            await printUpdateExamples(connection);
        }

        throw error;
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n🔌 Соединение с базой данных закрыто');
        }
    }
}

/**
 * Выводит примеры обновленных записей
 */
async function printUpdateExamples(connection) {
    console.log('\n📋 Примеры обновленных записей:');

    try {
        // Получаем последние обновленные записи
        const [recentUpdates] = await connection.execute(`
            SELECT 
                id, 
                title, 
                year,
                updated_at,
                content_type_id,
                duration,
                premiere_at
            FROM contents 
            WHERE updated_at > DATE_SUB(NOW(), INTERVAL 1 DAY)
            ORDER BY updated_at DESC 
            LIMIT 5
        `);

        if (recentUpdates.length > 0) {
            console.log('   Последние обновления:');
            recentUpdates.forEach(item => {
                console.log(`     ${item.id}: "${item.title}" (${item.year})`);
                console.log(`        Тип: ${item.content_type_id}, Длительность: ${item.duration} мин`);
                console.log(`        Премьера: ${item.premiere_at}, Обновлено: ${item.updated_at}`);
            });
        } else {
            console.log('   Не найдено недавно обновленных записей');
        }

        // Статистика по заполненности полей
        console.log('\n📊 Статистика заполненности полей:');

        const fieldStats = [
            ['duration', 'Продолжительность'],
            ['premiere_at', 'Дата премьеры'],
            ['cast', 'Актёры'],
            ['directors', 'Режиссёры'],
            ['age_restriction', 'Возрастное ограничение']
        ];

        for (const [field, name] of fieldStats) {
            const [stats] = await connection.execute(`
                SELECT 
                    COUNT(*) as total,
                    COUNT(${field}) as filled,
                    ROUND(COUNT(${field}) * 100.0 / COUNT(*), 1) as percentage
                FROM contents
            `);

            if (stats[0]) {
                console.log(`   ${name}: ${stats[0].filled}/${stats[0].total} (${stats[0].percentage}%)`);
            }
        }

    } catch (error) {
        console.error('   Ошибка при получении примеров:', error.message);
    }
}

/**
 * Проверяет структуру базы перед началом
 */
async function validateDatabaseStructure() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);

        const requiredTables = [
            'contents', 'content_genres', 'content_countries',
            'content_voice_authors', 'content_seasons', 'ratings',
            'content_languages', 'content_subtitles'
        ];

        console.log('🔍 Проверяю структуру базы данных...');

        for (const table of requiredTables) {
            const [tables] = await connection.query(
                "SHOW TABLES LIKE ?", [table]
            );

            if (tables.length === 0) {
                console.warn(`⚠️ Таблица "${table}" не найдена. Могут быть ошибки.`);
            }
        }

        console.log('✅ Проверка структуры завершена');
        return true;

    } catch (error) {
        console.error('Ошибка при проверке структуры:', error.message);
        return false;
    } finally {
        if (connection) await connection.end();
    }
}

// ===== ОСНОВНАЯ ЛОГИКА =====
async function main() {
    console.log('='.repeat(60));
    console.log('   ОБНОВЛЕНИЕ КОНТЕНТА ДЕТАЛЬНОЙ ИНФОРМАЦИЕЙ');
    console.log('='.repeat(60));
    console.log(`   API: ${API_URL}`);
    console.log(`   PageSize: ${PAGE_SIZE}`);
    console.log('='.repeat(60) + '\n');

    try {
        // Проверяем структуру базы данных
        const isValid = await validateDatabaseStructure();
        if (!isValid) {
            console.warn('\n⚠️ Продолжаю с неполной структурой базы...');
        }

        // Запускаем обновление
        await updateAllContentDetails();

        console.log('\n🎉 Обновление завершено успешно!');

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

// Экспорт для тестирования
module.exports = {
    parseCustomDate,
    needsUpdate,
    fetchContentDetailsPage,
    processContentDetails,
    updateAllContentDetails
};