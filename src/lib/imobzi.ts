import { MetaLeadData } from './meta';
import { saveLeadToDb } from './db';
import fs from 'fs';
import path from 'path';

interface FieldMappingConfig {
  contactFields: {
    fullname: string;
    phone: string;
    email: string;
    propertyCode: string;
  };
  customQuestions: Array<{
    id: string;
    metaKey: string;
    label: string;
    target: 'message' | 'profile' | 'property_code' | 'ignore';
    includeInNote: boolean;
    includeInProfile: boolean;
  }>;
  noteTitleTemplate: string;
  leadSource: string;
}

function loadMappingConfig(): FieldMappingConfig {
  const configPath = path.join(process.cwd(), 'src', 'data', 'field-mapping.json');
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch (err) {
    console.error('Erro ao ler field-mapping.json:', err);
  }

  // Configuração padrão de fallback
  return {
    contactFields: {
      fullname: 'nome_completo',
      phone: 'phone_number',
      email: 'email',
      propertyCode: 'Código do Imóvel',
    },
    customQuestions: [],
    noteTitleTemplate: 'Contato de {nome} sobre o imóvel de cód. {codigo_imovel}',
    leadSource: 'Facebook Leads',
  };
}

function getFieldValue(leadData: MetaLeadData, keyOrPattern: string): string {
  if (!leadData.field_data || !Array.isArray(leadData.field_data)) return '';
  const cleanPattern = keyOrPattern.trim().toLowerCase();

  // 1. Busca exata
  const exact = leadData.field_data.find((f) => f.name.trim().toLowerCase() === cleanPattern);
  if (exact && exact.values && exact.values.length > 0) return exact.values[0];

  // 2. Busca parcial / substring
  const partial = leadData.field_data.find((f) => f.name.toLowerCase().includes(cleanPattern));
  if (partial && partial.values && partial.values.length > 0) return partial.values[0];

  return '';
}

async function recordLeadInHistory(leadRecord: {
  id: string;
  timestamp: string;
  name: string;
  phone: string;
  email: string;
  propertyCode?: string;
  imobziCode?: string;
  imobziDbId?: string;
  status: 'success' | 'failed';
  source: string;
  formId?: string;
  formName?: string;
  campaignName?: string;
  adName?: string;
  platform?: string;
  formattedNote?: string;
  rawPayload?: any;
}) {
  // 1. Salvar no Neon PostgreSQL (Persistência em Nuvem para Vercel)
  try {
    await saveLeadToDb({
      lead_id: leadRecord.id,
      name: leadRecord.name,
      phone: leadRecord.phone,
      email: leadRecord.email,
      property_code: leadRecord.propertyCode,
      imobzi_code: leadRecord.imobziCode,
      imobzi_db_id: leadRecord.imobziDbId,
      status: leadRecord.status,
      source: leadRecord.source,
      form_id: leadRecord.formId,
      form_name: leadRecord.formName,
      campaign_name: leadRecord.campaignName,
      ad_name: leadRecord.adName,
      formatted_note: leadRecord.formattedNote,
      raw_payload: leadRecord.rawPayload,
    });
  } catch (neonErr) {
    console.error('Erro ao registrar lead no Neon:', neonErr);
  }

  // 2. Fallback para arquivo local (Ambiente de desenvolvimento)
  const historyPath = path.join(process.cwd(), 'src', 'data', 'leads-history.json');
  try {
    let history: any[] = [];
    if (fs.existsSync(historyPath)) {
      history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
    }
    history.unshift(leadRecord);
    // Manter últimos 50
    if (history.length > 50) history = history.slice(0, 50);
    fs.writeFileSync(historyPath, JSON.stringify(history, null, 2), 'utf8');
  } catch (err) {
    // Ignorado em ambientes somente leitura como Vercel
  }
}

// -------------------------------------------------------------
// Dicionário inteligente e funções de Auto-Mapeamento
// -------------------------------------------------------------

