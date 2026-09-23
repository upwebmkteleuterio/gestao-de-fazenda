const fs = require('fs');
const path = 'src/store/useUIStore.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace("| 'UI Kit';", "| 'Lotes'\n   | 'UI Kit';");
fs.writeFileSync(path, content);
