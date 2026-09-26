const { google } = require("googleapis");
const fs = require("fs");

function getEnvVar(key) {
  const envContent = fs.readFileSync(".env.local", "utf8");
  const match = envContent.match(new RegExp(`^${key}=(.*)$`, "m"));
  return match ? match[1].trim() : null;
}

async function protectColumnW() {
  const credentialsBase64 = getEnvVar("GOOGLE_CREDENTIALS_BASE64");
  const spreadsheetId = getEnvVar("GOOGLE_SPREADSHEET_ID");

  if (!credentialsBase64 || !spreadsheetId) {
    console.log("Variáveis de ambiente ausentes.");
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
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const sheets = google.sheets({ version: "v4", auth });

  try {
    // Pegar as infos da planilha para achar o sheetId da "Página1"
    const info = await sheets.spreadsheets.get({ spreadsheetId });
    const sheet = info.data.sheets.find(s => s.properties.title === "Página1" || s.properties.title === "Planilha 1");
    if (!sheet) {
      console.log("Aba não encontrada");
      return;
    }
    const sheetId = sheet.properties.sheetId;

    // Coluna W é o índice 22
    const addProtectedRangeRequest = {
      addProtectedRange: {
        protectedRange: {
          range: {
            sheetId: sheetId,
            startColumnIndex: 22,
            endColumnIndex: 23, // 23 não é inclusivo
          },
          description: "Bloqueado para edição apenas pela API",
          warningOnly: false,
          editors: {
            users: [
              credentialsJson.client_email // O e-mail da conta de serviço
            ]
          }
        }
      }
    };

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: spreadsheetId,
      requestBody: {
        requests: [addProtectedRangeRequest]
      }
    });

    console.log("Coluna W bloqueada com sucesso!");
  } catch (err) {
    console.error("Erro ao bloquear a coluna:", err.message);
  }
}

protectColumnW();
