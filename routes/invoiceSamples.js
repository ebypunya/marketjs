// =========================================================================
// API INVOICE SAMPLE — mounted at /api/invoice-samples
// =========================================================================
const express = require('express');
const router = express.Router();
const { db } = require('../config/db');
const { requireLogin } = require('../middleware/auth');

router.get('/next-no', requireLogin, (req, res) => {
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

router.get('/', requireLogin, (req, res) => {
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

router.get('/:id', requireLogin, (req, res) => {
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

router.post('/', requireLogin, (req, res) => {
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

router.put('/:id', requireLogin, (req, res) => {
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

router.delete('/:id', requireLogin, (req, res) => {
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

module.exports = router;
