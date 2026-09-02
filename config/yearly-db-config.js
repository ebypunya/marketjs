module.exports = {
    // Tahun dasar: tahun ini database masih bernama "marketjs" polos (tanpa suffix tahun)
    baseYear: 2026,
    baseDbName: 'marketjs',

    // Tabel yang datanya ikut disalin ke database tahun baru
    // (selain ini, semua tabel lain hanya disalin STRUKTURNYA saja / kosong)
    masterTables: ['customers', 'products', 'rates', 'users'],

    // Path ke mysqldump.exe dan mysql.exe (sesuaikan kalau XAMPP di lokasi lain)
    mysqldumpPath: 'C:\\xampp\\mysql\\bin\\mysqldump.exe',
    mysqlPath: 'C:\\xampp\\mysql\\bin\\mysql.exe',

    dbHost: 'localhost',
    dbUser: 'root',
    dbPassword: '',
};