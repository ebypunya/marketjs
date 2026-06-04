const express = require('express');
const mysql = require('mysql2');
const path = require('path');
const app = express();
const port = 80;

// --- 1. KONEKSI DATABASE ---
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
    else {
        console.log('Database Terhubung! [Status: OK]');
        conn.release();
    }
});

// --- 2. MIDDLEWARE & STATIC FILES ---
app.use(express.static(path.join(__dirname, 'public')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use(express.urlencoded({ extended: true }));

// --- 3. ROUTING HALAMAN (Clean URL) ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/registrasi', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'registrasi.html'));
});

app.get('/lupa-password', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'lupa-password.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// --- 4. LOGIKA REGISTRASI ---
app.post('/register-proses', (req, res) => {
    const { fullname, username, email, password } = req.body;
    const sql = "INSERT INTO users (fullname, username, email, password) VALUES (?, ?, ?, ?)";
    
    db.query(sql, [fullname, username, email, password], (err, result) => {
        if (err) {
            return res.send(`
                <link rel="stylesheet" href="/assets/css/main.css">
                <div class="container animate-fade-in">
                <div class="form-card" style="text-align:center;">
                <h2 style="color:red;">Registrasi Gagal!</h2>
                <p>${err.message}</p>
                <a href="/registrasi" class="btn-primary" style="text-decoration:none; display:inline-block;">Kembali</a>
                </div>
                </div>
                `);
        }

        res.send(`
            <!DOCTYPE html>
            <html lang="id">
            <head>
            <meta charset="UTF-8">
            <link rel="stylesheet" href="/assets/css/main.css">
            <title>Registrasi Berhasil</title>
            </head>
            <body>
            <div class="container animate-fade-in">
            <div class="form-card" style="text-align:center;">
            <div style="font-size: 50px; margin-bottom: 10px;">✅</div>
            <h2>Registrasi Berhasil!</h2>
            <p>Akun <b>${fullname}</b> telah aktif.</p>
            <br>
            <a href="/" class="btn-primary" style="text-decoration:none; display:inline-block;">Klik di sini untuk Login</a>
            </div>
            <footer><p>&copy; DeV#477 2026</p></footer>
            </div>
            </body>
            </html>
            `);
    });
});

// --- 5. LOGIKA LOGIN ---
app.post('/login-proses', (req, res) => {
    const { username, password } = req.body;
    const sql = "SELECT * FROM users WHERE (username = ? OR email = ?) AND password = ?";
    
    db.query(sql, [username, username, password], (err, results) => {
        if (err) return res.status(500).send("Error Server");

        if (results.length > 0) {
            res.redirect('/dashboard');
        } else {
            res.send(`
                <link rel="stylesheet" href="/assets/css/main.css">
                <div class="container animate-fade-in">
                <div class="form-card" style="text-align:center;">
                <div style="font-size: 50px; margin-bottom: 10px;">❌</div>
                <h2 style="color:red;">Login Gagal!</h2>
                <p>Username atau Password salah.</p>
                <br>
                <a href="/" class="btn-primary" style="text-decoration:none; display:inline-block;">Coba Lagi</a>
                </div>
                <footer><p>&copy; DeV#477 2026</p></footer>
                </div>
                `);
        }
    });
});

// --- LISTENING & CLEAR CONSOLE ---
app.listen(port, () => {
    // Memberisihkan konsol setiap kali restart
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