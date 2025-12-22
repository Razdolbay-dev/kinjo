require('dotenv').config();
const axios = require('axios');
const mysql = require('mysql2/promise');

/* ================= CONFIG ================= */

const API_URL = 'https://catalog-sync-api.rstprgapipt.com/v1/contents';
const PAGE_SIZE = 100;
const TOKEN = process.env.CATALOG_API_TOKEN;