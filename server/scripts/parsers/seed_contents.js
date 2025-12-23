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

const API_URL = 'https://catalog-sync-api.rstprgapipt.com/v1/contents';

// ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====

/**
 * Получает одну страницу контента из API
 */
async function fetchContentsPage(page = 1, pageSize = 100) {
    console.log(`📄 Запрашиваю страницу ${page} (размер: ${pageSize})...`);

    try {
        const response = await axios.post(API_URL, {
            pagination: {
                type: "page",
                order: "DESC",
                sortBy: "year",
                pageSize: pageSize
            }
        }, {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_TOKEN}`
            },
            timeout: 30000
        });

        return {
            data: response.data.data,
            meta: response.data.meta
        };
    } catch (error) {
        console.error(`❌ Ошибка при запросе страницы ${page}:`);
        if (error.response) {
            console.error(`   Статус: ${error.response.status}`);
            console.error(`   Ответ:`, error.response.data);
        }
        throw error;
    }
}

/**
 * Вставляет основной контент в таблицу contents
 */
async function insertContent(connection, content) {
    const sql = `
        INSERT INTO contents (
            id, title, original_title, poster_url, description, 
            year, kinopoisk_id, imdb_id, audio_tracks, video_quality,
            seasons_count, episodes_count, created_at, updated_at, 
            is_lgbt, player_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            title = VALUES(title),
            original_title = VALUES(original_title),
            poster_url = VALUES(poster_url),
            description = VALUES(description),
            year = VALUES(year),
            kinopoisk_id = VALUES(kinopoisk_id),
            imdb_id = VALUES(imdb_id),
            audio_tracks = VALUES(audio_tracks),
            video_quality = VALUES(video_quality),
            seasons_count = VALUES(seasons_count),
            episodes_count = VALUES(episodes_count),
            updated_at = VALUES(updated_at),
            is_lgbt = VALUES(is_lgbt),
            player_url = VALUES(player_url)
    `;

    const values = [
        content.id,
        content.title || '',
        content.originalTitle || '',
        content.posterUrl || '',
        content.description || '',
        content.year || null,
        content.kinopoiskId || null,
        content.imdbId || null,
        content.audioTracks || null,
        content.videoQuality || null,
        content.seasonsCount || null,
        content.episodesCount || null,
        content.createdAt ? new Date(content.createdAt) : null,
        content.updatedAt ? new Date(content.updatedAt) : null,
        content.isLgbt || false,
        content.playerUrl || null
    ];

    await connection.query(sql, values);
    return content.id;
}

/**
 * Вставляет рейтинги в таблицу ratings
 */
async function insertRatings(connection, contentId, ratings) {
    if (!ratings || Object.keys(ratings).length === 0) return;

    const ratingValues = [];
    const ratingSql = `
        INSERT INTO ratings (content_id, source, rating, votes)
        VALUES ?
        ON DUPLICATE KEY UPDATE
            rating = VALUES(rating),
            votes = VALUES(votes)
    `;

    for (const [source, data] of Object.entries(ratings)) {
        if (data && data.rating !== undefined) {
            ratingValues.push([
                contentId,
                source,
                data.rating,
                data.votes || null
            ]);
        }
    }

    if (ratingValues.length > 0) {
        await connection.query(ratingSql, [ratingValues]);
    }
}

/**
 * Обрабатывает связи многие-ко-многим для жанров, стран и т.д.
 */
async function processManyToManyRelations(connection, contentId, items, tableName, itemKey) {
    if (!items || items.length === 0) return;

    const values = items.map(item => [contentId, item.id]);
    const sql = `
        INSERT IGNORE INTO ${tableName} (content_id, ${itemKey}_id)
        VALUES ?
    `;

    await connection.query(sql, [values]);
}

/**
 * Обрабатывает авторов озвучки (voiceAuthorsV2)
 */
async function processVoiceAuthors(connection, contentId, voiceAuthors) {
    if (!voiceAuthors || voiceAuthors.length === 0) return;

    const values = voiceAuthors.map(author => [contentId, author.id]);
    const sql = `
        INSERT IGNORE INTO content_voice_authors (content_id, voice_author_id)
        VALUES ?
    `;

    await connection.query(sql, [values]);
}

/**
 * Обрабатывает эпизоды по сезонам (episodesBySeason)
 */
async function processEpisodesBySeason(connection, contentId, episodesBySeason) {
    if (!episodesBySeason || Object.keys(episodesBySeason).length === 0) return;

    const seasonValues = [];
    for (const [seasonNumber, episodesCount] of Object.entries(episodesBySeason)) {
        seasonValues.push([
            contentId,
            parseInt(seasonNumber),
            episodesCount
        ]);
    }

    const sql = `
        INSERT INTO content_seasons (content_id, season_ordering, episodes_count)
        VALUES ?
        ON DUPLICATE KEY UPDATE
            episodes_count = VALUES(episodes_count)
    `;

    if (seasonValues.length > 0) {
        await connection.query(sql, [seasonValues]);
    }
}

/**
 * Обрабатывает один элемент контента со всеми связями
 */
async function processContentItem(connection, content) {
    try {
        await connection.beginTransaction();

        // 1. Вставляем основной контент
        const contentId = await insertContent(connection, content);

        // 2. Вставляем рейтинги
        await insertRatings(connection, contentId, content.ratings);

        // 3. Обрабатываем связи многие-ко-многим
        await processManyToManyRelations(connection, contentId, content.genres, 'content_genres', 'genre');
        await processManyToManyRelations(connection, contentId, content.countries, 'content_countries', 'country');

        // 4. Обрабатываем авторов озвучки
        await processVoiceAuthors(connection, contentId, content.voiceAuthorsV2);

        // 5. Обрабатываем эпизоды по сезонам
        await processEpisodesBySeason(connection, contentId, content.episodesBySeason);

        await connection.commit();
        return { success: true, contentId };

    } catch (error) {
        await connection.rollback();
        console.error(`❌ Ошибка при обработке контента ID ${content.id}:`, error.message);
        return { success: false, error };
    }
}

/**
 * Основная функция для обработки всех страниц
 */
async function processAllPages() {
    console.log('🚀 Начинаю загрузку контента...\n');

    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Подключение к базе данных установлено\n');

        let currentPage = 1;
        let totalPages = 1;
        let totalProcessed = 0;
        let totalFailed = 0;
        const pageSize = 100;

        // Получаем первую страницу для определения общего количества страниц
        const firstPage = await fetchContentsPage(currentPage, pageSize);
        totalPages = firstPage.meta.pages || 1;

        console.log(`📊 Всего страниц для обработки: ${totalPages}`);
        console.log(`📊 Всего элементов: ${firstPage.meta.total || 'неизвестно'}\n`);

        // Обрабатываем первую страницу
        let stats = await processPageContents(connection, firstPage.data);
        totalProcessed += stats.processed;
        totalFailed += stats.failed;

        // Обрабатываем остальные страницы
        for (currentPage = 2; currentPage <= totalPages; currentPage++) {
            console.log(`\n🔄 Обработка страницы ${currentPage} из ${totalPages}...`);

            const pageData = await fetchContentsPage(currentPage, pageSize);
            const pageStats = await processPageContents(connection, pageData.data);

            totalProcessed += pageStats.processed;
            totalFailed += pageStats.failed;

            // Небольшая задержка, чтобы не нагружать API
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        console.log('\n✅ === ЗАГРУЗКА ЗАВЕРШЕНА ===');
        console.log('📈 Итоговая статистика:');
        console.log(`   Обработано страниц: ${totalPages}`);
        console.log(`   Успешно загружено: ${totalProcessed}`);
        console.log(`   Ошибок: ${totalFailed}`);
        console.log(`   Всего элементов: ${totalProcessed + totalFailed}`);

        // Выводим общую статистику
        await printFinalStatistics(connection);

    } catch (error) {
        console.error('\n❌ Критическая ошибка при обработке контента:');
        console.error(error.message);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Соединение с базой данных закрыто');
        }
    }
}

/**
 * Обрабатывает содержимое одной страницы
 */
async function processPageContents(connection, contents) {
    const stats = {
        processed: 0,
        failed: 0
    };

    for (const content of contents) {
        console.log(`   Обрабатываю: "${content.title}" (ID: ${content.id})`);

        const result = await processContentItem(connection, content);

        if (result.success) {
            stats.processed++;
        } else {
            stats.failed++;
        }
    }

    console.log(`   ✓ Успешно: ${stats.processed}, ✗ Ошибок: ${stats.failed}`);
    return stats;
}

/**
 * Выводит итоговую статистику
 */
async function printFinalStatistics(connection) {
    console.log('\n📋 Статистика базы данных:');

    try {
        const queries = [
            ['contents', 'SELECT COUNT(*) as count FROM contents'],
            ['ratings', 'SELECT COUNT(*) as count FROM ratings'],
            ['content_genres', 'SELECT COUNT(*) as count FROM content_genres'],
            ['content_countries', 'SELECT COUNT(*) as count FROM content_countries'],
            ['content_voice_authors', 'SELECT COUNT(*) as count FROM content_voice_authors'],
            ['content_seasons', 'SELECT COUNT(*) as count FROM content_seasons']
        ];

        for (const [tableName, sql] of queries) {
            const [result] = await connection.query(sql);
            console.log(`   ${tableName}: ${result[0].count} записей`);
        }

        // Пример последних добавленных записей
        const [latestContents] = await connection.query(`
            SELECT id, title, year 
            FROM contents 
            ORDER BY id DESC 
            LIMIT 5
        `);

        console.log('\n🎬 Последние добавленные фильмы:');
        latestContents.forEach(content => {
            console.log(`   ${content.id}: "${content.title}" (${content.year})`);
        });

    } catch (error) {
        console.error('   Ошибка при получении статистики:', error.message);
    }
}

/**
 * Проверяет структуру базы данных перед началом
 */
async function validateDatabaseStructure() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);

        const requiredTables = [
            'contents', 'content_genres', 'content_countries',
            'content_voice_authors', 'content_seasons', 'ratings',
            'genres', 'countries', 'voice_authors'
        ];

        console.log('🔍 Проверяю структуру базы данных...');

        for (const table of requiredTables) {
            const [tables] = await connection.query(
                "SHOW TABLES LIKE ?", [table]
            );

            if (tables.length === 0) {
                console.error(`❌ Таблица "${table}" не найдена!`);
                console.error(`   Запустите скрипты для заполнения вспомогательных таблиц.`);
                return false;
            }
        }

        console.log('✅ Все необходимые таблицы существуют');
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
    console.log('========================================');
    console.log(' ЗАГРУЗКА КОНТЕНТА В БАЗУ ДАННЫХ ');
    console.log('========================================\n');

    try {
        // Проверяем структуру базы данных
        const isValid = await validateDatabaseStructure();
        if (!isValid) {
            console.error('\n❌ Прервано: неполная структура базы данных');
            process.exit(1);
        }

        // Начинаем загрузку контента
        await processAllPages();

        console.log('\n🎉 Все операции завершены успешно!');

    } catch (error) {
        console.error('\n💥 Скрипт завершился с критической ошибкой:');
        console.error(error.message);
        process.exit(1);
    }
}

// Запуск скрипта
if (require.main === module) {
    main().catch(error => {
        console.error('Непредвиденная ошибка:', error);
        process.exit(1);
    });
}

// Экспортируем функции для тестирования
module.exports = {
    fetchContentsPage,
    processContentItem,
    processAllPages,
    validateDatabaseStructure
};