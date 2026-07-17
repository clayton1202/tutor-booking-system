// models/tutorModel.js
// Queries related to tutor_profiles table (PostgreSQL via `pg`).

const pool = require('../config/db');

// Get a tutor's profile by their user id (returns undefined if not set up yet)
async function getProfileByUserId(userId) {
    const result = await pool.query(
        'SELECT * FROM tutor_profiles WHERE user_id = $1',
        [userId]
    );
    return result.rows[0];
}

// Create or update a tutor's profile (upsert pattern)
async function upsertProfile({ userId, subject, bio, hourlyRate }) {
    const existing = await getProfileByUserId(userId);

    if (existing) {
        await pool.query(
            'UPDATE tutor_profiles SET subject = $1, bio = $2, hourly_rate = $3 WHERE user_id = $4',
            [subject, bio, hourlyRate, userId]
        );
        return existing.id;
    }

    const result = await pool.query(
        'INSERT INTO tutor_profiles (user_id, subject, bio, hourly_rate) VALUES ($1, $2, $3, $4) RETURNING id',
        [userId, subject, bio, hourlyRate]
    );
    return result.rows[0].id;
}

// Used later (Day 4) by students to browse/search tutors.
// Supports two filter criteria (required by the project rubric):
// 1) subject (partial match) and 2) maximum hourly rate.
async function getAllTutors({ subject, maxRate } = {}) {
    let sql = `
        SELECT tp.id AS profile_id, tp.subject, tp.bio, tp.hourly_rate,
               u.id AS user_id, u.name, u.email
        FROM tutor_profiles tp
        JOIN users u ON tp.user_id = u.id
        WHERE 1=1
    `;
    const params = [];

    if (subject) {
        params.push(`%${subject}%`);
        sql += ` AND tp.subject ILIKE $${params.length}`; // ILIKE = case-insensitive LIKE in Postgres
    }

    if (maxRate) {
        params.push(maxRate);
        sql += ` AND tp.hourly_rate <= $${params.length}`;
    }

    sql += ' ORDER BY u.name ASC';

    const result = await pool.query(sql, params);
    return result.rows;
}

// Fetch one tutor's public profile (used on the booking form page)
async function getTutorByUserId(userId) {
    const result = await pool.query(
        `SELECT tp.*, u.name, u.email
         FROM tutor_profiles tp
         JOIN users u ON tp.user_id = u.id
         WHERE u.id = $1`,
        [userId]
    );
    return result.rows[0];
}

module.exports = { getProfileByUserId, upsertProfile, getAllTutors, getTutorByUserId };
