const fs = require('fs');
const path = 'src/pages/Pastagens.tsx';
let content = fs.readFileSync(path, 'utf8');

// Add page, limit states and Pagination component
content = content.replace("const [status, setStatus] = useState('all');", "const [status, setStatus] = useState('all');\n  const [page, setPage] = useState(1);\n  const limit = 10;");

content = content.replace(
  "  const { pastos, lotes, historico, isLoadingPastos,",
  "  const { pastos, totalPastos, lotes, historico, isLoadingPastos,"
);
content = content.replace(
  "  } = usePastagens({ search, status });",
  "  } = usePastagens({ search, status, page, limit });"
);


// Insert Pagination below Table
const tableEndStr = "            onAction={(action, row) => {\n              if (action === 'edit' || action === 'view') {\n                handleOpenEdit(row);\n              } else if (action === 'delete') {\n                setItemToDelete(row);\n                setModalOpen(true);\n              }\n            }}\n          />";
const paginationStr = `          />\n          <Pagination\n            currentPage={page}\n            totalPages={Math.ceil((totalPastos || 0) / limit)}\n            onPageChange={setPage}\n            totalItems={totalPastos}\n            itemsPerPage={limit}\n          />`;

content = content.replace(tableEndStr, paginationStr);

// Reset page when filters change
content = content.replace(
  "onChange={(e) => setSearch(e.target.value)}",
  "onChange={(e) => { setSearch(e.target.value); setPage(1); }}"
);
content = content.replace(
  "onChange={(e) => setStatus(e.target.value)}",
  "onChange={(e) => { setStatus(e.target.value); setPage(1); }}"
);

content = content.replace(
  "import { usePastagens } from '../hooks/usePastagens';",
  "import { usePastagens } from '../hooks/usePastagens';\nimport { Pagination } from '../components/Pagination';"
);


fs.writeFileSync(path, content);
