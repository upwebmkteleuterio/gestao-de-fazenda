const fs = require('fs');

const path1 = 'src/pages/Pastagens.tsx';
let content1 = fs.readFileSync(path1, 'utf8');
content1 = content1.replace(/Criar Novo Lote/g, 'Novo Piquete');
content1 = content1.replace(/Módulo de Manejo/g, ''); // Actually this might leave an empty badge, let's just remove the whole badge block or keep it with something else? The user asked to remove "Módulo de manejo". Let's check how it's structured.
fs.writeFileSync(path1, content1);

const path2 = 'src/pages/Pastagens/components/PastagensSlidePanel.tsx';
let content2 = fs.readFileSync(path2, 'utf8');
content2 = content2.replace(/Criar Novo Lote \(Pasto\)/g, 'Criar Novo Piquete');
content2 = content2.replace(/Configuração do lote/g, 'Configuração da área');
content2 = content2.replace(/A data prevista de saída deste lote/g, 'A data prevista de saída desta área');
content2 = content2.replace(/Pasto Manguinho Lote Norte/g, 'Pasto Manguinho Piquete Norte');
fs.writeFileSync(path2, content2);
