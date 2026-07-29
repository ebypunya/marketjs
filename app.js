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
    connectionLimit: 10,
    dateStrings: true
});

db.getConnection((err, conn) => {
    if (err) {
        console.error('Koneksi Database Gagal:', err.message);
    } else {
        console.log('Database Terhubung! [Status: OK]');
        conn.release();
    }
});

// Koneksi database GUDANG (terpisah dari database utama marketjs)
const dbGudang = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'gudang',
    waitForConnections: true,
    connectionLimit: 10,
    dateStrings: true
});

dbGudang.getConnection((err, conn) => {
    if (err) {
        console.error('Koneksi Database GUDANG Gagal:', err.message);
    } else {
        console.log('Database GUDANG Terhubung! [Status: OK]');
        conn.release();
    }
});

// Koneksi database PRODUKSI (terpisah, untuk tracking riwayat produksi per contract)
const dbProduksi = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'produksi',
    waitForConnections: true,
    connectionLimit: 10,
    dateStrings: true
});

dbProduksi.getConnection((err, conn) => {
    if (err) {
        console.error('Koneksi Database PRODUKSI Gagal:', err.message);
    } else {
        console.log('Database PRODUKSI Terhubung! [Status: OK]');
        conn.release();
    }
});
// Koneksi database INSPECT (terpisah, untuk data inspeksi kain per contract)
const dbInspect = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'inspect',
    waitForConnections: true,
    connectionLimit: 10,
    dateStrings: true
});

dbInspect.getConnection((err, conn) => {
    if (err) {
        console.error('Koneksi Database INSPECT Gagal:', err.message);
    } else {
        console.log('Database INSPECT Terhubung! [Status: OK]');
        conn.release();
    }
});


// =========================================================================
// 2. GLOBAL MIDDLEWARE
// =========================================================================
app.use(express.static(path.join(__dirname, 'public')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

app.use(express.urlencoded({ extended: true }));
app.use(express.json()); 

app.use(session({
    secret: 'dev477-secret-key-ganti-ini',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        maxAge: 1000 * 60 * 60 * 8
    }
}));

// =========================================================================
// 3. CUSTOM MIDDLEWARE (AUTHENTICATION & AUTHORIZATION)
// =========================================================================
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

// =========================================================================
// 4. RUTE HALAMAN / WEB VIEW (ROUTE GET UNTUK SERVING HTML)
// =========================================================================

app.get('/', (req, res) => {
    if (req.session.user) return res.redirect('/dashboard');
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/registrasi', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'registrasi.html'));
});

app.get('/lupa-password', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'lupa-password.html'));
});

app.get('/dashboard', requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/admin/manage-users', requireSuperAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin', 'manage-users.html'));
});

app.get('/master-data/customers', requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'master-data', 'customers', 'index.html'));
});
app.get('/master-data/customers/tambah', requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'master-data', 'customers', 'tambah.html'));
});
app.get('/master-data/customers/edit', requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'master-data', 'customers', 'edit.html'));
});

app.get('/master-data/products', requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'master-data', 'products', 'index.html'));
});
app.get('/master-data/products/tambah', requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'master-data', 'products', 'tambah.html'));
});
app.get('/master-data/products/edit', requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'master-data', 'products', 'edit.html'));
});

app.get('/master-data/kurs', requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'master-data', 'kurs', 'index.html'));
});
app.get('/master-data/kurs/tambah', requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'master-data', 'kurs', 'tambah.html'));
});
app.get('/master-data/kurs/edit', requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'master-data', 'kurs', 'edit.html'));
});

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
app.get('/sales/sales-contract/produksi', requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'sales', 'sales-contract', 'produksi.html'));
});

app.get('/sales/invoices', requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'sales', 'invoices', 'index.html'));
});

app.get('/sales/invoices/tambah', requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'sales', 'invoices', 'tambah.html'));
});

app.get('/sales/invoices/edit', requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'sales', 'invoices', 'edit.html'));
});

app.get('/sales/invoices/detail', requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'sales', 'invoices', 'detail.html'));
});

app.get('/sales/invoices/print', requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'sales', 'invoices', 'print.html'));
});
app.get('/finance/invoice-sample', requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'finance', 'invoice-sample', 'index.html'));
});
app.get('/finance/invoice-sample/tambah', requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'finance', 'invoice-sample', 'tambah.html'));
});
app.get('/finance/invoice-sample/edit', requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'finance', 'invoice-sample', 'edit.html'));
});
app.get('/finance/invoice-sample/detail', requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'finance', 'invoice-sample', 'detail.html'));
});
app.get('/finance/invoice-sample/print', requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'finance', 'invoice-sample', 'print.html'));
});

// =========================================================================
// API GUDANG SPAREPART (dari database "gudang": gudangengineering + part_grup)
// =========================================================================

app.get('/api/gudang-sparepart', requireLogin, (req, res) => {
    const page   = Math.max(parseInt(req.query.page) || 1, 1);
    const limit  = 15;                       // <-- diubah dari 20 jadi 15
    const offset = (page - 1) * limit;

    const search = (req.query.search || '').trim();
    const grup   = (req.query.grup || '').trim();

    let where = [];
    let params = [];

    if (search) {
        where.push('(ge.nama_barang LIKE ? OR ge.kode_barang LIKE ?)');
        params.push(`%${search}%`, `%${search}%`);
    }
    if (grup) {
        where.push('ge.grup = ?');
        params.push(grup);
    }
    const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const countSql = `SELECT COUNT(*) AS total FROM gudangengineering ge ${whereSql}`;

    dbGudang.query(countSql, params, (err, countResult) => {
        if (err) return res.status(500).json({ error: err.message });
        const total = countResult[0].total;

        const dataSql = `
        SELECT ge.kode_barang, ge.nama_barang, ge.quantity, pg.grup AS grup
        FROM gudangengineering ge
        LEFT JOIN part_grup pg ON pg.kode_grup = ge.grup
        ${whereSql}
        ORDER BY ge.nama_barang ASC
        LIMIT ? OFFSET ?
        `;

        dbGudang.query(dataSql, [...params, limit, offset], (err2, rows) => {
            if (err2) return res.status(500).json({ error: err2.message });
            res.json({
                data: rows,
                total,
                page,
                totalPages: Math.ceil(total / limit) || 1
            });
        });
    });
});

