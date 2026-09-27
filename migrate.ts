import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

async function migrate() {
  const sql = neon(process.env.DATABASE_URL!);
  await sql`ALTER TABLE tv_leads ALTER COLUMN estagio TYPE TEXT;`;
  await sql`ALTER TABLE tv_leads ALTER COLUMN nome TYPE TEXT;`;
  await sql`ALTER TABLE tv_leads ALTER COLUMN corretor_nome TYPE TEXT;`;
  console.log("Migration done");
}

migrate();
