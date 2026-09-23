const fs = require('fs');

let content = fs.readFileSync('src/pages/Pastagens.tsx', 'utf8');
content = content.replace(
  '        setPastoToDelete={setPastoToDelete}',
  '        setPastoToDelete={setPastoToDelete}\n        animaisNoPasto={animaisNoPasto}\n        resumoRebanhoPasto={resumoRebanhoPasto}\n        servicosDoPasto={servicosDoPasto}'
);
fs.writeFileSync('src/pages/Pastagens.tsx', content);

let slideContent = fs.readFileSync('src/pages/Pastagens/components/PastagensSlidePanel.tsx', 'utf8');
slideContent = slideContent.replace(
  '  handleSavePasto, handleAddServico, setModalOpen, setPastoToDelete',
  '  handleSavePasto, handleAddServico, setModalOpen, setPastoToDelete,\n  animaisNoPasto, resumoRebanhoPasto, servicosDoPasto'
);
fs.writeFileSync('src/pages/Pastagens/components/PastagensSlidePanel.tsx', slideContent);
