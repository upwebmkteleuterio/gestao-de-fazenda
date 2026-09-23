const fs = require('fs');
const path = 'src/pages/Financeiro.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/valor: 45000\.00,/g, "valor: 0,");
content = content.replace(/valor: 10000\.00,/g, "valor: 0,");
content = content.replace(/categoria: 'venda_gado',/g, "categoria: '',");

fs.writeFileSync(path, content);
