// =========================================================================
// KONFIGURASI DATABASE (CONNECTION POOLS)
// Semua koneksi MySQL ada di sini. Import { db, dbGudang, dbProduksi, dbInspect }
// dari file manapun yang butuh query ke database.
// =========================================================================
const mysql = require('mysql2');
const { getCurrentDbName } = require('./yearly-db');

const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: getCurrentDbName(),
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

module.exports = { db, dbGudang, dbProduksi, dbInspect };
