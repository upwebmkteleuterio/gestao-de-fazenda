const fs = require('fs');
const lines = fs.readFileSync('src/pages/Pastagens.tsx', 'utf8').split('\n');

const topLines = lines.slice(0, 554); // 0 to 553
const slideLines = lines.slice(554, 866); // 554 to 865
const modalLines = lines.slice(866, lines.length - 3); // 866 to 885

fs.writeFileSync('src/pages/Pastagens/components/slide_lines.txt', slideLines.join('\n'));
fs.writeFileSync('src/pages/Pastagens/components/modal_lines.txt', modalLines.join('\n'));
