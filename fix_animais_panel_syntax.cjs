const fs = require('fs');
const path = 'src/pages/Animais/components/AnimaisSlidePanel.tsx';
let content = fs.readFileSync(path, 'utf8');

const brokenStr = `            </div>
                label="Sexo *"
                id="sexo"
                value={formData.sexo || 'F'}
                onChange={(e) => setFormData({ ...formData, sexo: e.target.value as any })}
                disabled={formData.tipo_animal === 'vaca' || formData.tipo_animal === 'matriz' || formData.tipo_animal === 'touro'}
                options={[
                  { label: 'Fêmea', value: 'F' },
                  { label: 'Macho', value: 'M' },
                ]}
              />
              <Input
                label="Raça"`;

const newStr = `            </div>
            
            {/* ROW 3: Sexo e Raça */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Sexo *"
                id="sexo"
                value={formData.sexo || 'F'}
                onChange={(e) => setFormData({ ...formData, sexo: e.target.value as any })}
                disabled={formData.tipo_animal === 'vaca' || formData.tipo_animal === 'matriz' || formData.tipo_animal === 'touro'}
                options={[
                  { label: 'Fêmea', value: 'F' },
                  { label: 'Macho', value: 'M' },
                ]}
              />
              <Input
                label="Raça"`;

content = content.replace(brokenStr, newStr);
fs.writeFileSync(path, content);
console.log('Fixed AnimaisSlidePanel.tsx syntax');
