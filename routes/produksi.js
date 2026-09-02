// =========================================================================
// API TRACKING PRODUKSI (cross-database: marketjs.contracts -> produksi.*)
// Mounted at /api/produksi
// =========================================================================
const express = require('express');
const router = express.Router();
const { dbProduksi } = require('../config/db');
const { requireLogin } = require('../middleware/auth');

router.get('/by-contract/:contractNo', requireLogin, (req, res) => {
    const contractNo = req.params.contractNo;

    const sqlMaster = `
    SELECT id_master_produksi, barcode, no_kontrak, no_wo, no_batch, kode_kain, warna
    FROM master_produksi
    WHERE no_kontrak LIKE ?
    ORDER BY id_master_produksi ASC
    `;

    dbProduksi.query(sqlMaster, [contractNo + '//%'], (err, masterRows) => {
        if (err) return res.status(500).json({ error: err.message });

        if (!masterRows.length) {
            return res.json({ master: [] });
        }

        const barcodes = masterRows.map(m => m.barcode);

        const sqlRiwayat = `
        SELECT id_riwayat_produksi, barcode, proses_produksi, mesin, nama_operator, qtty, waktu_mulai, waktu_selesai
        FROM riwayat_produksi
        WHERE barcode IN (?)
        ORDER BY waktu_mulai ASC
        `;

        const pcsColumns = Array.from({ length: 30 }, (_, i) => `IFNULL(pcs${i + 1}_panjang, 0)`).join(' + ');
        const sqlPlatingdown = `
        SELECT barcode, SUM(${pcsColumns}) AS total_panjang
        FROM proses_platingdown
        WHERE barcode IN (?)
        GROUP BY barcode
        `;

        dbProduksi.query(sqlRiwayat, [barcodes], (err2, riwayatRows) => {
            if (err2) return res.status(500).json({ error: err2.message });

            dbProduksi.query(sqlPlatingdown, [barcodes], (err3, platingRows) => {
                if (err3) return res.status(500).json({ error: err3.message });

                const riwayatByBarcode = {};
                riwayatRows.forEach(r => {
                    if (!riwayatByBarcode[r.barcode]) riwayatByBarcode[r.barcode] = [];
                    riwayatByBarcode[r.barcode].push(r);
                });

                const panjangByBarcode = {};
                platingRows.forEach(p => {
                    panjangByBarcode[p.barcode] = parseFloat(p.total_panjang) || 0;
                });

                const result = masterRows.map(m => ({
                    barcode: m.barcode,
                    no_kontrak: m.no_kontrak,
                    no_wo: m.no_wo,
                    no_batch: m.no_batch,
                    kode_kain: m.kode_kain,
                    warna: m.warna,
                    panjang_greige: panjangByBarcode.hasOwnProperty(m.barcode) ? panjangByBarcode[m.barcode] : null,
                    riwayat: riwayatByBarcode[m.barcode] || []
                }));

                res.json({ master: result });
            });
        });
    });
});

module.exports = router;
