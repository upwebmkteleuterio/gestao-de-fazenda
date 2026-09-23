const fs = require('fs');

const files = [
  'src/pages/Financeiro.tsx',
  'src/pages/Lotes/index.tsx',
  'src/pages/Pastagens.tsx',
  'src/pages/ManejoReprodutivo.tsx',
  'src/pages/ManejoSanitario.tsx',
  'src/pages/Insumos.tsx'
];

for (const path of files) {
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace(/(<\s*Table[^>]*>[\s\S]*?<\/\s*Table>|<\s*Table[^>]*\/>)(\s*<\s*Pagination[\s\S]*?<\/\s*Pagination>|<\s*Pagination[^>]*\/>)/g, "<>\n$1\n$2\n</>");
  fs.writeFileSync(path, content);
}
