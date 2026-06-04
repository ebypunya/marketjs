// ===== REALTIME CLOCK =====
function updateClock() {
const now = new Date();
const days = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
const months = ['Januari','Februari','Maret','April','Mei','Juni',
'Juli','Agustus','September','Oktober','November','Desember'];
const clockEl = document.getElementById('clock');
const dateEl  = document.getElementById('clock-date');
if (clockEl) clockEl.textContent = now.toLocaleTimeString('id-ID', { hour12: false });
if (dateEl)  dateEl.textContent  = days[now.getDay()] + ', ' + now.getDate() + ' ' +
months[now.getMonth()] + ' ' + now.getFullYear();
}

// ===== TOGGLE SUBMENU =====
function toggleMenu(el) {
el.classList.toggle('open');
el.nextElementSibling.classList.toggle('open');
}

// ===== LOAD SESSION =====
function loadSession() {
fetch('/api/me')
.then(r => r.json())
.then(user => {
const fullnameEl    = document.getElementById('user-fullname');
const roleEl        = document.getElementById('user-role-label');
const avatarEl      = document.getElementById('user-avatar');
const adminSection  = document.getElementById('admin-panel-section');

if (fullnameEl)   fullnameEl.textContent   = user.fullname;
if (roleEl)       roleEl.textContent        = user.role === 'superadmin' ? 'Superadmin Access' : 'User Access';
if (avatarEl)     avatarEl.textContent      = user.fullname.charAt(0).toUpperCase();

// Tampilkan admin panel section jika superadmin
// Tapi jangan tutup jika sudah di-open oleh setActiveAndExpand
if (adminSection && user.role === 'superadmin') {
adminSection.style.display = 'block';
}
})
.catch(() => window.location.href = '/');
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
updateClock();
setInterval(updateClock, 1000);
loadSession();
});