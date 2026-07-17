// models/userModel.js
// Encapsulates all SQL queries related to the `users` table
// so controllers don't write raw SQL directly.
//
// Uses PostgreSQL via the `pg` package. Note the differences from MySQL:
// - Placeholders are $1, $2, ... instead of ?
// - pool.query() returns { rows }, not [rows]
// - There's no result.insertId — use `RETURNING id` and read rows[0].id

const pool = require('../config/db');

// Find a user by email — used during login and to check duplicates on register
async function findByEmail(email) {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0]; // undefined if not found
}

// Find a user by id — useful later for profile pages
async function findById(id) {
    const result = await pool.query(
        'SELECT id, name, email, role, created_at FROM users WHERE id = $1',
        [id]
    );
    return result.rows[0];
}

// Create a new user. password should already be hashed before calling this.
async function createUser({ name, email, passwordHash, role }) {
    const result = await pool.query(
        'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id',
        [name, email, passwordHash, role]
    );
    return result.rows[0].id;
}

module.exports = { findByEmail, findById, createUser };
