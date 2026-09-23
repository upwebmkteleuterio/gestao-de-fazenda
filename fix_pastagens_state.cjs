const fs = require('fs');
const path = 'src/pages/Pastagens.tsx';
let content = fs.readFileSync(path, 'utf8');

const oldStr = `export const PastagensPage: React.FC = () => {
  const { showToast } = useUIStore();
  const [page, setPage] = useState(1);
  
  const { pastagens, total, servicos, isLoadingPastagens, createPastagem, updatePastagem, deletePastagem, addServico } = usePastagens(
    { search: searchTerm, status: statusFiltro, page, limit: 10 },
    undefined // We'll pass selectedPasto?.id later in the render tree or keep it undefined if we handle it differently
  );
  
  const { animais } = useAnimais();

  // Filtros Tela 3
  
  

  // Estado SlidePanel (Tela 3.1)
  const [slideOpen, setSlideOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'dados' | 'servicos'>('dados');
  const [selectedPasto, setSelectedPasto] = useState<Pastagem | null>(null);`;

const newStr = `export const PastagensPage: React.FC = () => {
  const { showToast } = useUIStore();
  
  // Filtros
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFiltro, setStatusFiltro] = useState<'todos' | 'normal' | 'excedido' | 'vazio'>('todos');

  // Estado
  const [slideOpen, setSlideOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'dados' | 'servicos'>('dados');
  const [selectedPasto, setSelectedPasto] = useState<Pastagem | null>(null);

  const { pastagens, total, servicos, isLoadingPastagens, createPastagem, updatePastagem, deletePastagem, addServico } = usePastagens(
    { search: searchTerm, status: statusFiltro, page, limit: 10 },
    selectedPasto?.id
  );
  
  const { animais } = useAnimais();`;

content = content.replace(/export const PastagensPage: React\.FC = \(\) => \{[\s\S]*?const \[selectedPasto, setSelectedPasto\] = useState<Pastagem \| null>\(null\);/, newStr);
fs.writeFileSync(path, content);
