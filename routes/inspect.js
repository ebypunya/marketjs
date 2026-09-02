// =========================================================================
// API DATA INSPECT (cross-database: marketjs.contracts -> inspect.detail_inspect)
// Mounted at /api/inspect
// =========================================================================
const express = require('express');
const router = express.Router();
const { dbInspect } = require('../config/db');
const { requireLogin } = require('../middleware/auth');

router.get('/by-contract/:contractNo', requireLogin, (req, res) => {
    const contractNo = req.params.contractNo;

    const sql = `
    SELECT id_detail, no_kontrak, no_lot, Nocolor, no_pcs, panjang, berat, inspector, tanggal, nomesin, grade
    FROM detail_inspect
    WHERE no_kontrak LIKE ?
    ORDER BY no_lot ASC, no_pcs ASC
    `;

    dbInspect.query(sql, [contractNo + '//%'], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        if (!rows.length) {
            return res.json({ batches: [], total_panjang_all: 0, total_pcs_all: 0 });
        }

        const batchMap = {};
        rows.forEach(r => {
            const key = r.no_lot || '-';
            if (!batchMap[key]) {
                batchMap[key] = { no_lot: key, items: [], total_panjang: 0, total_pcs: 0 };
            }
            batchMap[key].items.push(r);
            batchMap[key].total_panjang += parseFloat(r.panjang) || 0;
            batchMap[key].total_pcs += 1;
        });

        const batches = Object.values(batchMap);
        const total_panjang_all = batches.reduce((s, b) => s + b.total_panjang, 0);
        const total_pcs_all     = batches.reduce((s, b) => s + b.total_pcs, 0);

        res.json({ batches, total_panjang_all, total_pcs_all });
    });
});

module.exports = router;
