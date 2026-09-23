const fs = require('fs');
const path = 'src/pages/Pastagens.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace specific strings
content = content.replace("Criar Novo Lote", "Novo Piquete/Pasto");
content = content.replace("Gestão de Lotes (Pastagens)", "Gestão de Pastagens e Piquetes");
content = content.replace("Gerenciar Lote", "Gerenciar Piquete");
content = content.replace("Listagem Completa de Áreas & Lotes de Pastagem", "Listagem Completa de Pastos e Piquetes");
content = content.replace("showToast('Novo lote/pasto criado com sucesso!');", "showToast('Novo piquete/pasto criado com sucesso!');");
content = content.replace("Abertura para Criar Novo Lote", "Abertura para Criar Novo Piquete");

fs.writeFileSync(path, content);
