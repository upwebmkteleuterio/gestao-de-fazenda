const fs = require('fs');

const path = 'src/pages/Animais/components/AnimaisSlidePanel.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add animais and handleCreateFilho to props
content = content.replace('calcularIdadeFormatada, showToast', 'calcularIdadeFormatada, showToast, animais = [], handleCreateFilho');

// 2. Add datalist to the file, and change input implementations
const datalistBlock = `
    <datalist id="maes-list">
      {animais.filter((a: any) => a.tipo_animal === 'vaca' || a.tipo_animal === 'matriz').map((a: any) => (
        <option key={a.brinco} value={a.brinco}>{a.brinco} ({a.raca || 'Sem raça'})</option>
      ))}
    </datalist>
    <datalist id="pais-list">
      {animais.filter((a: any) => a.tipo_animal === 'touro').map((a: any) => (
        <option key={a.brinco} value={a.brinco}>{a.brinco} ({a.raca || 'Sem raça'})</option>
      ))}
    </datalist>
`;

content = content.replace('<SlidePanel', datalistBlock + '\\n    <SlidePanel');

// 3. Fix View Mode Outputs
const viewOld = `
              <div>
                <p className="text-xs text-gray-400 uppercase font-semibold">Peso Atual</p>
                <p className="font-medium text-gray-800 dark:text-gray-200">{selectedAnimal.peso_atual ? \`\${selectedAnimal.peso_atual} kg\` : 'N/I'}</p>
              </div>
`;

const viewNew = `
              <div>
                <p className="text-xs text-gray-400 uppercase font-semibold">Peso Atual</p>
                <p className="font-medium text-gray-800 dark:text-gray-200">{selectedAnimal.peso_atual ? \`\${selectedAnimal.peso_atual} kg\` : 'N/I'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase font-semibold">Cor / Pelagem</p>
                <p className="font-medium text-gray-800 dark:text-gray-200">{selectedAnimal.cor || 'N/I'}</p>
              </div>
              {selectedAnimal.mae_id && (
                <div>
                  <p className="text-xs text-gray-400 uppercase font-semibold">Mãe</p>
                  <p className="font-medium text-gray-800 dark:text-gray-200">{selectedAnimal.mae_id}</p>
                </div>
              )}
              {selectedAnimal.pai_id && (
                <div>
                  <p className="text-xs text-gray-400 uppercase font-semibold">Pai</p>
                  <p className="font-medium text-gray-800 dark:text-gray-200">{selectedAnimal.pai_id}</p>
                </div>
              )}
`;

content = content.replace(viewOld, viewNew);

// 4. View Mode Matriz Reprodutiva Outputs
const matrizViewOld = `
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
`;

const matrizViewNew = `
            {selectedAnimal.tipo_animal === 'matriz' && (
              <div className="bg-purple-50/50 dark:bg-purple-950/20 p-4 rounded-xl border border-purple-100 dark:border-purple-800/40 space-y-4">
                <h4 className="text-xs font-bold text-purple-800 dark:text-purple-400 uppercase">Ficha Reprodutiva</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-purple-600 dark:text-purple-400 uppercase font-semibold">Status Reprodutivo</p>
                    <p className="font-medium text-gray-800 dark:text-gray-200">{selectedAnimal.status_reprodutivo || 'N/I'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-purple-600 dark:text-purple-400 uppercase font-semibold">Touro Cobertura</p>
                    <p className="font-medium text-gray-800 dark:text-gray-200">{selectedAnimal.touro_cobertura || 'N/I'}</p>
                  </div>
                </div>
                {selectedAnimal.historico_toque && selectedAnimal.historico_toque.length > 0 && (
                  <div className="pt-2 border-t border-purple-100 dark:border-purple-800/40">
                    <p className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">Histórico de Toques (Diagnósticos)</p>
                    <div className="space-y-2">
                      {selectedAnimal.historico_toque.map((toq: any) => (
                        <div key={toq.id} className="p-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg flex justify-between items-center text-sm">
                          <div>
                            <span className="font-bold">{toq.ano}</span> - {new Date(toq.data + 'T00:00:00').toLocaleDateString('pt-BR')}
                            {toq.observacoes && <span className="block text-xs text-gray-500 mt-1">{toq.observacoes}</span>}
                          </div>
                          <Badge variant={toq.resultado === 'cheia' ? 'success' : 'danger'}>
                            {toq.resultado === 'cheia' ? 'Cheia' : 'Vazia'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
`;

