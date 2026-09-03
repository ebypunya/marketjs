// =========================================================================
// API DEBIT NOTE (HEADER) — mounted at /api/debitnote
// =========================================================================
const express = require('express');
const router = express.Router();
const { db } = require('../config/db');
const { requireLogin } = require('../middleware/auth');

const ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];

// Preview nomor berikutnya (bukan disimpan ke DB, hanya info tampilan)
router.get('/next-no', requireLogin, (req, res) => {
    const now = new Date();
    const year = now.getFullYear();
    const monthRoman = ROMAN[now.getMonth()];

    const sql = `
        SELECT COUNT(*) AS cnt FROM debitnote
        WHERE YEAR(created_at) = ? AND MONTH(created_at) = ?
    `;
    db.query(sql, [year, now.getMonth() + 1], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        const seq = (results[0].cnt || 0) + 1;
        const next_no = `${year}/${monthRoman}/${String(seq).padStart(3, '0')}`;
        res.json({ next_no });
    });
});

router.get('/', requireLogin, (req, res) => {
    const sql = `
        SELECT d.*, IFNULL(dd.item_count, 0) AS item_count
        FROM debitnote d
        LEFT JOIN (
            SELECT id_debitnote, COUNT(*) AS item_count
            FROM debitnote_detail
            GROUP BY id_debitnote
        ) dd ON dd.id_debitnote = d.id_debitnote
        ORDER BY d.created_at DESC
    `;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

router.get('/:id', requireLogin, (req, res) => {
    db.query('SELECT * FROM debitnote WHERE id_debitnote = ?', [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!results.length) return res.status(404).json({ error: 'Not found' });
        res.json(results[0]);
    });
});

router.post('/', requireLogin, (req, res) => {
    const { reff_no, attn, date, messrs, currency, rate_id, kurs, delivery_note_no } = req.body;

    if (!date || !messrs || !rate_id || !kurs) {
        return res.status(400).json({ error: 'Field wajib tidak lengkap.' });
    }

    const sql = `
        INSERT INTO debitnote
        (reff_no, attn, date, total_amount, total_amount_idr, currency, messrs, rate_id, kurs, delivery_note_no, created_at, updated_at)
        VALUES (?, ?, ?, 0, 0, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    db.query(sql, [
        reff_no || null, attn || null, date, currency || 'USD',
        messrs, String(rate_id), kurs, delivery_note_no || null
    ], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, id: result.insertId });
    });
});

router.put('/:id', requireLogin, (req, res) => {
    const { reff_no, attn, date, messrs, currency, rate_id, kurs, delivery_note_no } = req.body;

    if (!date || !messrs || !rate_id || !kurs) {
        return res.status(400).json({ error: 'Field wajib tidak lengkap.' });
    }

    const sql = `
        UPDATE debitnote SET
        reff_no=?, attn=?, date=?, currency=?, messrs=?, rate_id=?, kurs=?, delivery_note_no=?, updated_at=NOW()
        WHERE id_debitnote=?
    `;
    db.query(sql, [
        reff_no || null, attn || null, date, currency || 'USD',
        messrs, String(rate_id), kurs, delivery_note_no || null,
        req.params.id
    ], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

router.delete('/:id', requireLogin, (req, res) => {
    const id = req.params.id;
    db.query('DELETE FROM debitnote_detail WHERE id_debitnote = ?', [id], (err) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        db.query('DELETE FROM debitnote WHERE id_debitnote = ?', [id], (err2, result) => {
            if (err2) return res.status(500).json({ success: false, error: err2.message });
            if (result.affectedRows === 0) return res.status(404).json({ success: false, error: 'Data tidak ditemukan' });
            res.json({ success: true });
        });
    });
});

module.exports = router;