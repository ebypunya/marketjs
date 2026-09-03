// =========================================================================
// API AI ASSISTANT — mounted at /api/ai
// Chat + generate report berbasis data live (Google Gemini function calling).
// Pakai REST API langsung (fetch), TANPA package @google/genai.
// =========================================================================
const express = require('express');
const router = express.Router();
const { GoogleGenAI } = require('@google/genai');
const { db } = require('../config/db');
const { requireLogin } = require('../middleware/auth');
const aiKeys = require('../config/ai-keys');


const dbp = db.promise();
function getAiClient() {
    return new GoogleGenAI({ apiKey: aiKeys.getCurrentApiKey() });
}

// ---------------------------------------------------------------------
// DEFINISI TOOLS (format Anthropic-style, akan dikonversi ke format Gemini)
// ---------------------------------------------------------------------
const TOOLS = [
    {
        name: 'get_contracts',
        description: 'Ambil daftar Sales Contract beserta customer, currency, total, status, dan progres invoice. Gunakan untuk pertanyaan soal contract, jadwal kirim, atau nilai penjualan.',
        input_schema: {
            type: 'object',
            properties: {
                status: { type: 'string', description: 'Filter status: draft, confirmed, done, cancelled.' },
                customer_name: { type: 'string', description: 'Filter nama customer (partial match).' },
                date_from: { type: 'string', description: 'Contract dibuat mulai tanggal (YYYY-MM-DD).' },
                date_to: { type: 'string', description: 'Contract dibuat sampai tanggal (YYYY-MM-DD).' },
                limit: { type: 'integer', description: 'Maks baris, default 100, maks 300.' }
            }
        }
    },
    {
        name: 'get_contract_items',
        description: 'Ambil detail item produk dari satu contract tertentu (berdasarkan contract_no).',
        input_schema: {
            type: 'object',
            properties: { contract_no: { type: 'string', description: 'Nomor contract, contoh C260012.' } },
            required: ['contract_no']
        }
    },
    {
        name: 'get_invoices',
        description: 'Ambil daftar Invoice beserta customer, currency, total, status. Gunakan untuk pertanyaan soal invoice, outstanding/belum lunas, atau penjualan terealisasi.',
        input_schema: {
            type: 'object',
            properties: {
                status: { type: 'string', description: 'Filter status: draft, finalized, paid, cancelled.' },
                customer_name: { type: 'string', description: 'Filter nama customer (partial match).' },
                date_from: { type: 'string', description: 'Invoice dibuat mulai tanggal (YYYY-MM-DD).' },
                date_to: { type: 'string', description: 'Invoice dibuat sampai tanggal (YYYY-MM-DD).' },
                limit: { type: 'integer', description: 'Maks baris, default 100, maks 300.' }
            }
        }
    },
    {
        name: 'get_invoice_items',
        description: 'Ambil detail produk dari satu invoice tertentu (berdasarkan invoice_no).',
        input_schema: {
            type: 'object',
            properties: { invoice_no: { type: 'string', description: 'Nomor invoice, contoh INV260045.' } },
            required: ['invoice_no']
        }
    },
    {
        name: 'get_customers',
        description: 'Ambil daftar customer.',
        input_schema: {
            type: 'object',
            properties: {
                search: { type: 'string', description: 'Cari nama customer (partial match).' },
                limit: { type: 'integer', description: 'Maks baris, default 100.' }
            }
        }
    },
    {
        name: 'get_products',
        description: 'Ambil daftar produk/fabric beserta harga (price_m, price_y).',
        input_schema: {
            type: 'object',
            properties: {
                search: { type: 'string', description: 'Cari nama/fabric_no produk (partial match).' },
                limit: { type: 'integer', description: 'Maks baris, default 100.' }
            }
        }
    },
    {
        name: 'get_rates',
        description: 'Ambil riwayat kurs USD/Rupiah (sell_rate, buy_rate). Gunakan ini untuk pertanyaan "kurs terakhir", "kurs hari ini", atau tren kurs.',
        input_schema: {
            type: 'object',
            properties: {
                date_from: { type: 'string', description: 'Mulai tanggal (YYYY-MM-DD).' },
                date_to: { type: 'string', description: 'Sampai tanggal (YYYY-MM-DD).' },
                limit: { type: 'integer', description: 'Maks baris, default 30.' }
            }
        }
    },
    {
        name: 'get_debit_notes',
        description: 'Ambil daftar Debit Note.',
        input_schema: {
            type: 'object',
            properties: {
                date_from: { type: 'string', description: 'Mulai tanggal (YYYY-MM-DD).' },
                date_to: { type: 'string', description: 'Sampai tanggal (YYYY-MM-DD).' },
                limit: { type: 'integer', description: 'Maks baris, default 100.' }
            }
        }
    },
    {
        name: 'get_surat_jalan',
        description: 'Ambil daftar Surat Jalan (pengiriman barang).',
        input_schema: {
            type: 'object',
            properties: {
                jenis: { type: 'string', description: 'Filter jenis: Export, Lokal, Sample.' },
                date_from: { type: 'string', description: 'Mulai tanggal (YYYY-MM-DD).' },
                date_to: { type: 'string', description: 'Sampai tanggal (YYYY-MM-DD).' },
                limit: { type: 'integer', description: 'Maks baris, default 100.' }
            }
        }
    },
    {
        name: 'get_summary_report',
        description: 'Ambil ringkasan agregat (total & jumlah, dikelompokkan per currency dan status) untuk contract, invoice, dan debit note dalam suatu periode. PALING COCOK dipakai sebagai basis data saat diminta membuat laporan/summary.',
        input_schema: {
            type: 'object',
            properties: {
                date_from: { type: 'string', description: 'Mulai tanggal (YYYY-MM-DD). Default awal bulan ini.' },
                date_to: { type: 'string', description: 'Sampai tanggal (YYYY-MM-DD). Default hari ini.' }
            }
        }
    },
];

