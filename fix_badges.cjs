const fs = require('fs');

const path1 = 'src/pages/Pastagens.tsx';
let content1 = fs.readFileSync(path1, 'utf8');
content1 = content1.replace(/<div className="flex items-center space-x-2">\s*<span className="px-2\.5 py-0\.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900\/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800\/50">\s*<\/span>\s*<\/div>/g, '');
fs.writeFileSync(path1, content1);

const path2 = 'src/pages/ManejoReprodutivo.tsx';
let content2 = fs.readFileSync(path2, 'utf8');
content2 = content2.replace(/<div className="flex items-center space-x-2">\s*<span className="px-2\.5 py-0\.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900\/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800\/50">\s*Módulo de Manejo\s*<\/span>\s*<\/div>/g, '');
fs.writeFileSync(path2, content2);
