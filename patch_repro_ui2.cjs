const fs = require('fs');
const path = 'src/pages/ManejoReprodutivo.tsx';
let content = fs.readFileSync(path, 'utf8');

// Undo bad changes from previous if they partially applied
// Actually, it didn't match the useManejoReprodutivo so it probably just didn't replace it. Let's do it properly.

// Let's first make sure we have page/limit states
if (!content.includes('const [page, setPage] = useState(1);')) {
  content = content.replace("const [dataFim, setDataFim] = useState('');", "const [dataFim, setDataFim] = useState('');\n  const [page, setPage] = useState(1);\n  const limit = 10;");
}

content = content.replace(
  "  const { eventos, isLoading, createEvento, updateEvento, deleteEvento } = useReproducao({",
  "  const { eventos, totalEventos, isLoading, createEvento, updateEvento, deleteEvento } = useReproducao({"
);
content = content.replace(
  "    endDate: dataFim,\n  });",
  "    endDate: dataFim,\n    page,\n    limit,\n  });"
);

// Insert Pagination below Table if not already there
const tableEndStr = "            onAction={(action, row) => {\n              if (action === 'edit' || action === 'view') {\n                if (action === 'edit') handleOpenEdit(row);\n                else handleOpenView(row);\n              } else if (action === 'delete') {\n                setEventoToDelete(row);\n                setModalOpen(true);\n              }\n            }}\n          />";
const paginationStr = `          />\n          <Pagination\n            currentPage={page}\n            totalPages={Math.ceil((totalEventos || 0) / limit)}\n            onPageChange={setPage}\n            totalItems={totalEventos}\n            itemsPerPage={limit}\n          />`;

if (content.includes(tableEndStr) && !content.includes('<Pagination')) {
  content = content.replace(tableEndStr, paginationStr);
}

// Reset page when filters change (if not already done)
if (!content.includes('setPage(1)')) {
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
}

if (!content.includes('import { Pagination }')) {
  content = content.replace(
    "import { useReproducao } from '../hooks/useReproducao';",
    "import { useReproducao } from '../hooks/useReproducao';\nimport { Pagination } from '../components/Pagination';"
  );
}

fs.writeFileSync(path, content);
