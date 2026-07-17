// models/bookingModel.js
// Queries related to the bookings table — the core CRUD resource of the app.
// (PostgreSQL via `pg`)

const pool = require('../config/db');

// Create a new booking (used by students in Day 4)
async function createBooking({ studentId, tutorId, subject, date, time }) {
    const result = await pool.query(
        `INSERT INTO bookings (student_id, tutor_id, subject, booking_date, booking_time, status)
         VALUES ($1, $2, $3, $4, $5, 'pending') RETURNING id`,
        [studentId, tutorId, subject, date, time]
    );
    return result.rows[0].id;
}

// Get a single booking by id, with student + tutor names joined in
async function getBookingById(id) {
    const result = await pool.query(
        `SELECT b.*, s.name AS student_name, s.email AS student_email, t.name AS tutor_name
         FROM bookings b
         JOIN users s ON b.student_id = s.id
         JOIN users t ON b.tutor_id = t.id
         WHERE b.id = $1`,
        [id]
    );
    return result.rows[0];
}

// Get all bookings for a given tutor. Optional filters: status, date
// (this is the "search/filter by at least two criteria" requirement, tutor side)
async function getBookingsForTutor(tutorId, { status, date } = {}) {
    let sql = `
        SELECT b.*, s.name AS student_name, s.email AS student_email
        FROM bookings b
        JOIN users s ON b.student_id = s.id
        WHERE b.tutor_id = $1
    `;
    const params = [tutorId];

    if (status) {
        params.push(status);
        sql += ` AND b.status = $${params.length}`;
    }
    if (date) {
        params.push(date);
        sql += ` AND b.booking_date = $${params.length}`;
    }

    sql += ' ORDER BY b.booking_date ASC, b.booking_time ASC';

    const result = await pool.query(sql, params);
    return result.rows;
}

// Get all bookings for a given student. Optional filters: status, subject
// (used by students in Day 4)
async function getBookingsForStudent(studentId, { status, subject } = {}) {
    let sql = `
        SELECT b.*, t.name AS tutor_name
        FROM bookings b
        JOIN users t ON b.tutor_id = t.id
        WHERE b.student_id = $1
    `;
    const params = [studentId];

    if (status) {
        params.push(status);
        sql += ` AND b.status = $${params.length}`;
    }
    if (subject) {
        params.push(`%${subject}%`);
        sql += ` AND b.subject ILIKE $${params.length}`;
    }

    sql += ' ORDER BY b.booking_date ASC, b.booking_time ASC';

    const result = await pool.query(sql, params);
    return result.rows;
}

// Update booking status — only allowed if the booking belongs to this tutor
// (prevents one tutor from approving/rejecting another tutor's bookings)
async function updateBookingStatusByTutor(bookingId, tutorId, status) {
    const result = await pool.query(
        'UPDATE bookings SET status = $1 WHERE id = $2 AND tutor_id = $3',
        [status, bookingId, tutorId]
    );
    return result.rowCount > 0;
}

// Students can cancel their own pending/approved bookings (Day 4)
async function cancelBookingByStudent(bookingId, studentId) {
    const result = await pool.query(
        `UPDATE bookings SET status = 'cancelled' WHERE id = $1 AND student_id = $2`,
        [bookingId, studentId]
    );
    return result.rowCount > 0;
}

// Students can edit date/time/subject of their own booking, but only
// while it's still pending (once a tutor approves/rejects, it's locked)
async function updateBookingDetailsByStudent(bookingId, studentId, { subject, date, time }) {
    const result = await pool.query(
        `UPDATE bookings SET subject = $1, booking_date = $2, booking_time = $3
         WHERE id = $4 AND student_id = $5 AND status = 'pending'`,
        [subject, date, time, bookingId, studentId]
    );
    return result.rowCount > 0;
}

// Students can permanently delete old cancelled/rejected bookings to
// clean up their history (true DELETE, as opposed to the soft "cancel")
async function deleteBookingByStudent(bookingId, studentId) {
    const result = await pool.query(
        `DELETE FROM bookings WHERE id = $1 AND student_id = $2 AND status IN ('cancelled', 'rejected')`,
        [bookingId, studentId]
    );
    return result.rowCount > 0;
}

module.exports = {
    createBooking,
    getBookingById,
    getBookingsForTutor,
    getBookingsForStudent,
    updateBookingStatusByTutor,
    cancelBookingByStudent,
    updateBookingDetailsByStudent,
    deleteBookingByStudent
};
