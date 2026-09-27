const fs = require('fs');
const path = require('path');

const file2 = 'src/lib/imobzi.ts';
let code2 = fs.readFileSync(file2, 'utf8');

const loadFunc = `export async function loadMappingConfig(): Promise<FieldMappingConfig> {
  let config = await getSetting('field_mapping');
  if (config) return config;

  const configPath = require('path').join(process.cwd(), 'src', 'data', 'field-mapping.json');
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
}`;

const saveFunc = `export async function saveUpdatedConfig(config: FieldMappingConfig) {
  await setSetting('field_mapping', config);
  
  const configPath = require('path').join(process.cwd(), 'src', 'data', 'field-mapping.json');
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
  } catch (err) {
  }
}`;

code2 = code2.replace(/function loadMappingConfig\(\): FieldMappingConfig \{[\s\S]*?\}\n/, loadFunc + '\n');
code2 = code2.replace(/function saveUpdatedConfig\(config: FieldMappingConfig\) \{[\s\S]*?\}\n/, saveFunc + '\n');
if (!code2.includes('getSetting')) {
  code2 = code2.replace("import path from 'path';", "import path from 'path';\nimport { getSetting, setSetting } from './db';");
}
code2 = code2.replace(/const config = loadMappingConfig\(\);/g, 'const config = await loadMappingConfig();');

// Also export FieldMappingConfig type so api/mapping can use it if needed (though mapping API doesn't use it right now)
code2 = code2.replace("interface FieldMappingConfig", "export interface FieldMappingConfig");

fs.writeFileSync(file2, code2);
console.log('done');
