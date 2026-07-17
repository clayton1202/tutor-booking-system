// controllers/studentController.js
const { body, validationResult } = require('express-validator');
const tutorModel = require('../models/tutorModel');
const bookingModel = require('../models/bookingModel');
const mailer = require('../utils/mailer');

// ---------- Validation ----------

const bookingValidationRules = [
    body('tutorId').isInt().withMessage('Invalid tutor'),
    body('subject').trim().notEmpty().withMessage('Subject is required'),
    body('date')
        .notEmpty().withMessage('Date is required')
        .isDate().withMessage('Invalid date')
        .custom((value) => {
            const today = new Date().toISOString().split('T')[0];
            if (value < today) {
                throw new Error('Date cannot be in the past');
            }
            return true;
        }),
    body('time').notEmpty().withMessage('Time is required')
];

// Same as above but without tutorId (edit form doesn't allow changing tutor)
const editValidationRules = [
    body('subject').trim().notEmpty().withMessage('Subject is required'),
    body('date')
        .notEmpty().withMessage('Date is required')
        .isDate().withMessage('Invalid date')
        .custom((value) => {
            const today = new Date().toISOString().split('T')[0];
            if (value < today) {
                throw new Error('Date cannot be in the past');
            }
            return true;
        }),
    body('time').notEmpty().withMessage('Time is required')
];

// ---------- Dashboard (summary) ----------

async function showDashboard(req, res) {
    const studentId = req.session.user.id;
    const allBookings = await bookingModel.getBookingsForStudent(studentId);

    const pending = allBookings.filter(b => b.status === 'pending');
    const approved = allBookings.filter(b => b.status === 'approved');

    const flashSuccess = req.session.flashSuccess;
    req.session.flashSuccess = null;

    res.render('student/dashboard', {
        user: req.session.user,
        totalBookings: allBookings.length,
        pending,
        approved: approved.slice(0, 5), // upcoming preview, max 5
        flashSuccess
    });
}

// ---------- Browse / search tutors ----------

async function browseTutors(req, res) {
    const { subject, maxRate } = req.query;
    const tutors = await tutorModel.getAllTutors({ subject, maxRate });

    res.render('student/tutors', {
        tutors,
        filters: { subject: subject || '', maxRate: maxRate || '' }
    });
}

// ---------- Create booking ----------

async function showBookingForm(req, res) {
    const tutorUserId = req.query.tutorId;
    const tutor = await tutorModel.getTutorByUserId(tutorUserId);

    if (!tutor) {
        return res.status(404).render('error', {
            title: 'Tutor not found',
            message: 'This tutor no longer exists.'
        });
    }

    res.render('student/book', { tutor, errors: [], oldInput: {} });
}

async function createBooking(req, res) {
    const errors = validationResult(req);
    const tutor = await tutorModel.getTutorByUserId(req.body.tutorId);

    if (!errors.isEmpty()) {
        return res.status(400).render('student/book', {
            tutor: tutor || { user_id: req.body.tutorId, name: '' },
            errors: errors.array(),
            oldInput: req.body
        });
    }

    const { tutorId, subject, date, time } = req.body;

    try {
        await bookingModel.createBooking({
            studentId: req.session.user.id,
            tutorId,
            subject,
            date,
            time
        });

        // Fire off confirmation + notification emails.
        // These run without blocking the redirect, and any failure is
        // logged (not thrown) inside sendMail so the booking still succeeds.
        const studentName = req.session.user.name;
        const tutorName = tutor ? tutor.name : 'your tutor';

        mailer.sendMail({
            to: req.session.user.email,
            ...mailer.bookingCreatedEmail({ studentName, tutorName, subject, date, time })
        });

        if (tutor && tutor.email) {
            mailer.sendMail({
                to: tutor.email,
                ...mailer.newBookingRequestEmail({ tutorName, studentName, subject, date, time })
            });
        }

        req.session.flashSuccess = 'Booking request sent! Waiting for tutor approval. Check your email for confirmation.';
        return res.redirect('/student/bookings');
    } catch (err) {
        console.error('Create booking error:', err);
        return res.status(500).render('student/book', {
            tutor,
            errors: [{ msg: 'Something went wrong. Please try again.' }],
            oldInput: req.body
        });
    }
}

// ---------- My bookings (full list + filter) ----------

async function showBookings(req, res) {
    const studentId = req.session.user.id;
    const { status, subject } = req.query;

    const bookings = await bookingModel.getBookingsForStudent(studentId, { status, subject });

    const flashSuccess = req.session.flashSuccess;
    req.session.flashSuccess = null;

    res.render('student/bookings', {
        bookings,
        filters: { status: status || '', subject: subject || '' },
        flashSuccess
    });
}

// ---------- Edit (only while pending) ----------

async function showEditForm(req, res) {
    const booking = await bookingModel.getBookingById(req.params.id);

    if (!booking || booking.student_id !== req.session.user.id || booking.status !== 'pending') {
        return res.status(404).render('error', {
            title: 'Cannot edit this booking',
            message: 'This booking cannot be edited (it may already be approved/rejected).'
        });
    }

    res.render('student/edit-booking', { booking, errors: [] });
}

async function updateBooking(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const booking = await bookingModel.getBookingById(req.params.id);
        return res.status(400).render('student/edit-booking', {
            booking: { ...booking, ...req.body },
            errors: errors.array()
        });
    }

    const { subject, date, time } = req.body;
    const updated = await bookingModel.updateBookingDetailsByStudent(
        req.params.id,
        req.session.user.id,
        { subject, date, time }
    );

    if (updated) {
        req.session.flashSuccess = 'Booking updated.';
    }
    res.redirect('/student/bookings');
}

// ---------- Cancel (soft) / Delete (hard) ----------

async function cancelBooking(req, res) {
    await bookingModel.cancelBookingByStudent(req.params.id, req.session.user.id);
    req.session.flashSuccess = 'Booking cancelled.';
    res.redirect('/student/bookings');
}

async function deleteBooking(req, res) {
    await bookingModel.deleteBookingByStudent(req.params.id, req.session.user.id);
    req.session.flashSuccess = 'Booking record deleted.';
    res.redirect('/student/bookings');
}

module.exports = {
    bookingValidationRules,
    editValidationRules,
    showDashboard,
    browseTutors,
    showBookingForm,
    createBooking,
    showBookings,
    showEditForm,
    updateBooking,
    cancelBooking,
    deleteBooking
};
