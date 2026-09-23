const fs = require('fs');
const path = 'src/pages/Pastagens.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/responsavel: 'Carlos Silva'/g, "responsavel: ''");
fs.writeFileSync(path, content);
