const { requireValidLicenseOrExit } = require('./config/license-check');
requireValidLicenseOrExit();

const { ensureYearlyDatabase } = require('./config/yearly-db');

async function main() {
    // Pastikan database untuk tahun berjalan sudah ada SEBELUM apapun lain
    // (routes, pool koneksi, dll) di-require.
    await ensureYearlyDatabase();

    const express = require('express');
    const session = require('express-session');
    const path = require('path');

    const app = express();
    const port = 80;

    // =========================================================================
    // GLOBAL MIDDLEWARE
    // =========================================================================
    app.use(express.static(path.join(__dirname, 'public')));
    app.use('/assets', express.static(path.join(__dirname, 'assets')));

    app.use(express.urlencoded({ extended: true }));
    app.use(express.json());

    app.use(session({
        secret: 'dev477-secret-key-ganti-ini',
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: false,
            maxAge: 1000 * 60 * 60 * 8
        }
    }));

    // =========================================================================
    // ROUTES
    // =========================================================================
    app.use('/', require('./routes/pages'));
    app.use('/', require('./routes/auth')); // login/register/logout + /api/me + /api/users

    app.use('/api/gudang-sparepart', require('./routes/gudang'));
    app.use('/api/customers', require('./routes/customers'));
    app.use('/api/products', require('./routes/products'));
    app.use('/api/rates', require('./routes/rates'));

    app.use('/api/contracts', require('./routes/contracts'));
    app.use('/api/contract-details', require('./routes/contractDetails'));
    app.use('/api/produksi', require('./routes/produksi'));
    app.use('/api/inspect', require('./routes/inspect'));

    app.use('/api/invoices', require('./routes/invoices'));
    app.use('/api/invoice-details', require('./routes/invoiceDetails'));

    app.use('/api/invoice-samples', require('./routes/invoiceSamples'));
    app.use('/api/invoice-sample-details', require('./routes/invoiceSampleDetails'));

    // =========================================================================
    // SERVER INITIALIZATION & LISTENER
    // =========================================================================
    app.listen(port, () => {
        console.log('\x1b[36m%s\x1b[0m', '========================================');
        console.log('\x1b[35m%s\x1b[0m', '  MARKETJS - ENTERPRISE CORE SYSTEM');
        console.log('\x1b[35m%s\x1b[0m', '  Developed by DEV477 (C) 2026');
        console.log('\x1b[36m%s\x1b[0m', '========================================');
        console.log(`Server Status : Running`);
        console.log(`Address       : http://localhost`);
        console.log(`Database      : MySQL (Connected)`);
        console.log('\x1b[36m%s\x1b[0m', '========================================');
    });
}

main().catch((err) => {
    console.error('\x1b[31m%s\x1b[0m', 'Gagal menjalankan server:', err.message);
    process.exit(1);
});