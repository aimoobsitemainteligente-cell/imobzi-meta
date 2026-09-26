const { neon } = require("@neondatabase/serverless");
const { google } = require("googleapis");
const fs = require("fs");

function getEnvVar(key) {
  const envContent = fs.readFileSync(".env.local", "utf8");
  const match = envContent.match(new RegExp(`^${key}=(.*)$`, "m"));
  return match ? match[1].trim() : null;
}

async function syncWithDB() {
  const databaseUrl = getEnvVar("DATABASE_URL");
  const credentialsBase64 = getEnvVar("GOOGLE_CREDENTIALS_BASE64");
  const spreadsheetId = getEnvVar("GOOGLE_SPREADSHEET_ID");

  if (!databaseUrl || !credentialsBase64 || !spreadsheetId) {
    console.log("Variáveis de ambiente ausentes.");
    return;
  }

  const sql = neon(databaseUrl);
  
  console.log("Carregando base de contatos do Neon...");
  const dbContacts = await sql`SELECT phone, imobzi_link FROM imobzi_contacts WHERE phone IS NOT NULL AND phone != ''`;
  console.log(`Carregados ${dbContacts.length} contatos com telefone do banco de dados.`);

  console.log("Conectando ao Google Sheets...");
  const credentialsJson = JSON.parse(
    Buffer.from(credentialsBase64, "base64").toString("utf-8")
  );
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: credentialsJson.client_email,
      private_key: credentialsJson.private_key,
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const sheets = google.sheets({ version: "v4", auth });

  let sheetRows = [];
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: "Página1!A1:W20000", 
    });
    sheetRows = response.data.values || [];
  } catch(e) {
    console.log("Erro ao ler planilha:", e.message);
    return;
  }

  const updates = [];

  for (let rowIndex = 0; rowIndex < sheetRows.length; rowIndex++) {
    const row = sheetRows[rowIndex];
    const sheetName = (row[2] || "").trim().toLowerCase();
    const rawSheetPhone = row[3] || "";
    const sheetPhone = rawSheetPhone.replace(/\D/g, "");
    const currentLink = row[22] || ""; 
    
    if (!sheetName || sheetName === "lead" || sheetName === "nome") continue;
    if (currentLink.includes("my.imobzi.com")) continue;
    if (!sheetPhone || sheetPhone.length < 8) continue;

    // Buscar correspondencia no DB
    const match = dbContacts.find(c => c.phone === sheetPhone || c.phone.endsWith(sheetPhone) || sheetPhone.endsWith(c.phone));
    
    if (match && match.imobzi_link) {
      const rowNumber = rowIndex + 1;
      updates.push({
        range: `Página1!W${rowNumber}`,
        values: [[match.imobzi_link]]
      });
      console.log(`Encontrou: ${sheetName} -> ${match.imobzi_link}`);
    } else {
      console.log(`❌ Não encontrou no Neon: ${sheetName} - Tel: ${sheetPhone}`);
    }
  }

  if (updates.length > 0) {
    try {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: spreadsheetId,
        requestBody: {
          valueInputOption: "USER_ENTERED",
          data: updates
        }
      });
      console.log(`✅ Planilha atualizada com ${updates.length} novos links!`);
    } catch(e) {
      console.log("Erro ao atualizar planilha:", e.message);
    }
  } else {
    console.log("Nenhuma atualização necessária. (Leads não encontrados na base).");
  }
}

syncWithDB();
