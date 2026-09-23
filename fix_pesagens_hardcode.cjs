const fs = require('fs');
const path = 'src/pages/Pesagens/index.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/peso_kg: 450,/g, 'peso_kg: 0,');
fs.writeFileSync(path, content);

const path2 = 'src/pages/Pesagens/components/PesagemSlidePanel.tsx';
let content2 = fs.readFileSync(path2, 'utf8');
content2 = content2.replace(/peso_kg: row.peso_kg \|\| 450/g, 'peso_kg: row.peso_kg || 0');
fs.writeFileSync(path2, content2);
