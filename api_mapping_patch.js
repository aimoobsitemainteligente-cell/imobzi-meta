const fs = require('fs');

let file = 'src/app/api/mapping/route.ts';
let code = fs.readFileSync(file, 'utf8');

// Replace local fs writing with saveUpdatedConfig from imobzi
code = code.replace(
  /const mappingFilePath = path\.join\(process\.cwd\(\), "src", "data", "field-mapping\.json"\);\s*export async function GET/,
  "import { loadMappingConfig, saveUpdatedConfig } from '@/lib/imobzi';\n\nexport async function GET"
);

code = code.replace(
  /const fileData = fs\.readFileSync\(mappingFilePath, 'utf8'\);\s*const currentMapping = JSON\.parse\(fileData\);/,
  "const currentMapping = await loadMappingConfig();"
);

code = code.replace(
  /fs\.writeFileSync\(mappingFilePath, JSON\.stringify\(body, null, 2\), 'utf8'\);/,
  "await saveUpdatedConfig(body);"
);

fs.writeFileSync(file, code);

file = 'src/app/api/test-lead/route.ts';
if(fs.existsSync(file)) {
  let code2 = fs.readFileSync(file, 'utf8');
  if(!code2.includes('loadMappingConfig')) {
     code2 = code2.replace("import path from 'path';", "import path from 'path';\nimport { loadMappingConfig } from '@/lib/imobzi';");
     code2 = code2.replace(/const p = path\.join\(process\.cwd\(\), 'src', 'data', 'field-mapping\.json'\);\s*const c = JSON\.parse\(fs\.readFileSync\(p, 'utf8'\)\);/, "const c = await loadMappingConfig();");
     fs.writeFileSync(file, code2);
  }
}
console.log('patched APIs');
