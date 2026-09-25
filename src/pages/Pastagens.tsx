import React from 'react';
import { useUIStore } from '@/store/useUIStore';

// Hooks locais especializados
import { usePastagensTable } from './Pastagens/hooks/usePastagensTable';
import { usePastagemForm } from './Pastagens/hooks/usePastagemForm';
import { checkSaidaVencida } from './Pastagens/utils/pastagemUtils';

// Sub-componentes da página Pastagens
import { PastagensHeader } from './Pastagens/components/PastagensHeader';
import { PastagensFilters } from './Pastagens/components/PastagensFilters';
import { PastagensGridCards } from './Pastagens/components/PastagensGridCards';
import { PastagensTable } from './Pastagens/components/PastagensTable';
import { PastagensBatchBar } from './Pastagens/components/PastagensBatchBar';
import { PastagensSlidePanel } from './Pastagens/components/PastagensSlidePanel';
import { PastagensModals } from './Pastagens/components/PastagensModals';

export const PastagensPage: React.FC = () => {
  const { showToast } = useUIStore();

  // Hook de Listagem, Filtros de Ocupação e Seleção de Pastos
  const {
    page,
    setPage,
    total,
    searchTerm,
    setSearchTerm,
    statusFiltro,
    setStatusFiltro,
    selectedPastoIds,
    setSelectedPastoIds,
    handleToggleSelectPasto,
    handleSelectAllPastos,
    pastagens,
    source,
    capturedAt,
    servicos,
    isLoadingPastagens,
    isErrorPastagens,
    refetchPastagens,
    createPastagem,
    updatePastagem,
    deletePastagem,
    addServico,
    syncLocalMutation,
  } = usePastagensTable();

  // Hook de Formulário, Configuração da Área, Rebanho Alocado e Serviços de Solo
  const {
    slideOpen,
    setSlideOpen,
    isEditing,
    isSaving,
    isDeleting,
    activeTab,
    setActiveTab,
    selectedPasto,
    pastoForm,
    setPastoForm,
    servicoForm,
    setServicoForm,
    modalOpen,
    setModalOpen,
    pastoToDelete,
    setPastoToDelete,
    handleOpenCreate,
    handleOpenDetails,
    handleSavePasto,
    handleAddServico,
    handleDeletePasto,
    animaisNoPasto,
    resumoRebanhoPasto,
    servicosDoPasto,
  } = usePastagemForm({
    createPastagem,
    updatePastagem,
    deletePastagem,
    addServico,
    servicos,
    syncLocalMutation,
  });

  const handleRegistrarServicoLote = () => {
    showToast(`Ação em lote aplicada para ${selectedPastoIds.length} áreas.`, 'success');
    setSelectedPastoIds([]);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header com ações principais */}
      <PastagensHeader onNovoPiquete={handleOpenCreate} />

      {source === 'local' && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200" role="status">
          <span>Exibindo dados locais{capturedAt ? ` · última captura ${new Date(capturedAt).toLocaleString('pt-BR')}` : ''}.</span>
        </div>
      )}

      {/* Busca e Filtros de Status de Ocupação */}
      <PastagensFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        statusFiltro={statusFiltro}
        onStatusChange={setStatusFiltro}
      />

      {/* Cards Visuais de Destaque dos Pastos e Piquetes */}
      <PastagensGridCards
        pastagens={pastagens}
        isLoading={isLoadingPastagens}
        onOpenDetails={handleOpenDetails}
      />

      {/* Tabela de Listagem Completa com Ações e Seleção */}
      <PastagensTable
        pastagens={pastagens}
        total={total}
        page={page}
        onPageChange={setPage}
        isLoading={isLoadingPastagens}
        isError={isErrorPastagens}
        onRetry={refetchPastagens}
        onNovoPasto={handleOpenCreate}
        selectedIds={selectedPastoIds}
        onToggleSelect={handleToggleSelectPasto}
        onSelectAll={handleSelectAllPastos}
        onOpenDetails={handleOpenDetails}
      />

      {/* Barra de Ação Flutuante para Seleção em Lote */}
      <PastagensBatchBar
        selectedCount={selectedPastoIds.length}
        onRegistrarServicoLote={handleRegistrarServicoLote}
        onLimparSelecao={() => setSelectedPastoIds([])}
      />

      {/* SlidePanel de Detalhes, Rebanho Alocado e Serviços de Solo */}
      <PastagensSlidePanel
        slideOpen={slideOpen}
        setSlideOpen={setSlideOpen}
        isEditing={isEditing}
        isSaving={isSaving}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedPasto={selectedPasto}
        pastoForm={pastoForm}
        setPastoForm={setPastoForm}
        servicoForm={servicoForm}
        setServicoForm={setServicoForm}
        handleSavePasto={handleSavePasto}
        handleAddServico={handleAddServico}
        setModalOpen={setModalOpen}
        setPastoToDelete={setPastoToDelete}
        animaisNoPasto={animaisNoPasto}
        resumoRebanhoPasto={resumoRebanhoPasto}
        servicosDoPasto={servicosDoPasto}
        checkSaidaVencida={checkSaidaVencida}
      />

      {/* Modal de Confirmação de Exclusão */}
      <PastagensModals
        modalOpen={modalOpen}
        setModalOpen={setModalOpen}
        pastoToDelete={pastoToDelete}
        handleDeletePasto={handleDeletePasto}
        isDeleting={isDeleting}
      />
    </div>
  );
};

export default PastagensPage;