const QUESTION_DICTIONARY: Record<string, string> = {
  'qual_seria_a_sua_disponibilidade_para_aquisição?': 'Disponibilidade para Aquisição',
  'como_gostaria_de_prosseguir?': 'Canal de Atendimento Preferido',
  'possuí_valor_de_entrada_disponível?': 'Possui Entrada Disponível',
  'qual_a_sua_disponibilidade_para_a_entrada?': 'Valor Disponível de Entrada',
  'qual_faixa_de__investimento_você_procura?': 'Faixa de Investimento Pretendida',
  'como_pretende_fazer_a_aquisição?': 'Forma de Pagamento Pretendida',
  'qual_o_melhor_horário_para_te_ligar?': 'Melhor Horário para Contato',
  'qual_o_tipo_de_imóvel_você_procura?': 'Tipo de Imóvel Desejado',
  'quantos_quartos_você_precisa?': 'Número de Quartos',
  'em_qual_bairro_você_tem_preferência?': 'Bairro de Preferência',
};

const PROFILE_KEYWORDS = [
  'entrada', 'investimento', 'renda', 'financiamento', 'orçamento',
  'faixa', 'valor', 'disponibilidade', 'aquisição', 'aquisicao', 'compra',
  'dormitórios', 'dormitorios', 'quartos', 'banheiros', 'vagas', 'garagem',
  'tipo', 'imóvel', 'imovel', 'bairro', 'região', 'regiao', 'imediata',
  'recursos', 'prazo', 'parcela', 'pretensão', 'pretensao'
];

function cleanQuestionLabel(rawKey: string): string {
  const clean = rawKey.trim().toLowerCase();
  if (QUESTION_DICTIONARY[clean]) return QUESTION_DICTIONARY[clean];

  // Remove caracteres estranhos, substitui underlines por espaços e capitaliza
  let label = rawKey.replace(/_/g, ' ').replace(/[?:]+$/, '').trim();
  if (!label) return rawKey;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function isProfileQuestion(key: string, label: string): boolean {
  const text = (key + ' ' + label).toLowerCase();
  return PROFILE_KEYWORDS.some((kw) => text.includes(kw));
}

function resolveContactField(
  leadData: MetaLeadData,
  primaryKey: string,
  synonyms: string[],
  patternMatcher?: (val: string) => boolean
): { value: string; matchedKey: string } {
  if (!leadData.field_data || !Array.isArray(leadData.field_data)) {
    return { value: '', matchedKey: '' };
  }

  // 1. Chave configurada prioritária
  if (primaryKey) {
    const val = getFieldValue(leadData, primaryKey);
    if (val) return { value: val, matchedKey: primaryKey };
  }

  // 2. Sinônimos exatos ou parciais
  for (const s of synonyms) {
    const match = leadData.field_data.find((f) => f.name.toLowerCase().includes(s.toLowerCase()));
    if (match && match.values && match.values.length > 0 && match.values[0].trim()) {
      return { value: match.values[0].trim(), matchedKey: match.name };
    }
  }

  // 3. Fallback por conteúdo (Regex / Validação de formato)
  if (patternMatcher) {
    for (const f of leadData.field_data) {
      if (f.values && f.values.length > 0 && patternMatcher(f.values[0])) {
        return { value: f.values[0].trim(), matchedKey: f.name };
      }
    }
  }

  return { value: '', matchedKey: '' };
}

function saveUpdatedConfig(config: FieldMappingConfig) {
  const configPath = path.join(process.cwd(), 'src', 'data', 'field-mapping.json');
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
  } catch (err) {
    console.error('Erro ao atualizar field-mapping.json:', err);
  }
}

