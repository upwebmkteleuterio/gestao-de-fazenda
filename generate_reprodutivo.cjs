const fs = require('fs');

const slideStr = fs.readFileSync('src/pages/ManejoReprodutivo/components/slide_str.txt', 'utf8');
const modalStr = fs.readFileSync('src/pages/ManejoReprodutivo/components/modal_str.txt', 'utf8');

// I will just create a giant props interface by looking at variables inside slideStr and modalStr
// But wait, the easiest way is to let TypeScript tell us what's missing, or we can just pass the whole state.
