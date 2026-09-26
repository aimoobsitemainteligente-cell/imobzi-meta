const { neon } = require("@neondatabase/serverless");
const fs = require("fs");

function getEnvVar(key) {
  const envContent = fs.readFileSync(".env.local", "utf8");
  const match = envContent.match(new RegExp(`^${key}=(.*)$`, "m"));
  return match ? match[1].trim() : null;
}

async function checkHistory() {
  const databaseUrl = getEnvVar("DATABASE_URL");
  if (!databaseUrl) {
    console.log("No DATABASE_URL found.");
    return;
  }
  
  const sql = neon(databaseUrl);
  
  try {
    const rows = await sql`SELECT count(*) FROM meta_leads`;
    console.log(`Total leads no Neon DB: ${rows[0].count}`);
    
    // Ler do leads-history.json também só por precaução
    try {
      const historyContent = fs.readFileSync("src/data/leads-history.json", "utf8");
      const historyJson = JSON.parse(historyContent);
      console.log(`Total leads no leads-history.json: ${historyJson.length}`);
    } catch(e) {
      console.log("leads-history.json não pôde ser lido:", e.message);
    }
  } catch(e) {
    console.log("Erro no Neon DB:", e.message);
  }
}

checkHistory();
