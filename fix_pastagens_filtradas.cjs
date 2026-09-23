const fs = require('fs');
const path = 'src/pages/Pastagens.tsx';
let content = fs.readFileSync(path, 'utf8');

const useMemoRegex = /const pastagensFiltradas = useMemo\(\(\) => \{[\s\S]*?\}, \[pastagens, searchTerm, statusFiltro\]\);/;
content = content.replace(useMemoRegex, 'const pastagensFiltradas = pastagens; // Filtragem agora é server-side');

// Let's also verify that 'filteredPastagens' string I added previously isn't causing issues
content = content.replace("  const filteredPastagens = pastagens; // Filtragem agora é server-side", "");

fs.writeFileSync(path, content);
