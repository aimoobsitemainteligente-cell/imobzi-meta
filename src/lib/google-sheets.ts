import { google } from "googleapis";

/**
 * Função para enviar os dados do lead para uma planilha do Google Sheets.
 * @param leadData Dados mapeados do lead retornados pela Meta.
 */
export async function sendToGoogleSheets(leadData: any) {
  try {
    // 1. Validar se as credenciais foram configuradas
    const credentialsBase64 = process.env.GOOGLE_CREDENTIALS_BASE64;
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;

    if (!credentialsBase64 || !spreadsheetId) {
      console.warn("⚠️ Google Sheets não configurado. Ignorando envio.");
      return;
    }

    // 2. Decodificar as credenciais
    const credentialsJson = JSON.parse(
      Buffer.from(credentialsBase64, "base64").toString("utf-8")
    );

    // 3. Autenticar usando a Service Account
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: credentialsJson.client_email,
        private_key: credentialsJson.private_key,
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    // 4. Preparar os dados para inserir (Apenas um array com os valores na ordem das colunas)
    // Ex: Data, Nome, Email, Telefone, Campanha, Formulário, Código Imóvel
    const values = [
      [
        new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
        leadData.name || "N/A",
        leadData.email || "N/A",
        leadData.phone || "N/A",
        leadData.campaign_name || "N/A",
        leadData.form_name || "N/A",
        leadData.property_code || "N/A",
        leadData.source || "Meta Lead Ads"
      ],
    ];

    // 5. Inserir a linha na planilha
    // Estamos assumindo que a aba se chama "Página1". Se for diferente, mude aqui.
    // O range "A:F" indica as colunas de A até F
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: spreadsheetId,
      range: "Página1!A:F", // Mude "Página1" para o nome correto da aba se necessário
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values,
      },
    });

    console.log(`✅ Lead inserido no Google Sheets com sucesso na linha ${response.data.updates?.updatedRange}`);

  } catch (error) {
    console.error("❌ Erro ao enviar lead para o Google Sheets:", error);
  }
}
