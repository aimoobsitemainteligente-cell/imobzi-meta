const fs = require('fs');

const file = 'src/lib/db.ts';
let code = fs.readFileSync(file, 'utf8');

// 1. Add settings table to initDb
const tableSettings = `
    await sql\`
      CREATE TABLE IF NOT EXISTS settings (
        key VARCHAR(100) PRIMARY KEY,
        value JSONB,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    \`;
`;

code = code.replace(
  'CREATE TABLE IF NOT EXISTS meta_leads',
  tableSettings + '\n      CREATE TABLE IF NOT EXISTS meta_leads'
);

// 2. Add functions
const newFunctions = `
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
      INSERT INTO settings (key, value) VALUES (\${key}, \${JSON.stringify(value)})
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
    \`;
    return true;
  } catch (e) {
    console.error("Erro ao salvar setting:", e);
    return false;
  }
}
`;

code = code + '\n' + newFunctions;

fs.writeFileSync(file, code);
console.log('db.ts updated successfully');
