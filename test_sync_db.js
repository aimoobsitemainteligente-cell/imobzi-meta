require('dotenv').config({ path: '.env.local' });
const { getSheetsData } = require('./src/lib/tv/sheets');
const { syncTvLeads } = require('./src/lib/db');

async function run() {
  console.log('Fetching sheets...');
  const sheetsLeads = await getSheetsData();
  console.log(`Fetched ${sheetsLeads.length} leads. Syncing to DB...`);
  await syncTvLeads(sheetsLeads);
  console.log('Sync complete!');
}

run();