// ---------------------------------------------------------------------
// KONVERSI SCHEMA ANTHROPIC-STYLE -> GEMINI STYLE
// Gemini butuh: field "parameters" (bukan "input_schema"), dan
// nilai "type" HARUS UPPERCASE ("OBJECT", "STRING", "INTEGER", dst).
// ---------------------------------------------------------------------
function toGeminiSchema(schema) {
    if (!schema || typeof schema !== 'object') return schema;
    const copy = { ...schema };
    if (copy.type) copy.type = String(copy.type).toUpperCase();
    if (copy.properties) {
        const newProps = {};
        for (const [k, v] of Object.entries(copy.properties)) newProps[k] = toGeminiSchema(v);
        copy.properties = newProps;
    }
    if (copy.items) copy.items = toGeminiSchema(copy.items);
    return copy;
}

const GEMINI_TOOLS = TOOLS.map(t => ({
    name: t.name,
    description: t.description,
    parameters: toGeminiSchema(t.input_schema),
}));

// ---------------------------------------------------------------------
// EKSEKUSI TOOL -> QUERY DATABASE
// ---------------------------------------------------------------------
function clampLimit(v, def, max) {
    const n = parseInt(v, 10);
    if (!n || n < 1) return def;
    return Math.min(n, max);
}

async function execTool(name, input) {
    input = input || {};
    switch (name) {
        case 'get_contracts': {
            const limit = clampLimit(input.limit, 100, 300);
            let where = [];
            let params = [];
            if (input.status) { where.push('c.status = ?'); params.push(input.status); }
            if (input.customer_name) { where.push('cu.name LIKE ?'); params.push(`%${input.customer_name}%`); }
            if (input.date_from) { where.push('c.created_at >= ?'); params.push(input.date_from); }
            if (input.date_to) { where.push('c.created_at <= ?'); params.push(input.date_to + ' 23:59:59'); }
            const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
            const sql = `
                SELECT c.contract_no, c.order_no, cu.name AS customer_name, c.currency, c.status,
                c.total, c.date_ship, c.created_at,
                IFNULL(cdagg.total_qty_meter,0) AS total_qty_meter,
                IFNULL(cdagg.total_qty_invoiced_meter,0) AS total_qty_invoiced_meter
                FROM contracts c
                LEFT JOIN customers cu ON cu.id = c.customer_id
                LEFT JOIN (SELECT contract_id, SUM(qty_meter) total_qty_meter, SUM(qty_invoiced_meter) total_qty_invoiced_meter
                FROM contract_details GROUP BY contract_id) cdagg ON cdagg.contract_id = c.id
                ${whereSql}
                ORDER BY c.created_at DESC LIMIT ?`;
            params.push(limit);
            const [rows] = await dbp.query(sql, params);
            return rows;
        }
        case 'get_contract_items': {
            const [c] = await dbp.query('SELECT id FROM contracts WHERE contract_no = ?', [input.contract_no]);
            if (!c.length) return { error: 'Contract tidak ditemukan' };
            const [rows] = await dbp.query(`
                SELECT p.nama, p.fabric_no, cd.color, cd.unit, cd.qty_meter, cd.qty_yard,
                cd.price_usd, cd.price_idr, cd.stotal_usd, cd.stotal_idr,
                cd.qty_invoiced_meter, cd.qty_invoiced_yard
                FROM contract_details cd LEFT JOIN products p ON p.id = cd.product_id
                WHERE cd.contract_id = ? ORDER BY cd.created_at ASC`, [c[0].id]);
            return rows;
        }
        case 'get_invoices': {
            const limit = clampLimit(input.limit, 100, 300);
            let where = [];
            let params = [];
            if (input.status) { where.push('i.status = ?'); params.push(input.status); }
            if (input.customer_name) { where.push('cu.name LIKE ?'); params.push(`%${input.customer_name}%`); }
            if (input.date_from) { where.push('i.created_at >= ?'); params.push(input.date_from); }
            if (input.date_to) { where.push('i.created_at <= ?'); params.push(input.date_to + ' 23:59:59'); }
            const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
            const sql = `
                SELECT i.invoice_no, cu.name AS customer_name, i.currency, i.total, i.status, i.created_at
                FROM invoices i LEFT JOIN customers cu ON cu.id = i.customer_id
                ${whereSql}
                ORDER BY i.created_at DESC LIMIT ?`;
            params.push(limit);
            const [rows] = await dbp.query(sql, params);
            return rows;
        }
        case 'get_invoice_items': {
            const [i] = await dbp.query('SELECT id FROM invoices WHERE invoice_no = ?', [input.invoice_no]);
            if (!i.length) return { error: 'Invoice tidak ditemukan' };
            const [rows] = await dbp.query(`
                SELECT p.nama, p.fabric_no, idt.color, idt.unit, idt.qty_meter, idt.qty_yard,
                idt.price_usd, idt.diskon, idt.stotal_usd, idt.delivery_status
                FROM invoice_details idt LEFT JOIN products p ON p.id = idt.product_id
                WHERE idt.invoice_id = ? ORDER BY idt.created_at ASC`, [i[0].id]);
            return rows;
        }
        case 'get_customers': {
            const limit = clampLimit(input.limit, 100, 300);
            let where = '', params = [];
            if (input.search) { where = 'WHERE name LIKE ?'; params.push(`%${input.search}%`); }
            params.push(limit);
            const [rows] = await dbp.query(`SELECT name, phone, email, address FROM customers ${where} ORDER BY created_at DESC LIMIT ?`, params);
            return rows;
        }
        case 'get_products': {
            const limit = clampLimit(input.limit, 100, 300);
            let where = '', params = [];
            if (input.search) { where = 'WHERE nama LIKE ? OR fabric_no LIKE ?'; params.push(`%${input.search}%`, `%${input.search}%`); }
            params.push(limit);
            const [rows] = await dbp.query(`SELECT nama, fabric_no, color, price_m, price_y FROM products ${where} ORDER BY updated_at DESC LIMIT ?`, params);
            return rows;
        }
        case 'get_rates': {
            const limit = clampLimit(input.limit, 30, 100);
            let where = [], params = [];
            if (input.date_from) { where.push('created_at >= ?'); params.push(input.date_from); }
            if (input.date_to) { where.push('created_at <= ?'); params.push(input.date_to + ' 23:59:59'); }
            const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
            params.push(limit);
            const [rows] = await dbp.query(`SELECT sell_rate, buy_rate, created_at FROM rates ${whereSql} ORDER BY created_at DESC LIMIT ?`, params);
            return rows;
        }
        case 'get_debit_notes': {
            const limit = clampLimit(input.limit, 100, 300);
            let where = [], params = [];
            if (input.date_from) { where.push('date >= ?'); params.push(input.date_from); }
            if (input.date_to) { where.push('date <= ?'); params.push(input.date_to); }
            const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
            params.push(limit);
            const [rows] = await dbp.query(`SELECT reff_no, messrs, currency, total_amount, total_amount_idr, date FROM debitnote ${whereSql} ORDER BY date DESC LIMIT ?`, params);
            return rows;
        }
        case 'get_surat_jalan': {
            const limit = clampLimit(input.limit, 100, 300);
            let where = [], params = [];
            if (input.jenis) { where.push('jenis = ?'); params.push(input.jenis); }
            if (input.date_from) { where.push('tanggal >= ?'); params.push(input.date_from); }
            if (input.date_to) { where.push('tanggal <= ?'); params.push(input.date_to); }
            const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
            params.push(limit);
            const [rows] = await dbp.query(`SELECT no_suratjalan, jenis, buyer, tujuan, contract_no, tanggal FROM suratjalan ${whereSql} ORDER BY tanggal DESC LIMIT ?`, params);
            return rows;
        }
        case 'get_summary_report': {
            const now = new Date();
            const defFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
            const defTo = now.toISOString().slice(0, 10);
            const from = input.date_from || defFrom;
            const to = (input.date_to || defTo) + ' 23:59:59';

            const [contractsByCur] = await dbp.query(
                `SELECT currency, COUNT(*) cnt, SUM(total) total FROM contracts WHERE created_at BETWEEN ? AND ? GROUP BY currency`, [from, to]);
            const [contractsByStatus] = await dbp.query(
                `SELECT status, COUNT(*) cnt FROM contracts WHERE created_at BETWEEN ? AND ? GROUP BY status`, [from, to]);
            const [invoicesByCur] = await dbp.query(
                `SELECT currency, COUNT(*) cnt, SUM(total) total FROM invoices WHERE created_at BETWEEN ? AND ? GROUP BY currency`, [from, to]);
            const [invoicesByStatus] = await dbp.query(
                `SELECT status, COUNT(*) cnt FROM invoices WHERE created_at BETWEEN ? AND ? GROUP BY status`, [from, to]);
            const [outstanding] = await dbp.query(
                `SELECT currency, COUNT(*) cnt, SUM(total) total FROM invoices WHERE status NOT IN ('paid','cancelled') GROUP BY currency`);
            const [debitNotes] = await dbp.query(
                `SELECT currency, COUNT(*) cnt, SUM(total_amount) total FROM debitnote WHERE date BETWEEN ? AND ? GROUP BY currency`, [from, to.slice(0, 10)]);
            const [latestRate] = await dbp.query(`SELECT sell_rate, buy_rate, created_at FROM rates ORDER BY created_at DESC LIMIT 1`);

            return {
                period: { from, to: to.slice(0, 10) },
                contracts: { by_currency: contractsByCur, by_status: contractsByStatus },
                invoices: { by_currency: invoicesByCur, by_status: invoicesByStatus },
                outstanding_invoices_all_time: outstanding,
                debit_notes: debitNotes,
                latest_rate: latestRate[0] || null,
            };
        }
        default:
            return { error: `Tool tidak dikenal: ${name}` };
    }
}

