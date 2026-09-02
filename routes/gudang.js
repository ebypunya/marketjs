// =========================================================================
// API GUDANG SPAREPART (database "gudang": gudangengineering + part_grup)
// Mounted at /api/gudang-sparepart
// =========================================================================
const express = require('express');
const router = express.Router();
const { dbGudang } = require('../config/db');
const { requireLogin } = require('../middleware/auth');

router.get('/', requireLogin, (req, res) => {
    const page   = Math.max(parseInt(req.query.page) || 1, 1);
    const limit  = 15;
    const offset = (page - 1) * limit;

    const search = (req.query.search || '').trim();
    const grup   = (req.query.grup || '').trim();

    let where = [];
    let params = [];

    if (search) {
        where.push('(ge.nama_barang LIKE ? OR ge.kode_barang LIKE ?)');
        params.push(`%${search}%`, `%${search}%`);
    }
    if (grup) {
        where.push('ge.grup = ?');
        params.push(grup);
    }
    const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const countSql = `SELECT COUNT(*) AS total FROM gudangengineering ge ${whereSql}`;

    dbGudang.query(countSql, params, (err, countResult) => {
        if (err) return res.status(500).json({ error: err.message });
        const total = countResult[0].total;

        const dataSql = `
        SELECT ge.kode_barang, ge.nama_barang, ge.quantity, pg.grup AS grup
        FROM gudangengineering ge
        LEFT JOIN part_grup pg ON pg.kode_grup = ge.grup
        ${whereSql}
        ORDER BY ge.nama_barang ASC
        LIMIT ? OFFSET ?
        `;

        dbGudang.query(dataSql, [...params, limit, offset], (err2, rows) => {
            if (err2) return res.status(500).json({ error: err2.message });
            res.json({
                data: rows,
                total,
                page,
                totalPages: Math.ceil(total / limit) || 1
            });
        });
    });
});

router.get('/grup', requireLogin, (req, res) => {
    const sql = "SELECT DISTINCT kode_grup, grup FROM part_grup ORDER BY grup ASC";
    dbGudang.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

module.exports = router;
