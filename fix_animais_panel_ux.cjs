const fs = require('fs');
const path = 'src/pages/Animais/components/AnimaisSlidePanel.tsx';
let content = fs.readFileSync(path, 'utf8');

const oldStr = `            {/* Gatilho Principal: Tipo de Animal */}
            <Select
              label="Tipo de Animal (Gatilho de Campos)"
              id="tipo_animal"
              value={formData.tipo_animal}
              onChange={(e) => {
                const newTipo = e.target.value as TipoAnimal;
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
            />


            {/* CAMPOS COMUNS (Todos os Animais) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
              <Input
                label="ID / Brinco *"
                id="brinco"
                value={formData.brinco || ''}
                onChange={(e) => setFormData({ ...formData, brinco: e.target.value })}
                placeholder="Ex: BR-0099"
                required
              />
              <div className="flex gap-2 items-end">
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
              </div>
            </div>`;

const newStr = `            {/* ROW 1: Tipo e Brinco */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Tipo de Animal *"
                id="tipo_animal"
                value={formData.tipo_animal}
                onChange={(e) => {
                  const newTipo = e.target.value as TipoAnimal;
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
            <div className="bg-gray-50/50 dark:bg-gray-900/20 border border-gray-100 dark:border-gray-800 p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Registro de Idade</label>
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
                    hint={formData.data_nascimento ? \`Idade atual: \${calcularIdadeFormatada(formData.data_nascimento)}\` : ''}
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
                    hint={formData.data_nascimento ? \`Data estimada: \${new Date(formData.data_nascimento).toLocaleDateString('pt-BR')} (\${calcularIdadeFormatada(formData.data_nascimento)})\` : ''}
                  />
                )}
              </div>
            </div>`;

if(content.includes('Gatilho Principal: Tipo de Animal')) {
    content = content.replace(oldStr, newStr);
    fs.writeFileSync(path, content);
    console.log('Successfully patched UX and layout.');
} else {
    console.log('Could not find the target string!');
}
