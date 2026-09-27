const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const dbUrl = fs.readFileSync('.env.local', 'utf8').match(/^DATABASE_URL=(.*)$/m)[1];
const sql = neon(dbUrl);
sql`SELECT origem, count(*) FROM tv_leads GROUP BY origem;`.then(console.log);
