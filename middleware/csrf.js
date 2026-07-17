// middleware/csrf.js
// A lightweight, dependency-free CSRF protection middleware.
//
// How it works:
// 1. On every request, ensure the session has a random csrfToken.
// 2. Expose that token to all views as `csrfToken` so forms can include it
//    as a hidden field: <input type="hidden" name="_csrf" value="<%= csrfToken %>">
// 3. On every state-changing request (POST/PUT/PATCH/DELETE), verify the
//    submitted _csrf value matches the one stored in the session.
//
// This stops CSRF attacks because an attacker's malicious site cannot read
// the victim's session-specific token, so any forged form submission will
// be missing (or have the wrong) _csrf value and get rejected.

const crypto = require('crypto');

function csrfProtection(req, res, next) {
    // Generate a token for this session if one doesn't exist yet
    if (!req.session.csrfToken) {
        req.session.csrfToken = crypto.randomBytes(24).toString('hex');
    }

    // Make it available to every EJS view automatically
    res.locals.csrfToken = req.session.csrfToken;

    const methodsToCheck = ['POST', 'PUT', 'PATCH', 'DELETE'];
    if (methodsToCheck.includes(req.method)) {
        const submittedToken = req.body && req.body._csrf;

        if (!submittedToken || submittedToken !== req.session.csrfToken) {
            return res.status(403).render('error', {
                title: 'Request blocked',
                message: 'This form submission could not be verified (invalid or missing security token). Please go back and try again.'
            });
        }
    }

    next();
}

module.exports = csrfProtection;
