const fs = require('fs');
const path = 'src/pages/Pastagens/components/PastagensModals.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/Excluir Pastagem \/ Lote/g, 'Excluir Piquete / Pasto');
content = content.replace(/excluir o lote/g, 'excluir a área');
fs.writeFileSync(path, content);
