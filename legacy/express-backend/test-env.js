// test-env.js
require('dotenv').config();
console.log('DB_USER:', process.env.DB_USER || '<missing>');
console.log('DB_PASS present?:', !!process.env.DB_PASS);
console.log('DB_HOST:', process.env.DB_HOST || '<missing>');
console.log('DB_PORT:', process.env.DB_PORT || '<missing>');
console.log('DB_NAME:', process.env.DB_NAME || '<missing>');
