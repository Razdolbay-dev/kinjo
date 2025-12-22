const axios = require('axios');
const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

/* ================= CONFIG ================= */

const API_URL = 'https://catalog-sync-api.rstprgapipt.com/v1/contents';
const API_TOKEN = process.env.CATALOG_API_TOKEN;

const PAGE_SIZE = 100;
const START_PAGE = 1;

const DB_CONFIG = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    connectionLimit: 10,
};

/* ================= DB ================= */

const pool = mysql.createPool(DB_CONFIG);

/* ================= UTILS ================= */

function logInvalid(content, reason) {
    fs.appendFileSync(
        'invalid-contents.log',
        JSON.stringify({ id: content?.id, reason }) + '\n'
    );
}

function validateContent(c) {
    if (!c?.id) return 'missing id';
    if (!c.title) return 'missing title';
    if (!c.year) return 'missing year';
    if (c.duration === undefined || c.duration === null)
        return 'missing duration';
    if (!c.contentType || !c.contentType.id)
        return 'missing contentType';
    return null;
}

/* ================= UPSERTS ================= */

async function upsertContentType(db, ct) {
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

async function upsertContent(db, c, contentTypeId) {
    await db.execute(
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
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            contentTypeId,
            c.title,
            c.originalTitle ?? '',
            c.description ?? '',
            c.posterUrl ?? '',
            c.duration ?? 0,
            c.year,
            c.kinopoiskId || null,
            c.imdbId || null,
            c.videoQuality ?? '',
            c.seasonsCount ?? 0,
            c.episodesCount ?? 0,
            c.createdAt ?? new Date(),
            c.updatedAt ?? new Date(),
            !!c.isLgbt,
            c.playerUrl || null,
        ]
    );
}

/* ================= API ================= */

async function fetchPage(page) {
    const res = await axios.post(
        API_URL,
        {
            pagination: {
                type: 'page',
                order: 'DESC',
                sortBy: 'year',
                pageSize: PAGE_SIZE,
                page,
            },
        },
        {
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                Authorization: `Bearer ${API_TOKEN}`,
            },
            timeout: 30000,
        }
    );

    return res.data;
}

/* ================= SYNC ================= */

async function sync() {
    const db = await pool.getConnection();

    try {
        console.log('Starting sync...');

        const first = await fetchPage(START_PAGE);
        const totalPages = first.meta.pages;

        console.log(`Total pages: ${totalPages}`);

        for (let page = START_PAGE; page <= totalPages; page++) {
            console.log(`Page ${page}/${totalPages}`);

            const { data } = page === START_PAGE ? first : await fetchPage(page);

            for (const c of data) {
                try {
                    const error = validateContent(c);
                    if (error) {
                        logInvalid(c, error);
                        continue;
                    }

                    await db.beginTransaction();

                    const contentTypeId = await upsertContentType(
                        db,
                        c.contentType
                    );

                    await upsertContent(db, c, contentTypeId);

                    await db.commit();
                } catch (err) {
                    await db.rollback();
                    console.error(`Failed content ${c?.id}: ${err.message}`);
                }
            }
        }

        console.log('Sync finished');
    } finally {
        db.release();
        pool.end();
    }
}

/* ================= RUN ================= */

sync().catch(err => {
    console.error('Fatal sync error:', err);
    process.exit(1);
});
