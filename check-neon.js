const { neon } = require("@neondatabase/serverless");
const fs = require("fs");
const env = fs.readFileSync(".env.local", "utf8");
const url = env.match(/^DATABASE_URL=(.*)$/m)[1].trim();
async function run() {
  const sql = neon(url);
  const res = await sql`SELECT count(*) as total, count(NULLIF(phone, '')) as with_phone FROM imobzi_contacts`;
  console.log(res);
}
run();