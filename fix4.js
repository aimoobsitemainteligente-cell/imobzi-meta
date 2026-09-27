const fs = require('fs');
let code = fs.readFileSync('src/lib/imobzi.ts', 'utf8');
code = code.replace("export export interface", "export interface");
fs.writeFileSync('src/lib/imobzi.ts', code);
