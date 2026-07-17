// controllers/authController.js
// Handles registration, login, and logout.
// Server-side validation via express-validator + password hashing via bcrypt.

const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const userModel = require('../models/userModel');

const SALT_ROUNDS = 10;

// ---------- Validation rule sets (also used as middleware in routes) ----------

const registerValidationRules = [
    body('name')
        .trim()
        .notEmpty().withMessage('Name is required')
        .isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
    body('email')
        .trim()
        .isEmail().withMessage('Please enter a valid email address')
        .normalizeEmail(),
    body('password')
        .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('confirmPassword')
        .custom((value, { req }) => value === req.body.password)
        .withMessage('Passwords do not match'),
    body('role')
        .isIn(['student', 'tutor']).withMessage('Please select a valid role')
];

const loginValidationRules = [
    body('email').trim().isEmail().withMessage('Please enter a valid email address'),
    body('password').notEmpty().withMessage('Password is required')
];

// ---------- Page renderers ----------

function showRegisterForm(req, res) {
    res.render('auth/register', { errors: [], oldInput: {} });
}

function showLoginForm(req, res) {
    const flashError = req.session.flashError;
    req.session.flashError = null;
    res.render('auth/login', { errors: [], oldInput: {}, flashError });
}

// ---------- Actions ----------

async function register(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).render('auth/register', {
            errors: errors.array(),
            oldInput: req.body
        });
    }

    const { name, email, password, role } = req.body;

    try {
        const existing = await userModel.findByEmail(email);
        if (existing) {
            return res.status(400).render('auth/register', {
                errors: [{ msg: 'An account with this email already exists' }],
                oldInput: req.body
            });
        }

        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
        await userModel.createUser({ name, email, passwordHash, role });

        req.session.flashSuccess = 'Registration successful! Please log in.';
        return res.redirect('/login');
    } catch (err) {
        console.error('Register error:', err);
        return res.status(500).render('auth/register', {
            errors: [{ msg: 'Something went wrong. Please try again.' }],
            oldInput: req.body
        });
    }
}

async function login(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).render('auth/login', {
            errors: errors.array(),
            oldInput: req.body,
            flashError: null
        });
    }

    const { email, password } = req.body;

    try {
        const user = await userModel.findByEmail(email);
        if (!user) {
            return res.status(400).render('auth/login', {
                errors: [{ msg: 'Invalid email or password' }],
                oldInput: req.body,
                flashError: null
            });
        }

        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
            return res.status(400).render('auth/login', {
                errors: [{ msg: 'Invalid email or password' }],
                oldInput: req.body,
                flashError: null
            });
        }

        // Store minimal, non-sensitive info in the session
        req.session.user = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
        };

        if (user.role === 'tutor') {
            return res.redirect('/tutor/dashboard');
        }
        return res.redirect('/student/dashboard');
    } catch (err) {
        console.error('Login error:', err);
        return res.status(500).render('auth/login', {
            errors: [{ msg: 'Something went wrong. Please try again.' }],
            oldInput: req.body,
            flashError: null
        });
    }
}

function logout(req, res) {
    req.session.destroy(() => {
        res.redirect('/login');
    });
}

module.exports = {
    registerValidationRules,
    loginValidationRules,
    showRegisterForm,
    showLoginForm,
    register,
    login,
    logout
};
