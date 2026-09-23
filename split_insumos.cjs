const fs = require('fs');
const lines = fs.readFileSync('src/pages/Insumos.tsx', 'utf8').split('\n');

const topLines = lines.slice(0, 582);
const slideLines = lines.slice(582, 776);
const modalLines = lines.slice(776, lines.length - 3);

fs.writeFileSync('src/pages/Insumos/components/slide_lines.txt', slideLines.join('\n'));
fs.writeFileSync('src/pages/Insumos/components/modal_lines.txt', modalLines.join('\n'));
