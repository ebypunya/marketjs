// =========================================================================
// API SURAT JALAN DETAILS (BARANG) — mounted at /api/surat-jalan-details
// =========================================================================
const express = require('express');
const router = express.Router();
const { db } = require('../config/db');
const { requireLogin } = require('../middleware/auth');

router.get('/by-surat-jalan/:id', requireLogin, (req, res) => {
    const sql = `SELECT * FROM surat_jalan_details WHERE id_suratjalan = ? ORDER BY id_suratjalandetail ASC`;
    db.query(sql, [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

router.post('/', requireLogin, (req, res) => {
    const { id_suratjalan, deskripsi, jumlah, qty, sat_panjang, panjang } = req.body;

    if (!id_suratjalan || !deskripsi || !panjang) {
        return res.status(400).json({ error: 'Field wajib tidak lengkap.' });
    }

    const sql = `
        INSERT INTO surat_jalan_details
        (id_suratjalan, deskripsi, jumlah, qty, sat_panjang, panjang, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    db.query(sql, [
        id_suratjalan,
        deskripsi,
        jumlah || null,
        qty || null,
        sat_panjang || 'Yard',
        panjang
    ], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, id: result.insertId });
    });
});

router.delete('/:id', requireLogin, (req, res) => {
    db.query('DELETE FROM surat_jalan_details WHERE id_suratjalandetail = ?', [req.params.id], (err, result) => {
        if (err) {
            console.error('DELETE surat_jalan_details error:', err);
            return res.status(500).json({ success: false, error: err.message });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Data tidak ditemukan' });
        }
        console.log(`Surat Jalan Detail ${req.params.id} deleted successfully`);
        res.json({ success: true });
    });
});

module.exports = router;