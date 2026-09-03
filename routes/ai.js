// =========================================================================
// API AI ASSISTANT — mounted at /api/ai
// Chat + generate report + input data live berbasis Google Gemini SDK.
// =========================================================================
const express = require('express');
const router = express.Router();
const { GoogleGenAI } = require('@google/genai');
const { db } = require('../config/db');
const { requireLogin } = require('../middleware/auth');
const aiConfig = require('../config/ai-config');

const dbp = db.promise();
const ai = new GoogleGenAI({ apiKey: aiConfig.apiKey });

// ---------------------------------------------------------------------
// DEFINISI TOOLS (Mendukung fungsi Read & Write)
// ---------------------------------------------------------------------
const TOOLS = [
    {
        name: 'get_contracts',
        description: 'Ambil daftar Sales Contract beserta customer, currency, total, status, dan progres invoice.',
        parameters: {
            type: 'OBJECT',
            properties: {
                status: { type: 'STRING', description: 'Filter status: draft, confirmed, done, cancelled.' },
                customer_name: { type: 'STRING', description: 'Filter nama customer (partial match).' },
                date_from: { type: 'STRING', description: 'Contract dibuat mulai tanggal (YYYY-MM-DD).' },
                date_to: { type: 'STRING', description: 'Contract dibuat sampai tanggal (YYYY-MM-DD).' },
                limit: { type: 'INTEGER', description: 'Maks baris, default 100.' }
            }
        }
    },
    {
        name: 'get_contract_items',
        description: 'Ambil detail item produk dari satu contract tertentu berdasarkan contract_no.',
        parameters: {
            type: 'OBJECT',
            properties: { contract_no: { type: 'STRING', description: 'Nomor contract, contoh C260012.' } },
            required: ['contract_no']
        }
    },
    {
        name: 'get_invoices',
        description: 'Ambil daftar Invoice beserta customer, currency, total, status.',
        parameters: {
            type: 'OBJECT',
            properties: {
                status: { type: 'STRING', description: 'Filter status: draft, finalized, paid, cancelled.' },
                customer_name: { type: 'STRING', description: 'Filter nama customer (partial match).' },
                date_from: { type: 'STRING', description: 'Invoice dibuat mulai tanggal (YYYY-MM-DD).' },
                date_to: { type: 'STRING', description: 'Invoice dibuat sampai tanggal (YYYY-MM-DD).' },
                limit: { type: 'INTEGER', description: 'Maks baris, default 100.' }
            }
        }
    },
    {
        name: 'get_rates',
        description: 'Ambil riwayat kurs USD/Rupiah (sell_rate, buy_rate).',
        parameters: {
            type: 'OBJECT',
            properties: {
                date_from: { type: 'STRING', description: 'Mulai tanggal (YYYY-MM-DD).' },
                date_to: { type: 'STRING', description: 'Sampai tanggal (YYYY-MM-DD).' },
                limit: { type: 'INTEGER', description: 'Maks baris, default 30.' }
            }
        }
    },
    {
        name: 'input_rate',
        description: 'INPUT / SIMPAN kurs USD/Rupiah baru ke database. Gunakan jika user menyuruh input/catat kurs.',
        parameters: {
            type: 'OBJECT',
            properties: {
                sell_rate: { type: 'NUMBER', description: 'Nilai kurs jual (Sell Rate).' },
                buy_rate: { type: 'NUMBER', description: 'Nilai kurs beli (Buy Rate).' },
                date: { type: 'STRING', description: 'Tanggal kurs format YYYY-MM-DD (Opsional, default hari ini).' }
            },
            required: ['sell_rate', 'buy_rate']
        }
    },
    {
        name: 'get_summary_report',
        description: 'Ambil ringkasan agregat contract, invoice, debit note dalam suatu periode.',
        parameters: {
            type: 'OBJECT',
            properties: {
                date_from: { type: 'STRING', description: 'Mulai tanggal (YYYY-MM-DD).' },
                date_to: { type: 'STRING', description: 'Sampai tanggal (YYYY-MM-DD).' }
            }
        }
    }
];

// ---------------------------------------------------------------------
// EKSEKUSI TOOL -> QUERY / MUTASI DATABASE
// ---------------------------------------------------------------------
function clampLimit(v, def, max) {
    const n = parseInt(v, 10);
    if (!n || n < 1) return def;
    return Math.min(n, max);
}

