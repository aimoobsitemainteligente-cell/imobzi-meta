const fs = require('fs');

const file = 'src/lib/db.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  'CREATE TABLE IF NOT EXISTS meta_leads',
  'CREATE TABLE IF NOT EXISTS settings (key VARCHAR(100) PRIMARY KEY, value JSONB, updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);\n      CREATE TABLE IF NOT EXISTS meta_leads'
);

code += `
export async function getSetting(key: string): Promise<any> {
  const sql = getSql();
  if (!sql) return null;
  try {
    await initDb();
    const rows = await sql\`SELECT value FROM settings WHERE key = \${key}\`;
    if (rows.length > 0) return rows[0].value;
  } catch (e) {
    console.error("Erro ao ler setting:", e);
  }
  return null;
}

export async function setSetting(key: string, value: any): Promise<boolean> {
  const sql = getSql();
  if (!sql) return false;
  try {
    await initDb();
    await sql\`
      INSERT INTO settings (key, value) VALUES (\${key}, \${JSON.stringify(value)}::jsonb)
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
    \`;
    return true;
  } catch (e) {
    console.error("Erro ao salvar setting:", e);
    return false;
  }
}
`;

fs.writeFileSync(file, code);

const file2 = 'src/lib/imobzi.ts';
let code2 = fs.readFileSync(file2, 'utf8');
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

const saveFunc = `export async function saveUpdatedConfig(config: FieldMappingConfig) {
  await setSetting('field_mapping', config);
  
  const configPath = path.join(process.cwd(), 'src', 'data', 'field-mapping.json');
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
fs.writeFileSync(file2, code2);
console.log('done');
