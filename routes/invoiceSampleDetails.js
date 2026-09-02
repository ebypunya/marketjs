// =========================================================================
// API INVOICE SAMPLE DETAILS — mounted at /api/invoice-sample-details
// =========================================================================
const express = require('express');
const router = express.Router();
const { db } = require('../config/db');
const { requireLogin } = require('../middleware/auth');
const { recalcInvoiceSampleTotal } = require('../utils/recalc');

router.get('/by-invoice-sample/:id', requireLogin, (req, res) => {
    const sql = `SELECT * FROM invoice_sample_details WHERE invoice_sample_id = ? ORDER BY created_at ASC`;
    db.query(sql, [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

router.post('/', requireLogin, (req, res) => {
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

router.delete('/:id', requireLogin, (req, res) => {
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

module.exports = router;
