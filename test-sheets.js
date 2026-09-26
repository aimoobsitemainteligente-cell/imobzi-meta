const { google } = require("googleapis");
const fs = require("fs");

function getEnvVar(key) {
  const envContent = fs.readFileSync(".env.local", "utf8");
  const match = envContent.match(new RegExp(`^${key}=(.*)$`, "m"));
  return match ? match[1].trim() : null;
}

async function readSheet() {
  const credentialsBase64 = getEnvVar("GOOGLE_CREDENTIALS_BASE64");
  const spreadsheetId = getEnvVar("GOOGLE_SPREADSHEET_ID");

  if (!credentialsBase64 || !spreadsheetId) {
    console.log("Credentials missing.");
    return;
  }

  const credentialsJson = JSON.parse(
    Buffer.from(credentialsBase64, "base64").toString("utf-8")
  );

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: credentialsJson.client_email,
      private_key: credentialsJson.private_key,
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: "Página1!A1:W200",
    });
    
    const rows = response.data.values || [];
    
    let report = `Total de linhas na planilha: ${rows.length}\n\n`;
    
    // Pegar as 5 últimas linhas inseridas (excluindo o cabeçalho se houver)
    const recentRows = rows.slice(-5);
    
    report += "Últimos 5 registros:\n";
    recentRows.forEach((r, i) => {
      report += `[Linha ${rows.length - 5 + i + 1}]\n`;
      report += `  A (Data): ${r[0]}\n`;
      report += `  B (Hora): ${r[1]}\n`;
      report += `  C (Nome): ${r[2]}\n`;
      report += `  E (Vídeo/Anúncio): ${r[4]}\n`;
      report += `  F (Imóvel): ${r[5]?.replace(/\n/g, " | ")}\n`;
      report += `  W (Link Imobzi): ${r[22] || "Vazio"}\n`;
      report += `------------------------\n`;
    });

    console.log(report);
  } catch (err) {
    console.error(err.message);
  }
}

readSheet();
