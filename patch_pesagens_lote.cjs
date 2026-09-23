const fs = require('fs');
const path = 'src/pages/Pesagens/index.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add import for useLotes
if (!content.includes("import { useLotes }")) {
  content = content.replace(
    "import { usePesagens } from '../../hooks/usePesagens';",
    "import { usePesagens } from '../../hooks/usePesagens';\nimport { useLotes } from '../../hooks/useLotes';"
  );
}

// 2. Extract useLotes hook
const usePesagensHook = `  const { pesagens, total, isLoading, createPesagem, createPesagemGrupo, updatePesagem, deletePesagem } = usePesagens({
    search,
    tipoAnimal,
    startDate,
    endDate,
    page,
    limit,
  });`;
  
const newUsePesagensHook = `  const { pesagens, total, isLoading, createPesagem, createPesagemGrupo, updatePesagem, deletePesagem } = usePesagens({
    search,
    tipoAnimal,
    startDate,
    endDate,
    page,
    limit,
  });
  const { createLote } = useLotes();`;
  
if (!content.includes("const { createLote }")) {
  content = content.replace(usePesagensHook, newUsePesagensHook);
}

// 3. Update confirmarCriacaoLote
const oldConfirmar = `  const confirmarCriacaoLote = () => {
    if (!loteName) {
      showToast('Por favor, informe o destino (Pasto/Lote).', 'error');
      return;
    }
    showToast(\`Lote movido para "\${loteName}" com sucesso contendo \${selectedPesagemIds.length} animais!\`, 'success');
    setSelectedPesagemIds([]);
    setLoteModalOpen(false);
  };`;
  
const newConfirmar = `  const confirmarCriacaoLote = async () => {
    if (!loteName) {
      showToast('Por favor, informe o nome do Lote.', 'error');
      return;
    }
    
    const animalIds = selectedPesagemIds
      .map(id => pesagens.find(p => p.id === id)?.animal_id)
      .filter(Boolean) as string[];

    try {
      await createLote({ nome: loteName, animais_ids: animalIds });
      showToast(\`Lote "\${loteName}" criado com \${animalIds.length} animais! Acesse a aba Lotes em Animais para gerenciá-lo.\`, 'success');
      setSelectedPesagemIds([]);
      setLoteModalOpen(false);
      setLoteName('');
    } catch (e) {
      showToast('Erro ao criar lote.', 'error');
    }
  };`;
  
content = content.replace(oldConfirmar, newConfirmar);

fs.writeFileSync(path, content);
console.log('Pesagens index updated');
