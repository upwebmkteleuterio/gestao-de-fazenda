const fs = require('fs');
const content = fs.readFileSync('src/pages/ManejoReprodutivo.tsx', 'utf8');

const slideStart = content.indexOf('{/* TELA 4.1');
const modalStart = content.indexOf('{/* Modal De exclusão */}');

const indexTop = content.substring(0, slideStart);
const slidePanelStr = content.substring(slideStart, modalStart);
const modalStr = content.substring(modalStart, content.lastIndexOf('</div>'));

fs.writeFileSync('src/pages/ManejoReprodutivo/components/slide_str.txt', slidePanelStr);
fs.writeFileSync('src/pages/ManejoReprodutivo/components/modal_str.txt', modalStr);
