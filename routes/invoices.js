// =========================================================================
// API TRANSAKSI INVOICES — mounted at /api/invoices
// =========================================================================
const express = require('express');
const router = express.Router();
const { db } = require('../config/db');
const { requireLogin } = require('../middleware/auth');
const { adjustContractDetailInvoiced } = require('../utils/recalc');

router.get('/next-no', requireLogin, (req, res) => {
    const sql = `SELECT invoice_no FROM invoices ORDER BY invoice_no DESC LIMIT 1`;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });

        let next_no = 'INV260001';
        if (results.length > 0) {
            const prev_no = results[0].invoice_no;
            const num = parseInt(prev_no.replace(/^INV/i, '')) || 0;
            next_no = 'INV' + String(num + 1).padStart(prev_no.length - 3, '0');
        }
        res.json({ next_no });
    });
});

router.get('/', requireLogin, (req, res) => {
    const sql = `
    SELECT
    i.id, i.invoice_no, i.customer_id, 
    c.name AS customer_name,
    i.currency, i.total, i.status, i.created_at, i.updated_at,
    COUNT(DISTINCT ic.contract_id) AS contract_count
    FROM invoices i
    LEFT JOIN customers c ON c.id = i.customer_id
    LEFT JOIN invoice_contracts ic ON ic.invoice_id = i.id
    GROUP BY i.id, i.invoice_no, i.customer_id, c.name, i.currency, i.total, i.status, i.created_at, i.updated_at
    ORDER BY i.created_at DESC
    `;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

router.get('/:id', requireLogin, (req, res) => {
    const invoiceId = req.params.id;
    const sql = `
    SELECT i.*, c.name AS customer_name, c.address AS customer_address,
    r.sell_rate, r.buy_rate, r.created_at AS rate_date
    FROM invoices i
    LEFT JOIN customers c ON c.id = i.customer_id
    LEFT JOIN rates r ON r.id = i.rate_id
    WHERE i.id = ?
    `;

    db.query(sql, [invoiceId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!results.length) return res.status(404).json({ error: 'Invoice not found' });

        const invoice = results[0];

        const contractSql = `
        SELECT ct.*, ic.added_at
        FROM invoice_contracts ic
        JOIN contracts ct ON ct.id = ic.contract_id
        WHERE ic.invoice_id = ?
        ORDER BY ic.added_at ASC
        `;

        db.query(contractSql, [invoiceId], (err2, contracts) => {
            if (err2) return res.status(500).json({ error: err2.message });
            invoice.contracts = contracts || [];
            res.json(invoice);
        });
    });
});

router.post('/', requireLogin, (req, res) => {
    const {
        invoice_no, customer_id, currency, invoice_date, rate_id,
        status, total, contracts,
        lc_no, vessel, case_mark, from_location, to_location,
        delivery_note_no, ppn_percent
    } = req.body;

    if (!invoice_no || !customer_id || !contracts || !Array.isArray(contracts) || !contracts.length) {
        return res.status(400).json({ error: 'Required fields missing or invalid' });
    }
    if (!rate_id) {
        return res.status(400).json({ error: 'Kurs wajib dipilih.' });
    }

    db.query('SELECT id FROM invoices WHERE invoice_no = ?', [invoice_no], (err, dup) => {
        if (err) return res.status(500).json({ error: err.message });
        if (dup.length > 0) return res.status(400).json({ error: `Invoice No "${invoice_no}" already used` });

        const insertSql = `
        INSERT INTO invoices 
        (invoice_no, customer_id, currency, rate_id, total, status,
        lc_no, vessel, case_mark, from_location, to_location, delivery_note_no, ppn_percent,
        created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `;

        db.query(insertSql, [
            invoice_no, customer_id, currency || 'USD', rate_id, total || 0, status || 'draft',
            lc_no || null, vessel || null, case_mark || null,
            from_location || null, to_location || null, delivery_note_no || null,
            (ppn_percent === '' || ppn_percent === undefined || ppn_percent === null) ? 11 : ppn_percent
            ], (err2, result) => {
                if (err2) return res.status(500).json({ error: err2.message });
                const invoiceId = result.insertId;
                const linkSql = 'INSERT INTO invoice_contracts (invoice_id, contract_id, added_at) VALUES (?, ?, NOW())';
                let completed = 0, hasError = false;
                contracts.forEach(contractId => {
                    db.query(linkSql, [invoiceId, contractId], (err3) => {
                        completed++;
                        if (err3 && !hasError) { hasError = true; return res.status(500).json({ error: 'Failed to link contracts: ' + err3.message }); }
                        if (completed === contracts.length && !hasError) res.json({ success: true, id: invoiceId });
                    });
                });
            });
    });
});

router.put('/:id', requireLogin, (req, res) => {
    const {
        invoice_no, customer_id, currency, total, status
    } = req.body;

    if (!invoice_no || !customer_id) {
        return res.status(400).json({ error: 'Required fields missing' });
    }

    db.query('SELECT id FROM invoices WHERE invoice_no = ? AND id != ?', [invoice_no, req.params.id], (err, dup) => {
        if (err) return res.status(500).json({ error: err.message });
        if (dup.length > 0) return res.status(400).json({ error: `Invoice No "${invoice_no}" already used` });

        const sql = `
        UPDATE invoices SET
        invoice_no=?, customer_id=?, currency=?, total=?, status=?, updated_at=NOW()
        WHERE id=?
        `;

        db.query(sql, [invoice_no, customer_id, currency || 'USD', total || 0, status || 'draft', req.params.id],
            (err2) => {
                if (err2) return res.status(500).json({ error: err2.message });
                res.json({ success: true });
            });
    });
});

router.put('/:id/rate', requireLogin, (req, res) => {
    const { rate_id } = req.body;
    if (!rate_id) return res.status(400).json({ error: 'rate_id wajib diisi.' });
    db.query('UPDATE invoices SET rate_id=?, updated_at=NOW() WHERE id=?', [rate_id, req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

router.put('/:id/shipping-info', requireLogin, (req, res) => {
    const {
        lc_no, vessel, case_mark, from_location, to_location,
        delivery_note_no, ppn_percent
    } = req.body;

    const sql = `
    UPDATE invoices SET
    lc_no=?, vessel=?, case_mark=?, from_location=?, to_location=?,
    delivery_note_no=?, ppn_percent=?, updated_at=NOW()
    WHERE id=?`;

    db.query(sql, [
        lc_no || null, vessel || null, case_mark || null,
        from_location || null, to_location || null,
        delivery_note_no || null,
        (ppn_percent === '' || ppn_percent === undefined || ppn_percent === null) ? 11 : ppn_percent,
        req.params.id
        ], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
});

router.delete('/:id', requireLogin, (req, res) => {
    const invoiceId = req.params.id;

    db.query('SELECT id, contract_detail_id, qty_meter, qty_yard FROM invoice_details WHERE invoice_id = ?', [invoiceId], (errSel, items) => {
        if (errSel) {
            console.error('SELECT invoice_details (pre-delete) error:', errSel);
            return res.status(500).json({ success: false, error: errSel.message });
        }

        const releaseAll = (cb) => {
            if (!items || !items.length) return cb();
            let done = 0;
            items.forEach(it => {
                adjustContractDetailInvoiced(it.contract_detail_id, -(parseFloat(it.qty_meter)||0), -(parseFloat(it.qty_yard)||0), () => {
                    done++;
                    if (done === items.length) cb();
                });
            });
        };

        releaseAll(() => {
            db.query('DELETE FROM invoice_contracts WHERE invoice_id = ?', [invoiceId], (err) => {
                if (err) {
                    console.error('DELETE invoice_contracts error:', err);
                    return res.status(500).json({ success: false, error: 'Failed to delete invoice relationships: ' + err.message });
                }

                db.query('DELETE FROM invoice_details WHERE invoice_id = ?', [invoiceId], (errDet) => {
                    if (errDet) {
                        console.error('DELETE invoice_details error:', errDet);
                        return res.status(500).json({ success: false, error: 'Failed to delete invoice items: ' + errDet.message });
                    }

                    db.query('DELETE FROM invoices WHERE id = ?', [invoiceId], (err2, result) => {
                        if (err2) {
                            console.error('DELETE invoice error:', err2);
                            return res.status(500).json({ success: false, error: 'Failed to delete invoice: ' + err2.message });
                        }
                        if (result.affectedRows === 0) {
                            return res.status(404).json({ success: false, error: 'Invoice not found' });
                        }
                        console.log(`Invoice ${invoiceId} and its relationships deleted successfully`);
                        res.json({ success: true });
                    });
                });
            });
        });
    });
});

router.post('/:id/add-contract', requireLogin, (req, res) => {
    const { contract_id } = req.body;
    const invoiceId = req.params.id;

    if (!contract_id) return res.status(400).json({ error: 'contract_id required' });

    const sql = 'INSERT INTO invoice_contracts (invoice_id, contract_id, added_at) VALUES (?, ?, NOW())';
    db.query(sql, [invoiceId, contract_id], (err) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ error: 'Contract already in invoice' });
            }
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true });
    });
});

router.delete('/:id/remove-contract/:contractId', requireLogin, (req, res) => {
    const { id: invoiceId, contractId } = req.params;

    db.query('DELETE FROM invoice_contracts WHERE invoice_id = ? AND contract_id = ?', 
        [invoiceId, contractId], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Relationship not found' });
            }
            res.json({ success: true });
        });
});

router.put('/:id/total', requireLogin, (req, res) => {
    const { total } = req.body;
    db.query(
        'UPDATE invoices SET total=?, updated_at=NOW() WHERE id=?',
        [total || 0, req.params.id],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
        );
});

module.exports = router;
