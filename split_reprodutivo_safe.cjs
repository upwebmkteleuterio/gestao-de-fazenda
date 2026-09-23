const fs = require('fs');
const lines = fs.readFileSync('src/pages/ManejoReprodutivo.tsx', 'utf8').split('\n');

const topLines = lines.slice(0, 699); // 0 to 698
const slideLines = lines.slice(699, 1311); // 699 to 1310
const modalLines = lines.slice(1311, lines.length - 3); // 1311 to end minus </div> ); };

fs.writeFileSync('src/pages/ManejoReprodutivo/components/slide_lines.txt', slideLines.join('\n'));
fs.writeFileSync('src/pages/ManejoReprodutivo/components/modal_lines.txt', modalLines.join('\n'));
