// routes/tutorRoutes.js
const express = require('express');
const router = express.Router();
const { isLoggedIn, isRole } = require('../middleware/auth');
const tutorController = require('../controllers/tutorController');

// All tutor routes require login + tutor role
router.use(isLoggedIn, isRole('tutor'));

router.get('/profile', tutorController.showProfileForm);
router.post('/profile', tutorController.profileValidationRules, tutorController.saveProfile);

router.get('/dashboard', tutorController.showDashboard);

router.get('/schedule', tutorController.showSchedule);

router.post('/bookings/:id/approve', tutorController.approveBooking);
router.post('/bookings/:id/reject', tutorController.rejectBooking);

module.exports = router;
