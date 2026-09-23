const fs = require('fs');
const lines = fs.readFileSync('src/pages/Animais.tsx', 'utf8').split('\n');

const topLines = lines.slice(0, 490);
const slideLines = lines.slice(490, 1005);
const modalLines = lines.slice(1005, lines.length - 3);

if (!fs.existsSync('src/pages/Animais/components')) {
  fs.mkdirSync('src/pages/Animais/components', { recursive: true });
}

fs.writeFileSync('src/pages/Animais/components/slide_lines.txt', slideLines.join('\n'));
fs.writeFileSync('src/pages/Animais/components/modal_lines.txt', modalLines.join('\n'));
