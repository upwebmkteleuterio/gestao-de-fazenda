const fs = require('fs');
const path = 'src/pages/ManejoReprodutivo.tsx';
let content = fs.readFileSync(path, 'utf8');

// Add page, limit states and Pagination component
content = content.replace("const [dataFim, setDataFim] = useState('');", "const [dataFim, setDataFim] = useState('');\n  const [page, setPage] = useState(1);\n  const limit = 10;");

content = content.replace(
  "  const { eventos, isLoadingEventos, createEvento, updateEvento, deleteEvento } = useManejoReprodutivo({",
  "  const { eventos, totalEventos, isLoadingEventos, createEvento, updateEvento, deleteEvento } = useManejoReprodutivo({"
);
content = content.replace(
  "    endDate: dataFim,",
  "    endDate: dataFim,\n    page,\n    limit,"
);


// Insert Pagination below Table
const tableEndStr = "            onAction={(action, row) => {\n              if (action === 'edit' || action === 'view') {\n                if (action === 'edit') handleOpenEdit(row);\n                else handleOpenView(row);\n              } else if (action === 'delete') {\n                setItemToDelete(row);\n                setModalOpen(true);\n              }\n            }}\n          />";
const paginationStr = `          />\n          <Pagination\n            currentPage={page}\n            totalPages={Math.ceil((totalEventos || 0) / limit)}\n            onPageChange={setPage}\n            totalItems={totalEventos}\n            itemsPerPage={limit}\n          />`;

content = content.replace(tableEndStr, paginationStr);

// Reset page when filters change
content = content.replace(
  "onChange={(e) => setSearch(e.target.value)}",
  "onChange={(e) => { setSearch(e.target.value); setPage(1); }}"
);
content = content.replace(
  "onChange={(e) => setProtocolo(e.target.value)}",
  "onChange={(e) => { setProtocolo(e.target.value); setPage(1); }}"
);
content = content.replace(
  "onChange={(e) => setDataInicio(e.target.value)}",
  "onChange={(e) => { setDataInicio(e.target.value); setPage(1); }}"
);
content = content.replace(
  "onChange={(e) => setDataFim(e.target.value)}",
  "onChange={(e) => { setDataFim(e.target.value); setPage(1); }}"
);

content = content.replace(
  "import { useManejoReprodutivo } from '../hooks/useManejoReprodutivo';",
  "import { useManejoReprodutivo } from '../hooks/useManejoReprodutivo';\nimport { Pagination } from '../components/Pagination';"
);

fs.writeFileSync(path, content);
