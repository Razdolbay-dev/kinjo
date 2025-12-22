require('dotenv').config();
const axios = require('axios');
const mysql = require('mysql2/promise');

/* ================= CONFIG ================= */

const API_URL = 'https://catalog-sync-api.rstprgapipt.com/v1/contents';
const PAGE_SIZE = 100;
const TOKEN = process.env.CATALOG_API_TOKEN;

if (!TOKEN) {
    console.error('CATALOG_API_TOKEN is not set');
    process.exit(1);
}

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    connectionLimit: 10,
});

/* ================= API ================= */

async function fetchPage(page) {
    const { data } = await axios.post(
        API_URL,
        {
            pagination: {
                type: 'page',
                order: 'DESC',
                sortBy: 'year',
                page,
                pageSize: PAGE_SIZE,
            },
        },
        {
            headers: {
                Authorization: `Bearer ${TOKEN}`,
                'Content-Type': 'application/json',
                accept: 'application/json',
            },
            timeout: 20000,
        }
    );

    return data;
}

/* ================= DB HELPERS ================= */

async function upsertContent(conn, c) {
    await conn.query(
        `
            INSERT INTO contents (
                id,
                content_type_id,
                title,
                original_title,
                description,
                poster_url,
                duration,
                year,
                kinopoisk_id,
                imdb_id,
                video_quality,
                seasons_count,
                episodes_count,
                created_at,
                updated_at,
                is_lgbt,
                player_url
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                                     content_type_id = VALUES(content_type_id),
                                     title = VALUES(title),
                                     original_title = VALUES(original_title),
                                     description = VALUES(description),
                                     poster_url = VALUES(poster_url),
                                     duration = VALUES(duration),
                                     year = VALUES(year),
                                     kinopoisk_id = VALUES(kinopoisk_id),
                                     imdb_id = VALUES(imdb_id),
                                     video_quality = VALUES(video_quality),
                                     seasons_count = VALUES(seasons_count),
                                     episodes_count = VALUES(episodes_count),
                                     updated_at = VALUES(updated_at),
                                     is_lgbt = VALUES(is_lgbt),
                                     player_url = VALUES(player_url)

        `,
        [
            c.id,
            contentTypeId,     // <-- КРИТИЧЕСКИ ВАЖНО
            c.title,
            c.originalTitle,
            c.description,
            c.posterUrl,
            c.duration ?? 0,        // <-- ВАЖНО
            c.year,
            c.kinopoiskId || null,
            c.imdbId || null,
            c.videoQuality,
            c.seasonsCount,
            c.episodesCount,
            c.createdAt,
            c.updatedAt,
            c.isLgbt,
            c.playerUrl,
        ]

    );
}

async function syncGenres(conn, contentId, genres) {
    if (!genres.length) return;

    for (const g of genres) {
        await conn.query(
            `INSERT IGNORE INTO genres (id, name, slug) VALUES (?, ?, ?)`,
            [g.id, g.name, g.slug]
        );
    }

    await conn.query(`DELETE FROM content_genres WHERE content_id = ?`, [contentId]);

    for (const g of genres) {
        await conn.query(
            `INSERT INTO content_genres (content_id, genre_id) VALUES (?, ?)`,
            [contentId, g.id]
        );
    }
}

async function syncCountries(conn, contentId, countries) {
    if (!countries.length) return;

    for (const c of countries) {
        await conn.query(
            `INSERT IGNORE INTO countries (id, name, slug) VALUES (?, ?, ?)`,
            [c.id, c.name, c.slug]
        );
    }

    await conn.query(`DELETE FROM content_countries WHERE content_id = ?`, [contentId]);

    for (const c of countries) {
        await conn.query(
            `INSERT INTO content_countries (content_id, country_id) VALUES (?, ?)`,
            [contentId, c.id]
        );
    }
}

async function syncRatings(conn, contentId, ratings) {
    for (const r of ratings) {
        await conn.query(
            `
      INSERT INTO ratings (content_id, source, rating, votes)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        rating = VALUES(rating),
        votes = VALUES(votes)
      `,
            [contentId, r.source, r.rating, r.votes]
        );
    }
}

/* ================= SYNC ================= */

async function syncAll() {
    console.log('Fetching first page...');
    const first = await fetchPage(1);
    const totalPages = first.meta.pages;

    console.log(`Total pages: ${totalPages}`);

    const conn = await db.getConnection();
    try {
        for (let page = 1; page <= totalPages; page++) {
            console.log(`Sync page ${page}/${totalPages}`);

            const response = page === 1 ? first : await fetchPage(page);

            for (const c of response.data) {
                await conn.beginTransaction();

                try {
                    const contentTypeId = await upsertContentType(db, c.contentType);
                    await upsertContent(conn, c);
                    await syncGenres(conn, c.id, c.genres || []);
                    await syncCountries(conn, c.id, c.countries || []);
                    await syncRatings(
                        conn,
                        c.id,
                        Object.entries(c.ratings || {}).map(([source, r]) => ({
                            source,
                            rating: r.rating,
                            votes: r.votes,
                        }))
                    );

                    await conn.commit();
                } catch (err) {
                    await conn.rollback();
                    console.error(`Failed content ${c.id}:`, err.message);
                }
            }
        }
    } finally {
        conn.release();
    }
}


async function upsertContentType(db, ct) {
    if (!ct || !ct.id) {
        throw new Error('Invalid contentType object');
    }

    await db.execute(
        `
            INSERT INTO content_types (id, name, slug)
            VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE
                                     name = VALUES(name),
                                     slug = VALUES(slug)
        `,
        [ct.id, ct.name ?? '', ct.slug ?? '']
    );

    return ct.id;
}


/* ================= RUN ================= */

(async () => {
    try {
        await syncAll();
        console.log('DB sync completed');
        process.exit(0);
    } catch (err) {
        console.error('Sync failed:', err);
        process.exit(1);
    }
})();
