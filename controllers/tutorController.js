// controllers/tutorController.js
const { body, validationResult } = require('express-validator');
const tutorModel = require('../models/tutorModel');
const bookingModel = require('../models/bookingModel');
const mailer = require('../utils/mailer');

// ---------- Validation ----------

const profileValidationRules = [
    body('subject')
        .trim()
        .notEmpty().withMessage('Subject is required')
        .isLength({ max: 100 }).withMessage('Subject is too long'),
    body('bio')
        .trim()
        .isLength({ max: 1000 }).withMessage('Bio must be under 1000 characters'),
    body('hourlyRate')
        .isFloat({ min: 0 }).withMessage('Hourly rate must be a positive number')
];

// ---------- Profile setup ----------

async function showProfileForm(req, res) {
    const profile = await tutorModel.getProfileByUserId(req.session.user.id);
    res.render('tutor/profile', { profile: profile || {}, errors: [] });
}

async function saveProfile(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).render('tutor/profile', {
            profile: req.body,
            errors: errors.array()
        });
    }

    const { subject, bio, hourlyRate } = req.body;

    try {
        await tutorModel.upsertProfile({
            userId: req.session.user.id,
            subject,
            bio,
            hourlyRate
        });
        req.session.flashSuccess = 'Profile saved successfully.';
        return res.redirect('/tutor/dashboard');
    } catch (err) {
        console.error('Save profile error:', err);
        return res.status(500).render('tutor/profile', {
            profile: req.body,
            errors: [{ msg: 'Something went wrong. Please try again.' }]
        });
    }
}

// ---------- Dashboard ----------

async function showDashboard(req, res) {
    const tutorId = req.session.user.id;
    const profile = await tutorModel.getProfileByUserId(tutorId);

    if (!profile) {
        req.session.flashError = 'Please set up your tutor profile first.';
        return res.redirect('/tutor/profile');
    }

    const pendingBookings = await bookingModel.getBookingsForTutor(tutorId, { status: 'pending' });

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const todaysBookings = await bookingModel.getBookingsForTutor(tutorId, {
        status: 'approved',
        date: today
    });

    const flashSuccess = req.session.flashSuccess;
    req.session.flashSuccess = null;

    res.render('tutor/dashboard', {
        user: req.session.user,
        profile,
        pendingBookings,
        todaysBookings,
        flashSuccess
    });
}

// ---------- Schedule (search/filter) ----------

async function showSchedule(req, res) {
    const tutorId = req.session.user.id;
    const { status, date } = req.query; // filters come from ?status=...&date=...

    const bookings = await bookingModel.getBookingsForTutor(tutorId, { status, date });

    res.render('tutor/schedule', {
        user: req.session.user,
        bookings,
        filters: { status: status || '', date: date || '' }
    });
}

// ---------- Approve / reject ----------

async function approveBooking(req, res) {
    const tutorId = req.session.user.id;
    const updated = await bookingModel.updateBookingStatusByTutor(req.params.id, tutorId, 'approved');

    if (updated) {
        const booking = await bookingModel.getBookingById(req.params.id);
        if (booking) {
            mailer.sendMail({
                to: booking.student_email || undefined, // falls back gracefully if not present
                ...mailer.bookingStatusEmail({
                    studentName: booking.student_name,
                    tutorName: booking.tutor_name,
                    subject: booking.subject,
                    date: booking.booking_date,
                    time: booking.booking_time,
                    status: 'approved'
                })
            });
        }
    }

    req.session.flashSuccess = 'Booking approved.';
    res.redirect('/tutor/dashboard');
}

async function rejectBooking(req, res) {
    const tutorId = req.session.user.id;
    const updated = await bookingModel.updateBookingStatusByTutor(req.params.id, tutorId, 'rejected');

    if (updated) {
        const booking = await bookingModel.getBookingById(req.params.id);
        if (booking) {
            mailer.sendMail({
                to: booking.student_email || undefined,
                ...mailer.bookingStatusEmail({
                    studentName: booking.student_name,
                    tutorName: booking.tutor_name,
                    subject: booking.subject,
                    date: booking.booking_date,
                    time: booking.booking_time,
                    status: 'rejected'
                })
            });
        }
    }

    req.session.flashSuccess = 'Booking rejected.';
    res.redirect('/tutor/dashboard');
}

module.exports = {
    profileValidationRules,
    showProfileForm,
    saveProfile,
    showDashboard,
    showSchedule,
    approveBooking,
    rejectBooking
};
