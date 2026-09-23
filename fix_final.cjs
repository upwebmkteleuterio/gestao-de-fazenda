const fs = require('fs');
const path = 'src/pages/Animais/components/AnimaisSlidePanel.tsx';
let content = fs.readFileSync(path, 'utf8');

// The file currently has:
//             </div>
//                 label="Sexo *"
//                 id="sexo"
//                 value={formData.sexo || 'F'}
//                 onChange={(e) => setFormData({ ...formData, sexo: e.target.value as any })}
//                 disabled={formData.tipo_animal === 'vaca' || formData.tipo_animal === 'matriz' || formData.tipo_animal === 'touro'}
//                 options={[
//                   { label: 'Fêmea', value: 'F' },
//                   { label: 'Macho', value: 'M' },
//                 ]}
//               />
//               <Input

const regex = /<\/div>\s+label="Sexo \*"\s+id="sexo"[\s\S]*?options=\{[\s\S]*?\]\}\s+\/>\s+<Input/;

const newStr = `</div>
            
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
              <Input`;

if(regex.test(content)) {
  content = content.replace(regex, newStr);
  fs.writeFileSync(path, content);
  console.log('Fixed with regex');
} else {
  console.log('Regex did not match');
}
