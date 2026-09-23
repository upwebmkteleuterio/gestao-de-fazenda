const fs = require('fs');
const path = 'src/pages/ManejoReprodutivo.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/condicao_corporal: ev\.dados_protocolo\?\.condicao_corporal \|\| '3\.5 \(Boa\)'/g, "condicao_corporal: ev.dados_protocolo?.condicao_corporal || ''");

fs.writeFileSync(path, content);
