const fs = require('fs');

// Patch Insumos.tsx
let content = fs.readFileSync('src/pages/Insumos.tsx', 'utf8');
content = content.replace(
  '        handleSaveBaixa={handleSaveBaixa}',
  '        handleSaveBaixa={handleSaveBaixa}\n        setItemToDelete={setItemToDelete}\n        setModalOpen={setModalOpen}\n        insumos={insumos}'
);
fs.writeFileSync('src/pages/Insumos.tsx', content);

// Patch InsumosSlidePanel.tsx
let slideContent = fs.readFileSync('src/pages/Insumos/components/InsumosSlidePanel.tsx', 'utf8');
slideContent = slideContent.replace(
  '  formBaixa, setFormBaixa, handleSaveBaixa',
  '  formBaixa, setFormBaixa, handleSaveBaixa,\n  setItemToDelete, setModalOpen, insumos'
);
fs.writeFileSync('src/pages/Insumos/components/InsumosSlidePanel.tsx', slideContent);
