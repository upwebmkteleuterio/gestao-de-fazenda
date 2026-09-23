const fs = require('fs');
const path = 'src/pages/Pastagens.tsx';
let content = fs.readFileSync(path, 'utf8');

const effectCode = `  // Reseta para a página 1 ao alterar filtros
  React.useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFiltro]);`;

if (!content.includes('setPage(1);') && content.includes('const [page, setPage] = useState(1);')) {
  content = content.replace("  const { pastagens, total", effectCode + "\n\n  const { pastagens, total");
  fs.writeFileSync(path, content);
}