content = content.replace(matrizViewOld, matrizViewNew);

// 5. Replace Pai and Mae inputs with list attributes
const maeInputOld = `label="Mãe (Input Brinco/ID)"
                    id="mae_id"
                    value={formData.mae_id || ''}
                    onChange={(e) => setFormData({ ...formData, mae_id: e.target.value })}
                    placeholder="BR-0012"`;

const maeInputNew = `label="Mãe (Selecione ou Digite)"
                    id="mae_id"
                    value={formData.mae_id || ''}
                    onChange={(e) => setFormData({ ...formData, mae_id: e.target.value })}
                    placeholder="Ex: BR-0012"
                    list="maes-list"`;

const paiInputOld = `label="Pai (Input Brinco/ID)"
                    id="pai_id"
                    value={formData.pai_id || ''}
                    onChange={(e) => setFormData({ ...formData, pai_id: e.target.value })}
                    placeholder="BR-0102"`;

const paiInputNew = `label="Pai (Selecione ou Digite)"
                    id="pai_id"
                    value={formData.pai_id || ''}
                    onChange={(e) => setFormData({ ...formData, pai_id: e.target.value })}
                    placeholder="Ex: BR-0102"
                    list="pais-list"`;

content = content.replace(maeInputOld, maeInputNew);
content = content.replace(paiInputOld, paiInputNew);

// 6. Matriz actions - make them functional
const descarteOld = `<Button type="button" variant="danger" className="text-xs py-1.5 px-3">
                        Encaminhar Vaca para Descarte
                      </Button>`;

const descarteNew = `<Button 
                        type="button" 
                        variant="danger" 
                        className="text-xs py-1.5 px-3"
                        onClick={() => {
                          setFormData({ ...formData, status: 'descarte' });
                          showToast('Vaca marcada como Descarte.', 'info');
                          window.scrollTo(0, 0); // Opcional, para ver o campo de descarte
                        }}
                      >
                        Encaminhar Vaca para Descarte
                      </Button>`;

const vincularBezerroOld = `<Button type="button" variant="secondary" className="text-xs py-1.5 px-3" icon={Activity}>
                        Vincular Novo Bezerro
                      </Button>`;

const vincularBezerroNew = `<Button 
                        type="button" 
                        variant="secondary" 
                        className="text-xs py-1.5 px-3" 
                        icon={Activity}
                        onClick={() => {
                          if (slideMode === 'create') {
                            showToast('Salve a matriz antes de vincular bezerros.', 'error');
                            return;
                          }
                          setSlideOpen(false);
                          setTimeout(() => {
                            if (handleCreateFilho) handleCreateFilho(formData.brinco || '');
                          }, 300);
                        }}
                      >
                        Vincular Novo Bezerro
                      </Button>`;

content = content.replace(descarteOld, descarteNew);
content = content.replace(vincularBezerroOld, vincularBezerroNew);

// 7. Age vs Date logic. Add a numeric field next to Data de Nascimento
// Need to find Data de nascimento block
const dataNascimentoOld = `<Input
                label="Data de Nascimento"
                id="data_nascimento"
                type="date"
                value={formData.data_nascimento || ''}
                onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })}
                hint={\`Idade estimada: \${calcularIdadeFormatada(formData.data_nascimento || '')}\`}
              />`;

const dataNascimentoNew = `<div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Input
                    label="Data Nascimento (Exata)"
                    id="data_nascimento"
                    type="date"
                    value={formData.data_nascimento || ''}
                    onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })}
                  />
                </div>
                <div className="w-24">
                  <Input
                    label="Idade (Meses)"
                    id="idade_estimada"
                    type="number"
                    placeholder="Ex: 24"
                    onChange={(e) => {
                      const meses = parseInt(e.target.value);
                      if (!isNaN(meses) && meses >= 0) {
                        const d = new Date();
                        d.setMonth(d.getMonth() - meses);
                        setFormData({ ...formData, data_nascimento: d.toISOString().split('T')[0] });
                      }
                    }}
                    hint={formData.data_nascimento ? calcularIdadeFormatada(formData.data_nascimento) : ''}
                  />
                </div>
              </div>`;

content = content.replace(dataNascimentoOld, dataNascimentoNew);

fs.writeFileSync(path, content);
console.log('Slide panel updated successfully.');
