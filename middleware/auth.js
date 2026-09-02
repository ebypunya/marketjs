// =========================================================================
// CUSTOM MIDDLEWARE (AUTHENTICATION & AUTHORIZATION)
// =========================================================================
const path = require('path');

function requireLogin(req, res, next) {
    if (!req.session.user) {
        return res.redirect('/?error=unauthorized');
    }
    next();
}

function requireSuperAdmin(req, res, next) {
    if (!req.session.user) {
        return res.redirect('/?error=unauthorized');
    }
    if (req.session.user.role !== 'superadmin') {
        return res.status(403).sendFile(path.join(__dirname, '..', 'public', '403.html'));
    }
    next();
}

module.exports = { requireLogin, requireSuperAdmin };
