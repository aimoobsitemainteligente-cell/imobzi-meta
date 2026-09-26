const fs = require("fs");

function getEnvVar(key) {
  const envContent = fs.readFileSync(".env.local", "utf8");
  const match = envContent.match(new RegExp(`^${key}=(.*)$`, "m"));
  return match ? match[1].trim() : null;
}

async function test() {
  const apiSecret = getEnvVar("IMOBZI_API_SECRET");
  // Try searching a random phone from the spreadsheet, maybe 11986420556
  // We can just try to search 'telefone'
  const searchPhone = "11986420556";
  const url = `https://api.imobzi.app/v1/contacts?phone=${searchPhone}`;

  const res = await fetch(url, {
    headers: {
      "X-Imobzi-Secret": apiSecret,
    },
  });

  const json = await res.json();
  console.log("Total na pagina:", json.contacts ? json.contacts.length : 0);
  if (json.contacts && json.contacts.length > 0) {
    console.log("Exemplo:", JSON.stringify(json.contacts[0], null, 2));
  }
}

test();
