const fs = require('fs');

const file2 = 'src/lib/imobzi.ts';
let code2 = fs.readFileSync(file2, 'utf8');

// Use string replacement instead of regex to avoid whitespace issues
const originalLoad = `function loadMappingConfig(): FieldMappingConfig {
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
}`;

const originalLoadWindows = originalLoad.replace(/\n/g, '\r\n');

const loadFunc = `export async function loadMappingConfig(): Promise<FieldMappingConfig> {
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
}`;

code2 = code2.replace(originalLoad, loadFunc);
code2 = code2.replace(originalLoadWindows, loadFunc);


const originalSave = `function saveUpdatedConfig(config: FieldMappingConfig) {
  const configPath = path.join(process.cwd(), 'src', 'data', 'field-mapping.json');
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
  } catch (err) {
    console.error('Erro ao atualizar field-mapping.json:', err);
  }
}`;

const originalSaveWindows = originalSave.replace(/\n/g, '\r\n');

const saveFunc = `export async function saveUpdatedConfig(config: FieldMappingConfig) {
  await setSetting('field_mapping', config);
  const configPath = path.join(process.cwd(), 'src', 'data', 'field-mapping.json');
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
  } catch (err) {}
}`;

code2 = code2.replace(originalSave, saveFunc);
code2 = code2.replace(originalSaveWindows, saveFunc);

if (!code2.includes('getSetting')) {
  code2 = code2.replace("import path from 'path';", "import path from 'path';\r\nimport { getSetting, setSetting } from './db';");
}
code2 = code2.replace(/const config = loadMappingConfig\(\);/g, 'const config = await loadMappingConfig();');

// Also export FieldMappingConfig type
code2 = code2.replace("interface FieldMappingConfig", "export interface FieldMappingConfig");

fs.writeFileSync(file2, code2);
console.log('done');
