// middleware/auth.js
// Route-protection middleware used across the app.
// isLoggedIn  -> blocks access if nobody is logged in
// isRole(role) -> blocks access if the logged-in user's role doesn't match

function isLoggedIn(req, res, next) {
    if (req.session.user) {
        return next();
    }
    req.session.flashError = 'Please log in to continue.';
    return res.redirect('/login');
}

function isRole(requiredRole) {
    return (req, res, next) => {
        if (req.session.user && req.session.user.role === requiredRole) {
            return next();
        }
        return res.status(403).render('error', {
            title: 'Access denied',
            message: `This page is only for ${requiredRole}s.`
        });
    };
}

module.exports = { isLoggedIn, isRole };
