function getPageMeta() {
    const path = window.location.pathname;
    const map = {
        '/dashboard':                       { title: 'Console Dashboard',   sub: 'Summary of your business activities today.' },
        '/master-data/customers':           { title: 'Manage Customer',     sub: 'Data seluruh customer terdaftar.' },
        '/master-data/customers/tambah':    { title: 'Tambah Customer',     sub: 'Tambah data customer baru.' },
        '/master-data/customers/edit':      { title: 'Edit Customer',       sub: 'Ubah data customer.' },
        '/admin/manage-users':              { title: 'Manage Users',        sub: 'Kelola akun pengguna sistem.' },
        '/master-data/products':           { title: 'Manage Product',      sub: 'Data seluruh product terdaftar.' },
        '/master-data/products/tambah':    { title: 'Tambah Product',      sub: 'Tambah data product baru.' },
        '/master-data/products/edit':      { title: 'Edit Product',        sub: 'Ubah data product.' },
        '/master-data/kurs':               { title: 'Kurs',                sub: 'Manajemen kurs USD/Rupiah.' },
        '/master-data/kurs/tambah':        { title: 'Tambah Kurs',         sub: 'Input kurs baru.' },
        '/master-data/kurs/edit':          { title: 'Edit Kurs',           sub: 'Ubah data kurs.' },
        '/sales/sales-contract': { title: 'Sales Contract', sub: 'Daftar seluruh sales contract.' },
    };
    return map[path] || { title: 'MarketJS', sub: '' };
}

