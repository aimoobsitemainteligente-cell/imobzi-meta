const { getSheetsData } = require('./src/lib/tv/sheets');
require('dotenv').config({ path: '.env.local' });
getSheetsData().then(d => console.log('Sheets rows:', d.length));
