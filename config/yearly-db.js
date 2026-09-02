const mysql = require('mysql2/promise');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

const {
    baseYear,
    baseDbName,
    masterTables,
    mysqldumpPath,
    mysqlPath,
    dbHost,
    dbUser,
    dbPassword,
} = require('./yearly-db-config');

// Untuk testing: bisa dipaksa pura-pura tahun tertentu dengan
// menjalankan:  set FORCE_YEAR=2027 && node app.js   (Windows cmd)
// Jangan dipakai di server produksi asli.
function getCurrentYear() {
    return process.env.FORCE_YEAR ? parseInt(process.env.FORCE_YEAR, 10) : new Date().getFullYear();
}

function getDbNameForYear(year) {
    return year <= baseYear ? baseDbName : `${baseDbName}${year}`;
}

function getCurrentDbName() {
    return getDbNameForYear(getCurrentYear());
}

async function databaseExists(connection, dbName) {
    const [rows] = await connection.query(
        'SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?',
        [dbName]
        );
    return rows.length > 0;
}

async function findSourceDbName(connection, currentYear) {
    for (let y = currentYear - 1; y >= baseYear; y--) {
        const name = getDbNameForYear(y);
        if (await databaseExists(connection, name)) return name;
    }
    if (await databaseExists(connection, baseDbName)) return baseDbName;
    return null;
}

function runShell(cmd) {
    // maxBuffer diperbesar untuk jaga-jaga kalau data sudah banyak
    return execAsync(cmd, { maxBuffer: 1024 * 1024 * 100 });
}

function authArgs() {
    return `-u ${dbUser}${dbPassword ? ` -p${dbPassword}` : ''}`;
}

/**
 * Dipanggil di awal startup server, SEBELUM pool koneksi utama (db.js) dibuat.
 * Memastikan database untuk tahun berjalan sudah ada; kalau belum, dibuat
 * dengan cara mengklon struktur + data master dari database tahun sebelumnya.
 */
 async function ensureYearlyDatabase() {
    const currentYear = getCurrentYear();
    const targetDb = getDbNameForYear(currentYear);

    const connection = await mysql.createConnection({
        host: dbHost,
        user: dbUser,
        password: dbPassword,
    });

    try {
        const exists = await databaseExists(connection, targetDb);
        if (exists) {
            console.log(`[yearly-db] Database "${targetDb}" sudah ada, digunakan seperti biasa.`);
            return targetDb;
        }

        console.log(`[yearly-db] Database "${targetDb}" belum ada. Mencari database sumber untuk disalin...`);
        const sourceDb = await findSourceDbName(connection, currentYear);

        if (!sourceDb) {
            throw new Error(
                'Tidak ditemukan database sumber untuk disalin (database dasar pun tidak ditemukan). ' +
                'Periksa config/yearly-db-config.js.'
                );
        }

        console.log(`[yearly-db] Membuat database baru "${targetDb}" (disalin dari "${sourceDb}")...`);
        await connection.query(`CREATE DATABASE \`${targetDb}\``);

        // 1) Clone SELURUH struktur tabel (tanpa data) dari database sumber
        const schemaCmd =
        `"${mysqldumpPath}" ${authArgs()} --no-data --routines --triggers --add-drop-table ${sourceDb} | ` +
        `"${mysqlPath}" ${authArgs()} ${targetDb}`;
        await runShell(schemaCmd);

        // 2) Isi ulang HANYA tabel master data + users dengan data dari database sumber
        const tableList = masterTables.join(' ');
        const dataCmd =
        `"${mysqldumpPath}" ${authArgs()} --add-drop-table ${sourceDb} ${tableList} | ` +
        `"${mysqlPath}" ${authArgs()} ${targetDb}`;
        await runShell(dataCmd);

        console.log(
            `[yearly-db] Database "${targetDb}" berhasil dibuat. ` +
            `Data disalin dari "${sourceDb}" untuk tabel: ${masterTables.join(', ')}.`
            );
        return targetDb;
    } finally {
        await connection.end();
    }
}

module.exports = { getCurrentDbName, getDbNameForYear, ensureYearlyDatabase };