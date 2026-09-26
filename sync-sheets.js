const { neon } = require("@neondatabase/serverless");
const { google } = require("googleapis");
const fs = require("fs");

function getEnvVar(key) {
  const envContent = fs.readFileSync(".env.local", "utf8");
  const match = envContent.match(new RegExp(`^${key}=(.*)$`, "m"));
  return match ? match[1].trim() : null;
}

async function syncLeads() {
  console.log("Iniciando sincronização...");
  const databaseUrl = getEnvVar("DATABASE_URL");
  const credentialsBase64 = getEnvVar("GOOGLE_CREDENTIALS_BASE64");
  const spreadsheetId = getEnvVar("GOOGLE_SPREADSHEET_ID");

  if (!databaseUrl || !credentialsBase64 || !spreadsheetId) {
    console.log("Variáveis de ambiente ausentes.");
    return;
  }
  
  console.log("Conectando ao banco Neon...");

  // 1. Pegar leads do banco Neon
  const sql = neon(databaseUrl);
  let dbLeads = [];
  try {
    dbLeads = await sql`SELECT name, phone, imobzi_code, created_at FROM meta_leads ORDER BY created_at ASC`;
    console.log(`Encontrados ${dbLeads.length} leads no banco de dados.`);
  } catch(e) {
    console.log("Erro no Neon DB:", e.message);
    return;
  }

  // 2. Autenticar no Google Sheets
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

  // 3. Pegar linhas da planilha
  let sheetRows = [];
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: "Página1!A1:W200", // Assumindo máximo de 200 linhas
    });
    sheetRows = response.data.values || [];
    console.log(`Lidas ${sheetRows.length} linhas da planilha.`);
  } catch(e) {
    console.log("Erro ao ler planilha:", e.message);
    return;
  }

  const updates = [];

  // 4. Comparar e preparar atualização
  for (let rowIndex = 0; rowIndex < sheetRows.length; rowIndex++) {
    const row = sheetRows[rowIndex];
    const sheetName = (row[2] || "").trim().toLowerCase();
    const sheetPhone = (row[3] || "").replace(/\D/g, "");
    
    // Pula cabeçalho ou linhas vazias
    if (!sheetName || sheetName === "lead" || sheetName === "nome") continue;

    // Achar o correspondente no banco (pelo nome ou pelo telefone)
    const dbMatch = dbLeads.find(l => {
      const dbNameMatch = l.name.trim().toLowerCase() === sheetName;
      const dbPhoneClean = (l.phone || "").replace(/\D/g, "");
      const phoneMatch = sheetPhone && dbPhoneClean && sheetPhone.includes(dbPhoneClean) || dbPhoneClean.includes(sheetPhone);
      
      // Retorna match se o nome for igual ou se os números de telefone baterem (com pelo menos 8 digitos pra evitar falso positivo)
      return dbNameMatch || (sheetPhone.length >= 8 && dbPhoneClean.length >= 8 && (sheetPhone === dbPhoneClean || sheetPhone.endsWith(dbPhoneClean) || dbPhoneClean.endsWith(sheetPhone)));
    });
    
    if (dbMatch) {
      // Calcular a data/hora correta do banco (fuso horário de Brasília -3)
      const dateObj = new Date(dbMatch.created_at);
      
      const dataString = `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth()+1).toString().padStart(2, '0')}/${dateObj.getFullYear()}`;
      const horaString = `${dateObj.getHours().toString().padStart(2, '0')}:${dateObj.getMinutes().toString().padStart(2, '0')}`;
      
      // Link do imobzi
      const safeId = dbMatch.imobzi_code ? dbMatch.imobzi_code.replace("person-", "") : "";
      const linkImobzi = safeId ? `https://my.imobzi.com/#/contacts/person-${safeId}` : "N/A";
      
      // Só atualiza se tiver algo diferente ou se a coluna W estiver vazia
      const currentData = row[0] || "";
      const currentHora = row[1] || "";
      const currentLink = row[22] || "";

      if (currentData !== dataString || currentHora !== horaString || currentLink !== linkImobzi) {
        const rowNumber = rowIndex + 1; // 1-indexed

        // Atualizar A (Data), B (Hora) e W (Link)
        updates.push({
          range: `Página1!A${rowNumber}:B${rowNumber}`,
          values: [[dataString, horaString]]
        });
        updates.push({
          range: `Página1!W${rowNumber}`,
          values: [[linkImobzi]]
        });
      }
    }
  }

  console.log(`Preparando ${updates.length / 2} atualizações para a planilha...`);

  // 5. Aplicar atualizações em lote (batchUpdate)
  if (updates.length > 0) {
    try {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: spreadsheetId,
        requestBody: {
          valueInputOption: "USER_ENTERED",
          data: updates
        }
      });
      console.log("✅ Planilha atualizada com sucesso!");
    } catch(e) {
      console.log("Erro ao atualizar planilha:", e.message);
    }
  } else {
    console.log("Nenhuma atualização necessária. Os dados já estão corretos.");
  }
}

syncLeads();
