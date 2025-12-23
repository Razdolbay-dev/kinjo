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
const PAGE_SIZE = 100;

// ===== ИСПРАВЛЕННЫЕ ФУНКЦИИ =====

/**
 * Получает страницу контента с указанием номера страницы
 */
async function fetchContentsPage(page = 1) {
    console.log(`📄 Запрашиваю страницу ${page}...`);

    try {
        const response = await axios.post(API_URL, {
            pagination: {
                type: "page",
                order: "DESC",
                sortBy: "year",
                pageSize: PAGE_SIZE,
                page: page  // Ключевое исправление: передаем номер страницы!
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

        // Проверяем, что это действительно новая страница
        if (response.data.data.length > 0) {
            const firstItem = response.data.data[0];
            console.log(`   Первый элемент: ID ${firstItem.id}, "${firstItem.title}"`);
        }

        return response.data;
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
 * Проверяет, был ли контент уже обработан
 */
async function isContentProcessed(connection, contentId) {
    try {
        const [rows] = await connection.query(
            'SELECT COUNT(*) as count FROM contents WHERE id = ?',
            [contentId]
        );
        return rows[0].count > 0;
    } catch (error) {
        return false;
    }
}

/**
 * Основная функция обработки с защитой от дубликатов
 */
async function processAllPages() {
    console.log('🚀 Начинаю загрузку контента с правильной пагинацией...\n');
    console.log(`📊 Размер страницы: ${PAGE_SIZE} элементов\n`);

    let connection;
    let processedIds = new Set(); // Для отслеживания обработанных ID в памяти
    let totalProcessed = 0;
    let totalPages = 0;

    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Подключение к базе данных установлено\n');

        // 1. Получаем первую страницу для определения общего количества
        console.log('📊 Получаю информацию о количестве страниц...');
        const firstResponse = await fetchContentsPage(1);

        totalPages = firstResponse.meta.pages;
        const totalItems = firstResponse.meta.total;

        console.log(`📊 Всего элементов: ${totalItems}`);
        console.log(`📊 Всего страниц: ${totalPages}\n`);

        if (totalPages === 0) {
            console.log('❌ API вернул 0 страниц');
            return;
        }

        // 2. Сначала проверим, сколько уже есть записей
        const [existingCount] = await connection.query('SELECT COUNT(*) as count FROM contents');
        console.log(`📊 Уже загружено записей: ${existingCount[0].count}\n`);

        // 3. Обрабатываем ВСЕ страницы последовательно
        for (let currentPage = 1; currentPage <= totalPages; currentPage++) {
            console.log(`\n📖 Страница ${currentPage} из ${totalPages} (${Math.round((currentPage / totalPages) * 100)}%)`);

            const response = await fetchContentsPage(currentPage);
            const pageData = response.data;

            let pageProcessed = 0;
            let pageSkipped = 0;

            // Обрабатываем каждый элемент на странице
            for (const content of pageData) {
                // Проверяем дубликаты
                if (processedIds.has(content.id)) {
                    console.log(`   ⏭️ Пропущен (дубликат в памяти): ID ${content.id}`);
                    pageSkipped++;
                    continue;
                }

                const alreadyInDB = await isContentProcessed(connection, content.id);
                if (alreadyInDB) {
                    console.log(`   ⏭️ Пропущен (уже в БД): ID ${content.id}`);
                    processedIds.add(content.id);
                    pageSkipped++;
                    continue;
                }

                // Обрабатываем новый контент
                const result = await processContentItem(connection, content);

                if (result.success) {
                    processedIds.add(content.id);
                    pageProcessed++;
                    totalProcessed++;

                    // Выводим прогресс каждые 10 обработанных записей
                    if (pageProcessed % 10 === 0) {
                        console.log(`   📈 Обработано на странице: ${pageProcessed}`);
                    }
                } else {
                    console.log(`   ✗ Ошибка: ID ${content.id} - ${result.error}`);
                }
            }

            console.log(`   📈 Итог страницы: ${pageProcessed} добавлено, ${pageSkipped} пропущено`);

            // Сохраняем прогресс каждые 50 страниц
            if (currentPage % 50 === 0) {
                console.log(`\n💾 Сохраняю прогресс... Всего обработано: ${totalProcessed} записей`);
            }

            // Пауза между страницами (1.5 секунды)
            if (currentPage < totalPages) {
                await new Promise(resolve => setTimeout(resolve, 1500));
            }
        }

        // Финальная статистика
        console.log('\n' + '='.repeat(60));
        console.log('✅ ЗАГРУЗКА ЗАВЕРШЕНА!');
        console.log('='.repeat(60));
        console.log(`📈 Итоговая статистика:`);
        console.log(`   Всего страниц: ${totalPages}`);
        console.log(`   Всего элементов в API: ${totalItems}`);
        console.log(`   Успешно загружено: ${totalProcessed} новых записей`);
        console.log(`   Уникальных ID в памяти: ${processedIds.size}`);

        // Проверяем итоговое количество в БД
        const [finalCount] = await connection.query('SELECT COUNT(*) as count FROM contents');
        console.log(`   Всего записей в базе: ${finalCount[0].count}`);

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

/**
 * Обрабатывает один элемент контента (остается без изменений)
 */
async function processContentItem(connection, content) {
    const contentId = content.id;

    try {
        await connection.beginTransaction();

        // 1. Вставляем основной контент
        const insertSql = `
            INSERT INTO contents (
                id, title, original_title, description, poster_url, year,
                kinopoisk_id, imdb_id, audio_tracks, video_quality,
                seasons_count, episodes_count, created_at, updated_at,
                is_lgbt, player_url
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                title = VALUES(title),
                original_title = VALUES(original_title),
                description = VALUES(description),
                poster_url = VALUES(poster_url),
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
            content.originalTitle || null,
            content.description || null,
            content.posterUrl || null,
            content.year || null,
            content.kinopoiskId || null,
            content.imdbId || null,
            content.audioTracks || null,
            content.videoQuality || null,
            content.seasonsCount || null,
            content.episodesCount || null,
            parseCustomDate(content.createdAt),
            parseCustomDate(content.updatedAt),
            parseIsLgbt(content.isLgbt),
            content.playerUrl || null
        ];

        await connection.query(insertSql, values);

        // 2. Рейтинги
        if (content.ratings && typeof content.ratings === 'object') {
            const ratingValues = [];
            for (const [source, data] of Object.entries(content.ratings)) {
                if (data && typeof data === 'object') {
                    ratingValues.push([
                        contentId,
                        source,
                        data.rating || 0,
                        data.votes || 0
                    ]);
                }
            }

            if (ratingValues.length > 0) {
                const ratingSql = `
                    INSERT INTO ratings (content_id, source, rating, votes)
                    VALUES ?
                    ON DUPLICATE KEY UPDATE
                        rating = VALUES(rating),
                        votes = VALUES(votes)
                `;
                await connection.query(ratingSql, [ratingValues]);
            }
        }

        // 3. Жанры
        if (Array.isArray(content.genres) && content.genres.length > 0) {
            const genreValues = content.genres.map(genre => [contentId, genre.id]);
            const genreSql = `INSERT IGNORE INTO content_genres (content_id, genre_id) VALUES ?`;
            await connection.query(genreSql, [genreValues]);
        }

        // 4. Страны
        if (Array.isArray(content.countries) && content.countries.length > 0) {
            const countryValues = content.countries.map(country => [contentId, country.id]);
            const countrySql = `INSERT IGNORE INTO content_countries (content_id, country_id) VALUES ?`;
            await connection.query(countrySql, [countryValues]);
        }

        // 5. Авторы озвучки
        if (Array.isArray(content.voiceAuthorsV2) && content.voiceAuthorsV2.length > 0) {
            const authorValues = content.voiceAuthorsV2
                .filter(author => author && author.id !== undefined)
                .map(author => [contentId, author.id]);

            if (authorValues.length > 0) {
                const authorSql = `INSERT IGNORE INTO content_voice_authors (content_id, voice_author_id) VALUES ?`;
                await connection.query(authorSql, [authorValues]);
            }
        }

        // 6. Эпизоды по сезонам
        if (content.episodesBySeason && typeof content.episodesBySeason === 'object') {
            const seasonValues = [];
            for (const [seasonNumber, episodesCount] of Object.entries(content.episodesBySeason)) {
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
                const seasonSql = `
                    INSERT INTO content_seasons (content_id, season_ordering, episodes_count)
                    VALUES ?
                    ON DUPLICATE KEY UPDATE
                        episodes_count = VALUES(episodes_count)
                `;
                await connection.query(seasonSql, [seasonValues]);
            }
        }

        await connection.commit();
        return { success: true, contentId };

    } catch (error) {
        await connection.rollback();
        return { success: false, error: error.message, contentId };
    }
}

// ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====
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

function parseIsLgbt(value) {
    if (value === null || value === undefined) return false;
    return Boolean(value);
}

// ===== ОСНОВНАЯ ЛОГИКА =====
async function main() {
    console.log('='.repeat(60));
    console.log('   ЗАГРУЗКА КОНТЕНТА С ПРАВИЛЬНОЙ ПАГИНАЦИЕЙ');
    console.log('='.repeat(60));
    console.log(`   API: ${API_URL}`);
    console.log(`   PageSize: ${PAGE_SIZE}`);
    console.log('='.repeat(60) + '\n');

    try {
        // Запускаем загрузку
        await processAllPages();

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
    fetchContentsPage,
    processContentItem,
    processAllPages
};