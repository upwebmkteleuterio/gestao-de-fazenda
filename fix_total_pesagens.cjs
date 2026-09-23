const fs = require('fs');
const path = 'src/pages/Pesagens/index.tsx';
let content = fs.readFileSync(path, 'utf8');

const regex = /const \{ pesagens, isLoading, createPesagem, createPesagemGrupo, updatePesagem, deletePesagem \} = usePesagens\(\{/;

const newStr = `const { pesagens, total, isLoading, createPesagem, createPesagemGrupo, updatePesagem, deletePesagem } = usePesagens({`;

content = content.replace(regex, newStr);

const regex2 = /endDate,[\s\S]*?\}\);/;
const newStr2 = `endDate,
    page,
    limit,
  });`;

content = content.replace(regex2, newStr2);
fs.writeFileSync(path, content);
console.log('Fixed total in usePesagens');
