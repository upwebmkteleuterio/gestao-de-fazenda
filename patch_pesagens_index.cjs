const fs = require('fs');
const path = 'src/pages/Pesagens/index.tsx';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes('import { Pagination }')) {
  content = content.replace(
    "import { Card } from '../../components/Card';",
    "import { Card } from '../../components/Card';\nimport { Pagination } from '../../components/Pagination';"
  );
}

// Add state for page and limit
const stateBlock = `  const [search, setSearch] = useState('');
  const [tipoAnimal, setTipoAnimal] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');`;

const newStateBlock = `  const [search, setSearch] = useState('');
  const [tipoAnimal, setTipoAnimal] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);`;

content = content.replace(stateBlock, newStateBlock);

const useHookCall = `  const { pesagens, isLoading, createPesagem, updatePesagem, deletePesagem, createPesagemGrupo } = usePesagens({
    search,
    tipoAnimal,
    startDate,
    endDate,
  });`;
  
const newUseHookCall = `  const { pesagens, total, isLoading, createPesagem, updatePesagem, deletePesagem, createPesagemGrupo } = usePesagens({
    search,
    tipoAnimal,
    startDate,
    endDate,
    page,
    limit,
  });`;
  
content = content.replace(useHookCall, newUseHookCall);

const tableBlock = `          <Table
            columns={columns}
            data={pesagens}
            onRowClick={(row) => handleOpenView(row)}
            onAction={(action, row) => {
              if (action === 'edit') handleOpenEdit(row);
              else if (action === 'view') handleOpenView(row);
              else if (action === 'delete') {
                setPesagemToDelete(row);
                setModalOpen(true);
              }
            }}
            selectedIds={selectedPesagemIds}
            onToggleSelect={(id) => {
              if (selectedPesagemIds.includes(id)) {
                setSelectedPesagemIds(selectedPesagemIds.filter(i => i !== id));
              } else {
                setSelectedPesagemIds([...selectedPesagemIds, id]);
              }
            }}
            onSelectAll={() => {
              if (selectedPesagemIds.length === pesagens.length) setSelectedPesagemIds([]);
              else setSelectedPesagemIds(pesagens.map(p => p.id));
            }}
          />
        )}`;
        
const newTableBlock = `          <>
          <Table
            columns={columns}
            data={pesagens}
            onRowClick={(row) => handleOpenView(row)}
            onAction={(action, row) => {
              if (action === 'edit') handleOpenEdit(row);
              else if (action === 'view') handleOpenView(row);
              else if (action === 'delete') {
                setPesagemToDelete(row);
                setModalOpen(true);
              }
            }}
            selectedIds={selectedPesagemIds}
            onToggleSelect={(id) => {
              if (selectedPesagemIds.includes(id)) {
                setSelectedPesagemIds(selectedPesagemIds.filter(i => i !== id));
              } else {
                setSelectedPesagemIds([...selectedPesagemIds, id]);
              }
            }}
            onSelectAll={() => {
              if (selectedPesagemIds.length === pesagens.length) setSelectedPesagemIds([]);
              else setSelectedPesagemIds(pesagens.map(p => p.id));
            }}
          />
          <Pagination
            currentPage={page}
            totalPages={Math.ceil((total || 0) / limit) || 1}
            onPageChange={(p) => setPage(p)}
            totalItems={total}
            itemsPerPage={limit}
          />
          </>
        )}`;
        
content = content.replace(tableBlock, newTableBlock);

fs.writeFileSync(path, content);
console.log('Pesagens index updated');
