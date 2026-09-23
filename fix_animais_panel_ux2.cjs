const fs = require('fs');
const path = 'src/pages/Animais/components/AnimaisSlidePanel.tsx';
const content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');

const startIndex = lines.findIndex(l => l.includes('Gatilho Principal: Tipo de Animal'));
const endIndex = lines.findIndex((l, i) => i > startIndex && l.includes('label="Sexo *"')); // The next component

if (startIndex === -1 || endIndex === -1) {
  console.log('Could not find boundaries!');
  process.exit(1);
}

const newStr = `            {/* ROW 1: Tipo e Brinco */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Tipo de Animal *"
                id="tipo_animal"
                value={formData.tipo_animal}
                onChange={(e) => {
                  const newTipo = e.target.value;
                  setFormData({
                    ...formData,
                    tipo_animal: newTipo,
                    sexo: newTipo === 'vaca' || newTipo === 'matriz' ? 'F' : newTipo === 'touro' ? 'M' : formData.sexo,
                  });
                }}
                options={[
                  { label: 'Vaca', value: 'vaca' },
                  { label: 'Bezerro/a', value: 'bezerro' },
                  { label: 'Matriz', value: 'matriz' },
                  { label: 'Touro', value: 'touro' },
                ]}
                noMargin
              />
              <Input
                label="ID / Brinco *"
                id="brinco"
                value={formData.brinco || ''}
                onChange={(e) => setFormData({ ...formData, brinco: e.target.value })}
                placeholder="Ex: BR-0099"
                required
                noMargin
              />
            </div>

            {/* ROW 2: Nascimento ou Idade */}
            <div className="bg-gray-50/50 dark:bg-gray-900/20 border border-gray-100 dark:border-gray-800 p-4 rounded-xl space-y-3 col-span-1 sm:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Registro de Idade</label>
                <div className="flex bg-gray-200/50 dark:bg-gray-800 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setIdadeMode('data')}
                    className={\`px-3 py-1 text-xs font-medium rounded-md transition-colors \${idadeMode === 'data' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}\`}
                  >
                    Data Exata
                  </button>
                  <button
                    type="button"
                    onClick={() => setIdadeMode('meses')}
                    className={\`px-3 py-1 text-xs font-medium rounded-md transition-colors \${idadeMode === 'meses' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}\`}
                  >
                    Aproximada (Meses)
                  </button>
                </div>
              </div>

              <div>
                {idadeMode === 'data' ? (
                  <Input
                    id="data_nascimento"
                    type="date"
                    value={formData.data_nascimento || ''}
                    onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })}
                    noMargin
                    hint={formData.data_nascimento ? \`Idade atualizada: \${calcularIdadeFormatada(formData.data_nascimento)}\` : ''}
                  />
                ) : (
                  <Input
                    id="idade_estimada"
                    type="number"
                    placeholder="Quantos meses o animal tem hoje?"
                    onChange={(e) => {
                      const meses = parseInt(e.target.value);
                      if (!isNaN(meses) && meses >= 0) {
                        const d = new Date();
                        d.setMonth(d.getMonth() - meses);
                        setFormData({ ...formData, data_nascimento: d.toISOString().split('T')[0] });
                      }
                    }}
                    noMargin
                    hint={formData.data_nascimento ? \`Data de nascimento calculada: \${new Date(formData.data_nascimento).toLocaleDateString('pt-BR')} (\${calcularIdadeFormatada(formData.data_nascimento)})\` : ''}
                  />
                )}
              </div>
            </div>`;

// Insert the newStr in place of the old block
lines.splice(startIndex, endIndex - startIndex, newStr);

fs.writeFileSync(path, lines.join('\n'));
console.log('Successfully patched UX using array splice!');
