const fs = require('fs');
const path = 'src/pages/ManejoReprodutivo.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/touro: 'Touro Nelore Elite PO'/g, "touro: ''");
content = content.replace(/condicao_corporal: '3\.5 \(Boa\)'/g, "condicao_corporal: ''");
content = content.replace(/nome_touro_monta: 'Touro Nelore Reprodutor #01'/g, "nome_touro_monta: ''");
content = content.replace(/nome_touro_monta: ev\.dados_protocolo\?\.touro \|\| 'Touro Nelore Reprodutor'/g, "nome_touro_monta: ev.dados_protocolo?.touro || ''");
content = content.replace(/tipo_embriao: 'Vitrificado FIV'/g, "tipo_embriao: ''");
content = content.replace(/tipo_embriao: ev\.dados_protocolo\?\.tipo_embriao \|\| 'Vitrificado FIV'/g, "tipo_embriao: ev.dados_protocolo?.tipo_embriao || ''");

fs.writeFileSync(path, content);
