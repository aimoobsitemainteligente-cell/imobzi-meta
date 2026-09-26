import { google } from "googleapis";

export async function getSheetsData() {
  const credentialsBase64 = process.env.GOOGLE_CREDENTIALS_BASE64;
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;

  if (!credentialsBase64 || !spreadsheetId) {
    throw new Error("Missing Google Sheets credentials or ID");
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

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Página1!A2:X", // Skipping header
  });

  const rows = response.data.values || [];
  
  // Transform to Lead objects
  const leads = rows.map((row, index) => {
    return {
      lead_id: `row-${index + 2}`,
      created_at: row[0] ? `${row[0]} ${row[1] || '00:00'}` : new Date().toISOString(), // A, B
      nome: row[2] || 'Sem Nome', // C
      telefone: row[3] || '', // D
      ad_name: row[4] || '', // E
      imovel: row[5] || '', // F
      primeiro_contato_data: row[6] || '', // G
      primeiro_contato_hora: row[7] || '', // H
      estagio: row[8] || 'Novo', // I (EVOLUÇÃO)
      corretor_nome: row[9] || 'Sem dono', // J
      status: row[11] || '', // L
      tempo_resposta: row[21] || '', // V
      link_imobzi: row[22] || '', // W
      origem: 'META', // Todos os leads da planilha vêm do Meta
    };
  });

  return leads;
}
