const fs = require('fs');
const path = 'src/pages/Pastagens.tsx';
let content = fs.readFileSync(path, 'utf8');

// replace the state hook and usePastagens call
const usePastagensMatch = "  const { pastagens, servicos, isLoadingPastagens, createPastagem, updatePastagem, deletePastagem, addServico } = usePastagens();";
const toReplace = `  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFiltro, setStatusFiltro] = useState<'todos' | 'normal' | 'excedido' | 'vazio'>('todos');
  
  const { pastagens, total, servicos, isLoadingPastagens, createPastagem, updatePastagem, deletePastagem, addServico } = usePastagens(
    { search: searchTerm, status: statusFiltro, page, limit: 10 },
    undefined // We'll pass selectedPasto?.id later in the render tree or keep it undefined if we handle it differently
  );`;

if (content.includes(usePastagensMatch)) {
  content = content.replace(usePastagensMatch, toReplace);
  // remove the old state declarations
  content = content.replace("  const [searchTerm, setSearchTerm] = useState('');\n", "");
  content = content.replace("  const [statusFiltro, setStatusFiltro] = useState<'todos' | 'normal' | 'excedido' | 'vazio'>('todos');\n", "");
}

// Now remove the useMemo for filteredPastagens
const filteredPastagensMatch = /  const filteredPastagens = useMemo\(\(\) => \{[\s\S]*?\}, \[pastagens, searchTerm, statusFiltro\]\);/;
if (content.match(filteredPastagensMatch)) {
  content = content.replace(filteredPastagensMatch, "  const filteredPastagens = pastagens; // Filtragem agora é server-side");
}

fs.writeFileSync(path, content);
