const fs = require('fs');
const path = 'src/pages/Animais.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add states for Lote View Modal
if (!content.includes("viewLoteModalOpen")) {
  content = content.replace(
    "const [loteModalOpen, setLoteModalOpen] = useState(false);",
    "const [loteModalOpen, setLoteModalOpen] = useState(false);\n  const [viewLoteModalOpen, setViewLoteModalOpen] = useState(false);\n  const [selectedLote, setSelectedLote] = useState<any>(null);"
  );
}

// 2. Add handleOpenLoteView function
if (!content.includes("const handleOpenLoteView")) {
  content = content.replace(
    "const handleOpenView = (animal: Animal) => {",
    `const handleOpenLoteView = (lote: any) => {
    setSelectedLote(lote);
    setViewLoteModalOpen(true);
  };

  const handleOpenView = (animal: Animal) => {`
  );
}

// 3. Add the Modal HTML
const modalHtml = `
      {/* Modal Visualizar Lote */}
      {viewLoteModalOpen && selectedLote && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <Layers className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedLote.nome}</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Criado em {new Date(selectedLote.data_criacao).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>
              <button onClick={() => setViewLoteModalOpen(false)} className="text-gray-400 hover:text-gray-500">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-0 overflow-y-auto flex-1 bg-gray-50/50 dark:bg-gray-900/20">
              <Table
                columns={[
                  { header: 'ID / Brinco', render: (r) => <span className="font-bold">{r.brinco}</span> },
                  { header: 'Categoria', accessor: 'categoria' },
                  { header: 'Tipo', accessor: 'tipo_animal' },
                  { header: 'Sexo', accessor: 'sexo' }
                ]}
                data={todosAnimais.filter((a) => selectedLote.animais_ids.includes(a.id))}
                emptyMessage="Nenhum animal encontrado."
              />
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-900/50 px-6 py-4 flex justify-between items-center border-t border-gray-100 dark:border-gray-800">
              <div className="text-sm text-gray-500">
                Total: <span className="font-bold text-gray-900 dark:text-white">{selectedLote.animais_ids.length}</span> animais
              </div>
              <Button variant="secondary" onClick={() => setViewLoteModalOpen(false)}>Fechar</Button>
            </div>
          </div>
        </div>
      )}`;

if (!content.includes("Modal Visualizar Lote")) {
  content = content.replace("    </div>\n  );\n};", modalHtml + "\n    </div>\n  );\n};");
}

fs.writeFileSync(path, content);
console.log('Lote View logic applied!');
