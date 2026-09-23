const fs = require('fs');
const path = 'src/pages/Financeiro.tsx';
let content = fs.readFileSync(path, 'utf8');

// Add page, limit states and Pagination component
content = content.replace("const [status, setStatus] = useState('all');", "const [status, setStatus] = useState('all');\n  const [page, setPage] = useState(1);\n  const limit = 10;");

content = content.replace(
  "  const { transacoes, resumo, isLoadingTransacoes, createTransacao, updateTransacao, deleteTransacao } = useFinanceiro({\n    tipo,\n    status,\n  });",
  "  const { transacoes, totalTransacoes, resumo, isLoadingTransacoes, createTransacao, updateTransacao, deleteTransacao } = useFinanceiro({\n    tipo,\n    status,\n    page,\n    limit,\n  });"
);

// Reset page on filter change. We can do it by effect or inline. Let's just do it in inline if possible, or add an effect.
content = content.replace(
  "import { useFinanceiro } from '../hooks/useFinanceiro';",
  "import { useFinanceiro } from '../hooks/useFinanceiro';\nimport { Pagination } from '../components/Pagination';"
);

// Insert Pagination below Table
const tableEndStr = "            onAction={(action, row) => {\n              if (action === 'edit' || action === 'view') {\n                setSelectedTransacao(row);\n                setFormData({ ...row });\n                setSlideOpen(true);\n              } else if (action === 'delete') {\n                setItemToDelete(row);\n                setModalOpen(true);\n              }\n            }}\n          />";
const paginationStr = `          />\n          <Pagination\n            currentPage={page}\n            totalPages={Math.ceil((totalTransacoes || 0) / limit)}\n            onPageChange={setPage}\n            totalItems={totalTransacoes}\n            itemsPerPage={limit}\n          />`;

content = content.replace(tableEndStr, paginationStr);

// Reset page when filters change
content = content.replace(
  "onChange={(e) => setTipo(e.target.value)}",
  "onChange={(e) => { setTipo(e.target.value); setPage(1); }}"
);
content = content.replace(
  "onChange={(e) => setStatus(e.target.value)}",
  "onChange={(e) => { setStatus(e.target.value); setPage(1); }}"
);

fs.writeFileSync(path, content);
