// =========================================================================
// API DEBIT NOTE DETAILS — mounted at /api/debitnote-details
// =========================================================================
const express = require('express');
const router = express.Router();
const { db } = require('../config/db');
const { requireLogin } = require('../middleware/auth');
const { recalcDebitNoteTotal } = require('../utils/recalc');

router.get('/by-debitnote/:id', requireLogin, (req, res) => {
    const sql = `SELECT * FROM debitnote_detail WHERE id_debitnote = ? ORDER BY created_at ASC`;
    db.query(sql, [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

router.post('/', requireLogin, (req, res) => {
    const { id_debitnote, description, amount, amount_idr, currency, subtotal, kurs } = req.body;
    if (!id_debitnote || !description || (!amount && !amount_idr)) {
        return res.status(400).json({ error: 'Field wajib tidak lengkap.' });
    }

    const sql = `
        INSERT INTO debitnote_detail
        (id_debitnote, description, amount, amount_idr, currency, subtotal, kurs, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    db.query(sql, [
        id_debitnote, description,
        amount || 0, amount_idr || 0, currency || 'USD',
        subtotal || 0, kurs || 0
    ], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        recalcDebitNoteTotal(id_debitnote);
        res.json({ success: true, id: result.insertId });
    });
});

router.delete('/:id', requireLogin, (req, res) => {
    const detailId = req.params.id;
    db.query('SELECT id_debitnote FROM debitnote_detail WHERE id_debitnotedetail = ?', [detailId], (err, rows) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        if (!rows.length) return res.status(404).json({ success: false, error: 'Item tidak ditemukan' });
        const debitNoteId = rows[0].id_debitnote;
        db.query('DELETE FROM debitnote_detail WHERE id_debitnotedetail = ?', [detailId], (err2, result) => {
            if (err2) return res.status(500).json({ success: false, error: err2.message });
            if (result.affectedRows === 0) return res.status(404).json({ success: false, error: 'Item tidak ditemukan' });
            recalcDebitNoteTotal(debitNoteId, () => res.json({ success: true }));
        });
    });
});

module.exports = router;