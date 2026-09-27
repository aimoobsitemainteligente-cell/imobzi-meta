const fs = require('fs');
const file = 'src/lib/imobzi.ts';
let code = fs.readFileSync(file, 'utf8');

const importAdd = `import { getSetting, setSetting } from './db';\n`;
if (!code.includes('getSetting')) {
  code = code.replace("import path from 'path';", "import path from 'path';\n" + importAdd);
}

const loadConfigReplaced = `
export async function loadMappingConfig(): Promise<FieldMappingConfig> {
  let config = await getSetting('field_mapping');
  if (config) return config;

  const configPath = path.join(process.cwd(), 'src', 'data', 'field-mapping.json');
  try {
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      await setSetting('field_mapping', config);
      return config;
    }
  } catch (err) {
    console.error('Erro ao ler field-mapping.json:', err);
  }

  // Configuração padrão de fallback
  const defaultConfig = {
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
  await setSetting('field_mapping', defaultConfig);
  return defaultConfig;
}
`;

// Replace loadMappingConfig
code = code.replace(/function loadMappingConfig\(\): FieldMappingConfig \{[\s\S]*?\}\n/, loadConfigReplaced);

// Replace saveUpdatedConfig
const saveConfigReplaced = `
export async function saveUpdatedConfig(config: FieldMappingConfig) {
  await setSetting('field_mapping', config);
  
  // Opcional: Manter backup local
  const configPath = path.join(process.cwd(), 'src', 'data', 'field-mapping.json');
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
  } catch (err) {
    // ignorado em prod
  }
}
`;

code = code.replace(/function saveUpdatedConfig\(config: FieldMappingConfig\) \{[\s\S]*?\}\n/, saveConfigReplaced);

// Update usages
code = code.replace(/const config = loadMappingConfig\(\);/g, 'const config = await loadMappingConfig();');

fs.writeFileSync(file, code);
console.log('imobzi.ts updated successfully');
