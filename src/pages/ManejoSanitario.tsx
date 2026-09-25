import { SanitarioSlidePanel } from './ManejoSanitario/components/SanitarioSlidePanel';
import { SanitarioModals } from './ManejoSanitario/components/SanitarioModals';
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, 
  Syringe, 
  ShieldCheck, 
  Search, 
  Calendar, 
  Users, 
  CheckCircle2, 
  Clock, 
  Trash2, 
  Edit3, 
  X, 
  Bell, 
  Pill, 
  Layers, 
  ChevronRight,
  Filter,
  Check,
  Edit,
  WifiOff
} from 'lucide-react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Table, Column } from '../components/Table';
import { Badge } from '../components/Badge';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { SlidePanel } from '../components/SlidePanel';
import { Modal } from '../components/Modal';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { useSanitario } from '../hooks/useSanitario';
import { Pagination } from '../components/Pagination';
import { useInsumos } from '../hooks/useInsumos';
import { useAnimais } from '../hooks/useAnimais';
import { useUIStore } from '../store/useUIStore';
import { ManejoSanitario, MedicamentoAplicado } from '../types/database';
import { MAX_DOMAIN_QUANTITY, MAX_DOMAIN_TEXT_LENGTH } from '../services/domainValidation';

export const ManejoSanitarioPage: React.FC = () => {
  const { showToast } = useUIStore();
  const { insumos } = useInsumos();
  const { animais } = useAnimais();

  // Tab Estrutural: 'andamento' | 'concluido'
  const [activeTab, setActiveTab] = useState<'andamento' | 'concluido'>('andamento');
  const [page, setPage] = useState(1);
  const limit = 10;

  // Filtros de busca
  const [search, setSearch] = useState('');
  const [tipoManejoFilter, setTipoManejoFilter] = useState('all');

  // Reseta página ao alterar filtros ou aba
  useEffect(() => {
    setPage(1);
  }, [search, tipoManejoFilter, activeTab]);

  // Query dos manejos com paginação e filtros no banco/serviço
  const { manejos, totalManejos, stats, source, capturedAt, isOffline, isLoading, isError, refetch, createManejo, updateManejo, deleteManejo, isMutating, isDeleting: isDeletingMutation } = useSanitario({
    search,
    tipo: tipoManejoFilter,
    status: activeTab,
    page,
    limit,
  });

  useEffect(() => {
    if (!isOffline) return;
    setSearch('');
    setTipoManejoFilter('all');
    setPage(1);
    setSelectedManejoIds([]);
    setModalOpen(false);
    setGroupModalOpen(false);
    if (slideMode !== 'view') setSlideOpen(false);
  }, [isOffline]);

  // Contadores para as Tabs Estruturais vindos do banco ou do snapshot local
  const countAndamento = stats.andamento;
  const countConcluidos = stats.concluido;

  // Lista retornada já filtrada e paginada pela camada de dados
  const listFiltrada = manejos;

  // Estado SlidePanel (Tela 5.1)
  const [slideOpen, setSlideOpen] = useState(false);
  const [slideMode, setSlideMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedManejo, setSelectedManejo] = useState<ManejoSanitario | null>(null);

  // Modal Exclusão
  const [modalOpen, setModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ManejoSanitario | null>(null);

  // Modal de Seleção de Grupo de Animais
  const [groupModalOpen, setGroupModalOpen] = useState(false);

  // Submitting state para prevenir cliques duplos no salvamento
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Selection state para seleção em lote de manejos sanitários
  const [selectedManejoIds, setSelectedManejoIds] = useState<string[]>([]);

  const handleToggleSelectManejo = (id: string) => {
    setSelectedManejoIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllManejos = () => {
    if (selectedManejoIds.length === listFiltrada.length) {
      setSelectedManejoIds([]);
    } else {
      setSelectedManejoIds(listFiltrada.map(m => m.id));
    }
  };

  // Estado da Sessão 2: Medicamentos Temporários antes de adicionar
  const [currentMedInsumoId, setCurrentMedInsumoId] = useState('');
  const [currentMedDose, setCurrentMedDose] = useState('5 ml / animal');
  const [currentMedQtd, setCurrentMedQtd] = useState<number>(1);

  // Form State Geral (Tela 5.1)
  const [formData, setFormData] = useState<{
    nome_lote: string;
    tipo_manejo: string;
    data_manejo: string;
    responsavel_tecnico: string;
    status: 'andamento' | 'concluido';
    observacoes: string;
    medicamentos: MedicamentoAplicado[];
    animais_ids: string[];
    criar_lembrete: boolean;
    data_lembrete: string;
  }>({
    nome_lote: '',
    tipo_manejo: 'Vacinação',
    data_manejo: new Date().toISOString().split('T')[0],
    responsavel_tecnico: '',
    status: 'andamento',
    observacoes: '',
    medicamentos: [],
    animais_ids: [],
    criar_lembrete: false,
    data_lembrete: '',
  });

  // Abrir Slide Panel para Novo Manejo (Tela 5.1)
  const handleOpenCreate = () => {
    setSelectedManejo(null);
    setSlideMode('create');

    
    setCurrentMedInsumoId('');
    setCurrentMedDose('');
    setCurrentMedQtd(0);

    setFormData({
      nome_lote: '',
      tipo_manejo: 'Vacinação',
      data_manejo: new Date().toISOString().split('T')[0],
      responsavel_tecnico: '',
      status: 'andamento',
      observacoes: '',
      medicamentos: [],
      animais_ids: [],
      criar_lembrete: false,
      data_lembrete: '',
    });

    setSlideOpen(true);
  };

  // Abrir Slide Panel para Editar
  const handleOpenEdit = (m: ManejoSanitario) => {
    setSelectedManejo(m);
    setSlideMode('edit');

    
    setCurrentMedInsumoId('');

    setFormData({
      nome_lote: m.nome_lote,
      tipo_manejo: m.tipo_manejo,
      data_manejo: m.data_manejo,
      responsavel_tecnico: m.responsavel_tecnico || '',
      status: m.status,
      observacoes: m.observacoes || '',
      medicamentos: m.medicamentos || [],
      animais_ids: m.animais_ids || [],
      criar_lembrete: m.criar_lembrete || false,
      data_lembrete: m.data_lembrete || '',
    });

    setSlideOpen(true);
  };

  // Abrir Slide Panel para Visualização
  const handleOpenView = (m: ManejoSanitario) => {
    setSelectedManejo(m);
    setSlideMode('view');

    
    setCurrentMedInsumoId('');

    setFormData({
      nome_lote: m.nome_lote,
      tipo_manejo: m.tipo_manejo,
      data_manejo: m.data_manejo,
      responsavel_tecnico: m.responsavel_tecnico || '',
      status: m.status,
      observacoes: m.observacoes || '',
      medicamentos: m.medicamentos || [],
      animais_ids: m.animais_ids || [],
      criar_lembrete: m.criar_lembrete || false,
      data_lembrete: m.data_lembrete || '',
    });

    setSlideOpen(true);
  };

  // Sessão 2: Adicionar medicamento à lista
  const handleAddMedicamento = () => {
    if (!currentMedInsumoId) {
      showToast('Selecione um medicamento do estoque.', 'error');
      return;
    }

    const insumoFound = insumos.find(i => i.id === currentMedInsumoId);
    if (!insumoFound) {
      showToast('Medicamento não encontrado no estoque disponível.', 'error');
      return;
    }
    if (formData.medicamentos.some((medicamento) => medicamento.insumo_id === currentMedInsumoId)) {
      showToast('Este medicamento já foi adicionado ao protocolo.', 'error');
      return;
    }
    if (!currentMedDose.trim() || currentMedDose.trim().length > MAX_DOMAIN_TEXT_LENGTH) {
      showToast(`Informe uma dose com no máximo ${MAX_DOMAIN_TEXT_LENGTH} caracteres.`, 'error');
      return;
    }
    if (!Number.isFinite(currentMedQtd) || currentMedQtd <= 0 || currentMedQtd > MAX_DOMAIN_QUANTITY) {
      showToast(`Informe uma quantidade positiva menor que ${MAX_DOMAIN_QUANTITY}.`, 'error');
      return;
    }

    const novoMed: MedicamentoAplicado = {
      insumo_id: insumoFound.id,
      nome_produto: insumoFound.nome_produto,
      dose: currentMedDose.trim(),
      quantidade_total: currentMedQtd,
    };

    setFormData(prev => ({
      ...prev,
      medicamentos: [...prev.medicamentos, novoMed]
    }));

    showToast(`${insumoFound.nome_produto} adicionado ao manejo!`);
  };

  // Sessão 2: Remover medicamento da lista
  const handleRemoveMedicamento = (index: number) => {
    setFormData(prev => ({
      ...prev,
      medicamentos: prev.medicamentos.filter((_, i) => i !== index)
    }));
  };

  // Sessão 3: Toggle seleção de animal no grupo
  const toggleAnimalInGroup = (animalId: string) => {
    setFormData(prev => {
      const exists = prev.animais_ids.includes(animalId);
      if (exists) {
        return { ...prev, animais_ids: prev.animais_ids.filter(id => id !== animalId) };
      } else {
        return { ...prev, animais_ids: [...prev.animais_ids, animalId] };
      }
    });
  };

  const handleSelectAllAnimais = () => {
    if (formData.animais_ids.length === animais.length) {
      setFormData(prev => ({ ...prev, animais_ids: [] }));
    } else {
      setFormData(prev => ({ ...prev, animais_ids: animais.map(a => a.id) }));
    }
  };

  // Salvar Manejo Sanitário
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSaving || isMutating) return;

    if (!formData.nome_lote) {
      showToast('Informe o nome do manejo ou lote.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      if (slideMode === 'edit' && selectedManejo) {
        await updateManejo({
          id: selectedManejo.id,
          updates: formData
        });
        showToast('Manejo sanitário atualizado!');
      } else {
        await createManejo(formData);
        showToast(
          formData.status === 'concluido'
            ? 'Manejo sanitário concluído! O estoque de medicamentos foi atualizado automaticamente.'
            : 'Manejo sanitário registrado em andamento!'
        );
      }
      setSlideOpen(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao salvar manejo sanitário.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete || isDeleting || isDeletingMutation) return;
    setIsDeleting(true);
    try {
      await deleteManejo(itemToDelete.id);
      showToast('Manejo sanitário removido do histórico.');
      setModalOpen(false);
      setSlideOpen(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao remover manejo.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Colunas da Listagem de Manejo Sanitário
  const columns: Column<ManejoSanitario>[] = [
    {
      header: 'Data',
      accessor: 'data_manejo',
      render: (row) => (
        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <span className="font-semibold text-gray-900 dark:text-gray-100">{row.data_manejo}</span>
        </div>
      ),
    },
    {
      header: 'Nome do Manejo / Lote',
      accessor: 'nome_lote',
      render: (row) => (
        <div>
          <span className="font-bold text-emerald-700 dark:text-emerald-400 block">{row.nome_lote}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {row.tipo_manejo} &bull; {row.medicamentos?.length || 0} med(s) &bull; {row.animais_ids?.length || 0} animais
          </span>
        </div>
      ),
    },
    {
      header: 'Responsável Técnico',
      accessor: 'responsavel_tecnico',
      render: (row) => (
        <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
          {row.responsavel_tecnico || 'Não informado'}
        </span>
      ),
    },
    {
      header: 'Status',
      render: (row) => (
        <Badge variant={row.status === 'concluido' ? 'success' : 'warning'}>
          {row.status === 'concluido' ? 'Concluído' : 'Em Andamento'}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* HEADER DA PÁGINA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
              Módulo Sanitário
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight mt-1">
            Controle Sanitário
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Histórico de medicações, vacinas e vermifugações do rebanho com rastreamento e baixa de insumos.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button variant="primary" icon={Plus} onClick={isOffline ? undefined : handleOpenCreate} disabled={isOffline} title={isOffline ? 'Novo manejo indisponível offline' : undefined}>
            Novo Manejo
          </Button>
        </div>
      </div>

      {isOffline && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
          <WifiOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div className="text-sm">
            <p className="font-semibold">Modo offline: exibindo as duas primeiras páginas locais.</p>
            <p className="mt-0.5 text-xs">Busca, filtro, paginação e ações ficam disponíveis novamente quando a conexão for restaurada. As duas abas continuam disponíveis offline.</p>
            {capturedAt && <p className="mt-1 text-[11px] opacity-80">Cache atualizado em {new Date(capturedAt).toLocaleString('pt-BR')}</p>}
          </div>
        </div>
      )}

      {/* TABS ESTRUTURAIS & FILTROS (TELA 5) */}
      <Card noPadding>
        {/* TABS ESTRUTURAIS: Em Andamento (X) / Concluídos (Y) */}
        <div className="flex border-b border-gray-200 dark:border-gray-800 px-4 pt-3 bg-gray-50/50 dark:bg-gray-900/50">
          <button
            onClick={() => { setActiveTab('andamento'); setPage(1); }}
            className={`pb-3 px-4 font-bold text-xs sm:text-sm border-b-2 transition-colors flex items-center space-x-2 ${
              activeTab === 'andamento'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Em Andamento</span>
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              activeTab === 'andamento' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
            }`}>
              {countAndamento}
            </span>
          </button>

          <button
            onClick={() => { setActiveTab('concluido'); setPage(1); }}
            className={`pb-3 px-4 font-bold text-xs sm:text-sm border-b-2 transition-colors flex items-center space-x-2 ${
              activeTab === 'concluido'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Concluídos</span>
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              activeTab === 'concluido' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
            }`}>
              {countConcluidos}
            </span>
          </button>
        </div>

        {/* BARRA DE BUSCA E FILTRO DE TIPO */}
        <div className="p-4 bg-white dark:bg-gray-800 grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-gray-100 dark:border-gray-800">
          <div className="md:col-span-2">
            <Input noMargin id="search_manejo"
              placeholder="Buscar por Nome do Manejo ou Lote..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              icon={Search}
              disabled={isOffline}
            />
          </div>

          <div>
            <Select noMargin id="filter_tipo_manejo"
              value={tipoManejoFilter}
              onChange={(e) => setTipoManejoFilter(e.target.value)}
              disabled={isOffline}
              options={[
                { label: 'Todos os Tipos de Protocolo', value: 'all' },
                { label: 'Vacinação', value: 'Vacinação' },
                { label: 'Vermifugação', value: 'Vermifugação' },
                { label: 'Tratamento', value: 'Tratamento' },
                { label: 'Exames', value: 'Exames' },
              ]}
            />
          </div>
        </div>

        {/* LISTAGEM (PRIORIDADE VISUAL) */}
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-gray-100 dark:bg-gray-700/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : isError ? (
          <div className="p-6">
            <ErrorState
              title="Erro ao carregar manejos sanitários"
              message="Não foi possível sincronizar o histórico de manejos sanitários ou a conexão atingiu o tempo limite. Tente novamente."
              onRetry={refetch}
            />
          </div>
        ) : listFiltrada.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Syringe}
              title={activeTab === 'andamento' ? 'Nenhum manejo em andamento' : 'Nenhum manejo concluído'}
              description={
                activeTab === 'andamento'
                  ? 'Não há protocolos de vacinação, vermifugação ou tratamentos pendentes no momento.'
                  : 'Nenhum histórico de manejo finalizado encontrado para os filtros selecionados.'
              }
              actionLabel={isOffline ? undefined : 'Novo Manejo'}
              onAction={isOffline ? undefined : handleOpenCreate}
            />
          </div>
        ) : (
          <Table
            data={listFiltrada}
            columns={columns}
            selectedIds={selectedManejoIds}
            onToggleSelect={isOffline ? undefined : handleToggleSelectManejo}
            onSelectAll={isOffline ? undefined : handleSelectAllManejos}
            onRowClick={(row) => handleOpenView(row)}
            onAction={isOffline ? undefined : (action, row) => {
              if (action === 'edit') handleOpenEdit(row);
              else if (action === 'view') handleOpenView(row);
              else if (action === 'delete') {
                setItemToDelete(row);
                setModalOpen(true);
              }
            }}
          />
        )}
        {!isOffline && (
          <Pagination
            currentPage={page}
            totalPages={Math.ceil((totalManejos || 0) / limit) || 1}
            onPageChange={setPage}
            totalItems={totalManejos}
            itemsPerPage={limit}
          />
        )}
      </Card>

      {/* STICKY BATCH ACTION BAR (Barra Flutuante para Ações em Lote) */}
      {!isOffline && selectedManejoIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900/95 dark:bg-gray-900/95 text-white border border-gray-700/80 shadow-2xl rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 backdrop-blur-md max-w-2xl w-11/12 animate-slide-up">
          <div className="flex items-center space-x-3">
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500 text-gray-950 font-bold text-xs">
              {selectedManejoIds.length}
            </span>
            <span className="text-sm font-semibold text-gray-100">
              {selectedManejoIds.length === 1 ? '1 manejo selecionado' : `${selectedManejoIds.length} manejos selecionados`}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="primary"
              onClick={() => {
                showToast(`Baixa/Conclusão em lote aplicada para ${selectedManejoIds.length} manejos.`, 'success');
                setSelectedManejoIds([]);
              }}
              className="bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold px-3 py-1.5 text-xs min-h-[44px]"
            >
              Dar Baixa em Lote ({selectedManejoIds.length})
            </Button>
            <Button
              variant="ghost"
              onClick={() => setSelectedManejoIds([])}
              className="!bg-slate-800 hover:!bg-slate-700 !text-white hover:!text-white border border-slate-600 font-bold px-3.5 py-1.5 text-xs rounded-lg transition-all shadow-sm min-h-[44px]"
            >
              Desmarcar Todos
            </Button>
          </div>
        </div>
      )}

      {/* TELA 5.1 - NOVO MANEJO SANITÁRIO [SLIDE PANEL] */}
      <SanitarioSlidePanel
        slideOpen={slideOpen}
        setSlideOpen={(open) => { if (!isSaving && !isDeleting && !isMutating) setSlideOpen(open); }}
        slideMode={slideMode}
        setSlideMode={setSlideMode}
        selectedManejo={selectedManejo}
        formData={formData}
        setFormData={setFormData}
        
        handleSelectAllAnimais={handleSelectAllAnimais}
        toggleAnimalInGroup={toggleAnimalInGroup}
        animais={animais}
        
        isSaving={isSaving || isMutating}
        isMutating={isSaving || isDeleting || isMutating}
        handleSave={handleSave}
        isOffline={isOffline}
        setGroupModalOpen={setGroupModalOpen}
        setItemToDelete={setItemToDelete}
        setModalOpen={setModalOpen}
        currentMedInsumoId={currentMedInsumoId}
        setCurrentMedInsumoId={setCurrentMedInsumoId}
        currentMedDose={currentMedDose}
        setCurrentMedDose={setCurrentMedDose}
        currentMedQtd={currentMedQtd}
        setCurrentMedQtd={setCurrentMedQtd}
        insumos={insumos}
        handleAddMedicamento={handleAddMedicamento}
        handleRemoveMedicamento={handleRemoveMedicamento}
      />
      <SanitarioModals
        modalOpen={modalOpen}
        setModalOpen={(open) => { if (!isDeleting && !isDeletingMutation) setModalOpen(open); }}
        itemToDelete={itemToDelete}
        handleDelete={handleDelete}
        isMutating={isDeleting || isDeletingMutation || isMutating}
        groupModalOpen={groupModalOpen}
        setGroupModalOpen={setGroupModalOpen}
        formData={formData}
        isOffline={isOffline}
        
        handleSelectAllAnimais={handleSelectAllAnimais}
        toggleAnimalInGroup={toggleAnimalInGroup}
        animais={animais}
      />
    </div>
  );
};
