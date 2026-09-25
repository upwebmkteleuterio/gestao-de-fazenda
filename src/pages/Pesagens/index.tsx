import React, { useState } from 'react';
import { Plus, Scale, Layers, Search, Edit, Trash2, Calendar, TrendingUp } from 'lucide-react';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Pagination } from '../../components/Pagination';
import { Table, Column } from '../../components/Table';
import { Badge } from '../../components/Badge';
import { Input } from '../../components/Input';
import { Select } from '../../components/Select';
import { SlidePanel } from '../../components/SlidePanel';
import { Modal } from '../../components/Modal';
import { Tabs } from '../../components/Tabs';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { usePesagens } from '../../hooks/usePesagens';
import { useLotes } from '../../hooks/useLotes';
import { useAnimais } from '../../hooks/useAnimais';
import { useUIStore } from '../../store/useUIStore';
import { useConnectivityStore } from '../../store/useConnectivityStore';
import { Pesagem } from '../../types/database';
import { PesagemSlidePanel } from './components/PesagemSlidePanel';
import { PesagemModals } from './components/PesagemModals';

export const PesagensPage: React.FC = () => {
  const { slidePanel, closeSlidePanel, showToast } = useUIStore();
  const { animais } = useAnimais();
  const isOffline = useConnectivityStore((state) => state.status === 'offline');

  const [search, setSearch] = useState('');
  const [tipoAnimal, setTipoAnimal] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const { pesagens, total, source, capturedAt, isLoading, isError, error, refetch, createPesagem, createPesagemGrupo, updatePesagem, deletePesagem } = usePesagens({
    search,
    tipoAnimal,
    startDate,
    endDate,
    page,
    limit,
  });
  const { createLote } = useLotes();

  // Seleção múltipla para Ação em Lote "Criar Lote de Animais"
  const [selectedPesagemIds, setSelectedPesagemIds] = useState<string[]>([]);

  // Slide Panel state
  const [slideOpen, setSlideOpen] = useState(false);
  const [slideMode, setSlideMode] = useState<'create' | 'edit' | 'view'>('create');
  const [activeTabPanel, setActiveTabPanel] = useState<'individual' | 'grupo'>('individual');
  const [selectedPesagem, setSelectedPesagem] = useState<Pesagem | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [pesagemToDelete, setPesagemToDelete] = useState<Pesagem | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Pesagem>>({
    animal_id: '',
    brinco_animal: '',
    tipo_animal: 'vaca',
    peso_kg: 0,
    data_pesagem: new Date().toISOString().split('T')[0],
    observacoes: '',
  });

  // Modal Lote State
  const [loteModalOpen, setLoteModalOpen] = useState(false);
  const [loteName, setLoteName] = useState('');

  // State para Pesagem em Grupo
  const [grupoRows, setGrupoRows] = useState<{ animal_id: string; brinco_animal: string; peso_kg: number }[]>([
    { animal_id: '', brinco_animal: '', peso_kg: 0 },
    { animal_id: '', brinco_animal: '', peso_kg: 0 },
  ]);

  React.useEffect(() => {
    if (!isOffline) return;
    setSearch('');
    setTipoAnimal('all');
    setStartDate('');
    setEndDate('');
    setPage(1);
  }, [isOffline]);

  const handleOpenCreate = () => {
    const firstAnimal = animais[0];
    setSelectedPesagem(null);
    setFormData({
      animal_id: firstAnimal?.id || '',
      brinco_animal: firstAnimal?.brinco || '',
      tipo_animal: firstAnimal?.tipo_animal || 'vaca',
      peso_kg: 0,
      data_pesagem: new Date().toISOString().split('T')[0],
      observacoes: '',
    });
    setSlideMode('create');
    setActiveTabPanel('individual');
    setSlideOpen(true);
  };

  const handleOpenEdit = (p: Pesagem) => {
    setSelectedPesagem(p);
    setFormData({ ...p });
    setSlideMode('edit');
    setSlideOpen(true);
  };

  const handleOpenView = (p: Pesagem) => {
    setSelectedPesagem(p);
    setFormData({ ...p });
    setSlideMode('view');
    setSlideOpen(true);
  };

  React.useEffect(() => {
    if (slidePanel.isOpen && slidePanel.entityType === 'pesagem') {
      if (slidePanel.mode === 'create') {
        handleOpenCreate();
      } else if (slidePanel.mode === 'edit' && slidePanel.data) {
        handleOpenEdit(slidePanel.data);
      } else if (slidePanel.mode === 'view' && slidePanel.data) {
        handleOpenView(slidePanel.data);
      }
      closeSlidePanel();
    }
  }, [slidePanel.isOpen, slidePanel.entityType]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (slideMode === 'create') {
        if (activeTabPanel === 'individual') {
          if (!formData.brinco_animal || !formData.peso_kg) {
            showToast('Preencha o brinco e peso do animal.', 'error');
            return;
          }
          await createPesagem(formData as Omit<Pesagem, 'id' | 'createdAt' | 'status_sincronizacao'>);
          showToast(`Pesagem do animal ${formData.brinco_animal} salva com sucesso!`);
        } else {
          // Salva Pesagem em Grupo
          const validGrupo = grupoRows.filter(r => r.animal_id && r.brinco_animal && r.peso_kg > 0);
          if (validGrupo.length === 0 || validGrupo.length !== grupoRows.filter(r => r.brinco_animal || r.peso_kg > 0).length) {
            showToast('Selecione um animal real e informe um peso válido em cada linha preenchida.', 'error');
            return;
          }
          const pesagensToCreate = validGrupo.map(r => ({
            animal_id: r.animal_id,
            brinco_animal: r.brinco_animal,
            tipo_animal: (animais.find((animal) => animal.id === r.animal_id)?.tipo_animal || 'vaca') as Pesagem['tipo_animal'],
            peso_kg: r.peso_kg,
            data_pesagem: formData.data_pesagem || new Date().toISOString().split('T')[0],
            observacoes: 'Pesagem registrada em grupo',
          }));

          await createPesagemGrupo(pesagensToCreate);
          showToast(`${validGrupo.length} pesagens em grupo salvas com sucesso!`);
        }
      } else if (slideMode === 'edit' && selectedPesagem) {
        await updatePesagem({ id: selectedPesagem.id, updates: formData });
        showToast('Pesagem atualizada com sucesso!');
      }
      setSlideOpen(false);
    } catch (err) {
      showToast('Erro ao salvar pesagem.', 'error');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!pesagemToDelete) return;
    try {
      await deletePesagem(pesagemToDelete.id);
      showToast('Pesagem excluída do histórico.', 'info');
      setModalOpen(false);
    } catch (err) {
      showToast('Erro ao excluir pesagem.', 'error');
    }
  };

  const handleCriarLoteComSelecionados = () => {
    setLoteName('');
    setLoteModalOpen(true);
  };

  const confirmarCriacaoLote = async () => {
    if (!loteName.trim()) {
      showToast('Por favor, informe o nome do Lote.', 'error');
      return;
    }
    
    const animalIds = selectedPesagemIds
      .map(id => pesagens.find(p => p.id === id)?.animal_id)
      .filter(Boolean) as string[];

    try {
      await createLote({ nome: loteName.trim(), animais_ids: animalIds });
      if (animalIds.length > 0) {
        showToast(`Lote "${loteName.trim()}" criado com ${animalIds.length} animais! Acesse Lotes & Retiros para gerenciá-lo.`, 'success');
      } else {
        showToast(`Lote "${loteName.trim()}" criado com sucesso!`, 'success');
      }
      setSelectedPesagemIds([]);
      setLoteModalOpen(false);
      setLoteName('');
    } catch (e) {
      showToast('Erro ao criar lote.', 'error');
    }
  };

  const columns: Column<Pesagem>[] = [
    {
      header: 'ID / Brinco',
      accessor: 'brinco_animal',
      render: (row) => (
        <div>
          <span className="font-bold text-emerald-700 dark:text-emerald-400 transition-colors">
            {row.brinco_animal}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 capitalize block">
            {row.tipo_animal || 'Vaca'}
          </span>
        </div>
      ),
    },
    {
      header: '1ª Pesagem (Anterior)',
      render: (row) => {
        if (row.data_pesagem_anterior && row.peso_anterior !== undefined) {
          return (
            <div>
              <span className="font-semibold text-gray-700 dark:text-gray-300 block text-xs">
                {row.data_pesagem_anterior}
              </span>
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                {row.peso_anterior} kg
              </span>
            </div>
          );
        }
        return <span className="text-xs text-gray-400 italic">Pesagem inicial</span>;
      },
    },
    {
      header: '2ª Pesagem (Atual)',
      render: (row) => (
        <div>
          <span className="font-semibold text-gray-900 dark:text-gray-100 block text-xs">
            {row.data_pesagem}
          </span>
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
            {row.peso_kg} kg
          </span>
        </div>
      ),
    },
    {
      header: 'Evolução / Ganho',
      render: (row) => {
        if (row.gmd_calculado !== undefined && row.dias_intervalo) {
          const ganho = row.ganho_peso_kg ?? (row.peso_anterior !== undefined ? Number((row.peso_kg - row.peso_anterior).toFixed(1)) : undefined);
          return (
            <div>
              <span className={`text-xs font-bold block ${ganho !== undefined && ganho >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                {ganho !== undefined ? (ganho >= 0 ? `+${ganho} kg` : `${ganho} kg`) : '-'}
              </span>
              <span className="text-xs text-gray-400">
                em {row.dias_intervalo} dias
              </span>
            </div>
          );
        }
        return <span className="text-xs text-gray-400">-</span>;
      },
    },
    {
      header: 'GMD Calculado (Ganho Diário)',
      render: (row) => {
        if (row.gmd_calculado !== undefined) {
          const gmd = row.gmd_calculado;
          if (gmd > 0.8) {
            return (
              <Badge variant="success" className="font-bold">
                +{gmd} kg/dia (Excelente)
              </Badge>
            );
          } else if (gmd >= 0) {
            return (
              <Badge variant="warning" className="font-bold">
                +{gmd} kg/dia (Moderado)
              </Badge>
            );
          } else {
            return (
              <Badge variant="danger" className="font-bold">
                {gmd} kg/dia (Perda)
              </Badge>
            );
          }
        }
        return <span className="text-xs text-gray-400">Aguardando 2ª pesagem</span>;
      },
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Histórico de Pesagens</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Acompanhe o Ganho Médio Diário (GMD) e crie lotes a partir do peso do rebanho.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0 flex-wrap sm:flex-nowrap">
          <Button
            id="btn-criar-lote-pesagens"
            variant={selectedPesagemIds.length > 0 ? 'primary' : 'secondary'}
            icon={Layers}
            onClick={handleCriarLoteComSelecionados}
            title={
              selectedPesagemIds.length > 0
                ? `Criar lote com as ${selectedPesagemIds.length} pesagens selecionadas`
                : 'Criar novo lote de animais a partir de pesagens'
            }
            className={selectedPesagemIds.length > 0 ? 'ring-2 ring-emerald-500/40 shadow-sm' : ''}
          >
            {selectedPesagemIds.length > 0 ? `Criar Lote (${selectedPesagemIds.length})` : 'Criar Lote'}
          </Button>
          <Button variant="primary" icon={Plus} onClick={handleOpenCreate}>
            Nova Pesagem
          </Button>
        </div>
      </div>

      {(isOffline || source === 'local' || capturedAt) && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200" role="status">
          <strong>{isOffline ? 'Modo offline:' : source === 'local' ? 'Dados locais:' : 'Cache offline disponível:'}</strong>{' '}
          {source === 'local' || isOffline ? 'Exibindo as 10 pesagens mais recentes disponíveis localmente. ' : 'As 10 pesagens mais recentes estão pré-carregadas para uso offline. '}
          Busca, filtros, datas e paginação ficam disponíveis somente online.
          {capturedAt && <span className="ml-1 text-xs opacity-80">Atualizado em {new Date(capturedAt).toLocaleString('pt-BR')}</span>}
        </div>
      )}

      {/* Card da Tabela com Filtros */}
      <Card noPadding>
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Input
            id="search-brinco"
            type="text"
            icon={Search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por Brinco..." noMargin
            disabled={isOffline}
          />

          <Select
            id="filter-tipo"
            value={tipoAnimal}
            onChange={(e) => setTipoAnimal(e.target.value)}
            noMargin
            disabled={isOffline}
            options={[
              { label: 'Todos os Tipos', value: 'all' },
              { label: 'Vaca', value: 'vaca' },
              { label: 'Bezerro', value: 'bezerro' },
              { label: 'Matriz', value: 'matriz' },
              { label: 'Touro', value: 'touro' },

            ]}
          />

          <Input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            noMargin
            disabled={isOffline}
            className="mb-0"
          />

          <Input
            id="endDate"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            noMargin
            disabled={isOffline}
            className="mb-0"
          />
        </div>

        {/* Tabela de Pesagens com Skeleton Loader, ErrorState e EmptyState */}
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-gray-100 dark:bg-gray-700/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : isError ? (
          <div className="p-6">
            <ErrorState
              title="Erro ao carregar histórico de pesagens"
              message="Não foi possível obter os dados de pesagem do rebanho ou o tempo limite foi atingido. Tente novamente."
              onRetry={refetch}
            />
          </div>
        ) : pesagens.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Scale}
              title="Nenhuma pesagem registrada"
              description="Não foram encontradas pesagens para os filtros selecionados ou ainda não há pesagens cadastradas no rebanho."
              actionLabel="Nova Pesagem"
              onAction={handleOpenCreate}
            />
          </div>
        ) : (
          <>
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
          {!isOffline && (
            <Pagination
              currentPage={page}
              totalPages={Math.ceil((total || 0) / limit) || 1}
              onPageChange={(p) => setPage(p)}
              totalItems={total}
              itemsPerPage={limit}
            />
          )}
          </>
        )}
      </Card>

      {/* STICKY BATCH ACTION BAR (Barra Flutuante para Ações em Lote) */}
      {selectedPesagemIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900/95 dark:bg-gray-900/95 text-white border border-gray-700/80 shadow-2xl rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 backdrop-blur-md max-w-2xl w-11/12 animate-slide-up">
          <div className="flex items-center space-x-3">
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500 text-gray-950 font-bold text-xs">
              {selectedPesagemIds.length}
            </span>
            <span className="text-sm font-semibold text-gray-100">
              {selectedPesagemIds.length === 1 ? '1 pesagem selecionada' : `${selectedPesagemIds.length} pesagens selecionadas`}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="primary"
              icon={Layers}
              onClick={handleCriarLoteComSelecionados}
              className="bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold px-3 py-1.5 text-xs"
            >
              Criar Lote ({selectedPesagemIds.length})
            </Button>
            <Button
              variant="ghost"
              onClick={() => setSelectedPesagemIds([])}
              className="!bg-slate-800 hover:!bg-slate-700 !text-white hover:!text-white border border-slate-600 font-bold px-3.5 py-1.5 text-xs rounded-lg transition-all shadow-sm"
            >
              Desmarcar Todos
            </Button>
          </div>
        </div>
      )}

      {/* SLIDE PANEL (Tela 2.1 - Nova Pesagem) */}
      
      <PesagemSlidePanel
        slideOpen={slideOpen}
        setSlideOpen={setSlideOpen}
        slideMode={slideMode}
        setSlideMode={setSlideMode}
        selectedPesagem={selectedPesagem}
        formData={formData}
        setFormData={setFormData}
        isSaving={false}
        handleSave={handleSave}
        activeTabPanel={activeTabPanel}
        setActiveTabPanel={setActiveTabPanel}
        grupoRows={grupoRows}
        setGrupoRows={setGrupoRows}
        animais={animais}
      />
      <PesagemModals
        modalOpen={modalOpen}
        setModalOpen={setModalOpen}
        pesagemToDelete={pesagemToDelete}
        handleDeleteConfirm={handleDeleteConfirm}
        loteModalOpen={loteModalOpen}
        setLoteModalOpen={setLoteModalOpen}
        loteName={loteName}
        setLoteName={setLoteName}
        selectedPesagemIds={selectedPesagemIds}
        confirmarCriacaoLote={confirmarCriacaoLote}
      />

    </div>
  );
};
