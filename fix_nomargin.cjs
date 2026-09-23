const fs = require('fs');

const files = [
  'src/pages/Insumos.tsx',
  'src/pages/ManejoReprodutivo.tsx',
  'src/pages/ManejoSanitario.tsx',
  'src/pages/Pastagens.tsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Remove incorrectly placed 'noMargin'
  content = content.replace(/^[ \t]*noMargin\s*\n/gm, '');
  content = content.replace(/\n[ \t]*noMargin\s*(?=\n)/g, '');

  fs.writeFileSync(file, content);
});
