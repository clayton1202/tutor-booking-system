// app.js
// Entry point of the Tutor Booking System
// Day 1 goal: get a bare Express server running, connected to MySQL,
// rendering a test page. Auth, routes, and controllers come in Day 2+.

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');

// Importing this triggers the DB connection test in config/db.js
require('./config/db');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- View engine ----------
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ---------- Middleware ----------
app.use(express.urlencoded({ extended: true })); // parse form submissions
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // css/js/images

app.use(session({
    secret: process.env.SESSION_SECRET || 'dev_secret_change_me',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 2 // 2 hours
    }
}));

// Make logged-in user available to all views (e.g. for navbar)
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

// CSRF protection — must come after session middleware (needs req.session)
// and after body parsing (needs req.body), but before the routes that
// handle form submissions.
const csrfProtection = require('./middleware/csrf');
app.use(csrfProtection);

// ---------- Routes ----------
const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const tutorRoutes = require('./routes/tutorRoutes');

app.use('/', authRoutes);           // /register, /login, /logout
app.use('/student', studentRoutes); // /student/dashboard
app.use('/tutor', tutorRoutes);     // /tutor/dashboard

app.get('/', (req, res) => {
    const flashSuccess = req.session.flashSuccess;
    req.session.flashSuccess = null;
    res.render('index', {
        title: 'Tutor Booking System',
        message: 'Server is running! Day 6: security hardening complete.',
        flashSuccess
    });
});

// ---------- 404 handler ----------
app.use((req, res) => {
    res.status(404).send('Page not found');
});

app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});
