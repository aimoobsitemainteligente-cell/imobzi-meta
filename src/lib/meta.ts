export interface MetaLeadData {
  id: string;
  created_time: string;
  field_data: Array<{
    name: string;
    values: string[];
  }>;
  form_id?: string;
  form_name?: string;
  ad_id?: string;
  ad_name?: string;
  adset_id?: string;
  adset_name?: string;
  campaign_id?: string;
  campaign_name?: string;
  platform?: string; // 'fb' | 'ig'
}

// Cache em memória para nomes de formulários
const formNameCache: Record<string, string> = {};

export async function getFormName(formId: string): Promise<string> {
  if (!formId) return "";
  if (formNameCache[formId]) return formNameCache[formId];

  const accessToken = process.env.META_ACCESS_TOKEN;
  if (!accessToken) return `Formulário #${formId}`;

  try {
    const url = `https://graph.facebook.com/v22.0/${formId}?fields=name&access_token=${accessToken}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.name) {
        formNameCache[formId] = data.name;
        return data.name;
      }
    }
  } catch (err) {
    console.error(`Erro ao buscar nome do formulário ${formId}:`, err);
  }

  return `Formulário #${formId}`;
}

export async function getLeadDetails(leadgenId: string, preloadedFormId?: string): Promise<MetaLeadData | null> {
  const accessToken = process.env.META_ACCESS_TOKEN;
  
  if (!accessToken) {
    console.error("META_ACCESS_TOKEN não está definido");
    return null;
  }

  if (leadgenId === '444444444444') {
    console.log('[TESTE META] Lead de teste simulado pelo painel da Meta detectado! Gerando dados mock para teste de integração.');
    return {
      id: leadgenId,
      created_time: new Date().toISOString(),
      field_data: [
        { name: 'full_name', values: ['Lead de Teste Meta'] },
        { name: 'email', values: ['lead_teste@exemplo.com'] },
        { name: 'phone_number', values: ['+5511999999999'] },
      ],
      form_id: preloadedFormId || '1076746638055354',
      form_name: '[U.M] FORM PADRÃO - ALPHAVILLE II [LÓG.COND.] [10/09/26]',
      platform: 'fb'
    };
  }

  // Busca o lead com os campos enriquecidos de formulário, anúncio e campanha
  const fields = 'id,created_time,field_data,form_id,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,platform';
  const url = `https://graph.facebook.com/v22.0/${leadgenId}?fields=${fields}&access_token=${accessToken}`;

  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Erro ao buscar lead do Meta (${response.status}):`, errorText);
      return null;
    }

    const data = await response.json();
    const leadData: MetaLeadData = data as MetaLeadData;

    // Se tiver form_id, buscar nome amigável do formulário
    const targetFormId = leadData.form_id || preloadedFormId;
    if (targetFormId) {
      leadData.form_id = targetFormId;
      leadData.form_name = await getFormName(targetFormId);
    }

    return leadData;
  } catch (error) {
    console.error("Erro na requisição para o Meta:", error);
    return null;
  }
}

export async function getPageLeadForms(): Promise<Array<{ id: string; name: string; status: string; locale?: string }>> {
  const accessToken = process.env.META_ACCESS_TOKEN;
  const pageId = process.env.META_PAGE_ID || "923277277786867";

  if (!accessToken) return [];

  try {
    const url = `https://graph.facebook.com/v22.0/${pageId}/leadgen_forms?fields=id,name,status,locale&limit=100&access_token=${accessToken}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.error("Erro ao listar formulários da página:", await res.text());
      return [];
    }

    const data = await res.json();
    if (data.data && Array.isArray(data.data)) {
      // Popula cache
      for (const form of data.data) {
        if (form.id && form.name) {
          formNameCache[form.id] = form.name;
        }
      }
      return data.data;
    }
    return [];
  } catch (error) {
    console.error("Erro ao consultar formulários da página:", error);
    return [];
  }
}
