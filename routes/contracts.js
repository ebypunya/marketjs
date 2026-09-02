// =========================================================================
// API TRANSAKSI SALES CONTRACT — mounted at /api/contracts
// =========================================================================
const express = require('express');
const router = express.Router();
const { db } = require('../config/db');
const { requireLogin } = require('../middleware/auth');

router.get('/next-no', requireLogin, (req, res) => {
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

router.get('/', requireLogin, (req, res) => {
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

router.get('/:id', requireLogin, (req, res) => {
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

router.post('/', requireLogin, (req, res) => {
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

router.put('/:id', requireLogin, (req, res) => {
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

router.put('/:id/total', requireLogin, (req, res) => {
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

router.delete('/:id', requireLogin, (req, res) => {
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

module.exports = router;
