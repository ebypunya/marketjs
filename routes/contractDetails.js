// =========================================================================
// API CHILD ITEMS / CONTRACT DETAILS — mounted at /api/contract-details
// =========================================================================
const express = require('express');
const router = express.Router();
const { db } = require('../config/db');
const { requireLogin } = require('../middleware/auth');
const { recalcContractTotal } = require('../utils/recalc');

router.get('/:contractId', requireLogin, (req, res) => {
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

router.get('/by-contract/:contractId', requireLogin, (req, res) => {
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

router.get('/remaining/:contractId', requireLogin, (req, res) => {
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

router.post('/', requireLogin, (req, res) => {
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

router.put('/:id', requireLogin, (req, res) => {
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

router.delete('/:id', requireLogin, (req, res) => {
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

module.exports = router;
