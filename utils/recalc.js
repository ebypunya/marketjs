// =========================================================================
// HELPER: recalc total contract / invoice / invoice sample / debit note
// dan adjust qty_invoiced pada contract_details.
// Dipakai bersama oleh beberapa route (contracts, contract-details,
// invoices, invoice-details, invoice-samples, debitnote-details).
// =========================================================================
const { db } = require('../config/db');

function recalcContractTotal(contractId, callback) {
    const sql = `
    UPDATE contracts c
    SET c.total = (
    SELECT COALESCE(SUM(CASE WHEN c.currency = 'IDR' THEN cd.stotal_idr ELSE cd.stotal_usd END), 0)
    FROM contract_details cd
    WHERE cd.contract_id = c.id
    ), c.updated_at = NOW()
    WHERE c.id = ?`;
    db.query(sql, [contractId], callback || (() => {}));
}

function adjustContractDetailInvoiced(contractDetailId, deltaMeter, deltaYard, callback) {
    if (!contractDetailId) return (callback || (() => {}))();
    const sql = `
    UPDATE contract_details
    SET qty_invoiced_meter = GREATEST(0, qty_invoiced_meter + ?),
    qty_invoiced_yard  = GREATEST(0, qty_invoiced_yard + ?)
    WHERE id = ?`;
    db.query(sql, [deltaMeter || 0, deltaYard || 0, contractDetailId], callback || (() => {}));
}

function recalcInvoiceTotal(invoiceId, callback) {
    const sql = `
    UPDATE invoices i
    SET i.total = (
    SELECT COALESCE(SUM(idt.stotal_usd), 0)
    FROM invoice_details idt
    WHERE idt.invoice_id = i.id
    ), i.updated_at = NOW()
    WHERE i.id = ?`;
    db.query(sql, [invoiceId], callback || (() => {}));
}

function recalcInvoiceSampleTotal(invoiceSampleId, callback) {
    const sql = `
    UPDATE invoice_samples isamp
    SET isamp.total = (
    SELECT COALESCE(SUM(isd.stotal), 0)
    FROM invoice_sample_details isd
    WHERE isd.invoice_sample_id = isamp.id
    ), isamp.updated_at = NOW()
    WHERE isamp.id = ?`;
    db.query(sql, [invoiceSampleId], callback || (() => {}));
}

function recalcDebitNoteTotal(debitNoteId, callback) {
    const sql = `
    UPDATE debitnote d
    SET d.total_amount = (
        SELECT COALESCE(SUM(dd.subtotal), 0)
        FROM debitnote_detail dd
        WHERE dd.id_debitnote = d.id_debitnote
    ),
    d.total_amount_idr = (
        SELECT COALESCE(SUM(dd.amount_idr), 0)
        FROM debitnote_detail dd
        WHERE dd.id_debitnote = d.id_debitnote
    ),
    d.updated_at = NOW()
    WHERE d.id_debitnote = ?`;
    db.query(sql, [debitNoteId], callback || (() => {}));
}

module.exports = {
    recalcContractTotal,
    adjustContractDetailInvoiced,
    recalcInvoiceTotal,
    recalcInvoiceSampleTotal,
    recalcDebitNoteTotal
};