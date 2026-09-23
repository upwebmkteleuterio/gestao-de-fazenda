const fs = require('fs');
const path = 'src/services/pastagensService.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/p\.capacidade_suporte/g, 'p.lotacao_maxima');

fs.writeFileSync(path, content);