// ---------------------------------------------------------------------
// SYSTEM PROMPT
// ---------------------------------------------------------------------
const SYSTEM_PROMPT = `Kamu adalah asisten AI internal untuk PT Urase Prima, perusahaan tekstil/fabric (ekspor & lokal) yang punya sistem bernama MarketJS mencakup: Sales Contract, Invoice, Invoice Sample, Debit Note, Surat Jalan, Kurs USD/Rupiah, Customer, dan Product.

ATURAN PENTING:
- Selalu jawab dalam Bahasa Indonesia, ringkas dan jelas.
- SELALU panggil tool yang relevan untuk mengambil data sebelum menjawab pertanyaan yang butuh angka/data spesifik (termasuk pertanyaan sederhana seperti "kurs terakhir berapa" -> panggil get_rates). JANGAN pernah mengarang angka.
- Untuk pertanyaan ringkasan/laporan periode tertentu, mulai dengan tool get_summary_report, lalu tool lain jika perlu detail lebih lanjut.
- Format angka: USD pakai "$ 1,234.56", IDR pakai "Rp 15.500" (format Indonesia, tanpa desimal).
- Saat diminta "buat laporan", susun dengan heading singkat dan poin-poin (pakai "- " di awal baris untuk bullet), sebutkan periode yang dipakai.
- Jika data yang diminta tidak ditemukan/kosong, katakan dengan jujur, jangan menebak.
- Kamu hanya bisa MEMBACA data (tidak bisa membuat/mengubah/menghapus data).`;

