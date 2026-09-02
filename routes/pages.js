// =========================================================================
// RUTE HALAMAN / WEB VIEW (serving HTML files)
// =========================================================================
const express = require('express');
const path = require('path');
const router = express.Router();
const { requireLogin, requireSuperAdmin } = require('../middleware/auth');

const pub = (...p) => path.join(__dirname, '..', 'public', ...p);

router.get('/', (req, res) => {
    if (req.session.user) return res.redirect('/dashboard');
    res.sendFile(pub('login.html'));
});

router.get('/registrasi', (req, res) => res.sendFile(pub('registrasi.html')));
router.get('/lupa-password', (req, res) => res.sendFile(pub('lupa-password.html')));

router.get('/dashboard', requireLogin, (req, res) => res.sendFile(pub('dashboard.html')));

router.get('/admin/manage-users', requireSuperAdmin, (req, res) =>
    res.sendFile(pub('admin', 'manage-users.html')));

// Master data - customers
router.get('/master-data/customers', requireLogin, (req, res) =>
    res.sendFile(pub('master-data', 'customers', 'index.html')));
router.get('/master-data/customers/tambah', requireLogin, (req, res) =>
    res.sendFile(pub('master-data', 'customers', 'tambah.html')));
router.get('/master-data/customers/edit', requireLogin, (req, res) =>
    res.sendFile(pub('master-data', 'customers', 'edit.html')));

// Master data - products
router.get('/master-data/products', requireLogin, (req, res) =>
    res.sendFile(pub('master-data', 'products', 'index.html')));
router.get('/master-data/products/tambah', requireLogin, (req, res) =>
    res.sendFile(pub('master-data', 'products', 'tambah.html')));
router.get('/master-data/products/edit', requireLogin, (req, res) =>
    res.sendFile(pub('master-data', 'products', 'edit.html')));

// Master data - kurs
router.get('/master-data/kurs', requireLogin, (req, res) =>
    res.sendFile(pub('master-data', 'kurs', 'index.html')));
router.get('/master-data/kurs/tambah', requireLogin, (req, res) =>
    res.sendFile(pub('master-data', 'kurs', 'tambah.html')));
router.get('/master-data/kurs/edit', requireLogin, (req, res) =>
    res.sendFile(pub('master-data', 'kurs', 'edit.html')));

// Sales - sales-contract
router.get('/sales/sales-contract', requireLogin, (req, res) =>
    res.sendFile(pub('sales', 'sales-contract.html')));
router.get('/sales/sales-contract/tambah', requireLogin, (req, res) =>
    res.sendFile(pub('sales', 'sales-contract', 'tambah.html')));
router.get('/sales/sales-contract/edit', requireLogin, (req, res) =>
    res.sendFile(pub('sales', 'sales-contract', 'edit.html')));
router.get('/sales/sales-contract/detail', requireLogin, (req, res) =>
    res.sendFile(pub('sales', 'sales-contract', 'detail.html')));
router.get('/sales/sales-contract/print', requireLogin, (req, res) =>
    res.sendFile(pub('sales', 'sales-contract', 'print.html')));
router.get('/sales/sales-contract/produksi', requireLogin, (req, res) =>
    res.sendFile(pub('sales', 'sales-contract', 'produksi.html')));

// Sales - invoices
router.get('/sales/invoices', requireLogin, (req, res) =>
    res.sendFile(pub('sales', 'invoices', 'index.html')));
router.get('/sales/invoices/tambah', requireLogin, (req, res) =>
    res.sendFile(pub('sales', 'invoices', 'tambah.html')));
router.get('/sales/invoices/edit', requireLogin, (req, res) =>
    res.sendFile(pub('sales', 'invoices', 'edit.html')));
router.get('/sales/invoices/detail', requireLogin, (req, res) =>
    res.sendFile(pub('sales', 'invoices', 'detail.html')));
router.get('/sales/invoices/print', requireLogin, (req, res) =>
    res.sendFile(pub('sales', 'invoices', 'print.html')));

// surat jalan
router.get('/inventory/surat-jalan', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/inventory/surat-jalan/index.html'));
});

router.get('/inventory/surat-jalan/tambah', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/inventory/surat-jalan/tambah.html'));
});

router.get('/inventory/surat-jalan/edit', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/inventory/surat-jalan/edit.html'));
});

router.get('/inventory/surat-jalan/detail', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/inventory/surat-jalan/detail.html'));
});

// Finance - invoice sample
router.get('/finance/invoice-sample', requireLogin, (req, res) =>
    res.sendFile(pub('finance', 'invoice-sample', 'index.html')));
router.get('/finance/invoice-sample/tambah', requireLogin, (req, res) =>
    res.sendFile(pub('finance', 'invoice-sample', 'tambah.html')));
router.get('/finance/invoice-sample/edit', requireLogin, (req, res) =>
    res.sendFile(pub('finance', 'invoice-sample', 'edit.html')));
router.get('/finance/invoice-sample/detail', requireLogin, (req, res) =>
    res.sendFile(pub('finance', 'invoice-sample', 'detail.html')));
router.get('/finance/invoice-sample/print', requireLogin, (req, res) =>
    res.sendFile(pub('finance', 'invoice-sample', 'print.html')));

module.exports = router;
