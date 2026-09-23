const fs = require('fs');
const path = 'src/pages/Animais/components/AnimaisSlidePanel.tsx';
let content = fs.readFileSync(path, 'utf8');

const oldStr = `            {/* CAMPOS COMUNS (Todos os Animais) */}
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

const newStr = `            {/* CAMPOS COMUNS (Todos os Animais) */}
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 sm:col-span-5">
                <Input
                  label="ID / Brinco *"
                  id="brinco"
                  value={formData.brinco || ''}
                  onChange={(e) => setFormData({ ...formData, brinco: e.target.value })}
                  placeholder="Ex: BR-0099"
                  required
                />
              </div>
              <div className="col-span-6 sm:col-span-4">
                <Input
                  label="Nascimento"
                  id="data_nascimento"
                  type="date"
                  value={formData.data_nascimento || ''}
                  onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })}
                />
              </div>
              <div className="col-span-6 sm:col-span-3">
                <Input
                  label="Idade (meses)"
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

content = content.replace(oldStr, newStr);
fs.writeFileSync(path, content);
console.log('Patched grid in AnimaisSlidePanel');
