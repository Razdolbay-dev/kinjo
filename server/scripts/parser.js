require('dotenv').config();
const axios = require('axios');

const API_URL = 'https://catalog-sync-api.rstprgapipt.com/v1/contents';
const PAGE_SIZE = 100;
const TOKEN = process.env.CATALOG_API_TOKEN;

if (!TOKEN) {
    console.error('CATALOG_API_TOKEN is not set');
    process.exit(1);
}

/**
 * Загрузка одной страницы
 */
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
                accept: 'application/json',
                'Content-Type': 'application/json',
                Authorization: `Bearer ${TOKEN}`,
            },
            timeout: 20000,
        }
    );

    return data;
}

/**
 * Нормализация контента
 */
function parseContent(item) {
    return {
        id: item.id,
        title: item.title,
        originalTitle: item.originalTitle,
        description: item.description || null,
        posterUrl: item.posterUrl,
        year: item.year,
        kinopoiskId: item.kinopoiskId || null,
        imdbId: item.imdbId || null,

        ratings: Object.entries(item.ratings || {}).map(([source, r]) => ({
            source,
            rating: r.rating,
            votes: r.votes,
        })),

        genres: (item.genres || []).map(g => ({
            id: g.id,
            name: g.name,
            slug: g.slug,
        })),

        countries: (item.countries || []).map(c => ({
            id: c.id,
            name: c.name,
            slug: c.slug,
        })),

        audioTracks: item.audioTracks || null,
        videoQuality: item.videoQuality,
        seasonsCount: item.seasonsCount || 0,
        episodesCount: item.episodesCount || 0,
        episodesBySeason: item.episodesBySeason || {},

        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        isLgbt: item.isLgbt || false,

        playerUrl: item.playerUrl || null,
    };
}

/**
 * Полный импорт ВСЕХ страниц
 */
async function importAllContents() {
    console.log('Fetching first page to detect total pages...');

    const firstResponse = await fetchPage(1);
    const totalPages = firstResponse.meta.pages;

    console.log(`Total pages: ${totalPages}`);

    const contents = [];
    contents.push(...firstResponse.data.map(parseContent));

    for (let page = 2; page <= totalPages; page++) {
        console.log(`Fetching page ${page}/${totalPages}`);

        const response = await fetchPage(page);
        contents.push(...response.data.map(parseContent));
    }

    return contents;
}

/**
 * CLI entrypoint
 */
(async () => {
    try {
        const contents = await importAllContents();

        console.log('==============================');
        console.log('Import finished successfully');
        console.log('Total records:', contents.length);
        console.log('Sample record:', contents[0]);
        console.log('==============================');
    } catch (err) {
        console.error(
            'Import failed:',
            err.response?.status,
            err.response?.data || err.message
        );
        process.exit(1);
    }
})();
