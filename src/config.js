require('dotenv').config();

const config = {
  openDartApi: {
    apiKey: process.env.OPEN_DART_API_KEY,
    baseUrl: 'https://opendart.fss.or.kr/api'
  },
  geminiApi: {
    apiKey: process.env.GEMINI_API_KEY
  }
};

module.exports = config; 