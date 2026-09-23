const fs = require('fs');
const path = 'src/pages/ManejoSanitario.tsx';
let content = fs.readFileSync(path, 'utf8');

// Add page, limit states and Pagination component
content = content.replace("const [activeTab, setActiveTab] = useState<'andamento' | 'concluido'>('andamento');", "const [activeTab, setActiveTab] = useState<'andamento' | 'concluido'>('andamento');\n  const [page, setPage] = useState(1);\n  const limit = 10;");

content = content.replace(
  "  const { manejos, isLoading, createManejo, updateManejo, deleteManejo } = useSanitario({",
  "  const { manejos, totalManejos, isLoading, createManejo, updateManejo, deleteManejo } = useSanitario({"
);
content = content.replace(
  "    status: activeTab,",
  "    status: activeTab,\n    page,\n    limit,"
);


// Insert Pagination below Table
const tableEndStr = "            onAction={(action, row) => {\n              if (action === 'edit' || action === 'view') {\n                if (action === 'edit') handleOpenEdit(row);\n                else handleOpenView(row);\n              } else if (action === 'delete') {\n                setItemToDelete(row);\n                setModalOpen(true);\n              }\n            }}\n          />";
const paginationStr = `          />\n          <Pagination\n            currentPage={page}\n            totalPages={Math.ceil((totalManejos || 0) / limit)}\n            onPageChange={setPage}\n            totalItems={totalManejos}\n            itemsPerPage={limit}\n          />`;

content = content.replace(tableEndStr, paginationStr);

// Reset page when filters change
content = content.replace(
  "onChange={(e) => setSearch(e.target.value)}",
  "onChange={(e) => { setSearch(e.target.value); setPage(1); }}"
);
content = content.replace(
  "onChange={(e) => setTipo(e.target.value)}",
  "onChange={(e) => { setTipo(e.target.value); setPage(1); }}"
);
content = content.replace(
  "onClick={() => setActiveTab('andamento')}",
  "onClick={() => { setActiveTab('andamento'); setPage(1); }}"
);
content = content.replace(
  "onClick={() => setActiveTab('concluido')}",
  "onClick={() => { setActiveTab('concluido'); setPage(1); }}"
);

content = content.replace(
  "import { useSanitario } from '../hooks/useSanitario';",
  "import { useSanitario } from '../hooks/useSanitario';\nimport { Pagination } from '../components/Pagination';"
);

fs.writeFileSync(path, content);
