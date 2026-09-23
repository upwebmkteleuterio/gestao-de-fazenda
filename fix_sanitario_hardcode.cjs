const fs = require('fs');
const path = 'src/pages/ManejoSanitario.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/setCurrentMedDose\('5 ml \/ animal'\);/g, "setCurrentMedDose('');");
content = content.replace(/setCurrentMedQtd\(1\);/g, "setCurrentMedQtd(0);");
content = content.replace(/nome_lote: 'Lote de Vacinação Aftosa L01',/g, "nome_lote: '',");
content = content.replace(/responsavel_tecnico: 'Dr\. Roberto Veterinário',/g, "responsavel_tecnico: '',");
content = content.replace(/animais_ids: animais\.slice\(0, 5\)\.map\(a => a\.id\),/g, "animais_ids: [],");
content = content.replace(/medicamentos: defaultInsumo \? \[\s*\{\s*insumo_id: defaultInsumo\.id,\s*nome_produto: defaultInsumo\.nome_produto,\s*dose: '5 ml \/ animal',\s*quantidade_total: 5,\s*\}\s*\] : \[\],/g, "medicamentos: [],");
content = content.replace(/const defaultInsumo = insumos\[0\];/g, "");
content = content.replace(/setCurrentMedInsumoId\(defaultInsumo\?\.id \|\| ''\);/g, "setCurrentMedInsumoId('');");

fs.writeFileSync(path, content);