// ---------------------------------------------------------------------
// PANGGIL GEMINI API (REST langsung, tanpa SDK)
// ---------------------------------------------------------------------
async function callGemini(contents) {
    const maxAttempts = aiKeys.getTotalKeys();
    let attempts = 0;

    while (attempts < maxAttempts) {
        attempts++;
        const currentKey = aiKeys.getCurrentApiKey();
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${aiConfig.model}:generateContent?key=${currentKey}`;

        const payload = {
            system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: contents,
            tools: [{ function_declarations: TOOLS }],
        };

        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const data = await res.json();

        // Cek jika terkena rate limit (429) atau kuota habis
        const isRateLimit = res.status === 429 || (data.error && (
            data.error.code === 429 || 
            String(data.error.message).toLowerCase().includes('quota') || 
            String(data.error.message).toLowerCase().includes('resource_exhausted')
        ));

        if (isRateLimit && attempts < maxAttempts) {
            console.warn(`[AI Warning] API Key index aktif terkena limit. Mencoba rotasi key...`);
            aiKeys.rotateApiKey();
            continue; // Ulangi loop dengan key baru
        }

        if (!res.ok) {
            throw new Error(data.error?.message || 'Gemini API error');
        }

        return data; // Berhasil, kembalikan response
    }

    throw new Error('Semua kuota 10 API Key Gemini sedang habis (rate limit terlampaui).');
}

// ---------------------------------------------------------------------
// ROUTE: POST /api/ai/chat
// body: { message: string, history: [{role:'user'|'assistant', content:string}] }
// ---------------------------------------------------------------------
router.post('/chat', requireLogin, async (req, res) => {
    const { message, history } = req.body;
    if (!message || !message.trim()) {
        return res.status(400).json({ error: 'Pesan tidak boleh kosong.' });
    }

    // Gemini pakai role "user" / "model" (bukan "assistant")
    const safeHistory = Array.isArray(history) ? history.slice(-30) : [];
    let contents = safeHistory
        .filter(h => h && h.content)
        .map(h => ({
            role: h.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: String(h.content) }],
        }));
    contents.push({ role: 'user', parts: [{ text: message }] });

    try {
        let iterations = 0;
        let finalText = '';

        while (iterations < 6) {
            iterations++;
            const data = await callGemini(contents);

            const candidate = data.candidates && data.candidates[0];
            if (!candidate || !candidate.content) {
                // Bisa kena block safety filter dsb.
                const reason = candidate?.finishReason || 'unknown';
                throw new Error(`Tidak ada respons dari Gemini (finishReason: ${reason}).`);
            }

            const parts = candidate.content.parts || [];
            const functionCalls = parts.filter(p => p.functionCall);

            if (!functionCalls.length) {
                finalText = parts.filter(p => p.text).map(p => p.text).join('\n');
                break;
            }

            // simpan giliran model (termasuk functionCall parts) ke history percakapan
            contents.push({ role: 'model', parts });

            // eksekusi semua function call, kumpulkan functionResponse parts jadi satu giliran "user"
            const responseParts = [];
            for (const fc of functionCalls) {
                let result;
                try {
                    result = await execTool(fc.functionCall.name, fc.functionCall.args);
                } catch (e) {
                    result = { error: e.message };
                }
                responseParts.push({
                    functionResponse: {
                        name: fc.functionCall.name,
                        response: { result },
                    },
                });
            }
            contents.push({ role: 'user', parts: responseParts });
        }

        if (!finalText) {
            finalText = 'Maaf, terjadi kendala saat memproses permintaan (terlalu banyak langkah). Coba pertanyaan lebih spesifik.';
        }
        res.json({ reply: finalText });
    } catch (err) {
        console.error('AI chat error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;