function renderLayout() {
    const meta = getPageMeta();

    const sidebarHTML = `
    <aside class="sidebar">
    <div class="logo-brand">
    <div style="width:32px;height:32px;background:var(--primary);border-radius:8px;flex-shrink:0"></div>
    DeV#477
    </div>
    <nav class="nav-group">

    <a href="/dashboard" class="nav-link"><i class="ti ti-layout-dashboard"></i> Dashboard</a>

    <div class="nav-divider"></div>

    <div class="nav-parent" onclick="toggleMenu(this)">
    <i class="ti ti-folder-open"></i><span>Master Data</span>
    <i class="ti ti-chevron-down arrow"></i>
    </div>
    <div class="nav-submenu">
    <a href="/master-data/customers" class="nav-sub-link">Manage Customer</a>
    <a href="/master-data/products" class="nav-sub-link">Manage Product</a>
    <a href="/master-data/kurs" class="nav-sub-link">Kurs</a>
    </div>

    <div class="nav-parent" onclick="toggleMenu(this)">
    <i class="ti ti-shopping-cart"></i><span>Sales & Orders</span>
    <i class="ti ti-chevron-down arrow"></i>
    </div>
    <div class="nav-submenu">
    <a href="/sales/order-process" class="nav-sub-link">Order Process</a>
    <a href="/sales/sales-contract" class="nav-sub-link">Sales Contract</a>
    </div>

    <div class="nav-parent" onclick="toggleMenu(this)">
    <i class="ti ti-package"></i><span>Inventory & Logistics</span>
    <i class="ti ti-chevron-down arrow"></i>
    </div>
    <div class="nav-submenu">
    <a href="/inventory/stocklot" class="nav-sub-link">Product Stocklot</a>
    <a href="/inventory/surat-jalan" class="nav-sub-link">Surat Jalan</a>
    <a href="/inventory/dpl" class="nav-sub-link">DPL (Delivery Packing List)</a>
    </div>

    <div class="nav-parent" onclick="toggleMenu(this)">
    <i class="ti ti-credit-card"></i><span>Finance & Billing</span>
    <i class="ti ti-chevron-down arrow"></i>
    </div>
    <div class="nav-submenu">
    <a href="/finance/invoice" class="nav-sub-link">Invoice</a>
    <a href="/finance/invoice-sample" class="nav-sub-link">Invoice Sample</a>
    <a href="/finance/debit-note" class="nav-sub-link">Debit Note</a>
    </div>

    <div class="nav-parent" onclick="toggleMenu(this)">
    <i class="ti ti-chart-bar"></i><span>Reports</span>
    <i class="ti ti-chevron-down arrow"></i>
    </div>
    <div class="nav-submenu">
    <a href="/reports/report" class="nav-sub-link">Report</a>
    </div>

    <div id="admin-panel-section" style="display:none">
    <div class="nav-divider"></div>
    <div class="nav-parent nav-admin" onclick="toggleMenu(this)">
    <i class="ti ti-shield-lock"></i><span>Admin Panel</span>
    <span class="badge-admin">SUPERADMIN</span>
    <i class="ti ti-chevron-down arrow"></i>
    </div>
    <div class="nav-submenu">
    <a href="/admin/manage-users" class="nav-sub-link nav-sub-admin">
    <i class="ti ti-users"></i> Manage Users
    </a>
    </div>
    </div>
    <a href="/logout" class="btn-logout-modern">Keluar</a>
    </nav>
    
    </aside>`;

    const headerHTML = `
    <div class="main-wrapper">
    <main class="main-content">
    <header class="header-flex">
    <div>
    <h1>${meta.title}</h1>
    <p style="color:var(--text-muted);font-size:0.9rem;margin-top:5px">${meta.sub}</p>
    </div>
    <div style="display:flex;align-items:center;gap:16px">
    <div class="clock-box">
    <div class="clock-time" id="clock">00:00:00</div>
    <div class="clock-date" id="clock-date">--</div>
    </div>
    <div style="width:1px;height:36px;background:var(--border-color)"></div>
    <div style="text-align:right">
    <b id="user-fullname" style="display:block;font-size:0.9rem">...</b>
    <small id="user-role-label" style="color:var(--text-muted)">...</small>
    </div>
    <div id="user-avatar" style="width:44px;height:44px;background:#e0e7ff;color:var(--primary);border-radius:12px;display:grid;place-items:center;font-weight:800;font-size:1.1rem">?</div>
    </div>
    </header>
    <div id="page-content">`;

    const footerHTML = `
    </div>
    </main>
    <footer class="main-footer">
    &copy; 2026 DeV#477 ENTERPRISE SYSTEM. ALL RIGHTS RESERVED.
    </footer>
    </div>`;

    const pageContent = document.getElementById('app-content').innerHTML;

    document.body.innerHTML =
    `<div class="dashboard-container">` +
    sidebarHTML +
    headerHTML +
    pageContent +
    footerHTML +
    `</div>`;

    // Jalankan SETELAH innerHTML selesai di-inject
    setActiveAndExpand();
}

// GANTI fungsi setActiveAndExpand() dengan ini:

function setActiveAndExpand() {
    const current = window.location.pathname;

    document.querySelectorAll('.nav-link, .nav-sub-link').forEach(link => {
        const href = link.getAttribute('href');
        if (!href) return;

        // Exact match untuk nav-link utama (Dashboard)
        // Untuk sub-link: exact match ATAU startsWith tapi hanya jika href lebih panjang dari '/'
        const isTopLink = link.classList.contains('nav-link');
        const isActive = isTopLink
        ? href === current
        : href === current || (href.length > 1 && current.startsWith(href + '/'));

        if (isActive) {
            link.classList.add('active');

            // Buka parent submenu jika ini sub-link
            const submenu = link.closest('.nav-submenu');
            if (submenu) {
                submenu.classList.add('open');
                const parent = submenu.previousElementSibling;
                if (parent && parent.classList.contains('nav-parent')) {
                    parent.classList.add('open');
                }
            }

            // Tampilkan admin section jika aktif
            const adminSection = link.closest('#admin-panel-section');
            if (adminSection) {
                adminSection.style.display = 'block';
            }
        }
    });
}

renderLayout();