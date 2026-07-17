// routes/studentRoutes.js
const express = require('express');
const router = express.Router();
const { isLoggedIn, isRole } = require('../middleware/auth');
const studentController = require('../controllers/studentController');

// All student routes require login + student role
router.use(isLoggedIn, isRole('student'));

router.get('/dashboard', studentController.showDashboard);

router.get('/tutors', studentController.browseTutors);

router.get('/book', studentController.showBookingForm);
router.post('/book', studentController.bookingValidationRules, studentController.createBooking);

router.get('/bookings', studentController.showBookings);
router.get('/bookings/:id/edit', studentController.showEditForm);
router.post('/bookings/:id/edit', studentController.editValidationRules, studentController.updateBooking);
router.post('/bookings/:id/cancel', studentController.cancelBooking);
router.post('/bookings/:id/delete', studentController.deleteBooking);

module.exports = router;
