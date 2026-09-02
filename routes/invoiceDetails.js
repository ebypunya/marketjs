// =========================================================================
// API CHILD ITEMS / INVOICE DETAILS (PRODUCT) — mounted at /api/invoice-details
// =========================================================================
const express = require('express');
const router = express.Router();
const { db } = require('../config/db');
const { requireLogin } = require('../middleware/auth');
const { recalcInvoiceTotal, adjustContractDetailInvoiced } = require('../utils/recalc');

router.get('/by-invoice/:invoiceId', requireLogin, (req, res) => {
    const sql = `
    SELECT idt.*,
    p.fabric_no, p.fabric_name, p.color AS product_color, p.composition,
    p.price_m, p.price_y,
    ct.contract_no, ct.order_no,
    cd.kurs AS item_kurs
    FROM invoice_details idt
    LEFT JOIN products p ON p.id = idt.product_id
    LEFT JOIN contracts ct ON ct.id = idt.contract_id
    LEFT JOIN contract_details cd ON cd.id = idt.contract_detail_id
    WHERE idt.invoice_id = ?
    ORDER BY idt.created_at ASC
    `;
    db.query(sql, [req.params.invoiceId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

router.post('/', requireLogin, (req, res) => {
    const {
        invoice_id, product_id, contract_detail_id, contract_id, color, unit,
        qty_meter, qty_yard, price_usd, diskon, stotal_usd,
        packages, package_unit, delivery_status
    } = req.body;

    if (!invoice_id || !product_id || (!qty_meter && !qty_yard)) {
        return res.status(400).json({ error: 'Field wajib tidak lengkap.' });
    }

    const sql = `
    INSERT INTO invoice_details
    (invoice_id, product_id, contract_detail_id, contract_id, color, unit,
    qty_meter, qty_yard, price_usd, diskon, stotal_usd,
    packages, package_unit, delivery_status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    db.query(sql, [
        invoice_id, product_id, contract_detail_id || null, contract_id || null,
        color || null, unit || 'Meter',
        qty_meter || 0, qty_yard || 0, price_usd || 0, diskon || 0, stotal_usd || 0,
        packages || null, package_unit || 'PACKAGES', delivery_status || 'full'
        ], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            recalcInvoiceTotal(invoice_id);
            if (contract_detail_id) {
                adjustContractDetailInvoiced(contract_detail_id, qty_meter || 0, qty_yard || 0, () => {
                    res.json({ success: true, id: result.insertId });
                });
            } else {
                res.json({ success: true, id: result.insertId });
            }
        });
});

router.put('/:id', requireLogin, (req, res) => {
    const detailId = req.params.id;
    const {
        product_id, contract_detail_id, contract_id, color, unit,
        qty_meter, qty_yard, price_usd, diskon, stotal_usd, packages
    } = req.body;

    db.query('SELECT invoice_id, contract_detail_id, qty_meter, qty_yard FROM invoice_details WHERE id = ?', [detailId], (err, rows) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        if (!rows.length) return res.status(404).json({ success: false, error: 'Item tidak ditemukan' });

        const old = rows[0];
        const invoiceId = old.invoice_id;

        const sql = `
        UPDATE invoice_details SET
        product_id=?, contract_detail_id=?, contract_id=?, color=?, unit=?, qty_meter=?, qty_yard=?, price_usd=?, diskon=?, stotal_usd=?, packages=?, updated_at=NOW()
        WHERE id=?`;

        db.query(sql, [
            product_id, contract_detail_id || null, contract_id || null, color || null, unit || 'Meter',
            qty_meter || 0, qty_yard || 0, price_usd || 0, diskon || 0, stotal_usd || 0,
            packages || null,
            detailId
            ], (err2) => {
                if (err2) return res.status(500).json({ success: false, error: err2.message });

                adjustContractDetailInvoiced(old.contract_detail_id, -(parseFloat(old.qty_meter)||0), -(parseFloat(old.qty_yard)||0), () => {
                    adjustContractDetailInvoiced(contract_detail_id, parseFloat(qty_meter)||0, parseFloat(qty_yard)||0, () => {
                        recalcInvoiceTotal(invoiceId);
                        res.json({ success: true });
                    });
                });
            });
    });
});

router.delete('/:id', requireLogin, (req, res) => {
    const detailId = req.params.id;

    db.query('SELECT invoice_id, contract_detail_id, qty_meter, qty_yard FROM invoice_details WHERE id = ?', [detailId], (err, rows) => {
        if (err) {
            console.error('SELECT invoice_details error:', err);
            return res.status(500).json({ success: false, error: err.message });
        }
        if (!rows || rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Item tidak ditemukan' });
        }

        const { invoice_id, contract_detail_id, qty_meter, qty_yard } = rows[0];

        db.query('DELETE FROM invoice_details WHERE id = ?', [detailId], (err2, result) => {
            if (err2) {
                console.error('DELETE invoice_details error:', err2);
                return res.status(500).json({ success: false, error: 'Gagal menghapus item: ' + err2.message });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, error: 'Item tidak ditemukan' });
            }

            adjustContractDetailInvoiced(contract_detail_id, -(parseFloat(qty_meter)||0), -(parseFloat(qty_yard)||0), () => {
                recalcInvoiceTotal(invoice_id, (err3) => {
                    if (err3) console.error('UPDATE invoice total error:', err3);
                    console.log(`Invoice detail ${detailId} deleted successfully`);
                    res.json({ success: true });
                });
            });
        });
    });
});

module.exports = router;
