import React, { useEffect } from 'react';
import { WifiOff } from 'lucide-react';
import { useUIStore } from '@/store/useUIStore';
import { useConnectivityStore } from '@/store/useConnectivityStore';

// Hooks locais de lógica
import { useReproducaoTable } from './ManejoReprodutivo/hooks/useReproducaoTable';
import { useReproducaoForm } from './ManejoReprodutivo/hooks/useReproducaoForm';
import { calcularPrevisaoParto } from './ManejoReprodutivo/utils/reproducaoUtils';

// Sub-componentes visuais
import { ReprodutivoHeader } from './ManejoReprodutivo/components/ReprodutivoHeader';
import { ReprodutivoFilters } from './ManejoReprodutivo/components/ReprodutivoFilters';
import { ReprodutivoTable } from './ManejoReprodutivo/components/ReprodutivoTable';
import { ReprodutivoBatchBar } from './ManejoReprodutivo/components/ReprodutivoBatchBar';
import { ReprodutivoSlidePanel } from './ManejoReprodutivo/components/ReprodutivoSlidePanel';
import { ReprodutivoModals } from './ManejoReprodutivo/components/ReprodutivoModals';

export const ManejoReprodutivoPage: React.FC = () => {
  const { showToast } = useUIStore();
  const connectivityStatus = useConnectivityStore((state) => state.status);

  // Hook de Listagem, Filtros de Busca e Seleção em Lote
  const {
    search,
    setSearch,
    protocolo,
    setProtocolo,
    dataInicio,
    setDataInicio,
    dataFim,
    setDataFim,
    page,
    setPage,
    totalEventos,
    isOffline,
    eventos,
    isLoading,
    isError,
    diagnostic,
    refetch,
    selectedEventoIds,
    setSelectedEventoIds,
    handleToggleSelectEvento,
    handleSelectAllEventos,
    handleClearFilters,
    hasActiveFilters,
    createEvento,
    createEventosBatch,
    updateEvento,
    deleteEvento,
    isSaving: mutationIsSaving,
  } = useReproducaoTable();
  const offline = isOffline || connectivityStatus === 'offline' || (typeof navigator !== 'undefined' && !navigator.onLine);

  // Hook de Formulário Reprodutivo (IATF, Monta, TETF, DG) e SlidePanel
  const {
    slideOpen,
    setSlideOpen,
    slideMode,
    setSlideMode,
    selectedEvento,
    activeTab,
    setActiveTab,
    selectedCowIds,
    toggleCowSelection,
    selectAllCows,
    modalOpen,
    setModalOpen,
    eventoToDelete,
    setEventoToDelete,
    formData,
    setFormData,
    matrizes,
    tourosList,
    handleOpenCreate,
    handleOpenEdit,
    handleOpenView,
    handleSave,
    handleDelete,
    isSaving,
  } = useReproducaoForm({
    createEvento,
    createEventosBatch,
    updateEvento,
    deleteEvento,
    isSaving: mutationIsSaving,
  });

  useEffect(() => {
    if (!offline) return;
    setSearch('');
    setProtocolo('all');
    setDataInicio('');
    setDataFim('');
    setPage(1);
    setSelectedEventoIds([]);
    setSlideOpen(false);
    setModalOpen(false);
    setEventoToDelete(null);
  }, [offline, setSearch, setProtocolo, setDataInicio, setDataFim, setPage, setSelectedEventoIds, setSlideOpen, setModalOpen, setEventoToDelete]);

  const handleRegistrarLote = () => {
    showToast(
      `Ação em lote aplicada para ${selectedEventoIds.length} eventos reprodutivos.`,
      'success'
    );
    setSelectedEventoIds([]);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header com ações principais */}
      <ReprodutivoHeader onNovoRegistro={handleOpenCreate} novoRegistroDisabled={offline} />

      {offline && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200" role="status">
          <WifiOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-semibold">Conexão necessária para o histórico reprodutivo.</p>
            <p className="mt-0.5 text-xs">Os registros são carregados somente enquanto houver conexão ativa. Verifique sua internet para consultar o histórico, usar filtros e paginação ou registrar eventos.</p>
          </div>
        </div>
      )}

      {/* Card de Filtros (com alinhamento visual uniforme e campos padronizados) */}
      <ReprodutivoFilters
        search={search}
        onSearchChange={setSearch}
        protocolo={protocolo}
        onProtocoloChange={setProtocolo}
        dataInicio={dataInicio}
        onDataInicioChange={setDataInicio}
        dataFim={dataFim}
        onDataFimChange={setDataFim}
        onClearFilters={handleClearFilters}
        hasActiveFilters={hasActiveFilters}
        disabled={offline}
      />

      {/* Tabela de Listagem de Eventos Reprodutivos */}
      <ReprodutivoTable
        eventos={eventos}
        total={totalEventos}
        page={page}
        onPageChange={setPage}
        isLoading={isLoading}
        isOffline={offline}
        isError={isError}
        diagnostic={diagnostic}
        onRetry={refetch}
        onNovoEvento={offline ? undefined : handleOpenCreate}
        selectedIds={selectedEventoIds}
        onToggleSelect={handleToggleSelectEvento}
        onSelectAll={handleSelectAllEventos}
        onRowClick={handleOpenView}
        onEdit={(evento) => {
          if (!offline) handleOpenEdit(evento);
        }}
        onDelete={(evento) => {
          if (offline) return;
          setEventoToDelete(evento);
          setModalOpen(true);
        }}
      />

      {/* Barra Flutuante para Seleção em Lote */}
      {!offline && (
        <ReprodutivoBatchBar
          selectedCount={selectedEventoIds.length}
          onRegistrarLote={handleRegistrarLote}
          onLimparSelecao={() => setSelectedEventoIds([])}
        />
      )}

      {/* SlidePanel Lateral de Criação, Edição e Visualização */}
      <ReprodutivoSlidePanel
        slideOpen={slideOpen}
        setSlideOpen={setSlideOpen}
        slideMode={slideMode}
        setSlideMode={setSlideMode}
        selectedEvento={selectedEvento}
        formData={formData}
        setFormData={setFormData}
        isSaving={isSaving}
        handleSave={handleSave}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedCowIds={selectedCowIds}
        toggleCowSelection={toggleCowSelection}
        toggleAllCows={selectAllCows}
        matrizes={matrizes}
        touros={tourosList}
        calcularPrevisaoParto={calcularPrevisaoParto}
        setModalOpen={setModalOpen}
        setEventoToDelete={setEventoToDelete}
        mutationsDisabled={offline}
      />

      {/* Modal de Confirmação de Exclusão */}
      <ReprodutivoModals
        modalOpen={modalOpen}
        setModalOpen={setModalOpen}
        eventoToDelete={eventoToDelete}
        handleDelete={handleDelete}
      />
    </div>
  );
};

export default ManejoReprodutivoPage;
