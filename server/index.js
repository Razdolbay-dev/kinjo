const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 5000;
const pool = require('./utils/db');

require('dotenv').config();

// 1. Middleware
app.use(express.json());
// Optional: Add CORS middleware here if needed for your API

// 2. Serve static files from the React build folder
// Make sure 'client/build' is the correct path to your built frontend
app.use(express.static(path.join(__dirname, '../client/build')));

// 3. Define your API routes BEFORE the catch-all route
// Example:
app.get('/api/test', (req, res) => {
    res.json({ message: 'API is working!' });
});

app.get('/api/db-check', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT 1 AS test');
        res.json({ success: true, rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 4. The corrected catch-all route for SPA support
// This must be the LAST route
app.get(/^.*$/, (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});