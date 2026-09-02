// =========================================================================
// API MASTER DATA CUSTOMERS — mounted at /api/customers
// =========================================================================
const express = require('express');
const router = express.Router();
const { db } = require('../config/db');
const { requireLogin } = require('../middleware/auth');

router.get('/', requireLogin, (req, res) => {
    const sql = "SELECT id, name, phone, address, email, annotation, created_at, updated_at FROM customers ORDER BY created_at DESC";
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

router.get('/:id', requireLogin, (req, res) => {
    db.query("SELECT * FROM customers WHERE id = ?", [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json(results[0]);
    });
});

router.post('/', requireLogin, (req, res) => {
    const { name, phone, address, email, annotation } = req.body;
    const sql = "INSERT INTO customers (name, phone, address, email, annotation) VALUES (?, ?, ?, ?, ?)";
    db.query(sql, [name, phone, address, email, annotation], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, id: result.insertId });
    });
});

router.put('/:id', requireLogin, (req, res) => {
    const { name, phone, address, email, annotation } = req.body;
    const sql = "UPDATE customers SET name=?, phone=?, address=?, email=?, annotation=?, updated_at=NOW() WHERE id=?";
    db.query(sql, [name, phone, address, email, annotation, req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

router.delete('/:id', requireLogin, (req, res) => {
    const id = req.params.id;
    db.query("DELETE FROM customers WHERE id = ?", [id], (err, result) => {
        if (err) {
            console.error('DELETE customer error:', err);
            return res.status(500).json({ success: false, error: err.message });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Data tidak ditemukan' });
        }
        console.log(`Customer ${id} deleted successfully`);
        res.json({ success: true });
    });
});

module.exports = router;
