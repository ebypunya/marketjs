// =========================================================================
// PROSES OTENTIKASI, LOGOUT, SESSION & MANAGE USERS
// =========================================================================
const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const { db } = require('../config/db');
const { requireLogin, requireSuperAdmin } = require('../middleware/auth');

router.post('/register-proses', async (req, res) => {
    const { fullname, username, email, password } = req.body;
    try {
        const saltRounds = 10;
        const password_hash = await bcrypt.hash(password, saltRounds);

        const sql = "INSERT INTO users (fullname, username, email, password, password_hash, status, role) VALUES (?, ?, ?, ?, ?, 'pending', 'user')";
        db.query(sql, [fullname, username, email, password, password_hash], (err) => {
            if (err) {
                return res.send(`
                    <link rel="stylesheet" href="/assets/css/main.css">
                    <div class="container animate-fade-in">
                    <div class="form-card" style="text-align:center;">
                    <h2 style="color:red;">Registrasi Gagal!</h2>
                    <p>Username atau email sudah digunakan.</p>
                    <a href="/registrasi" class="btn-primary" style="text-decoration:none;display:inline-block;margin-top:15px">Kembali</a>
                    </div>
                    </div>
                    `);
            }
            res.redirect('/registrasi?status=success');
        });
    } catch (err) {
        res.status(500).send('Server error');
    }
});

router.post('/login-proses', (req, res) => {
    const { username, password } = req.body;
    const sql = "SELECT * FROM users WHERE username = ? OR email = ?";

    db.query(sql, [username, username], async (err, results) => {
        if (err) return res.status(500).send('Server Error');
        if (results.length === 0) return res.redirect('/?error=invalid');

        const user = results[0];
        let passwordMatch = false;

        if (user.password_hash) {
            passwordMatch = await bcrypt.compare(password, user.password_hash);
        } else {
            passwordMatch = (password === user.password);
        }

        if (!passwordMatch) return res.redirect('/?error=invalid');
        if (user.status === 'pending') return res.redirect('/?error=pending');
        if (user.status === 'banned') return res.redirect('/?error=banned');

        req.session.user = {
            id: user.id,
            fullname: user.fullname,
            username: user.username,
            role: user.role
        };

        res.redirect('/dashboard');
    });
});

router.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

router.get('/api/me', requireLogin, (req, res) => {
    res.json({
        fullname: req.session.user.fullname,
        username: req.session.user.username,
        role: req.session.user.role
    });
});

router.get('/api/users', requireSuperAdmin, (req, res) => {
    const sql = "SELECT id, fullname, username, email, role, status, created_at FROM users ORDER BY created_at DESC";
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

router.post('/api/users/:id/status', requireSuperAdmin, (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    if (!['active', 'pending', 'banned'].includes(status)) {
        return res.status(400).json({ error: 'Status tidak valid' });
    }
    db.query("UPDATE users SET status = ? WHERE id = ?", [status, id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

router.post('/api/users/:id/role', requireSuperAdmin, (req, res) => {
    const { id } = req.params;
    const { role } = req.body;
    if (!['user', 'superadmin'].includes(role)) {
        return res.status(400).json({ error: 'Role tidak valid' });
    }
    db.query("UPDATE users SET role = ? WHERE id = ?", [role, id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

module.exports = router;
