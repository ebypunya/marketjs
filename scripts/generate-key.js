// Jalankan sekali untuk membuat key baru:
//   node scripts/generate-key.js
//
// Script ini akan mencetak KEY (untuk dikirim ke pihak yang berhak menjalankan
// aplikasi, mis. taruh di file license.key) dan HASH-nya (untuk ditaruh di
// config/license-hash.js sebagai nilai yang dicocokkan oleh server).

const crypto = require('crypto');

const key = crypto.randomBytes(24).toString('hex'); // key asli, rahasia
const hash = crypto.createHash('sha256').update(key).digest('hex');

console.log('=========================================');
console.log('LICENSE KEY (simpan di file license.key):');
console.log(key);
console.log('-----------------------------------------');
console.log('HASH (simpan di config/license-hash.js):');
console.log(hash);
console.log('=========================================');