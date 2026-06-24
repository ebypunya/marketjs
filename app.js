const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const session = require('express-session');
const path = require('path');

const app = express();
const port = 80;

// =========================================================================
// 1. KONFIGURASI DATABASE (CONNECTION POOL)
// =========================================================================
const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'marketjs',
    waitForConnections: true,
    connectionLimit: 10
});

// Cek koneksi database saat server pertama kali berjalan
db.getConnection((err, conn) => {
    if (err) {
        console.error('Koneksi Database Gagal:', err.message);
    } else {
        console.log('Database Terhubung! [Status: OK]');
        conn.release();
    }
});

// =========================================================================
// 2. GLOBAL MIDDLEWARE
// =========================================================================
// Folder statis untuk aset publik
app.use(express.static(path.join(__dirname, 'public')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Parser untuk incoming request body (Form-data & JSON)
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); 

// Konfigurasi Session
app.use(session({
    secret: 'dev477-secret-key-ganti-ini', // Ubah dengan key yang lebih aman di produksi
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,              // Set true jika menggunakan HTTPS
        maxAge: 1000 * 60 * 60 * 8  // Validitas session: 8 Jam
    }
}));

// =========================================================================
// 3. CUSTOM MIDDLEWARE (AUTHENTICATION & AUTHORIZATION)
// =========================================================================
// Proteksi rute umum: Wajib login
function requireLogin(req, res, next) {
    if (!req.session.user) {
        return res.redirect('/?error=unauthorized');
    }
    next();
}

// Proteksi rute khusus: Wajib login dengan role 'superadmin'
function requireSuperAdmin(req, res, next) {
    if (!req.session.user) {
        return res.redirect('/?error=unauthorized');
    }
    if (req.session.user.role !== 'superadmin') {
        return res.status(403).sendFile(path.join(__dirname, 'public', '403.html'));
    }
    next();
}

// =========================================================================
// 4. RUTE HALAMAN / WEB VIEW (ROUTE GET UNTUK SERVING HTML)
// =========================================================================

// --- Halaman Otentikasi & Landing ---
app.get('/', (req, res) => {
    // Jika sudah login, langsung dialihkan ke dashboard
    if (req.session.user) return res.redirect('/dashboard');
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/registrasi', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'registrasi.html'));
});

app.get('/lupa-password', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'lupa-password.html'));
});

// --- Halaman Utama & Admin ---
app.get('/dashboard', requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/admin/manage-users', requireSuperAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin', 'manage-users.html'));
});

// --- Halaman Master Data (Customers) ---
app.get('/master-data/customers', requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'master-data', 'customers', 'index.html'));
});
app.get('/master-data/customers/tambah', requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'master-data', 'customers', 'tambah.html'));
});
app.get('/master-data/customers/edit', requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'master-data', 'customers', 'edit.html'));
});

// --- Halaman Master Data (Products) ---
app.get('/master-data/products', requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'master-data', 'products', 'index.html'));
});
app.get('/master-data/products/tambah', requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'master-data', 'products', 'tambah.html'));
});
app.get('/master-data/products/edit', requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'master-data', 'products', 'edit.html'));
});

// --- Halaman Master Data (Kurs / Rates) ---
app.get('/master-data/kurs', requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'master-data', 'kurs', 'index.html'));
});
app.get('/master-data/kurs/tambah', requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'master-data', 'kurs', 'tambah.html'));
});
app.get('/master-data/kurs/edit', requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'master-data', 'kurs', 'edit.html'));
});

// --- Halaman Transaksi (Sales Contract) ---
app.get('/sales/sales-contract', requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'sales', 'sales-contract.html'));
});
app.get('/sales/sales-contract/tambah', requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'sales', 'sales-contract', 'tambah.html'));
});
app.get('/sales/sales-contract/edit', requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'sales', 'sales-contract', 'edit.html'));
});
app.get('/sales/sales-contract/detail', requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'sales', 'sales-contract', 'detail.html'));
});
app.get('/sales/sales-contract/print', requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'sales', 'sales-contract', 'print.html'));
});


// =========================================================================
// 5. PROSES OTENTIKASI & LOGOUT (POST/GET AUTH)
// =========================================================================

