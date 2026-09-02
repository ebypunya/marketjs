// =========================================================================
// API MASTER DATA KURS / RATES — mounted at /api/rates
// =========================================================================
const express = require('express');
const router = express.Router();
const { db } = require('../config/db');
const { requireLogin } = require('../middleware/auth');

router.get('/', requireLogin, (req, res) => {
    const sql = "SELECT id, sell_rate, buy_rate, created_at, updated_at FROM rates ORDER BY created_at DESC";
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

router.get('/:id', requireLogin, (req, res) => {
    db.query("SELECT * FROM rates WHERE id = ?", [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json(results[0]);
    });
});

router.post('/', requireLogin, (req, res) => {
    const { sell_rate, buy_rate } = req.body;
    const sql = "INSERT INTO rates (sell_rate, buy_rate) VALUES (?, ?)";
    db.query(sql, [sell_rate, buy_rate], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, id: result.insertId });
    });
});

router.put('/:id', requireLogin, (req, res) => {
    const { sell_rate, buy_rate } = req.body;
    const sql = "UPDATE rates SET sell_rate=?, buy_rate=?, updated_at=NOW() WHERE id=?";
    db.query(sql, [sell_rate, buy_rate, req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

router.delete('/:id', requireLogin, (req, res) => {
    const id = req.params.id;
    db.query("DELETE FROM rates WHERE id = ?", [id], (err, result) => {
        if (err) {
            console.error('DELETE rate error:', err);
            return res.status(500).json({ success: false, error: err.message });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Data tidak ditemukan' });
        }
        console.log(`Rate ${id} deleted successfully`);
        res.json({ success: true });
    });
});

module.exports = router;
