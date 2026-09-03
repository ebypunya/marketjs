// =========================================================================
// API SURAT JALAN (HEADER) — mounted at /api/surat-jalan
// =========================================================================
const express = require('express');
const router = express.Router();
const { db } = require('../config/db');
const { requireLogin } = require('../middleware/auth');

// PENTING: route '/latest' HARUS didefinisikan SEBELUM route '/:id',
// kalau tidak Express akan menganggap "latest" sebagai value dari :id.
router.get('/latest', requireLogin, (req, res) => {
    const jenisList = ['Export', 'Lokal', 'Sample'];
    const results = {};
    let completed = 0;
    let hasError = false;

    jenisList.forEach(jenis => {
        const sql = `SELECT no_suratjalan FROM suratjalan WHERE jenis = ? ORDER BY id_suratjalan DESC LIMIT 1`;
        db.query(sql, [jenis], (err, rows) => {
            if (hasError) return;
            completed++;

            if (err) {
                hasError = true;
                return res.status(500).json({ error: err.message });
            }

            results[jenis.toLowerCase()] = rows.length ? rows[0].no_suratjalan : null;

            if (completed === jenisList.length) {
                res.json(results);
            }
        });
    });
});

router.get('/', requireLogin, (req, res) => {
    const sql = `SELECT * FROM suratjalan ORDER BY tanggal DESC, id_suratjalan DESC`;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

router.get('/:id', requireLogin, (req, res) => {
    db.query('SELECT * FROM suratjalan WHERE id_suratjalan = ?', [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!results.length) return res.status(404).json({ error: 'Not found' });
        res.json(results[0]);
    });
});

router.post('/', requireLogin, (req, res) => {
    const {
        no_suratjalan, contract_no, faktur_no, buyer,
        tujuan, destinasi, jenis, tanggal, satuan, sat_panjang
    } = req.body;

    if (!no_suratjalan || !tanggal || !jenis) {
        return res.status(400).json({ error: 'Field wajib tidak lengkap.' });
    }

    db.query('SELECT id_suratjalan FROM suratjalan WHERE no_suratjalan = ?', [no_suratjalan], (err, dup) => {
        if (err) return res.status(500).json({ error: err.message });
        if (dup.length > 0) {
            return res.status(400).json({ error: `No Surat Jalan "${no_suratjalan}" sudah digunakan.` });
        }

        const sql = `
            INSERT INTO suratjalan
            (no_suratjalan, contract_no, faktur_no, buyer, tujuan, destinasi, jenis, tanggal, satuan, sat_panjang, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `;
        db.query(sql, [
            no_suratjalan,
            contract_no || null,
            faktur_no || null,
            buyer || null,
            tujuan || null,
            destinasi || null,
            jenis,
            tanggal,
            satuan || 'Roll',
            sat_panjang || 'Yard'
        ], (err2, result) => {
            if (err2) return res.status(500).json({ error: err2.message });
            res.json({ success: true, id: result.insertId });
        });
    });
});

router.put('/:id', requireLogin, (req, res) => {
    const {
        no_suratjalan, contract_no, faktur_no, buyer,
        tujuan, destinasi, jenis, tanggal, satuan, sat_panjang
    } = req.body;

    if (!no_suratjalan || !tanggal || !jenis) {
        return res.status(400).json({ error: 'Field wajib tidak lengkap.' });
    }

    db.query(
        'SELECT id_suratjalan FROM suratjalan WHERE no_suratjalan = ? AND id_suratjalan != ?',
        [no_suratjalan, req.params.id],
        (err, dup) => {
            if (err) return res.status(500).json({ error: err.message });
            if (dup.length > 0) {
                return res.status(400).json({ error: `No Surat Jalan "${no_suratjalan}" sudah digunakan.` });
            }

            const sql = `
                UPDATE suratjalan SET
                no_suratjalan=?, contract_no=?, faktur_no=?, buyer=?, tujuan=?, destinasi=?,
                jenis=?, tanggal=?, satuan=?, sat_panjang=?, updated_at=NOW()
                WHERE id_suratjalan=?
            `;
            db.query(sql, [
                no_suratjalan,
                contract_no || null,
                faktur_no || null,
                buyer || null,
                tujuan || null,
                destinasi || null,
                jenis,
                tanggal,
                satuan || 'Roll',
                sat_panjang || 'Yard',
                req.params.id
            ], (err2, result) => {
                if (err2) return res.status(500).json({ error: err2.message });
                if (result.affectedRows === 0) {
                    return res.status(404).json({ error: 'Data tidak ditemukan' });
                }
                res.json({ success: true });
            });
        }
    );
});

router.delete('/:id', requireLogin, (req, res) => {
    const id = req.params.id;

    // Hapus detail barang dulu (hindari foreign key constraint), baru header-nya.
    db.query('DELETE FROM suratjalan_detail WHERE id_suratjalan = ?', [id], (err) => {
        if (err) {
            console.error('DELETE suratjalan_detail error:', err);
            return res.status(500).json({ success: false, error: err.message });
        }

        db.query('DELETE FROM suratjalan WHERE id_suratjalan = ?', [id], (err2, result) => {
            if (err2) {
                console.error('DELETE suratjalan error:', err2);
                return res.status(500).json({ success: false, error: err2.message });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, error: 'Data tidak ditemukan' });
            }
            console.log(`Surat Jalan ${id} and its details deleted successfully`);
            res.json({ success: true });
        });
    });
});

module.exports = router;