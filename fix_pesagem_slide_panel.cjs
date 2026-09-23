const fs = require('fs');
const path = 'src/pages/Pesagens/components/PesagemSlidePanel.tsx';
let content = fs.readFileSync(path, 'utf8');

// We need to inject Trash2 icon.
if (!content.includes('Trash2')) {
  content = content.replace('X, Layers, Plus', 'X, Layers, Plus, Trash2');
}

const oldGrupoBlock = `                <p className="text-xs font-bold uppercase text-gray-500">Animais e Pesos do Lote</p>
                {grupoRows.map((row, idx) => (
                  <div key={idx} className="flex items-center space-x-2">
                    <div className="flex-1">
                      <Select
                        id={\`grupo_animal_\${idx}\`}
                        value={row.animal_id}
                        onChange={(e) => {
                          const id = e.target.value;
                          const found = animais.find(a => a.id === id);
                          const copy = [...grupoRows];
                          copy[idx] = { ...copy[idx], animal_id: id, brinco_animal: found?.brinco || '' };
                          setGrupoRows(copy);
                        }}
                        options={[
                          { label: 'Selecione o animal...', value: '' },
                          ...animais.map(a => ({ label: a.brinco, value: a.id }))
                        ]}
                      />
                    </div>
                    <div className="w-28">
                      <Input
                        id={\`grupo_peso_\${idx}\`}
                        type="number"
                        placeholder="kg"
                        value={row.peso_kg || ''}
                        onChange={(e) => {
                          const copy = [...grupoRows];
                          copy[idx] = { ...copy[idx], peso_kg: Number(e.target.value) };
                          setGrupoRows(copy);
                        }}
                      />
                    </div>
                  </div>
                ))}
                
                <Button
                  variant="secondary"
                  icon={Plus}
                  onClick={() => setGrupoRows([...grupoRows, { animal_id: '', brinco_animal: '', peso_kg: 0 }])}
                  className="w-full justify-center text-xs"
                >
                  Adicionar Mais Linha
                </Button>`;
                
const newGrupoBlock = `                <p className="text-xs font-bold uppercase text-gray-500">Animais e Pesos</p>
                {grupoRows.map((row, idx) => {
                  const selectedIds = grupoRows.map(r => r.animal_id).filter(id => id && id !== row.animal_id);
                  const animalOptions = animais.map(a => ({
                    label: a.brinco,
                    value: a.id,
                    disabled: selectedIds.includes(a.id)
                  })).sort((a, b) => {
                    if (a.disabled && !b.disabled) return 1;
                    if (!a.disabled && b.disabled) return -1;
                    return a.label.localeCompare(b.label);
                  });

                  return (
                  <div key={idx} className="flex items-center space-x-2">
                    <div className="flex-1">
                      <Select
                        id={\`grupo_animal_\${idx}\`}
                        value={row.animal_id}
                        onChange={(e) => {
                          const id = e.target.value;
                          const found = animais.find(a => a.id === id);
                          const copy = [...grupoRows];
                          copy[idx] = { ...copy[idx], animal_id: id, brinco_animal: found?.brinco || '' };
                          setGrupoRows(copy);
                        }}
                        options={[
                          { label: 'Selecione o animal...', value: '' },
                          ...animalOptions
                        ]}
                        noMargin
                      />
                    </div>
                    <div className="w-24">
                      <Input
                        id={\`grupo_peso_\${idx}\`}
                        type="number"
                        placeholder="kg"
                        value={row.peso_kg || ''}
                        onChange={(e) => {
                          const copy = [...grupoRows];
                          copy[idx] = { ...copy[idx], peso_kg: Number(e.target.value) };
                          setGrupoRows(copy);
                        }}
                        noMargin
                      />
                    </div>
                    {grupoRows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const copy = [...grupoRows];
                          copy.splice(idx, 1);
                          setGrupoRows(copy);
                        }}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors mt-0 shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )})}
                
                <Button
                  type="button"
                  variant="secondary"
                  icon={Plus}
                  onClick={() => setGrupoRows([...grupoRows, { animal_id: '', brinco_animal: '', peso_kg: 0 }])}
                  className="w-full justify-center text-xs mt-2"
                >
                  Adicionar animal
                </Button>`;

content = content.replace(oldGrupoBlock, newGrupoBlock);
fs.writeFileSync(path, content);
console.log("PesagemSlidePanel updated!");
