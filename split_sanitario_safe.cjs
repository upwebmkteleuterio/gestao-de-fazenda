const fs = require('fs');
const lines = fs.readFileSync('src/pages/ManejoSanitario.tsx', 'utf8').split('\n');

const topLines = lines.slice(0, 507); // 0 to 506
const slideLines = lines.slice(507, 814); // 507 to 813
const modalLines = lines.slice(814, lines.length - 3); // 814 to end minus </div> ); };

fs.writeFileSync('src/pages/ManejoSanitario/components/slide_lines.txt', slideLines.join('\n'));
fs.writeFileSync('src/pages/ManejoSanitario/components/modal_lines.txt', modalLines.join('\n'));
