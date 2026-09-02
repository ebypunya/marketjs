// =========================================================================
// API MASTER DATA PRODUCTS — mounted at /api/products
// =========================================================================
const express = require('express');
const router = express.Router();
const { db } = require('../config/db');
const { requireLogin } = require('../middleware/auth');

router.post('/', requireLogin, (req, res) => {
    const { nama, fabric_no, customer_fabric_no, fabric_name, customer, color,
        price_greige, shrinkge_standard, shrinkge_actual, after_shrinkge,
        additional_fee, after_risk, dyeing_fee, sub_final, price_m, price_y,
        special_condition, keterangan, composition } = req.body;

    const num = v => (v === '' || v === undefined || v === null) ? null : v;

    console.log('POST /api/products body:', req.body);

    const sql = `INSERT INTO products
    (nama, fabric_no, customer_fabric_no, fabric_name, customer, color,
    price_greige, shrinkge_standard, shrinkge_actual, after_shrinkge,
    additional_fee, after_risk, dyeing_fee, sub_final, price_m, price_y,
    special_condition, keterangan, composition)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    db.query(sql, [
        nama, fabric_no, customer_fabric_no || null, fabric_name || null, num(customer), color || null,
        num(price_greige), num(shrinkge_standard), num(shrinkge_actual), num(after_shrinkge),
        num(additional_fee), num(after_risk), num(dyeing_fee), num(sub_final),
        num(price_m), num(price_y),
        special_condition || null, keterangan || null, composition || null
        ], (err, result) => {
            if (err) {
                console.error('INSERT products error:', err);
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true, id: result.insertId });
        });
});

router.put('/:id', requireLogin, (req, res) => {
    const { nama, fabric_no, customer_fabric_no, fabric_name, customer, color,
        price_greige, shrinkge_standard, shrinkge_actual, after_shrinkge,
        additional_fee, after_risk, dyeing_fee, sub_final, price_m, price_y,
        special_condition, keterangan, composition } = req.body;

    const num = v => (v === '' || v === undefined || v === null) ? null : v;

    console.log('PUT /api/products/' + req.params.id + ' body:', req.body);

    const sql = `UPDATE products SET
    nama=?, fabric_no=?, customer_fabric_no=?, fabric_name=?, customer=?, color=?,
    price_greige=?, shrinkge_standard=?, shrinkge_actual=?, after_shrinkge=?,
    additional_fee=?, after_risk=?, dyeing_fee=?, sub_final=?, price_m=?, price_y=?,
    special_condition=?, keterangan=?, composition=?, updated_at=NOW()
    WHERE id=?`;

    db.query(sql, [
        nama, fabric_no, customer_fabric_no || null, fabric_name || null, num(customer), color || null,
        num(price_greige), num(shrinkge_standard), num(shrinkge_actual), num(after_shrinkge),
        num(additional_fee), num(after_risk), num(dyeing_fee), num(sub_final),
        num(price_m), num(price_y),
        special_condition || null, keterangan || null, composition || null,
        req.params.id
        ], (err) => {
            if (err) {
                console.error('UPDATE products error:', err);
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true });
        });
});

router.get('/', requireLogin, (req, res) => {
    const sql = `
    SELECT p.*, c.name AS customer_name
    FROM products p
    LEFT JOIN customers c ON c.id = p.customer
    ORDER BY p.updated_at DESC
    `;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

router.get('/:id', requireLogin, (req, res) => {
    const sql = `
    SELECT p.*, c.name AS customer_name
    FROM products p
    LEFT JOIN customers c ON c.id = p.customer
    WHERE p.id = ?
    `;
    db.query(sql, [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!results.length) return res.status(404).json({ error: 'Not found' });
        res.json(results[0]);
    });
});

router.delete('/:id', requireLogin, (req, res) => {
    const id = req.params.id;
    db.query("DELETE FROM products WHERE id = ?", [id], (err, result) => {
        if (err) {
            console.error('DELETE product error:', err);
            return res.status(500).json({ success: false, error: err.message });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Data tidak ditemukan' });
        }
        console.log(`Product ${id} deleted successfully`);
        res.json({ success: true });
    });
});

module.exports = router;
