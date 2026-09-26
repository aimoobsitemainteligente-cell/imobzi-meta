const { neon } = require("@neondatabase/serverless");
const fs = require("fs");

function getEnvVar(key) {
  const envContent = fs.readFileSync(".env.local", "utf8");
  const match = envContent.match(new RegExp(`^${key}=(.*)$`, "m"));
  return match ? match[1].trim() : null;
}

async function run() {
  const databaseUrl = getEnvVar("DATABASE_URL");
  const apiSecret = getEnvVar("IMOBZI_API_SECRET");

  if (!databaseUrl || !apiSecret) {
    console.log("Faltam variáveis de ambiente");
    return;
  }

  const sql = neon(databaseUrl);

  console.log("Criando tabela imobzi_contacts...");
  await sql`
    CREATE TABLE IF NOT EXISTS imobzi_contacts (
      id SERIAL PRIMARY KEY,
      imobzi_db_id VARCHAR(100) UNIQUE,
      imobzi_code VARCHAR(100),
      name VARCHAR(255),
      phone VARCHAR(100),
      email VARCHAR(255),
      imobzi_link VARCHAR(255),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  console.log("Tabela criada.");

  console.log("Baixando contatos do Imobzi e salvando no Neon...");
  let page = 1;
  let hasMore = true;
  let totalInserted = 0;

  while (hasMore) {
    const url = `https://api.imobzi.app/v1/contacts?limit=100&page=${page}`;
    try {
      const res = await fetch(url, {
        headers: { "X-Imobzi-Secret": apiSecret }
      });
      const data = await res.json();
      
      if (data.contacts && data.contacts.length > 0) {
        for (const c of data.contacts) {
          const phone = c.phones && c.phones.length > 0 ? (c.phones[0].number_plain || c.phones[0].number || "").replace(/\D/g, "") : "";
          const email = c.email || (c.emails && c.emails.length > 0 ? c.emails[0] : "");
          const link = c.code ? `https://my.imobzi.com/#/contacts/person-${c.code.replace("person-", "")}` : "";

          // Inserir ou atualizar
          await sql`
            INSERT INTO imobzi_contacts (imobzi_db_id, imobzi_code, name, phone, email, imobzi_link)
            VALUES (${c.contact_id || null}, ${c.code || null}, ${c.fullname || c.name || "N/A"}, ${phone}, ${email}, ${link})
            ON CONFLICT (imobzi_db_id) DO UPDATE SET
              name = EXCLUDED.name,
              phone = EXCLUDED.phone,
              email = EXCLUDED.email,
              imobzi_link = EXCLUDED.imobzi_link
          `;
          totalInserted++;
        }
        
        console.log(`Baixados e salvos: ${totalInserted} contatos (Página ${page})`);
        
        page++;
        if (data.contacts.length < 50) {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
    } catch (err) {
      console.error("\nErro:", err.message);
      hasMore = false;
    }
  }

  console.log("Todos os contatos foram salvos no Neon com sucesso!");
}

run();
