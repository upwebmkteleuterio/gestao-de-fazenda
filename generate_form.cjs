const fs = require('fs');
let lines = fs.readFileSync('src/pages/Animais/components/AnimaisSlidePanel.tsx', 'utf8').split('\n');

const startIndex = lines.findIndex(l => l.includes('{/* CAMPOS COMUNS */}'));
const endIndex = lines.findIndex(l => l.includes('Observações Adicionais')) - 2; // Before <div className="w-full">

console.log(`startIndex: ${startIndex}, endIndex: ${endIndex}`);
