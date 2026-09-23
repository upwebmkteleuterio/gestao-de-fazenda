const fs = require('fs');
const path = 'src/pages/Animais.tsx';
let content = fs.readFileSync(path, 'utf8');

const oldFn = `const handleCriarLoteComSelecionados = () => {
    if (selectedAnimalIds.length === 0) return;
    showToast(\`Lote criado com sucesso contendo \${selectedAnimalIds.length} animais selecionados!\`, 'success');
    clearSelectedAnimals();
  };`;

const newFn = `const handleCriarLoteComSelecionados = () => {
    if (selectedAnimalIds.length === 0) return;
    setLoteModalOpen(true);
  };

  const confirmarCriacaoLote = async () => {
    if (!nomeLote) return;
    setIsCreatingLote(true);
    try {
      const { lotesService } = await import('../services/lotesService');
      await lotesService.create(nomeLote, selectedAnimalIds);
      showToast(\`Lote "\${nomeLote}" criado com \${selectedAnimalIds.length} animais.\`, 'success');
      setLoteModalOpen(false);
      setNomeLote('');
      clearSelectedAnimals();
    } catch (e) {
      showToast('Erro ao criar lote', 'error');
    } finally {
      setIsCreatingLote(false);
    }
  };`;

if (content.includes("const handleCriarLoteComSelecionados")) {
  content = content.replace(oldFn, newFn);
}

fs.writeFileSync(path, content);
console.log('Fixed handleCriarLoteComSelecionados');
