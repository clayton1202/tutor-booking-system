// config/db.js
// Creates a reusable PostgreSQL connection pool using the `pg` package.
//
// Supports two ways of configuring the connection:
// 1) DATABASE_URL — a single connection string. Render (and most cloud
//    Postgres providers) give you one of these automatically; just paste
//    it into .env as DATABASE_URL and everything else is ignored.
// 2) Individual DB_HOST / DB_USER / DB_PASSWORD / DB_NAME / DB_PORT vars —
//    used for local development against a local Postgres install.

const { Pool } = require('pg');
require('dotenv').config();

const pool = process.env.DATABASE_URL
    ? new Pool({
        connectionString: process.env.DATABASE_URL,
        // Render's managed Postgres requires SSL; local Postgres does not.
        ssl: process.env.DATABASE_URL.includes('localhost')
            ? false
            : { rejectUnauthorized: false }
    })
    : new Pool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 5432
    });

// Quick sanity check on startup — logs whether the DB connection works
async function testConnection() {
    try {
        const client = await pool.connect();
        console.log('✅ PostgreSQL connected successfully to database:', process.env.DB_NAME || '(via DATABASE_URL)');
        client.release();
    } catch (err) {
        console.error('❌ PostgreSQL connection failed:', err.message);
        console.error('   Check your .env file and make sure PostgreSQL is running.');
    }
}

testConnection();

module.exports = pool;
