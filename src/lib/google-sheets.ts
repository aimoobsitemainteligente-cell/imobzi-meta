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

    // Extrair os dados do array field_data do Meta (já que name, phone e codigo_imovel não vêm soltos)
    let leadName = "N/A";
    let leadPhone = "N/A";
    let propertyCode = "";

    if (leadData.field_data && Array.isArray(leadData.field_data)) {
      for (const field of leadData.field_data) {
        const fieldName = field.name.toLowerCase();
        if (fieldName.includes('name') || fieldName.includes('nome')) {
          leadName = field.values[0] || leadName;
        }
        if (fieldName.includes('phone') || fieldName.includes('telefone') || fieldName.includes('celular')) {
          leadPhone = field.values[0] || leadPhone;
        }
        if (fieldName.includes('código') || fieldName.includes('codigo') || fieldName.includes('imóvel') || fieldName.includes('imovel') || fieldName.includes('ref')) {
          propertyCode = field.values[0] || propertyCode;
        }
      }
    }

    // 4. Preparar os dados de acordo com a planilha:
    // A=Data, B=Hora, C=Lead(nome), D=Nº TELEFONE, E=QUAL VIDEO?, F=IMÓVEL
    const now = new Date();
    // Forçar formatação manual para evitar problemas de fuso/locale na Vercel
    const dataString = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth()+1).toString().padStart(2, '0')}/${now.getFullYear()}`;
    const horaString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    // Para "QUAL VIDEO?" -> Anúncio
    const qualVideo = leadData.ad_name || "N/A";

    // Para "IMÓVEL" -> Código do imóvel na primeira linha, seguido de Formulário e Campanha
    const nomeFormulario = leadData.form_name || "N/A";
    const nomeCampanha = leadData.campaign_name || "N/A";
    
    let imovel = "";
    if (propertyCode && propertyCode !== "Não informado") {
      imovel += `Código: ${propertyCode}\n`;
    }
    imovel += `Formulário: ${nomeFormulario}\n🎯 Campanha: ${nomeCampanha}`;

    const values = [
      [
        dataString,        // A = Data
        horaString,        // B = Hora da entrada
        leadName,          // C = Lead (nome)
        leadPhone,         // D = Nº TELEFONE
        qualVideo,         // E = QUAL VIDEO? (Anúncio)
        imovel             // F = IMÓVEL (Form + Campanha)
      ],
    ];

    // 5. Inserir a linha na planilha
    // O range "A:F" indica as colunas de A até F
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: spreadsheetId,
      range: "Página1!A:F",
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