async function execTool(name, input) {
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
                c.total, c.date_ship, c.created_at
                FROM contracts c
                LEFT JOIN customers cu ON cu.id = c.customer_id
                ${whereSql}
                ORDER BY c.created_at DESC LIMIT ?`;
            params.push(limit);
            const [rows] = await dbp.query(sql, params);
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
        case 'input_rate': {
            const sell = parseFloat(input.sell_rate);
            const buy = parseFloat(input.buy_rate);
            const rateDate = input.date ? `${input.date} ${new Date().toTimeString().split(' ')[0]}` : new Date();
            
            if (isNaN(sell) || isNaN(buy)) {
                return { success: false, error: 'Nilai sell_rate dan buy_rate harus berupa angka.' };
            }

            const [result] = await dbp.query(
                `INSERT INTO rates (sell_rate, buy_rate, created_at) VALUES (?, ?, ?)`,
                [sell, buy, rateDate]
            );
            return { success: true, message: 'Kurs berhasil disimpan ke database.', id: result.insertId };
        }
        case 'get_summary_report': {
            const now = new Date();
            const defFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
            const defTo = now.toISOString().slice(0, 10);
            const from = input.date_from || defFrom;
            const to = (input.date_to || defTo) + ' 23:59:59';

            const [contractsByCur] = await dbp.query(
                `SELECT currency, COUNT(*) cnt, SUM(total) total FROM contracts WHERE created_at BETWEEN ? AND ? GROUP BY currency`, [from, to]);
            const [invoicesByCur] = await dbp.query(
                `SELECT currency, COUNT(*) cnt, SUM(total) total FROM invoices WHERE created_at BETWEEN ? AND ? GROUP BY currency`, [from, to]);
            const [latestRate] = await dbp.query(`SELECT sell_rate, buy_rate, created_at FROM rates ORDER BY created_at DESC LIMIT 1`);

            return {
                period: { from, to: to.slice(0, 10) },
                contracts: { by_currency: contractsByCur },
                invoices: { by_currency: invoicesByCur },
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
const SYSTEM_PROMPT = `Kamu adalah asisten AI internal untuk PT Urase Prima (MarketJS). 
ATURAN PENTING:
- Selalu jawab dalam Bahasa Indonesia, ringkas, dan jelas.
- Gunakan tool get/baca untuk mengambil data, dan gunakan tool input_rate jika user ingin memasukkan/mencatat kurs baru.
- Format angka: USD pakai "$ 1,234.56", IDR pakai "Rp 15.500".
- Jika data kosong atau gagal, katakan dengan jujur.`;

// ---------------------------------------------------------------------
// ROUTE: POST /api/ai/chat (Google Gemini Implementation)
// ---------------------------------------------------------------------
router.post('/chat', requireLogin, async (req, res) => {
    const { message, history } = req.body;
    if (!message || !message.trim()) {
        return res.status(400).json({ error: 'Pesan tidak boleh kosong.' });
    }
    if (!aiConfig.apiKey || aiConfig.apiKey === 'PASTE_GEMINI_API_KEY_DI_SINI') {
        return res.status(500).json({ error: 'GEMINI_API_KEY belum dikonfigurasi di config/ai-config.js.' });
    }

    try {
        // Pastikan format history murni mengikuti struktur objek { role, parts: [{ text }] }
        let formattedHistory = [];
        if (Array.isArray(history)) {
            history.slice(-30).forEach(h => {
                const geminiRole = h.role === 'assistant' || h.role === 'model' ? 'model' : 'user';
                // Hindari duplikasi atau konten kosong
                if (h.content && typeof h.content === 'string') {
                    formattedHistory.push({
                        role: geminiRole,
                        parts: [{ text: h.content }]
                    });
                }
            });
        }

        // Inisialisasi chat dengan history yang sudah dibersihkan
        const chat = ai.chats.create({
            model: aiConfig.model,
            config: {
                systemInstruction: SYSTEM_PROMPT,
                tools: [{ functionDeclarations: TOOLS }],
                maxOutputTokens: aiConfig.maxTokens,
            },
            history: formattedHistory
        });

        // Kirim pesan terbaru
        let response = await chat.sendMessage({ message: message });

        let iterations = 0;
        while (response.functionCalls && response.functionCalls.length > 0 && iterations < 5) {
            iterations++;
            const functionCall = response.functionCalls[0];
            const { name, args } = functionCall;

            let toolResult;
            try {
                toolResult = await execTool(name, args);
            } catch (e) {
                toolResult = { error: e.message };
            }

            response = await chat.sendMessage([
                {
                    functionResponse: {
                        name: name,
                        response: { result: toolResult }
                    }
                }
            ]);
        }

        const finalText = response.text || 'Maaf, saya tidak dapat memproses permintaan Anda.';
        res.json({ reply: finalText });

    } catch (err) {
        console.error('AI chat error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;