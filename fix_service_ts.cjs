const fs = require('fs');
const path = 'src/services/lotesService.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace("id: \\`lote-\\${Date.now()}\\`,", "id: `lote-${Date.now()}`,");
fs.writeFileSync(path, content);
