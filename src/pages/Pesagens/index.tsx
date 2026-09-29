import React, { useState } from 'react';
import { Plus, Scale, Search, Edit, Trash2, Calendar, TrendingUp } from 'lucide-react';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Pagination } from '../../components/Pagination';
import { Table, Column } from '../../components/Table';
import { Badge } from '../../components/Badge';
import { Input } from '../../components/Input';
import { Select } from '../../components/Select';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { usePesagens } from '../../hooks/usePesagens';
import { useAnimais } from '../../hooks/useAnimais';
import { useLotes } from '../../hooks/useLotes';
import { useUIStore } from '../../store/useUIStore';
import { useConnectivityStore } from '../../store/useConnectivityStore';
import { SyncStatusIndicator, type SyncStatus } from '../../components/SyncStatusIndicator';
import { Pesagem } from '../../types/database';
import { isPlausiblePesagem, validatePesagemFields } from '@/services/domainValidation';
import { PesagemSlidePanel } from './components/PesagemSlidePanel';
import { PesagemModals } from './components/PesagemModals';

type PesagemRow = Pesagem & {
  syncStatus?: SyncStatus;
  syncError?: string;
  localDeleted?: boolean;
};

export const PesagensPage: React.FC = () => {
  const { slidePanel, closeSlidePanel, showToast } = useUIStore();
  const { animais } = useAnimais();
  const { lotes } = useLotes();
  const isOffline = useConnectivityStore((state) => state.status === 'offline');

  const [search, setSearch] = useState('');
  const [tipoAnimal, setTipoAnimal] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const { pesagens, total, source, capturedAt, isLoading, isError, error, refetch, createPesagem, createPesagemGrupo, updatePesagem, deletePesagem, isCreating, isCreatingGrupo, isUpdating, isDeleting } = usePesagens({
    search,
    tipoAnimal,
    startDate,
    endDate,
    page,
    limit,
  });
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const isSaving = isSubmitting || isCreating || isCreatingGrupo || isUpdating;

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

  // State para Pesagem em Grupo
  const [grupoRows, setGrupoRows] = useState<{ animal_id: string; brinco_animal: string; peso_kg: number }[]>([
    { animal_id: '', brinco_animal: '', peso_kg: 0 },
    { animal_id: '', brinco_animal: '', peso_kg: 0 },
  ]);
  const [selectedLoteId, setSelectedLoteId] = useState('');

  React.useEffect(() => {
    if (!isOffline) return;
    setSearch('');
    setTipoAnimal('all');
    setStartDate('');
    setEndDate('');
    setPage(1);
  }, [isOffline]);

  const handleOpenCreate = () => {
    setSelectedPesagem(null);
    setFormData({
      animal_id: '',
      brinco_animal: '',
      tipo_animal: undefined,
      peso_kg: 0,
      data_pesagem: new Date().toISOString().split('T')[0],
      observacoes: '',
    });
    setSlideMode('create');
    setActiveTabPanel('individual');
    setSelectedLoteId('');
    setGrupoRows([
      { animal_id: '', brinco_animal: '', peso_kg: 0 },
      { animal_id: '', brinco_animal: '', peso_kg: 0 },
    ]);
    setSlideOpen(true);
  };

  const handleOpenEdit = (p: Pesagem) => {
    setSelectedPesagem(p);
    setFormData({ ...p });
    setActiveTabPanel('individual');
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
    if (isSaving) return;
    setIsSubmitting(true);

    try {
      if (slideMode === 'create') {
        if (activeTabPanel === 'individual') {
          validatePesagemFields(formData);
          if (isPlausiblePesagem(formData.peso_kg as number)) showToast('Atenção: este peso está fora da faixa usual, mas será salvo para conferência.', 'info');
          await createPesagem(formData as Omit<Pesagem, 'id' | 'createdAt' | 'status_sincronizacao'>);
          showToast(`Pesagem do animal ${formData.brinco_animal} salva com sucesso!`);
        } else {
          const selectedLote = lotes.find((lote) => lote.id === selectedLoteId);
          if (!selectedLote) {
            showToast('Selecione um lote cadastrado para a pesagem em grupo.', 'error');
            return;
          }
          const filledRows = grupoRows.filter((row) => row.animal_id || row.brinco_animal || row.peso_kg > 0);
          const validGrupo = grupoRows.filter((row) => row.animal_id && row.brinco_animal && row.peso_kg > 0);
          if (validGrupo.length === 0 || validGrupo.length !== filledRows.length) {
            showToast('Selecione um animal real e informe um peso válido em cada linha preenchida.', 'error');
            return;
          }
          const animalIds = new Set<string>();
          validGrupo.forEach((row) => {
            if (animalIds.has(row.animal_id)) throw new Error('Não é possível repetir o mesmo animal na pesagem em grupo.');
            animalIds.add(row.animal_id);
          });
          const dataPesagem = formData.data_pesagem || '';
          const pesagensToCreate = validGrupo.map((row) => ({
            animal_id: row.animal_id,
            brinco_animal: row.brinco_animal,
            tipo_animal: (animais.find((animal) => animal.id === row.animal_id)?.tipo_animal || 'vaca') as Pesagem['tipo_animal'],
            lote_id: selectedLote.id,
            lote_nome: selectedLote.nome,
            peso_kg: row.peso_kg,
            data_pesagem: dataPesagem,
            observacoes: 'Pesagem registrada em grupo',
          }));
          pesagensToCreate.forEach((item) => validatePesagemFields(item));
          if (pesagensToCreate.some((item) => isPlausiblePesagem(item.peso_kg))) showToast('Atenção: há peso fora da faixa usual; os valores tecnicamente válidos serão salvos para conferência.', 'info');
          await createPesagemGrupo(pesagensToCreate);
          showToast(`${validGrupo.length} pesagens em grupo salvas com sucesso!`);
        }
      } else if (slideMode === 'edit' && selectedPesagem) {
        validatePesagemFields(formData);
        if (isPlausiblePesagem(formData.peso_kg as number)) showToast('Atenção: este peso está fora da faixa usual, mas será salvo para conferência.', 'info');
        await updatePesagem({ id: selectedPesagem.id, updates: formData });
        showToast('Pesagem atualizada com sucesso!');
      }
      setSlideOpen(false);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erro ao salvar pesagem.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!pesagemToDelete || isDeleting) return;
    try {
      await deletePesagem(pesagemToDelete.id);
      showToast('Pesagem excluída do histórico.', 'info');
      setModalOpen(false);
    } catch (err) {
      showToast('Erro ao excluir pesagem.', 'error');
    }
  };

  const columns: Column<PesagemRow>[] = [
    {
      header: 'ID / Brinco',
      accessor: 'brinco_animal',
      render: (row) => (
        <div>
          <span className="font-bold text-emerald-700 dark:text-emerald-400 transition-colors inline-flex items-center gap-1.5">
            {row.brinco_animal}
            <SyncStatusIndicator status={row.syncStatus} error={row.syncError} />
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 capitalize block">
            {row.tipo_animal || 'Vaca'}
          </span>
          {row.brinco_duplicado && <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300">Brinco duplicado · histórico separado por animal</span>}
        </div>
      ),
    },
    {
      header: 'Lote',
      render: (row) => row.lote_nome
        ? <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">{row.lote_nome}</span>
        : <span className="text-xs text-gray-400">Individual</span>,
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
        return <span className="text-xs text-gray-400">Aguardando próxima pesagem ou intervalo válido</span>;
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
            Acompanhe o Ganho Médio Diário (GMD) e registre o peso do rebanho.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
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
            id="search-brinco-lote"
            type="text"
            icon={Search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por Brinco ou Lote..." noMargin
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


      {/* SLIDE PANEL (Tela 2.1 - Nova Pesagem) */}
      
      <PesagemSlidePanel
        slideOpen={slideOpen}
        setSlideOpen={setSlideOpen}
        slideMode={slideMode}
        setSlideMode={setSlideMode}
        selectedPesagem={selectedPesagem}
        formData={formData}
        setFormData={setFormData}
        isSaving={isSaving}
        handleSave={handleSave}
        activeTabPanel={activeTabPanel}
        setActiveTabPanel={setActiveTabPanel}
        grupoRows={grupoRows}
        setGrupoRows={setGrupoRows}
        animais={animais}
        lotes={lotes}
        selectedLoteId={selectedLoteId}
        setSelectedLoteId={setSelectedLoteId}
      />
      <PesagemModals
        modalOpen={modalOpen}
        setModalOpen={setModalOpen}
        pesagemToDelete={pesagemToDelete}
        handleDeleteConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />

    </div>
  );
};
