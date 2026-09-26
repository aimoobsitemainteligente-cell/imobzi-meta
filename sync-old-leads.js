const { google } = require("googleapis");
const fs = require("fs");

function getEnvVar(key) {
  const envContent = fs.readFileSync(".env.local", "utf8");
  const match = envContent.match(new RegExp(`^${key}=(.*)$`, "m"));
  return match ? match[1].trim() : null;
}

async function syncOldLeads() {
  const apiSecret = getEnvVar("IMOBZI_API_SECRET");
  const credentialsBase64 = getEnvVar("GOOGLE_CREDENTIALS_BASE64");
  const spreadsheetId = getEnvVar("GOOGLE_SPREADSHEET_ID");

  if (!apiSecret || !credentialsBase64 || !spreadsheetId) {
    console.log("Variáveis de ambiente ausentes.");
    return;
  }

  // 1. Buscar todos os contatos do Imobzi
  console.log("Baixando contatos do Imobzi...");
  const allImobziContacts = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const url = `https://api.imobzi.app/v1/contacts?limit=100&page=${page}`;
    try {
      const res = await fetch(url, {
        headers: { "X-Imobzi-Secret": apiSecret }
      });
      const data = await res.json();
      
      if (data.contacts && data.contacts.length > 0) {
        allImobziContacts.push(...data.contacts);
        console.log(`Baixados: ${allImobziContacts.length} (Página ${page})`);
        
        page++;
        // Se retornar menos de 100, deve ser a ultima pagina
        if (data.contacts.length < 50) { // Imobzi parece forçar limit=50
          hasMore = false;
        }
      } else {
        hasMore = false;
        console.log("Nenhum contato retornado, encerrando paginação.");
      }
    } catch (err) {
      console.error("\nErro ao buscar Imobzi:", err.message);
      hasMore = false;
    }
  }
  console.log(`\nTotal de contatos do Imobzi carregados na memória: ${allImobziContacts.length}`);

  // 2. Autenticar no Google Sheets
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

  // 3. Pegar linhas da planilha
  let sheetRows = [];
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: "Página1!A1:W500", 
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
    const rawSheetPhone = row[3] || "";
    const sheetPhone = rawSheetPhone.replace(/\D/g, "");
    const currentLink = row[22] || ""; // Coluna W
    
    // Pula cabeçalho ou linhas vazias
    if (!sheetName || sheetName === "lead" || sheetName === "nome") continue;
    
    // Só tentamos atualizar se não tem link válido
    if (currentLink.includes("my.imobzi.com")) continue;
    
    // Precisamos ter telefone na planilha para encontrar
    if (!sheetPhone || sheetPhone.length < 8) continue;

    // Achar o correspondente no banco do imobzi
    const contactMatch = allImobziContacts.find(c => {
      // Comparar por telefone
      if (c.phones && c.phones.length > 0) {
        for (const p of c.phones) {
          const pClean = (p.number_plain || p.number || "").replace(/\D/g, "");
          if (pClean && pClean.length >= 8) {
            if (pClean === sheetPhone || pClean.endsWith(sheetPhone) || sheetPhone.endsWith(pClean)) {
              return true;
            }
          }
        }
      }
      return false;
    });
    
    if (contactMatch && contactMatch.code) {
      const safeId = contactMatch.code.replace("person-", "");
      const linkImobzi = `https://my.imobzi.com/#/contacts/person-${safeId}`;
      
      const rowNumber = rowIndex + 1;
      updates.push({
        range: `Página1!W${rowNumber}`,
        values: [[linkImobzi]]
      });
    } else {
      console.log(`Não encontrou no Imobzi: ${sheetName} - Tel: ${sheetPhone}`);
    }
  }

  console.log(`Encontrados ${updates.length} leads antigos no Imobzi para atualizar na planilha...`);

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
    console.log("Nenhuma atualização necessária.");
  }
}

syncOldLeads();
