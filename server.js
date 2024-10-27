const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
const PORT = 3000;

// Enable CORS for frontend requests
app.use(cors());
app.use(express.json());

// Connect to SQLite database
const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) console.error('Error opening database', err);
    else console.log('Connected to SQLite database');
});

// Create table for storing license keys if it doesn't exist
db.run(`
    CREATE TABLE IF NOT EXISTS license_keys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT NOT NULL UNIQUE,
        used BOOLEAN NOT NULL DEFAULT 0
    )
`);

// Helper function to generate random license key
function generateLicenseKey() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let licenseKey = "";
    for (let i = 0; i < 16; i++) {
        if (i > 0 && i % 4 === 0) licenseKey += "-";
        licenseKey += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return licenseKey;
}

// Endpoint to generate a new license key
app.post('/generate', (req, res) => {
    const newKey = generateLicenseKey();

    // Insert the new key into the database
    db.run(`INSERT INTO license_keys (key) VALUES (?)`, [newKey], function (err) {
        if (err) return res.status(500).json({ error: "Failed to generate key" });
        res.json({ key: newKey });
    });
});

// Endpoint to fetch all license keys and their statuses
app.get('/keys', (req, res) => {
    db.all(`SELECT * FROM license_keys`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: "Failed to fetch keys" });
        res.json(rows);
    });
});

// Endpoint to mark a key as used
app.post('/use-key', (req, res) => {
    const { key } = req.body;

    // Check if the key exists and is unused
    db.get(`SELECT * FROM license_keys WHERE key = ? AND used = 0`, [key], (err, row) => {
        if (err) return res.status(500).json({ error: "Failed to verify key" });
        if (!row) return res.status(400).json({ error: "Key is invalid or already used" });

        // Mark key as used
        db.run(`UPDATE license_keys SET used = 1 WHERE key = ?`, [key], function (err) {
            if (err) return res.status(500).json({ error: "Failed to update key status" });
            res.json({ message: "Key marked as used successfully" });
        });
    });
});

// Start server
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