// Daftar grup untuk dropdown filter — ambil semua grup dari part_grup (tanpa filter kolom gudang)
app.get('/api/gudang-sparepart/grup', requireLogin, (req, res) => {
    const sql = "SELECT DISTINCT kode_grup, grup FROM part_grup ORDER BY grup ASC";
    dbGudang.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// =========================================================================
// 5. PROSES OTENTIKASI & LOGOUT (POST/GET AUTH)
// =========================================================================

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

app.post('/login-proses', (req, res) => {
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

app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});


// =========================================================================
// 6. BACKEND ENDPOINTS (REST API DATA SESSIONS & MANAGEMENT USERS)
// =========================================================================

app.get('/api/me', requireLogin, (req, res) => {
    res.json({
        fullname: req.session.user.fullname,
        username: req.session.user.username,
        role: req.session.user.role
    });
});

app.get('/api/users', requireSuperAdmin, (req, res) => {
    const sql = "SELECT id, fullname, username, email, role, status, created_at FROM users ORDER BY created_at DESC";
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

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

app.post('/api/products', requireLogin, (req, res) => {
    const { nama, fabric_no, customer_fabric_no, fabric_name, customer, color,
        price_greige, shrinkge_standard, shrinkge_actual, after_shrinkge,
        additional_fee, after_risk, dyeing_fee, sub_final, price_m, price_y,
        special_condition, keterangan, composition } = req.body;

        const num = v => (v === '' || v === undefined || v === null) ? null : v;

        console.log('POST /api/products body:', req.body);

        const sql = `INSERT INTO products
        (nama, fabric_no, customer_fabric_no, fabric_name, customer, color,
        price_greige, shrinkge_standard, shrinkge_actual, after_shrinkge,
        additional_fee, after_risk, dyeing_fee, sub_final, price_m, price_y,
        special_condition, keterangan, composition)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        db.query(sql, [
            nama, fabric_no, customer_fabric_no || null, fabric_name || null, num(customer), color || null,
            num(price_greige), num(shrinkge_standard), num(shrinkge_actual), num(after_shrinkge),
            num(additional_fee), num(after_risk), num(dyeing_fee), num(sub_final),
            num(price_m), num(price_y),
            special_condition || null, keterangan || null, composition || null
            ], (err, result) => {
                if (err) {
                    console.error('INSERT products error:', err);
                    return res.status(500).json({ error: err.message });
                }
                res.json({ success: true, id: result.insertId });
            });
    });

app.put('/api/products/:id', requireLogin, (req, res) => {
    const { nama, fabric_no, customer_fabric_no, fabric_name, customer, color,
        price_greige, shrinkge_standard, shrinkge_actual, after_shrinkge,
        additional_fee, after_risk, dyeing_fee, sub_final, price_m, price_y,
        special_condition, keterangan, composition } = req.body;

        const num = v => (v === '' || v === undefined || v === null) ? null : v;

        console.log('PUT /api/products/' + req.params.id + ' body:', req.body);

        const sql = `UPDATE products SET
        nama=?, fabric_no=?, customer_fabric_no=?, fabric_name=?, customer=?, color=?,
        price_greige=?, shrinkge_standard=?, shrinkge_actual=?, after_shrinkge=?,
        additional_fee=?, after_risk=?, dyeing_fee=?, sub_final=?, price_m=?, price_y=?,
        special_condition=?, keterangan=?, composition=?, updated_at=NOW()
        WHERE id=?`;

        db.query(sql, [
            nama, fabric_no, customer_fabric_no || null, fabric_name || null, num(customer), color || null,
            num(price_greige), num(shrinkge_standard), num(shrinkge_actual), num(after_shrinkge),
            num(additional_fee), num(after_risk), num(dyeing_fee), num(sub_final),
            num(price_m), num(price_y),
            special_condition || null, keterangan || null, composition || null,
            req.params.id
            ], (err) => {
                if (err) {
                    console.error('UPDATE products error:', err);
                    return res.status(500).json({ error: err.message });
                }
                res.json({ success: true });
            });
    });

app.get('/api/products', requireLogin, (req, res) => {
    const sql = `
    SELECT p.*, c.name AS customer_name
    FROM products p
    LEFT JOIN customers c ON c.id = p.customer
    ORDER BY p.updated_at DESC
    `;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.get('/api/products/:id', requireLogin, (req, res) => {
    const sql = `
    SELECT p.*, c.name AS customer_name
    FROM products p
    LEFT JOIN customers c ON c.id = p.customer
    WHERE p.id = ?
    `;
    db.query(sql, [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!results.length) return res.status(404).json({ error: 'Not found' });
        res.json(results[0]);
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

app.get('/api/contracts', requireLogin, (req, res) => {
    const sql = `
    SELECT
    c.id, c.contract_no, c.order_no, c.customer_id,
    cu.name AS customer_name,
    c.date_ship, c.status, c.currency, c.jenis,
    c.total, c.created_at, c.updated_at,
    IFNULL(cdagg.item_count, 0) AS item_count,
    IFNULL(cdagg.total_qty_meter, 0) AS total_qty_meter,
    IFNULL(cdagg.total_qty_invoiced_meter, 0) AS total_qty_invoiced_meter,
    invagg.invoice_numbers,
    IFNULL(invagg.invoice_count, 0) AS invoice_count
    FROM contracts c
    LEFT JOIN customers cu ON cu.id = c.customer_id
    LEFT JOIN (
    SELECT contract_id,
    COUNT(*) AS item_count,
    SUM(qty_meter) AS total_qty_meter,
    SUM(qty_invoiced_meter) AS total_qty_invoiced_meter
    FROM contract_details
    GROUP BY contract_id
    ) cdagg ON cdagg.contract_id = c.id
    LEFT JOIN (
    SELECT ic.contract_id,
    GROUP_CONCAT(DISTINCT CONCAT(i.id, '::', i.invoice_no) ORDER BY i.created_at SEPARATOR '||') AS invoice_numbers,
    COUNT(DISTINCT i.id) AS invoice_count
    FROM invoice_contracts ic
    JOIN invoices i ON i.id = ic.invoice_id
    GROUP BY ic.contract_id
    ) invagg ON invagg.contract_id = c.id
    ORDER BY c.contract_no DESC
    `;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

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

        const contract = results[0];

        const invSql = `
        SELECT i.id, i.invoice_no, i.status
        FROM invoice_contracts ic
        JOIN invoices i ON i.id = ic.invoice_id
        WHERE ic.contract_id = ?
        ORDER BY i.created_at ASC
        `;
        db.query(invSql, [req.params.id], (err2, invoices) => {
            if (err2) return res.status(500).json({ error: err2.message });
            contract.invoices = invoices || [];
            res.json(contract);
        });
    });
});

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

app.delete('/api/contracts/:id', requireLogin, (req, res) => {
    const id = req.params.id;
    
    db.query('DELETE FROM contract_details WHERE contract_id = ?', [id], (err) => {
        if (err) {
            console.error('DELETE contract_details error:', err);
            return res.status(500).json({ success: false, error: 'Gagal menghapus detail: ' + err.message });
        }
        
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

function recalcContractTotal(contractId, callback) {
    const sql = `
    UPDATE contracts c
    SET c.total = (
    SELECT COALESCE(SUM(CASE WHEN c.currency = 'IDR' THEN cd.stotal_idr ELSE cd.stotal_usd END), 0)
    FROM contract_details cd
    WHERE cd.contract_id = c.id
    ), c.updated_at = NOW()
    WHERE c.id = ?`;
    db.query(sql, [contractId], callback || (() => {}));
}

function adjustContractDetailInvoiced(contractDetailId, deltaMeter, deltaYard, callback) {
    if (!contractDetailId) return (callback || (() => {}))();
    const sql = `
    UPDATE contract_details
    SET qty_invoiced_meter = GREATEST(0, qty_invoiced_meter + ?),
    qty_invoiced_yard  = GREATEST(0, qty_invoiced_yard + ?)
    WHERE id = ?`;
    db.query(sql, [deltaMeter || 0, deltaYard || 0, contractDetailId], callback || (() => {}));
}

app.get('/api/contract-details/:contractId', requireLogin, (req, res) => {
   const sql = `
   SELECT cd.*, 
   p.nama, p.fabric_no, p.fabric_name, p.color AS product_color,
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

app.get('/api/contract-details/by-contract/:contractId', requireLogin, (req, res) => {
    const sql = `
    SELECT cd.*,
    p.nama, p.fabric_no, p.fabric_name, p.color AS product_color,
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

app.get('/api/contract-details/remaining/:contractId', requireLogin, (req, res) => {
    const sql = `
    SELECT cd.*,
    (cd.qty_meter - cd.qty_invoiced_meter) AS remaining_meter,
    (cd.qty_yard  - cd.qty_invoiced_yard)  AS remaining_yard,
    p.fabric_no, p.fabric_name, p.color AS product_color
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

app.post('/api/contract-details', requireLogin, (req, res) => {
    const {
        contract_id, product_id, color, unit, diskon,
        price_usd, price_idr, qty_meter, qty_yard, stotal_usd, stotal_idr,
        kurs, greige_no, dyeing_no
    } = req.body;

    if (!contract_id || !product_id || (!qty_meter && !qty_yard)) {
        return res.status(400).json({ error: 'Field wajib tidak lengkap.' });
    }
    const sql = `
    INSERT INTO contract_details
    (contract_id, product_id, color, unit, diskon,
    price_usd, price_idr, qty_meter, qty_yard, stotal_usd, stotal_idr,
    kurs, greige_no, dyeing_no, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    db.query(sql, [
        contract_id, product_id, color||null, unit||'Meter', diskon||0,
        price_usd||0, price_idr||0, qty_meter||0, qty_yard||0,
        stotal_usd||0, stotal_idr||0, kurs||0, greige_no||null, dyeing_no||null
        ], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });

            recalcContractTotal(contract_id);
            res.json({ success: true, id: result.insertId });
        });
});

app.put('/api/contract-details/:id', requireLogin, (req, res) => {
    const detailId = req.params.id;
    const {
        product_id, color, unit, diskon,
        price_usd, price_idr, qty_meter, qty_yard, stotal_usd, stotal_idr,
        kurs, greige_no, dyeing_no
    } = req.body;

    db.query('SELECT contract_id, qty_invoiced_meter, qty_invoiced_yard FROM contract_details WHERE id = ?', [detailId], (err, rows) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        if (!rows.length) return res.status(404).json({ success: false, error: 'Item tidak ditemukan' });

        const row = rows[0];
        if (parseFloat(qty_meter||0) < parseFloat(row.qty_invoiced_meter) || parseFloat(qty_yard||0) < parseFloat(row.qty_invoiced_yard)) {
            return res.status(400).json({
                success: false,
                error: `Qty tidak boleh kurang dari yang sudah diinvoice (${row.qty_invoiced_meter} m / ${row.qty_invoiced_yard} Y).`
            });
        }

        const contractId = row.contract_id;
        const sql = `
        UPDATE contract_details SET
        product_id=?, color=?, unit=?, diskon=?,
        price_usd=?, price_idr=?, qty_meter=?, qty_yard=?, stotal_usd=?, stotal_idr=?,
        kurs=?, greige_no=?, dyeing_no=?, updated_at=NOW()
        WHERE id=?`;

        db.query(sql, [
            product_id, color || null, unit || 'Meter', diskon || 0,
            price_usd||0, price_idr||0, qty_meter||0, qty_yard||0,
            stotal_usd||0, stotal_idr||0, kurs||0, greige_no||null, dyeing_no||null,
            detailId
            ], (err2) => {
                if (err2) return res.status(500).json({ success: false, error: err2.message });

                recalcContractTotal(contractId);
                res.json({ success: true });
            });
    });
});

app.delete('/api/contract-details/:id', requireLogin, (req, res) => {
    const detailId = req.params.id;

    db.query('SELECT contract_id, qty_invoiced_meter, qty_invoiced_yard FROM contract_details WHERE id = ?', [detailId], (err, rows) => {
        if (err) {
            console.error('SELECT contract_details error:', err);
            return res.status(500).json({ success: false, error: err.message });
        }
        if (!rows || rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Item tidak ditemukan' });
        }

        const row = rows[0];
        if (parseFloat(row.qty_invoiced_meter) > 0 || parseFloat(row.qty_invoiced_yard) > 0) {
            return res.status(400).json({
                success: false,
                error: 'Item ini sudah terpakai di invoice, tidak bisa dihapus. Hapus dulu item terkait di invoice-nya.'
            });
        }

        const contractId = row.contract_id;

        db.query('DELETE FROM contract_details WHERE id = ?', [detailId], (err2, result) => {
            if (err2) {
                console.error('DELETE contract_details error:', err2);
                return res.status(500).json({ success: false, error: 'Gagal menghapus item: ' + err2.message });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, error: 'Item tidak ditemukan' });
            }
            
            recalcContractTotal(contractId, (err3) => {
                if (err3) console.error('UPDATE contract total error:', err3);
                console.log(`Contract detail ${detailId} deleted successfully`);
                res.json({ success: true });
            });
        });
    });
});

// =========================================================================
// API TRACKING PRODUKSI — ambil riwayat produksi berdasarkan contract_no
// (cross-database: marketjs.contracts -> produksi.master_produksi -> produksi.riwayat_produksi)
// =========================================================================
app.get('/api/produksi/by-contract/:contractNo', requireLogin, (req, res) => {
    const contractNo = req.params.contractNo;

    const sqlMaster = `
    SELECT id_master_produksi, barcode, no_kontrak, no_wo, no_batch, kode_kain, warna
    FROM master_produksi
    WHERE no_kontrak LIKE ?
    ORDER BY id_master_produksi ASC
    `;

    dbProduksi.query(sqlMaster, [contractNo + '//%'], (err, masterRows) => {
        if (err) return res.status(500).json({ error: err.message });

        if (!masterRows.length) {
            return res.json({ master: [] });
        }

        const barcodes = masterRows.map(m => m.barcode);

        const sqlRiwayat = `
        SELECT id_riwayat_produksi, barcode, proses_produksi, mesin, nama_operator, qtty, waktu_mulai, waktu_selesai
        FROM riwayat_produksi
        WHERE barcode IN (?)
        ORDER BY waktu_mulai ASC
        `;

        // Bangun total panjang greige (SUM pcs1_panjang s/d pcs30_panjang) per barcode
        const pcsColumns = Array.from({ length: 30 }, (_, i) => `IFNULL(pcs${i + 1}_panjang, 0)`).join(' + ');
        const sqlPlatingdown = `
        SELECT barcode, SUM(${pcsColumns}) AS total_panjang
        FROM proses_platingdown
        WHERE barcode IN (?)
        GROUP BY barcode
        `;

        dbProduksi.query(sqlRiwayat, [barcodes], (err2, riwayatRows) => {
            if (err2) return res.status(500).json({ error: err2.message });

            dbProduksi.query(sqlPlatingdown, [barcodes], (err3, platingRows) => {
                if (err3) return res.status(500).json({ error: err3.message });

                const riwayatByBarcode = {};
                riwayatRows.forEach(r => {
                    if (!riwayatByBarcode[r.barcode]) riwayatByBarcode[r.barcode] = [];
                    riwayatByBarcode[r.barcode].push(r);
                });

                const panjangByBarcode = {};
                platingRows.forEach(p => {
                    panjangByBarcode[p.barcode] = parseFloat(p.total_panjang) || 0;
                });

                const result = masterRows.map(m => ({
                    barcode: m.barcode,
                    no_kontrak: m.no_kontrak,
                    no_wo: m.no_wo,
                    no_batch: m.no_batch,
                    kode_kain: m.kode_kain,
                    warna: m.warna,
                    panjang_greige: panjangByBarcode.hasOwnProperty(m.barcode) ? panjangByBarcode[m.barcode] : null,
                    riwayat: riwayatByBarcode[m.barcode] || []
                }));

                res.json({ master: result });
            });
        });
    });
});


// =========================================================================
// API DATA INSPECT — ambil hasil inspeksi kain berdasarkan contract_no
// (cross-database: marketjs.contracts -> inspect.detail_inspect)
// dikelompokkan per no_lot (= no_batch di produksi)
// =========================================================================
app.get('/api/inspect/by-contract/:contractNo', requireLogin, (req, res) => {
    const contractNo = req.params.contractNo;

    const sql = `
    SELECT id_detail, no_kontrak, no_lot, Nocolor, no_pcs, panjang, berat, inspector, tanggal, nomesin, grade
    FROM detail_inspect
    WHERE no_kontrak LIKE ?
    ORDER BY no_lot ASC, no_pcs ASC
    `;

    dbInspect.query(sql, [contractNo + '//%'], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        if (!rows.length) {
            return res.json({ batches: [], total_panjang_all: 0, total_pcs_all: 0 });
        }

        // Kelompokkan per no_lot (= no_batch)
        const batchMap = {};
        rows.forEach(r => {
            const key = r.no_lot || '-';
            if (!batchMap[key]) {
                batchMap[key] = { no_lot: key, items: [], total_panjang: 0, total_pcs: 0 };
            }
            batchMap[key].items.push(r);
            batchMap[key].total_panjang += parseFloat(r.panjang) || 0;
            batchMap[key].total_pcs += 1;
        });

        const batches = Object.values(batchMap);
        const total_panjang_all = batches.reduce((s, b) => s + b.total_panjang, 0);
        const total_pcs_all     = batches.reduce((s, b) => s + b.total_pcs, 0);

        res.json({ batches, total_panjang_all, total_pcs_all });
    });
});
// =========================================================================
// BACKEND ENDPOINTS (REST API TRANSAKSI INVOICES)
// =========================================================================

app.get('/api/invoices/next-no', requireLogin, (req, res) => {
    const sql = `SELECT invoice_no FROM invoices ORDER BY invoice_no DESC LIMIT 1`;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });

        let next_no = 'INV260001';
        if (results.length > 0) {
            const prev_no = results[0].invoice_no;
            const num = parseInt(prev_no.replace(/^INV/i, '')) || 0;
            next_no = 'INV' + String(num + 1).padStart(prev_no.length - 3, '0');
        }
        res.json({ next_no });
    });
});

app.get('/api/invoices', requireLogin, (req, res) => {
    const sql = `
    SELECT
    i.id, i.invoice_no, i.customer_id, 
    c.name AS customer_name,
    i.currency, i.total, i.status, i.created_at, i.updated_at,
    COUNT(DISTINCT ic.contract_id) AS contract_count
    FROM invoices i
    LEFT JOIN customers c ON c.id = i.customer_id
    LEFT JOIN invoice_contracts ic ON ic.invoice_id = i.id
    GROUP BY i.id, i.invoice_no, i.customer_id, c.name, i.currency, i.total, i.status, i.created_at, i.updated_at
    ORDER BY i.created_at DESC
    `;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.get('/api/invoices/:id', requireLogin, (req, res) => {
    const invoiceId = req.params.id;
    const sql = `
    SELECT i.*, c.name AS customer_name, c.address AS customer_address,
    r.sell_rate, r.buy_rate, r.created_at AS rate_date
    FROM invoices i
    LEFT JOIN customers c ON c.id = i.customer_id
    LEFT JOIN rates r ON r.id = i.rate_id
    WHERE i.id = ?
    `;

    db.query(sql, [invoiceId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!results.length) return res.status(404).json({ error: 'Invoice not found' });

        const invoice = results[0];

        const contractSql = `
        SELECT ct.*, ic.added_at
        FROM invoice_contracts ic
        JOIN contracts ct ON ct.id = ic.contract_id
        WHERE ic.invoice_id = ?
        ORDER BY ic.added_at ASC
        `;

        db.query(contractSql, [invoiceId], (err2, contracts) => {
            if (err2) return res.status(500).json({ error: err2.message });
            invoice.contracts = contracts || [];
            res.json(invoice);
        });
    });
});

app.post('/api/invoices', requireLogin, (req, res) => {
    const {
        invoice_no, customer_id, currency, invoice_date, rate_id,
        status, total, contracts,
        lc_no, vessel, case_mark, from_location, to_location,
        delivery_note_no, ppn_percent
    } = req.body;

    if (!invoice_no || !customer_id || !contracts || !Array.isArray(contracts) || !contracts.length) {
        return res.status(400).json({ error: 'Required fields missing or invalid' });
    }
    if (!rate_id) {
        return res.status(400).json({ error: 'Kurs wajib dipilih.' });
    }

    db.query('SELECT id FROM invoices WHERE invoice_no = ?', [invoice_no], (err, dup) => {
        if (err) return res.status(500).json({ error: err.message });
        if (dup.length > 0) return res.status(400).json({ error: `Invoice No "${invoice_no}" already used` });

        const insertSql = `
        INSERT INTO invoices 
        (invoice_no, customer_id, currency, rate_id, total, status,
        lc_no, vessel, case_mark, from_location, to_location, delivery_note_no, ppn_percent,
        created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `;

        db.query(insertSql, [
            invoice_no, customer_id, currency || 'USD', rate_id, total || 0, status || 'draft',
            lc_no || null, vessel || null, case_mark || null,
            from_location || null, to_location || null, delivery_note_no || null,
            (ppn_percent === '' || ppn_percent === undefined || ppn_percent === null) ? 11 : ppn_percent
            ], (err2, result) => {
                if (err2) return res.status(500).json({ error: err2.message });
                const invoiceId = result.insertId;
                const linkSql = 'INSERT INTO invoice_contracts (invoice_id, contract_id, added_at) VALUES (?, ?, NOW())';
                let completed = 0, hasError = false;
                contracts.forEach(contractId => {
                    db.query(linkSql, [invoiceId, contractId], (err3) => {
                        completed++;
                        if (err3 && !hasError) { hasError = true; return res.status(500).json({ error: 'Failed to link contracts: ' + err3.message }); }
                        if (completed === contracts.length && !hasError) res.json({ success: true, id: invoiceId });
                    });
                });
            });
    });
});

app.put('/api/invoices/:id', requireLogin, (req, res) => {
    const {
        invoice_no, customer_id, currency, total, status
    } = req.body;

    if (!invoice_no || !customer_id) {
        return res.status(400).json({ error: 'Required fields missing' });
    }

    db.query('SELECT id FROM invoices WHERE invoice_no = ? AND id != ?', [invoice_no, req.params.id], (err, dup) => {
        if (err) return res.status(500).json({ error: err.message });
        if (dup.length > 0) return res.status(400).json({ error: `Invoice No "${invoice_no}" already used` });

        const sql = `
        UPDATE invoices SET
        invoice_no=?, customer_id=?, currency=?, total=?, status=?, updated_at=NOW()
        WHERE id=?
        `;

        db.query(sql, [invoice_no, customer_id, currency || 'USD', total || 0, status || 'draft', req.params.id],
            (err2) => {
                if (err2) return res.status(500).json({ error: err2.message });
                res.json({ success: true });
            });
    });
});

app.put('/api/invoices/:id/rate', requireLogin, (req, res) => {
    const { rate_id } = req.body;
    if (!rate_id) return res.status(400).json({ error: 'rate_id wajib diisi.' });
    db.query('UPDATE invoices SET rate_id=?, updated_at=NOW() WHERE id=?', [rate_id, req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.put('/api/invoices/:id/shipping-info', requireLogin, (req, res) => {
    const {
        lc_no, vessel, case_mark, from_location, to_location,
        delivery_note_no, ppn_percent
    } = req.body;

    const sql = `
    UPDATE invoices SET
    lc_no=?, vessel=?, case_mark=?, from_location=?, to_location=?,
    delivery_note_no=?, ppn_percent=?, updated_at=NOW()
    WHERE id=?`;

    db.query(sql, [
        lc_no || null, vessel || null, case_mark || null,
        from_location || null, to_location || null,
        delivery_note_no || null,
        (ppn_percent === '' || ppn_percent === undefined || ppn_percent === null) ? 11 : ppn_percent,
        req.params.id
        ], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
});

app.delete('/api/invoices/:id', requireLogin, (req, res) => {
    const invoiceId = req.params.id;

    db.query('SELECT id, contract_detail_id, qty_meter, qty_yard FROM invoice_details WHERE invoice_id = ?', [invoiceId], (errSel, items) => {
        if (errSel) {
            console.error('SELECT invoice_details (pre-delete) error:', errSel);
            return res.status(500).json({ success: false, error: errSel.message });
        }

        const releaseAll = (cb) => {
            if (!items || !items.length) return cb();
            let done = 0;
            items.forEach(it => {
                adjustContractDetailInvoiced(it.contract_detail_id, -(parseFloat(it.qty_meter)||0), -(parseFloat(it.qty_yard)||0), () => {
                    done++;
                    if (done === items.length) cb();
                });
            });
        };

        releaseAll(() => {
            db.query('DELETE FROM invoice_contracts WHERE invoice_id = ?', [invoiceId], (err) => {
                if (err) {
                    console.error('DELETE invoice_contracts error:', err);
                    return res.status(500).json({ success: false, error: 'Failed to delete invoice relationships: ' + err.message });
                }

                db.query('DELETE FROM invoice_details WHERE invoice_id = ?', [invoiceId], (errDet) => {
                    if (errDet) {
                        console.error('DELETE invoice_details error:', errDet);
                        return res.status(500).json({ success: false, error: 'Failed to delete invoice items: ' + errDet.message });
                    }

                    db.query('DELETE FROM invoices WHERE id = ?', [invoiceId], (err2, result) => {
                        if (err2) {
                            console.error('DELETE invoice error:', err2);
                            return res.status(500).json({ success: false, error: 'Failed to delete invoice: ' + err2.message });
                        }
                        if (result.affectedRows === 0) {
                            return res.status(404).json({ success: false, error: 'Invoice not found' });
                        }
                        console.log(`Invoice ${invoiceId} and its relationships deleted successfully`);
                        res.json({ success: true });
                    });
                });
            });
        });
    });
});

app.post('/api/invoices/:id/add-contract', requireLogin, (req, res) => {
    const { contract_id } = req.body;
    const invoiceId = req.params.id;

    if (!contract_id) return res.status(400).json({ error: 'contract_id required' });

    const sql = 'INSERT INTO invoice_contracts (invoice_id, contract_id, added_at) VALUES (?, ?, NOW())';
    db.query(sql, [invoiceId, contract_id], (err) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ error: 'Contract already in invoice' });
            }
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true });
    });
});

app.delete('/api/invoices/:id/remove-contract/:contractId', requireLogin, (req, res) => {
    const { id: invoiceId, contractId } = req.params;

    db.query('DELETE FROM invoice_contracts WHERE invoice_id = ? AND contract_id = ?', 
        [invoiceId, contractId], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Relationship not found' });
            }
            res.json({ success: true });
        });
});

// =========================================================================
// BACKEND ENDPOINTS (REST API CHILD ITEMS / INVOICE DETAILS - PRODUCT)
// =========================================================================

function recalcInvoiceTotal(invoiceId, callback) {
    const sql = `
    UPDATE invoices i
    SET i.total = (
    SELECT COALESCE(SUM(idt.stotal_usd), 0)
    FROM invoice_details idt
    WHERE idt.invoice_id = i.id
    ), i.updated_at = NOW()
    WHERE i.id = ?`;
    db.query(sql, [invoiceId], callback || (() => {}));
}

app.put('/api/invoices/:id/total', requireLogin, (req, res) => {
    const { total } = req.body;
    db.query(
        'UPDATE invoices SET total=?, updated_at=NOW() WHERE id=?',
        [total || 0, req.params.id],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
        );
});

app.get('/api/invoice-details/by-invoice/:invoiceId', requireLogin, (req, res) => {
    const sql = `
    SELECT idt.*,
    p.fabric_no, p.fabric_name, p.color AS product_color, p.composition,
    p.price_m, p.price_y,
    ct.contract_no, ct.order_no,
    cd.kurs AS item_kurs
    FROM invoice_details idt
    LEFT JOIN products p ON p.id = idt.product_id
    LEFT JOIN contracts ct ON ct.id = idt.contract_id
    LEFT JOIN contract_details cd ON cd.id = idt.contract_detail_id
    WHERE idt.invoice_id = ?
    ORDER BY idt.created_at ASC
    `;
    db.query(sql, [req.params.invoiceId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post('/api/invoice-details', requireLogin, (req, res) => {
    const {
        invoice_id, product_id, contract_detail_id, contract_id, color, unit,
        qty_meter, qty_yard, price_usd, diskon, stotal_usd,
        packages, package_unit, delivery_status
    } = req.body;

    if (!invoice_id || !product_id || (!qty_meter && !qty_yard)) {
        return res.status(400).json({ error: 'Field wajib tidak lengkap.' });
    }

    const sql = `
    INSERT INTO invoice_details
    (invoice_id, product_id, contract_detail_id, contract_id, color, unit,
    qty_meter, qty_yard, price_usd, diskon, stotal_usd,
    packages, package_unit, delivery_status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    db.query(sql, [
        invoice_id, product_id, contract_detail_id || null, contract_id || null,
        color || null, unit || 'Meter',
        qty_meter || 0, qty_yard || 0, price_usd || 0, diskon || 0, stotal_usd || 0,
        packages || null, package_unit || 'PACKAGES', delivery_status || 'full'
        ], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            recalcInvoiceTotal(invoice_id);
            if (contract_detail_id) {
                adjustContractDetailInvoiced(contract_detail_id, qty_meter || 0, qty_yard || 0, () => {
                    res.json({ success: true, id: result.insertId });
                });
            } else {
                res.json({ success: true, id: result.insertId });
            }
        });
});

app.put('/api/invoice-details/:id', requireLogin, (req, res) => {
    const detailId = req.params.id;
    const {
        product_id, contract_detail_id, contract_id, color, unit,
        qty_meter, qty_yard, price_usd, diskon, stotal_usd, packages
    } = req.body;

    db.query('SELECT invoice_id, contract_detail_id, qty_meter, qty_yard FROM invoice_details WHERE id = ?', [detailId], (err, rows) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        if (!rows.length) return res.status(404).json({ success: false, error: 'Item tidak ditemukan' });

        const old = rows[0];
        const invoiceId = old.invoice_id;

        const sql = `
        UPDATE invoice_details SET
        product_id=?, contract_detail_id=?, contract_id=?, color=?, unit=?, qty_meter=?, qty_yard=?, price_usd=?, diskon=?, stotal_usd=?, packages=?, updated_at=NOW()
        WHERE id=?`;

        db.query(sql, [
            product_id, contract_detail_id || null, contract_id || null, color || null, unit || 'Meter',
            qty_meter || 0, qty_yard || 0, price_usd || 0, diskon || 0, stotal_usd || 0,
            packages || null,
            detailId
            ], (err2) => {
                if (err2) return res.status(500).json({ success: false, error: err2.message });

                adjustContractDetailInvoiced(old.contract_detail_id, -(parseFloat(old.qty_meter)||0), -(parseFloat(old.qty_yard)||0), () => {
                    adjustContractDetailInvoiced(contract_detail_id, parseFloat(qty_meter)||0, parseFloat(qty_yard)||0, () => {
                        recalcInvoiceTotal(invoiceId);
                        res.json({ success: true });
                    });
                });
            });
    });
});

app.delete('/api/invoice-details/:id', requireLogin, (req, res) => {
    const detailId = req.params.id;

    db.query('SELECT invoice_id, contract_detail_id, qty_meter, qty_yard FROM invoice_details WHERE id = ?', [detailId], (err, rows) => {
        if (err) {
            console.error('SELECT invoice_details error:', err);
            return res.status(500).json({ success: false, error: err.message });
        }
        if (!rows || rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Item tidak ditemukan' });
        }

        const { invoice_id, contract_detail_id, qty_meter, qty_yard } = rows[0];

        db.query('DELETE FROM invoice_details WHERE id = ?', [detailId], (err2, result) => {
            if (err2) {
                console.error('DELETE invoice_details error:', err2);
                return res.status(500).json({ success: false, error: 'Gagal menghapus item: ' + err2.message });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, error: 'Item tidak ditemukan' });
            }

            adjustContractDetailInvoiced(contract_detail_id, -(parseFloat(qty_meter)||0), -(parseFloat(qty_yard)||0), () => {
                recalcInvoiceTotal(invoice_id, (err3) => {
                    if (err3) console.error('UPDATE invoice total error:', err3);
                    console.log(`Invoice detail ${detailId} deleted successfully`);
                    res.json({ success: true });
                });
            });
        });
    });
});


// =========================================================================
// 12. BACKEND ENDPOINTS (REST API INVOICE SAMPLE)
// =========================================================================

app.get('/api/invoice-samples/next-no', requireLogin, (req, res) => {
    const sql = `SELECT invoice_sample_no FROM invoice_samples ORDER BY invoice_sample_no DESC LIMIT 1`;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        let next_no = 'ISN260001';
        if (results.length > 0) {
            const prev_no = results[0].invoice_sample_no;
            const num = parseInt(prev_no.replace(/^ISN/i, '')) || 0;
            next_no = 'ISN' + String(num + 1).padStart(prev_no.length - 3, '0');
        }
        res.json({ next_no });
    });
});

app.get('/api/invoice-samples', requireLogin, (req, res) => {
    const sql = `
    SELECT isamp.*, cu.name AS customer_name,
    IFNULL(d.item_count,0) AS item_count
    FROM invoice_samples isamp
    LEFT JOIN customers cu ON cu.id = isamp.customer_id
    LEFT JOIN (
    SELECT invoice_sample_id, COUNT(*) AS item_count
    FROM invoice_sample_details
    GROUP BY invoice_sample_id
    ) d ON d.invoice_sample_id = isamp.id
    ORDER BY isamp.created_at DESC
    `;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.get('/api/invoice-samples/:id', requireLogin, (req, res) => {
    const sql = `
    SELECT isamp.*, cu.name AS customer_name, cu.address AS customer_address,
    r.sell_rate, r.buy_rate, r.created_at AS rate_date
    FROM invoice_samples isamp
    LEFT JOIN customers cu ON cu.id = isamp.customer_id
    LEFT JOIN rates r ON r.id = isamp.rate_id
    WHERE isamp.id = ?
    `;
    db.query(sql, [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!results.length) return res.status(404).json({ error: 'Not found' });
        res.json(results[0]);
    });
});

app.post('/api/invoice-samples', requireLogin, (req, res) => {
    const {
        invoice_sample_no, reff_no, customer_id, attn, invoice_date,
        unit, currency, rate_id, delivery_date, courier,
        receipt_number, delivery_note_number
    } = req.body;

    if (!invoice_sample_no || !customer_id || !rate_id) {
        return res.status(400).json({ error: 'Field wajib tidak lengkap.' });
    }

    db.query('SELECT id FROM invoice_samples WHERE invoice_sample_no = ?', [invoice_sample_no], (err, dup) => {
        if (err) return res.status(500).json({ error: err.message });
        if (dup.length > 0) return res.status(400).json({ error: `Invoice Sample No "${invoice_sample_no}" sudah digunakan.` });

        const sql = `
        INSERT INTO invoice_samples
        (invoice_sample_no, reff_no, customer_id, attn, invoice_date,
        unit, currency, rate_id, delivery_date, courier,
        receipt_number, delivery_note_number, total, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NOW(), NOW())
        `;
        db.query(sql, [
            invoice_sample_no, reff_no || null, customer_id, attn || null, invoice_date || null,
            unit || 'Meter', currency || 'USD', rate_id, delivery_date || null, courier || null,
            receipt_number || null, delivery_note_number || null
            ], (err2, result) => {
                if (err2) return res.status(500).json({ error: err2.message });
                res.json({ success: true, id: result.insertId });
            });
    });
});

app.put('/api/invoice-samples/:id', requireLogin, (req, res) => {
    const {
        invoice_sample_no, reff_no, customer_id, attn, invoice_date,
        unit, currency, rate_id, delivery_date, courier,
        receipt_number, delivery_note_number
    } = req.body;

    if (!invoice_sample_no || !customer_id || !rate_id) {
        return res.status(400).json({ error: 'Field wajib tidak lengkap.' });
    }

    db.query('SELECT id FROM invoice_samples WHERE invoice_sample_no = ? AND id != ?', [invoice_sample_no, req.params.id], (err, dup) => {
        if (err) return res.status(500).json({ error: err.message });
        if (dup.length > 0) return res.status(400).json({ error: `Invoice Sample No "${invoice_sample_no}" sudah digunakan.` });

        const sql = `
        UPDATE invoice_samples SET
        invoice_sample_no=?, reff_no=?, customer_id=?, attn=?, invoice_date=?,
        unit=?, currency=?, rate_id=?, delivery_date=?, courier=?,
        receipt_number=?, delivery_note_number=?, updated_at=NOW()
        WHERE id=?`;
        db.query(sql, [
            invoice_sample_no, reff_no || null, customer_id, attn || null, invoice_date || null,
            unit || 'Meter', currency || 'USD', rate_id, delivery_date || null, courier || null,
            receipt_number || null, delivery_note_number || null,
            req.params.id
            ], (err2) => {
                if (err2) return res.status(500).json({ error: err2.message });
                res.json({ success: true });
            });
    });
});

app.delete('/api/invoice-samples/:id', requireLogin, (req, res) => {
    const id = req.params.id;
    db.query('DELETE FROM invoice_sample_details WHERE invoice_sample_id = ?', [id], (err) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        db.query('DELETE FROM invoice_samples WHERE id = ?', [id], (err2, result) => {
            if (err2) return res.status(500).json({ success: false, error: err2.message });
            if (result.affectedRows === 0) return res.status(404).json({ success: false, error: 'Data tidak ditemukan' });
            res.json({ success: true });
        });
    });
});

function recalcInvoiceSampleTotal(invoiceSampleId, callback) {
    const sql = `
    UPDATE invoice_samples isamp
    SET isamp.total = (
    SELECT COALESCE(SUM(isd.stotal), 0)
    FROM invoice_sample_details isd
    WHERE isd.invoice_sample_id = isamp.id
    ), isamp.updated_at = NOW()
    WHERE isamp.id = ?`;
    db.query(sql, [invoiceSampleId], callback || (() => {}));
}

app.get('/api/invoice-sample-details/by-invoice-sample/:id', requireLogin, (req, res) => {
    const sql = `SELECT * FROM invoice_sample_details WHERE invoice_sample_id = ? ORDER BY created_at ASC`;
    db.query(sql, [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post('/api/invoice-sample-details', requireLogin, (req, res) => {
    const { invoice_sample_id, description, qty, unit, price_usd, stotal } = req.body;
    if (!invoice_sample_id || !description || !qty) {
        return res.status(400).json({ error: 'Field wajib tidak lengkap.' });
    }
    const sql = `
    INSERT INTO invoice_sample_details
    (invoice_sample_id, description, qty, unit, price_usd, stotal, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`;
    db.query(sql, [invoice_sample_id, description, qty, unit || 'Meter', price_usd || 0, stotal || 0], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        recalcInvoiceSampleTotal(invoice_sample_id);
        res.json({ success: true, id: result.insertId });
    });
});

app.delete('/api/invoice-sample-details/:id', requireLogin, (req, res) => {
    const detailId = req.params.id;
    db.query('SELECT invoice_sample_id FROM invoice_sample_details WHERE id = ?', [detailId], (err, rows) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        if (!rows.length) return res.status(404).json({ success: false, error: 'Item tidak ditemukan' });
        const invoiceSampleId = rows[0].invoice_sample_id;
        db.query('DELETE FROM invoice_sample_details WHERE id = ?', [detailId], (err2, result) => {
            if (err2) return res.status(500).json({ success: false, error: err2.message });
            if (result.affectedRows === 0) return res.status(404).json({ success: false, error: 'Item tidak ditemukan' });
            recalcInvoiceSampleTotal(invoiceSampleId, () => res.json({ success: true }));
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