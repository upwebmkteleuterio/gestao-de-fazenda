const fs = require('fs');
const path = 'src/pages/Animais.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Import useLotes
if (!content.includes("import { useLotes }")) {
  content = content.replace(
    "import { useAnimais }",
    "import { useLotes } from '../hooks/useLotes';\nimport { useAnimais }"
  );
}

// 2. Destructure useLotes
if (!content.includes("const { lotes } = useLotes()")) {
  content = content.replace(
    "const { pastagens } = usePastagens();",
    "const { pastagens } = usePastagens();\n  const { lotes, createLote } = useLotes();"
  );
}

// 3. Update main tab state to include lotes
if (!content.includes("const [mainTab, setMainTab] = useState<'rebanho' | 'descartadas' | 'lotes'>")) {
  content = content.replace(
    "const [mainTab, setMainTab] = useState<'rebanho' | 'descartadas'>('rebanho');",
    "const [mainTab, setMainTab] = useState<'rebanho' | 'descartadas' | 'lotes'>('rebanho');"
  );
}

// 4. Update the Lote handler
const oldConfirmHandler = `const confirmarCriacaoLote = async () => {
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

const newConfirmHandler = `const confirmarCriacaoLote = async () => {
    if (!nomeLote) return;
    setIsCreatingLote(true);
    try {
      await createLote({ nome: nomeLote, animais_ids: selectedAnimalIds });
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

if (content.includes("await lotesService.create")) {
  content = content.replace(oldConfirmHandler, newConfirmHandler);
}

// 5. Update tabs rendering
const oldTabsStr = `tabs={[
            { id: 'rebanho', label: 'Rebanho Geral' },
            { id: 'descartadas', label: 'Vacas Descartadas', badge: vacasDescartadas.length > 0 ? vacasDescartadas.length : undefined },
          ]}`;

const newTabsStr = `tabs={[
            { id: 'rebanho', label: 'Rebanho Geral' },
            { id: 'descartadas', label: 'Vacas Descartadas', badge: vacasDescartadas.length > 0 ? vacasDescartadas.length : undefined },
            { id: 'lotes', label: 'Lotes / Retiros', badge: lotes.length > 0 ? lotes.length : undefined },
          ]}`;
content = content.replace(oldTabsStr, newTabsStr);

// 6. Update conditional rendering inside Card
const oldRenderDescartadas = `{mainTab === 'descartadas' && (`;
const newRenderLotes = `
        {mainTab === 'lotes' && (
          <div className="p-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Lotes Criados</h3>
            {lotes.length === 0 ? (
              <p className="text-gray-500 text-sm">Nenhum lote criado ainda.</p>
            ) : (
              <Table
                columns={[
                  { header: 'Nome do Lote', accessor: 'nome' },
                  { header: 'Data de Criação', accessor: (r) => new Date(r.data_criacao).toLocaleDateString('pt-BR') },
                  { header: 'Quantidade de Animais', accessor: (r) => \`\${r.animais_ids.length} cabeças\` }
                ]}
                data={lotes as any}
                onRowClick={() => {}}
                onAction={() => {}}
              />
            )}
          </div>
        )}
        {mainTab === 'descartadas' && (`;

content = content.replace(oldRenderDescartadas, newRenderLotes);

fs.writeFileSync(path, content);
console.log('Animais Lotes tab applied!');
