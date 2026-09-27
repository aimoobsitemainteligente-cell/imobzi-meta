import { getSheetsData } from './src/lib/tv/sheets';
import { syncTvLeads } from './src/lib/db';

async function run() {
  console.log('Fetching sheets...');
  const sheetsLeads = await getSheetsData();
  console.log(`Fetched ${sheetsLeads.length} leads from sheets.`);
  
  await syncTvLeads(sheetsLeads);
  console.log('Sync complete.');
}

run().catch(console.error);
