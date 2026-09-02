const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { validHash } = require('./license-hash');

const KEY_FILE_PATH = path.join(__dirname, '..', 'license.key');

function hashOf(str) {
    return crypto.createHash('sha256').update(str.trim()).digest('hex');
}

function checkLicense() {
    if (!fs.existsSync(KEY_FILE_PATH)) {
        return { ok: false, reason: `File key tidak ditemukan di: ${KEY_FILE_PATH}` };
    }

    let rawKey;
    try {
        rawKey = fs.readFileSync(KEY_FILE_PATH, 'utf8').trim();
    } catch (err) {
        return { ok: false, reason: `Gagal membaca file key: ${err.message}` };
    }

    if (!rawKey) {
        return { ok: false, reason: 'File key kosong.' };
    }

    if (!validHash || validHash === 'GANTI_DENGAN_HASH_DARI_SCRIPT_GENERATE_KEY') {
        return { ok: false, reason: 'Hash valid belum dikonfigurasi di config/license-hash.js.' };
    }

    const inputHash = hashOf(rawKey);

    const a = Buffer.from(inputHash, 'hex');
    const b = Buffer.from(validHash, 'hex');
    const match = a.length === b.length && crypto.timingSafeEqual(a, b);

    if (!match) {
        return { ok: false, reason: 'Key tidak valid / tidak cocok.' };
    }

    return { ok: true };
}

function requireValidLicenseOrExit() {
    const result = checkLicense();

    if (!result.ok) {
        console.error('\x1b[31m%s\x1b[0m', '========================================');
        console.error('\x1b[31m%s\x1b[0m', '  LICENSE CHECK GAGAL — SERVER TIDAK BISA DIJALANKAN');
        console.error('\x1b[31m%s\x1b[0m', '========================================');
        console.error('Alasan :', result.reason);
        console.error('Pastikan file "license.key" ada di root project dan berisi key yang benar.');
        console.error('\x1b[31m%s\x1b[0m', '========================================');
        process.exit(1);
    }

    console.log('\x1b[32m%s\x1b[0m', '[license] Key valid — server diizinkan berjalan.');
}

module.exports = { checkLicense, requireValidLicenseOrExit };