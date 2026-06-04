const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const session = require('express-session');
const path = require('path');

const app = express();
const port = 80;

// --- 1. DATABASE ---
const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'marketjs',
    waitForConnections: true,
    connectionLimit: 10
});

db.getConnection((err, conn) => {
    if (err) console.error('Koneksi Database Gagal:', err.message);
    else { console.log('Database Terhubung! [Status: OK]'); conn.release(); }
});

// --- 2. MIDDLEWARE ---
app.use(express.static(path.join(__dirname, 'public')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: 'dev477-secret-key-ganti-ini',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,      // Ganti true jika pakai HTTPS
        maxAge: 1000 * 60 * 60 * 8  // 8 jam
    }
}));

// --- 3. MIDDLEWARE AUTH ---
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
        return res.status(403).sendFile(path.join(__dirname, 'public', '403.html'));
    }
    next();
}

// --- 4. ROUTING HALAMAN ---
app.get('/', (req, res) => {
    // Kalau sudah login, langsung ke dashboard
    if (req.session.user) return res.redirect('/dashboard');
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/registrasi', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'registrasi.html'));
});

app.get('/lupa-password', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'lupa-password.html'));
});

// Dashboard - wajib login
app.get('/dashboard', requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Admin: Manage Users - wajib superadmin
app.get('/admin/manage-users', requireSuperAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin', 'manage-users.html'));
});

// API: data session user (untuk frontend)
app.get('/api/me', requireLogin, (req, res) => {
    res.json({
        fullname: req.session.user.fullname,
        username: req.session.user.username,
        role: req.session.user.role
    });
});

// API: data users untuk manage-users page
app.get('/api/users', requireSuperAdmin, (req, res) => {
    const sql = "SELECT id, fullname, username, email, role, status, created_at FROM users ORDER BY created_at DESC";
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// API: aktivasi / nonaktifkan user
app.post('/api/users/:id/status', requireSuperAdmin, (req, res) => {
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

// API: ubah role user
app.post('/api/users/:id/role', requireSuperAdmin, (req, res) => {
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

// --- 5. REGISTRASI ---
app.post('/register-proses', async (req, res) => {
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
                    </div></div>
                    `);
            }
            res.redirect('/registrasi?status=success');
        });
    } catch (err) {
        res.status(500).send('Server error');
    }
});

// --- 6. LOGIN ---
app.post('/login-proses', (req, res) => {
    const { username, password } = req.body;
    const sql = "SELECT * FROM users WHERE username = ? OR email = ?";

    db.query(sql, [username, username], async (err, results) => {
        if (err) return res.status(500).send('Server Error');

        if (results.length === 0) {
            return res.redirect('/?error=invalid');
        }

        const user = results[0];

        // Cek password (support bcrypt & plain text lama)
        let passwordMatch = false;
        if (user.password_hash) {
            passwordMatch = await bcrypt.compare(password, user.password_hash);
        } else {
            passwordMatch = (password === user.password);
        }

        if (!passwordMatch) {
            return res.redirect('/?error=invalid');
        }

        // Cek status akun
        if (user.status === 'pending') {
            return res.redirect('/?error=pending');
        }

        if (user.status === 'banned') {
            return res.redirect('/?error=banned');
        }

        // Simpan session
        req.session.user = {
            id: user.id,
            fullname: user.fullname,
            username: user.username,
            role: user.role
        };

        res.redirect('/dashboard');
    });
});

// --- 7. LOGOUT ---
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

// ===== 8. HALAMAN CUSTOMERS =====
app.get('/master-data/customers', requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'master-data', 'customers', 'index.html'));
});
app.get('/master-data/customers/tambah', requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'master-data', 'customers', 'tambah.html'));
});
app.get('/master-data/customers/edit', requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'master-data', 'customers', 'edit.html'));
});

// ===== API CUSTOMERS =====
app.get('/api/customers', requireLogin, (req, res) => {
    const sql = "SELECT id, name, phone, address, email, annotation, created_at, updated_at FROM customers ORDER BY created_at DESC";
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.get('/api/customers/:id', requireLogin, (req, res) => {
    db.query("SELECT * FROM customers WHERE id = ?", [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json(results[0]);
    });
});

app.post('/api/customers', requireLogin, (req, res) => {
    const { name, phone, address, email, annotation } = req.body;
    const sql = "INSERT INTO customers (name, phone, address, email, annotation) VALUES (?, ?, ?, ?, ?)";
    db.query(sql, [name, phone, address, email, annotation], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, id: result.insertId });
    });
});

app.put('/api/customers/:id', requireLogin, (req, res) => {
    const { name, phone, address, email, annotation } = req.body;
    const sql = "UPDATE customers SET name=?, phone=?, address=?, email=?, annotation=?, updated_at=NOW() WHERE id=?";
    db.query(sql, [name, phone, address, email, annotation, req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.delete('/api/customers/:id', requireLogin, (req, res) => {
    db.query("DELETE FROM customers WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});
// ---  START SERVER ---
app.listen(port, () => {
    console.clear();
    console.log('\x1b[36m%s\x1b[0m', '========================================');
    console.log('\x1b[35m%s\x1b[0m', '  MARKETJS - ENTERPRISE CORE SYSTEM');
    console.log('\x1b[35m%s\x1b[0m', '  Developed by DEV477 (C) 2026');
    console.log('\x1b[36m%s\x1b[0m', '========================================');
    console.log(`Server Status : Running`);
    console.log(`Address       : http://localhost`);
    console.log(`Database      : MySQL (Connected)`);
    console.log('\x1b[36m%s\x1b[0m', '========================================');
});