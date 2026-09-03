// =========================================================================
// POOL API KEYS GOOGLE GEMINI
// =========================================================================
const keys = [
  
    process.env.GEMINI_KEY_6 || 'RAHASIA',
    process.env.GEMINI_KEY_7 || 'RAHASIA',
    process.env.GEMINI_KEY_8 || 'RAHASIA',
    
];

let currentIndex = 0;

function getCurrentApiKey() {
    return keys[currentIndex];
}

function rotateApiKey() {
    currentIndex = (currentIndex + 1) % keys.length;
    console.log(`[AI Pool] Kuota habis/limit, merotasi ke API Key index ke-${currentIndex}`);
    return keys[currentIndex];
}

module.exports = {
    getCurrentApiKey,
    rotateApiKey,
    getTotalKeys: () => keys.length
};