export async function sendLeadToImobzi(leadData: MetaLeadData) {
  const apiSecret = process.env.IMOBZI_API_SECRET;

  if (!apiSecret) {
    console.error("IMOBZI_API_SECRET não está definido");
    return false;
  }

  const config = loadMappingConfig();

  // 1. Extração Inteligente com Auto-Detecção de Campos de Contato
  const nameRes = resolveContactField(
    leadData,
    config.contactFields.fullname,
    ['nome_completo', 'full_name', 'nome', 'name', 'primeiro_nome', 'first_name']
  );
  let fullName = nameRes.value;

  // Se veio separado em first_name e last_name
  if (!fullName) {
    const firstName = getFieldValue(leadData, 'first_name') || getFieldValue(leadData, 'primeiro_nome');
    const lastName = getFieldValue(leadData, 'last_name') || getFieldValue(leadData, 'sobrenome');
    if (firstName) fullName = `${firstName} ${lastName || ''}`.trim();
  }
  if (!fullName) fullName = "Lead Meta Ads";

  // Telefone com regex de dígitos
  const phoneRes = resolveContactField(
    leadData,
    config.contactFields.phone,
    ['phone_number', 'telefone', 'celular', 'whatsapp', 'fone', 'phone', 'tel', 'contato'],
    (val) => val.replace(/\D/g, '').length >= 8
  );
  const rawPhone = phoneRes.value;
  const cleanPhone = rawPhone.replace(/\D/g, '');

  // E-mail com regex de @
  const emailRes = resolveContactField(
    leadData,
    config.contactFields.email,
    ['email', 'e-mail', 'mail'],
    (val) => val.includes('@')
  );
  const email = emailRes.value;

  // Código do Imóvel
  const propertyRes = resolveContactField(
    leadData,
    config.contactFields.propertyCode,
    ['código do imóvel', 'codigo_imovel', 'codigo do imovel', 'código', 'codigo', 'imóvel', 'imovel', 'ref_imovel', 'referencia', 'referência', 'ref', 'property_id', 'id_imovel']
  );
  const propertyCode = propertyRes.value && propertyRes.value !== "Não informado" ? propertyRes.value : "";

  // 2. Identificação do Formulário e Campanha
  const formName = leadData.form_name || (leadData.form_id ? `Formulário #${leadData.form_id}` : "");
  const campaignName = leadData.campaign_name || "";
  const adName = leadData.ad_name || "";
  const platform = leadData.platform ? (leadData.platform.toLowerCase() === 'ig' ? 'Instagram' : 'Facebook') : 'Meta Ads';

  // 3. Auto-Descoberta e Mapeamento de Novas Perguntas
  // Identifica quais chaves do formulário pertencem a dados de contato para não duplicar nas perguntas
  const contactKeys = new Set([
    nameRes.matchedKey.toLowerCase(),
    phoneRes.matchedKey.toLowerCase(),
    emailRes.matchedKey.toLowerCase(),
    propertyRes.matchedKey.toLowerCase(),
    'first_name', 'last_name', 'sobrenome', 'primeiro_nome'
  ].filter(Boolean));

  let hasNewQuestions = false;
  const messageLines: string[] = [];
  const profileLines: string[] = [];

  for (const field of leadData.field_data) {
    const rawKey = field.name.trim();
    if (!rawKey) continue;

    // Se é um campo de contato principal, não precisa repetir nas perguntas
    if (contactKeys.has(rawKey.toLowerCase())) {
      continue;
    }

    const val = field.values.join(', ').trim();
    if (!val) continue;

    // Verifica se já existe uma regra prévia cadastrada
    let matchedRule = config.customQuestions.find(
      (q) => q.metaKey.toLowerCase().trim() === rawKey.toLowerCase()
    );

    // AUTO-MAPEAMENTO: Se a pergunta for nova, auto-descobrir e auto-cadastrar
    if (!matchedRule) {
      const cleanLabel = cleanQuestionLabel(rawKey);
      const autoIncludeInProfile = isProfileQuestion(rawKey, cleanLabel);

      matchedRule = {
        id: 'auto_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        metaKey: rawKey,
        label: cleanLabel,
        target: autoIncludeInProfile ? 'profile' : 'message',
        includeInNote: true,
        includeInProfile: autoIncludeInProfile,
      };

      config.customQuestions.push(matchedRule);
      hasNewQuestions = true;
      console.log(`✨ [Auto-Mapeamento] Nova pergunta detectada e mapeada automaticamente: "${rawKey}" ➔ "${cleanLabel}" (Perfil Inteligente: ${autoIncludeInProfile})`);
    }

    if (matchedRule.target === 'ignore') {
      continue;
    }

    const displayLabel = matchedRule.label || cleanQuestionLabel(rawKey);

    if (matchedRule.includeInProfile || matchedRule.target === 'profile') {
      profileLines.push(`${displayLabel}: ${val}`);
    } else {
      messageLines.push(`${displayLabel}: ${val}`);
    }
  }

  // Se descobriu novas perguntas, salva de volta para que o usuário veja no painel
  if (hasNewQuestions) {
    saveUpdatedConfig(config);
  }

  const messageSections: string[] = [];
  
  // Cabeçalho de identificação do Formulário de Origem
  const formHeaderParts: string[] = [];
  if (formName) formHeaderParts.push(`📋 Formulário: ${formName}`);
  if (campaignName) formHeaderParts.push(`🎯 Campanha: ${campaignName}`);
  if (adName) formHeaderParts.push(`📢 Anúncio: ${adName}`);
  formHeaderParts.push(`📱 Plataforma: ${platform}`);
  
  messageSections.push(formHeaderParts.join('\n'));

  if (propertyCode) {
    messageSections.push(`Olá! Tenho interesse no imóvel de cód. ${propertyCode} e aguardo retorno.`);
  } else {
    messageSections.push(`Olá! Gostaria de receber mais informações e aguardo retorno.`);
  }

  if (messageLines.length > 0) {
    messageSections.push(`Respostas do formulário:\n` + messageLines.join('\n'));
  }

  if (profileLines.length > 0) {
    messageSections.push(`Perfil inteligente:\n\n` + profileLines.join('\n'));
  }

  messageSections.push(
    `Origem: ${config.leadSource || 'Facebook Leads'}\nID Lead Ads: ${leadData.id}${leadData.form_id ? `\nID Formulário Meta: ${leadData.form_id}` : ''}`
  );

  const formattedMessage = messageSections.join('\n\n');

  // Nome da origem no Imobzi (incluindo o formulário para fácil identificação no rodízio)
  const effectiveLeadOrigin = formName 
    ? `Facebook Leads - ${formName.length > 40 ? formName.slice(0, 37) + '...' : formName}`
    : (config.leadSource || 'Facebook Leads');

  // Payload otimizado usando o endpoint nativo /v1/integration/lead do Imobzi
  const integrationPayload: Record<string, any> = {
    leadOrigin: effectiveLeadOrigin,
    name: fullName,
    email: email || undefined,
    phoneNumber: rawPhone || cleanPhone || undefined,
    phone: cleanPhone || undefined,
    message: formattedMessage,
  };

  if (propertyCode && propertyCode !== "Não informado") {
    integrationPayload.clientListingId = propertyCode;
  }

  const url = "https://api.imobzi.app/v1/integration/lead";

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Imobzi-Secret': apiSecret,
      },
      body: JSON.stringify(integrationPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Erro ao enviar lead para Imobzi (${response.status}):`, errorText);
      await recordLeadInHistory({
        id: leadData.id,
        timestamp: new Date().toISOString(),
        name: fullName,
        phone: rawPhone,
        email: email,
        propertyCode: propertyCode,
        status: 'failed',
        source: effectiveLeadOrigin,
        formId: leadData.form_id,
        formName: formName,
        campaignName: campaignName,
        adName: adName,
        platform: platform,
        formattedNote: formattedMessage,
      });
      return false;
    }

    const result = await response.json();
    console.log("✅ Lead enviado para o Imobzi com sucesso via /v1/integration/lead!", result);

    await recordLeadInHistory({
      id: leadData.id,
      timestamp: new Date().toISOString(),
      name: fullName,
      phone: rawPhone,
      email: email,
      propertyCode: propertyCode,
      imobziCode: result.code,
      imobziDbId: result.db_id,
      status: 'success',
      source: effectiveLeadOrigin,
      formId: leadData.form_id,
      formName: formName,
      campaignName: campaignName,
      adName: adName,
      platform: platform,
      formattedNote: formattedMessage,
    });

    return true;
  } catch (error) {
    console.error("Erro na requisição para o Imobzi:", error);
    return false;
  }
}