// Proses Registrasi User Baru
app.post('/register-proses', async (req, res) => {
    const { fullname, username, email, password } = req.body;

    try {
        const saltRounds = 10;
        const password_hash = await bcrypt.hash(password, saltRounds);

        // Catatan: Kolom 'password' menyimpan plain text untuk kebutuhan migrasi sistem/legacy, aman jika ingin dihilangkan nanti
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

// Proses Login User
app.post('/login-proses', (req, res) => {
    const { username, password } = req.body;
    const sql = "SELECT * FROM users WHERE username = ? OR email = ?";

    db.query(sql, [username, username], async (err, results) => {
        if (err) return res.status(500).send('Server Error');
        if (results.length === 0) return res.redirect('/?error=invalid');

        const user = results[0];
        let passwordMatch = false;

        // Cek kecocokan password (mendukung hash bcrypt & plain text lama)
        if (user.password_hash) {
            passwordMatch = await bcrypt.compare(password, user.password_hash);
        } else {
            passwordMatch = (password === user.password);
        }

        if (!passwordMatch) return res.redirect('/?error=invalid');

        // Validasi status verifikasi akun
        if (user.status === 'pending') return res.redirect('/?error=pending');
        if (user.status === 'banned') return res.redirect('/?error=banned');

        // Menyimpan data user ke session server
        req.session.user = {
            id: user.id,
            fullname: user.fullname,
            username: user.username,
            role: user.role
        };

        res.redirect('/dashboard');
    });
});

// Proses Logout
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});


// =========================================================================
// 6. BACKEND ENDPOINTS (REST API DATA SESSIONS & MANAGEMENT USERS)
// =========================================================================

// API: Get Info Session User yang sedang login
app.get('/api/me', requireLogin, (req, res) => {
    res.json({
        fullname: req.session.user.fullname,
        username: req.session.user.username,
        role: req.session.user.role
    });
});

// API: Get Semua Data Users (Hanya Superadmin)
app.get('/api/users', requireSuperAdmin, (req, res) => {
    const sql = "SELECT id, fullname, username, email, role, status, created_at FROM users ORDER BY created_at DESC";
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// API: Update Status User (Aktivasi / Banned)
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

// API: Update Tingkatan Akses / Role User
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


// =========================================================================
// 7. BACKEND ENDPOINTS (REST API MASTER DATA CUSTOMERS)
// =========================================================================

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
    const id = req.params.id;
    db.query("DELETE FROM customers WHERE id = ?", [id], (err, result) => {
        if (err) {
            console.error('DELETE customer error:', err);
            return res.status(500).json({ success: false, error: err.message });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Data tidak ditemukan' });
        }
        console.log(`Customer ${id} deleted successfully`);
        res.json({ success: true });
    });
});


// =========================================================================
// 8. BACKEND ENDPOINTS (REST API MASTER DATA PRODUCTS)
// =========================================================================

app.get('/api/products', requireLogin, (req, res) => {
    const sql = `SELECT id, fabric_no, customer_fabric_no, fabric_name, customer, color,
    price_greige, shrinkge_standard, shrinkge_actual, after_shrinkge,
    additional_fee, after_risk, dyeing_fee, sub_final, price_m, price_y,
    special_condition, keterangan, composition, created_at, updated_at
    FROM products ORDER BY created_at DESC`;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.get('/api/products/:id', requireLogin, (req, res) => {
    db.query("SELECT * FROM products WHERE id = ?", [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json(results[0]);
    });
});

app.post('/api/products', requireLogin, (req, res) => {
    const { fabric_no, customer_fabric_no, fabric_name, customer, color,
        price_greige, shrinkge_standard, shrinkge_actual, after_shrinkge,
        additional_fee, after_risk, dyeing_fee, sub_final, price_m, price_y,
        special_condition, keterangan, composition } = req.body;

    // Helper internal: konversi empty string ke null agar struktur data numerik database terjaga
    const num = v => (v === '' || v === undefined || v === null) ? null : v;

    const sql = `INSERT INTO products
    (fabric_no, customer_fabric_no, fabric_name, customer, color,
    price_greige, shrinkge_standard, shrinkge_actual, after_shrinkge,
    additional_fee, after_risk, dyeing_fee, sub_final, price_m, price_y,
    special_condition, keterangan, composition)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    db.query(sql, [
        fabric_no, customer_fabric_no || null, fabric_name || null, customer || null, color || null,
        num(price_greige), num(shrinkge_standard), num(shrinkge_actual), num(after_shrinkge),
        num(additional_fee), num(after_risk), num(dyeing_fee), num(sub_final),
        num(price_m), num(price_y),
        special_condition || null, keterangan || null, composition || null
        ], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, id: result.insertId });
        });
});

app.put('/api/products/:id', requireLogin, (req, res) => {
    const { fabric_no, customer_fabric_no, fabric_name, customer, color,
        price_greige, shrinkge_standard, shrinkge_actual, after_shrinkge,
        additional_fee, after_risk, dyeing_fee, sub_final, price_m, price_y,
        special_condition, keterangan, composition } = req.body;

        const num = v => (v === '' || v === undefined || v === null) ? null : v;

        const sql = `UPDATE products SET
        fabric_no=?, customer_fabric_no=?, fabric_name=?, customer=?, color=?,
        price_greige=?, shrinkge_standard=?, shrinkge_actual=?, after_shrinkge=?,
        additional_fee=?, after_risk=?, dyeing_fee=?, sub_final=?, price_m=?, price_y=?,
        special_condition=?, keterangan=?, composition=?, updated_at=NOW()
        WHERE id=?`;

        db.query(sql, [
            fabric_no, customer_fabric_no || null, fabric_name || null, customer || null, color || null,
            num(price_greige), num(shrinkge_standard), num(shrinkge_actual), num(after_shrinkge),
            num(additional_fee), num(after_risk), num(dyeing_fee), num(sub_final),
            num(price_m), num(price_y),
            special_condition || null, keterangan || null, composition || null,
            req.params.id
            ], (err) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ success: true });
            });
    });

app.delete('/api/products/:id', requireLogin, (req, res) => {
    const id = req.params.id;
    db.query("DELETE FROM products WHERE id = ?", [id], (err, result) => {
        if (err) {
            console.error('DELETE product error:', err);
            return res.status(500).json({ success: false, error: err.message });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Data tidak ditemukan' });
        }
        console.log(`Product ${id} deleted successfully`);
        res.json({ success: true });
    });
});


// =========================================================================
// 9. BACKEND ENDPOINTS (REST API MASTER DATA KURS / RATES)
// =========================================================================

app.get('/api/rates', requireLogin, (req, res) => {
    const sql = "SELECT id, sell_rate, buy_rate, created_at, updated_at FROM rates ORDER BY created_at DESC";
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.get('/api/rates/:id', requireLogin, (req, res) => {
    db.query("SELECT * FROM rates WHERE id = ?", [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json(results[0]);
    });
});

app.post('/api/rates', requireLogin, (req, res) => {
    const { sell_rate, buy_rate } = req.body;
    const sql = "INSERT INTO rates (sell_rate, buy_rate) VALUES (?, ?)";
    db.query(sql, [sell_rate, buy_rate], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, id: result.insertId });
    });
});

app.put('/api/rates/:id', requireLogin, (req, res) => {
    const { sell_rate, buy_rate } = req.body;
    const sql = "UPDATE rates SET sell_rate=?, buy_rate=?, updated_at=NOW() WHERE id=?";
    db.query(sql, [sell_rate, buy_rate, req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.delete('/api/rates/:id', requireLogin, (req, res) => {
    const id = req.params.id;
    db.query("DELETE FROM rates WHERE id = ?", [id], (err, result) => {
        if (err) {
            console.error('DELETE rate error:', err);
            return res.status(500).json({ success: false, error: err.message });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Data tidak ditemukan' });
        }
        console.log(`Rate ${id} deleted successfully`);
        res.json({ success: true });
    });
});


// =========================================================================
// 10. BACKEND ENDPOINTS (REST API TRANSAKSI SALES CONTRACT)
// =========================================================================

// API: Generate Auto Number untuk Sales Contract berikutnya
app.get('/api/contracts/next-no', requireLogin, (req, res) => {
    const sql = `SELECT contract_no FROM contracts ORDER BY contract_no DESC LIMIT 1`;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });

        let next_no = 'C260001';
        let prev_no = null;

        if (results.length > 0) {
            prev_no = results[0].contract_no;
            const num = parseInt(prev_no.replace(/^C/i, '')) || 0;
            next_no = 'C' + String(num + 1).padStart(prev_no.length - 1, '0');
        }

        res.json({ next_no, prev_no });
    });
});

// API: Get Semua Data Contracts (Untuk List View Dashboard)
app.get('/api/contracts', requireLogin, (req, res) => {
    const sql = `
    SELECT
    c.id, c.contract_no, c.order_no, c.customer_id,
    cu.name AS customer_name,
    c.date_ship, c.status, c.currency, c.jenis,
    c.total, c.created_at, c.updated_at,
    COUNT(cd.id) AS item_count
    FROM contracts c
    LEFT JOIN customers cu ON cu.id = c.customer_id
    LEFT JOIN contract_details cd ON cd.contract_id = c.id
    GROUP BY c.id
    ORDER BY c.contract_no DESC
    `;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// API: Get Single Data Contract berdasarkan ID
app.get('/api/contracts/:id', requireLogin, (req, res) => {
    const sql = `
    SELECT c.*, cu.name AS customer_name,
    r.sell_rate, r.buy_rate, r.created_at AS rate_date
    FROM contracts c
    LEFT JOIN customers cu ON cu.id = c.customer_id
    LEFT JOIN rates r      ON r.id  = c.rate_id
    WHERE c.id = ?
    `;
    db.query(sql, [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!results.length) return res.status(404).json({ error: 'Not found' });
        res.json(results[0]);
    });
});

// API: Create Contract Baru
app.post('/api/contracts', requireLogin, (req, res) => {
    const {
        contract_no, customer_id, currency, rate_id, jenis,
        order_no, status, created_at, date_ship,
        greige_no, dyeing_no, dyeing_int,
        quality, quality_note, note_ship, note
    } = req.body;

    if (!contract_no || !customer_id || !jenis) {
        return res.status(400).json({ error: 'Field wajib tidak lengkap.' });
    }

    // Hindari duplikasi nomor kontrak di database
    db.query('SELECT id FROM contracts WHERE contract_no = ?', [contract_no], (err, dup) => {
        if (err) return res.status(500).json({ error: err.message });
        if (dup.length > 0) return res.status(400).json({ error: `Contract No "${contract_no}" sudah digunakan.` });

        const createdAtVal = created_at || null;

        const sql = `
        INSERT INTO contracts
        (contract_no, customer_id, currency, rate_id, jenis,
        order_no, status, created_at, updated_at,
        date_ship, greige_no, dyeing_no, dyeing_int,
        quality, quality_note, note_ship, note, total)
        VALUES (?, ?, ?, ?, ?, ?, ?, ${createdAtVal ? '?' : 'NOW()'}, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, 0)
        `;

        const params = createdAtVal
        ? [
        contract_no, customer_id, currency || 'USD', rate_id || null, jenis,
        order_no || null, status || 'draft', createdAtVal,
        date_ship || null, greige_no || null, dyeing_no || null, dyeing_int || null,
        quality || null, quality_note || null, note_ship || null, note || null,
        ]
        : [
        contract_no, customer_id, currency || 'USD', rate_id || null, jenis,
        order_no || null, status || 'draft',
        date_ship || null, greige_no || null, dyeing_no || null, dyeing_int || null,
        quality || null, quality_note || null, note_ship || null, note || null,
        ];

        db.query(sql, params, (err2, result) => {
            if (err2) return res.status(500).json({ error: err2.message });
            res.json({ success: true, id: result.insertId });
        });
    });
});

// API: Update Data Contract (Full Edit)
app.put('/api/contracts/:id', requireLogin, (req, res) => {
    const {
        contract_no, customer_id, currency, rate_id, jenis,
        order_no, status, created_at, date_ship,
        greige_no, dyeing_no, dyeing_int,
        quality, quality_note, note_ship, note
    } = req.body;

    if (!contract_no || !customer_id || !jenis) {
        return res.status(400).json({ error: 'Field wajib tidak lengkap.' });
    }

    // Cek duplikasi nomor kontrak (abaikan jika nomor milik entitas ini sendiri)
    db.query('SELECT id FROM contracts WHERE contract_no = ? AND id != ?', [contract_no, req.params.id], (err, dup) => {
        if (err) return res.status(500).json({ error: err.message });
        if (dup.length > 0) return res.status(400).json({ error: `Contract No "${contract_no}" sudah digunakan.` });

        const sql = `
        UPDATE contracts SET
        contract_no=?, customer_id=?, currency=?, rate_id=?, jenis=?,
        order_no=?, status=?, created_at=?, date_ship=?,
        greige_no=?, dyeing_no=?, dyeing_int=?,
        quality=?, quality_note=?, note_ship=?, note=?,
        updated_at=NOW()
        WHERE id=?`;

        db.query(sql, [
            contract_no, customer_id, currency || 'USD', rate_id || null, jenis,
            order_no || null, status || 'draft', created_at || null, date_ship || null,
            greige_no || null, dyeing_no || null, dyeing_int || null,
            quality || null, quality_note || null, note_ship || null, note || null,
            req.params.id
            ], (err2) => {
                if (err2) return res.status(500).json({ error: err2.message });
                res.json({ success: true });
            });
    });
});

// API: Update Manual Total Nilai Nominal Contract
app.put('/api/contracts/:id/total', requireLogin, (req, res) => {
    const { total } = req.body;
    db.query(
        'UPDATE contracts SET total=?, updated_at=NOW() WHERE id=?',
        [total || 0, req.params.id],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
        );
});

// API: Delete Contract (Beserta cascades item detail di dalamnya)
app.delete('/api/contracts/:id', requireLogin, (req, res) => {
    const id = req.params.id;
    
    // Tahap 1: Bersihkan semua sub-item terkait di tabel contract_details terlebih dahulu
    db.query('DELETE FROM contract_details WHERE contract_id = ?', [id], (err) => {
        if (err) {
            console.error('DELETE contract_details error:', err);
            return res.status(500).json({ success: false, error: 'Gagal menghapus detail: ' + err.message });
        }
        
        // Tahap 2: Hapus data master contract utama
        db.query('DELETE FROM contracts WHERE id = ?', [id], (err2, result) => {
            if (err2) {
                console.error('DELETE contract error:', err2);
                return res.status(500).json({ success: false, error: 'Gagal menghapus contract: ' + err2.message });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, error: 'Contract tidak ditemukan' });
            }
            console.log(`Contract ${id} and its details deleted successfully`);
            res.json({ success: true });
        });
    });
});


// =========================================================================
// 11. BACKEND ENDPOINTS (REST API CHILD ITEMS / CONTRACT DETAILS)
// =========================================================================

// API: Get Items Detail berdasarkan Contract ID (Cara 1)
app.get('/api/contract-details/:contractId', requireLogin, (req, res) => {
    const sql = `
    SELECT cd.*, 
    p.fabric_no, p.fabric_name, p.color AS product_color,
    p.price_m, p.price_y
    FROM contract_details cd
    LEFT JOIN products p ON p.id = cd.product_id
    WHERE cd.contract_id = ?
    ORDER BY cd.created_at ASC
    `;
    db.query(sql, [req.params.contractId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// API: Get Items Detail berdasarkan Contract ID (Cara 2 - Alias Rute Efisiensi Frontend)
app.get('/api/contract-details/by-contract/:contractId', requireLogin, (req, res) => {
    const sql = `
    SELECT cd.*,
    p.fabric_no, p.fabric_name, p.color AS product_color,
    p.price_m, p.price_y
    FROM contract_details cd
    LEFT JOIN products p ON p.id = cd.product_id
    WHERE cd.contract_id = ?
    ORDER BY cd.created_at ASC
    `;
    db.query(sql, [req.params.contractId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// API: Tambah Item Detail ke dalam Contract (Auto-recalculate Total Nilai Kontrak)
app.post('/api/contract-details', requireLogin, (req, res) => {
    const {
        contract_id, product_id, color, unit, qty, price, diskon, stotal, yard,
        price_usd, price_idr, qty_meter, qty_yard, stotal_usd, stotal_idr,
        kurs, greige_no, dyeing_no
    } = req.body;

    if (!contract_id || !product_id || !qty) {
        return res.status(400).json({ error: 'Field wajib tidak lengkap.' });
    }
    const sql = `
    INSERT INTO contract_details
    (contract_id, product_id, color, unit, qty, price, diskon, stotal, yard,
    price_usd, price_idr, qty_meter, qty_yard, stotal_usd, stotal_idr,
    kurs, greige_no, dyeing_no, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    db.query(sql, [
        contract_id, product_id, color||null, unit||'Meter',
        qty, price||0, diskon||0, stotal||0, yard||0,
        price_usd||0, price_idr||0, qty_meter||0, qty_yard||0,
        stotal_usd||0, stotal_idr||0, kurs||0, greige_no||null, dyeing_no||null
        ], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            
        // Sinkronisasi otomatis kalkulasi total di master contract record
        db.query(
            `UPDATE contracts SET total=(SELECT COALESCE(SUM(stotal),0) FROM contract_details WHERE contract_id=?), updated_at=NOW() WHERE id=?`,
            [contract_id, contract_id], () => {}
            );
        res.json({ success: true, id: result.insertId });
    });
});

// API: Update Item Detail (Auto-recalculate Total Nilai Kontrak)
app.put('/api/contract-details/:id', requireLogin, (req, res) => {
    const detailId = req.params.id;
    const {
        product_id, color, unit, qty, price, diskon, stotal, yard,
        price_usd, price_idr, qty_meter, qty_yard, stotal_usd, stotal_idr,
        kurs, greige_no, dyeing_no
    } = req.body;

    db.query('SELECT contract_id FROM contract_details WHERE id = ?', [detailId], (err, rows) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        if (!rows.length) return res.status(404).json({ success: false, error: 'Item tidak ditemukan' });

        const contractId = rows[0].contract_id;
        const sql = `
        UPDATE contract_details SET
        product_id=?, color=?, unit=?, qty=?, price=?, diskon=?, stotal=?, yard=?,
        price_usd=?, price_idr=?, qty_meter=?, qty_yard=?, stotal_usd=?, stotal_idr=?,
        kurs=?, greige_no=?, dyeing_no=?, updated_at=NOW()
        WHERE id=?`;

        db.query(sql, [
            product_id, color || null, unit || 'Meter',
            qty, price || 0, diskon || 0, stotal || 0, yard || 0,
            price_usd||0, price_idr||0, qty_meter||0, qty_yard||0,
            stotal_usd||0, stotal_idr||0, kurs||0, greige_no||null, dyeing_no||null,
            detailId
            ], (err2) => {
                if (err2) return res.status(500).json({ success: false, error: err2.message });
                
            // Rekalkulasi total master kontrak
            db.query(
                `UPDATE contracts SET total=(SELECT COALESCE(SUM(stotal),0) FROM contract_details WHERE contract_id=?), updated_at=NOW() WHERE id=?`,
                [contractId, contractId], () => {}
                );
            res.json({ success: true });
        });
    });
});

// API: Hapus Single Item Detail berdasarkan Item ID (Auto-recalculate Total Nilai Kontrak)
app.delete('/api/contract-details/:id', requireLogin, (req, res) => {
    const detailId = req.params.id;
    
    // Dapatkan contract_id terlebih dahulu untuk memicu recalculate total pasca hapus
    db.query('SELECT contract_id FROM contract_details WHERE id = ?', [detailId], (err, rows) => {
        if (err) {
            console.error('SELECT contract_details error:', err);
            return res.status(500).json({ success: false, error: err.message });
        }
        if (!rows || rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Item tidak ditemukan' });
        }
        
        const contractId = rows[0].contract_id;
        
        db.query('DELETE FROM contract_details WHERE id = ?', [detailId], (err2, result) => {
            if (err2) {
                console.error('DELETE contract_details error:', err2);
                return res.status(500).json({ success: false, error: 'Gagal menghapus item: ' + err2.message });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, error: 'Item tidak ditemukan' });
            }
            
            // Trigger Rekalkulasi total kontrak sesudah penghapusan item berhasil
            db.query(
                `UPDATE contracts SET total=(SELECT COALESCE(SUM(stotal),0) FROM contract_details WHERE contract_id=?), updated_at=NOW() WHERE id=?`,
                [contractId, contractId], 
                (err3) => {
                    if (err3) console.error('UPDATE contract total error:', err3);
                    console.log(`Contract detail ${detailId} deleted successfully`);
                    res.json({ success: true });
                }
                );
        });
    });
});


// =========================================================================
// 12. SERVER INITIALIZATION & LISTENER
// =========================================================================

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