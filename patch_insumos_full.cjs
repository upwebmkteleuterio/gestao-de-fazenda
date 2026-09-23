const fs = require('fs');

// 1. Patch Service
const svcPath = 'src/services/insumosService.ts';
let svcCode = fs.readFileSync(svcPath, 'utf8');

const oldGetAll = `  getAll: async (categoria?: string, filters?: { page?: number; limit?: number }): Promise<{data: Insumo[], total: number}> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        let list = getStoredInsumos();
        if (categoria && categoria !== 'all') {
          list = list.filter(i => i.categoria === categoria);
        }
        const total = list.length;
        if (filters?.page && filters?.limit) {
          const startIndex = (filters.page - 1) * filters.limit;
          list = list.slice(startIndex, startIndex + filters.limit);
        }
        resolve({ data: list, total });
      }, 180);
    });
  },`;

const newGetAll = `  getAll: async (categoria?: string, filters?: { search?: string; estoqueBaixo?: boolean; page?: number; limit?: number }): Promise<{data: Insumo[], total: number}> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        let list = getStoredInsumos();
        if (categoria && categoria !== 'all') {
          list = list.filter(i => i.categoria === categoria);
        }
        if (filters?.search) {
          const q = filters.search.toLowerCase();
          list = list.filter(i => i.nome_produto.toLowerCase().includes(q));
        }
        if (filters?.estoqueBaixo) {
          list = list.filter(i => i.estoque_atual <= i.estoque_minimo);
        }
        
        list.sort((a, b) => a.nome_produto.localeCompare(b.nome_produto));
        
        const total = list.length;
        if (filters?.page && filters?.limit) {
          const startIndex = (filters.page - 1) * filters.limit;
          list = list.slice(startIndex, startIndex + filters.limit);
        }
        resolve({ data: list, total });
      }, 180);
    });
  },`;
svcCode = svcCode.replace(oldGetAll, newGetAll);
fs.writeFileSync(svcPath, svcCode);

// 2. Patch Hook
const hookPath = 'src/hooks/useInsumos.ts';
let hookCode = fs.readFileSync(hookPath, 'utf8');

hookCode = hookCode.replace(
  "export const useInsumos = (categoria?: string, filters?: { page?: number; limit?: number }) => {",
  "export const useInsumos = (categoria?: string, filters?: { search?: string; estoqueBaixo?: boolean; page?: number; limit?: number }) => {"
);
fs.writeFileSync(hookPath, hookCode);

// 3. Patch UI
const uiPath = 'src/pages/Insumos.tsx';
let uiCode = fs.readFileSync(uiPath, 'utf8');

uiCode = uiCode.replace(
  "import { useInsumos } from '../hooks/useInsumos';",
  "import { useInsumos } from '../hooks/useInsumos';\nimport { Pagination } from '../components/Pagination';"
);

uiCode = uiCode.replace(
  "const [categoriaFilter, setCategoriaFilter] = useState('all');",
  "const [categoriaFilter, setCategoriaFilter] = useState('all');\n  const [page, setPage] = useState(1);\n  const limit = 10;"
);

uiCode = uiCode.replace(
  "   } = useInsumos(categoriaFilter);",
  "     totalInsumos\n   } = useInsumos(categoriaFilter, { search, estoqueBaixo: apenasEstoqueBaixo, page, limit });"
);

// Remove local filtering
const localFilterStr = `  // Filtragem local por busca e switch de alerta de estoque baixo
  const insumosFiltrados = useMemo(() => {
    return insumos.filter(item => {
      const matchSearch = search ? item.nome_produto.toLowerCase().includes(search.toLowerCase()) : true;
      const isEstoqueBaixo = item.estoque_atual <= item.estoque_minimo;
      const matchEstoqueBaixo = apenasEstoqueBaixo ? isEstoqueBaixo : true;
      return matchSearch && matchEstoqueBaixo;
    });
  }, [insumos, search, apenasEstoqueBaixo]);`;

uiCode = uiCode.replace(localFilterStr, "  const insumosFiltrados = insumos;");

// Update table end to include pagination
const tableEndStr = "            onAction={(action, row) => {\n              if (action === 'edit' || action === 'view') {\n                handleOpenCadastro(row);\n              } else if (action === 'delete') {\n                setItemToDelete(row);\n                setModalOpen(true);\n              }\n            }}\n          />";
const paginationStr = `          />\n          <Pagination\n            currentPage={page}\n            totalPages={Math.ceil((totalInsumos || 0) / limit)}\n            onPageChange={setPage}\n            totalItems={totalInsumos}\n            itemsPerPage={limit}\n          />`;

uiCode = uiCode.replace(tableEndStr, paginationStr);

// Reset pages
uiCode = uiCode.replace(
  "onChange={(e) => setSearch(e.target.value)}",
  "onChange={(e) => { setSearch(e.target.value); setPage(1); }}"
);
uiCode = uiCode.replace(
  "onChange={(e) => setCategoriaFilter(e.target.value)}",
  "onChange={(e) => { setCategoriaFilter(e.target.value); setPage(1); }}"
);
uiCode = uiCode.replace(
  "onChange={(e) => setApenasEstoqueBaixo(e.target.checked)}",
  "onChange={(e) => { setApenasEstoqueBaixo(e.target.checked); setPage(1); }}"
);


fs.writeFileSync(uiPath, uiCode);
