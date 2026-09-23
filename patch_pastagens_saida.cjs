const fs = require('fs');

let content = fs.readFileSync('src/pages/Pastagens.tsx', 'utf8');
content = content.replace(
  '        servicosDoPasto={servicosDoPasto}',
  '        servicosDoPasto={servicosDoPasto}\n        checkSaidaVencida={checkSaidaVencida}'
);
fs.writeFileSync('src/pages/Pastagens.tsx', content);

let slideContent = fs.readFileSync('src/pages/Pastagens/components/PastagensSlidePanel.tsx', 'utf8');
slideContent = slideContent.replace(
  '  animaisNoPasto, resumoRebanhoPasto, servicosDoPasto',
  '  animaisNoPasto, resumoRebanhoPasto, servicosDoPasto, checkSaidaVencida'
);
fs.writeFileSync('src/pages/Pastagens/components/PastagensSlidePanel.tsx', slideContent);
