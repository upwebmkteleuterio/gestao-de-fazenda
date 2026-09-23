const fs = require('fs');
const lines = fs.readFileSync('src/pages/Animais.tsx', 'utf8').split('\n');
console.log(lines.length);
