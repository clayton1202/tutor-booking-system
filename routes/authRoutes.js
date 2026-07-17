// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.get('/register', authController.showRegisterForm);
router.post('/register', authController.registerValidationRules, authController.register);

router.get('/login', authController.showLoginForm);
router.post('/login', authController.loginValidationRules, authController.login);

router.get('/logout', authController.logout);

module.exports = router;
