// =========================================================================
// KONFIGURASI AI ASSISTANT (Google Gemini API)
// Dapatkan API key gratis di https://aistudio.google.com/
// =========================================================================
module.exports = {
    apiKey: process.env.GEMINI_API_KEY || 'rahasia',
    model: 'gemini-3.7-flash', // Model cepat, pintar, dan gratis (memiliki free tier)
    maxTokens: 1500,
};