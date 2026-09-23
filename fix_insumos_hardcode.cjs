const fs = require('fs');
const path = 'src/pages/Insumos.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/quantidade_inicial: 10,/g, "quantidade_inicial: 0,");
content = content.replace(/estoque_minimo: 5,/g, "estoque_minimo: 0,");
content = content.replace(/custo_unitario: 80\.00,/g, "custo_unitario: 0.00,");
content = content.replace(/observacao_motivo: 'Uso de rotina em campo \/ manejo',/g, "observacao_motivo: '',");

fs.writeFileSync(path, content);
