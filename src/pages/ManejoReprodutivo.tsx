import React, { useEffect, useMemo } from 'react';
import { WifiOff } from 'lucide-react';
import { useUIStore } from '@/store/useUIStore';
import { useConnectivityStore } from '@/store/useConnectivityStore';

// Hooks locais de lógica
import { useReproducaoTable } from './ManejoReprodutivo/hooks/useReproducaoTable';
import { useReproducaoForm } from './ManejoReprodutivo/hooks/useReproducaoForm';
import { calcularPrevisaoParto, matchesReproducaoSearch } from './ManejoReprodutivo/utils/reproducaoUtils';

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
    periodo,
    handlePeriodoChange,
    dataInicio,
    setDataInicio,
    dataFim,
    setDataFim,
    dateRangeError,
    page,
    setPage,
    totalEventos,
    source,
    capturedAt,
    coverageStart,
    coverageEnd,
    isOffline,
    eventos,
    isLoading,
    isError,
    error,
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
  const offline = isOffline || source === 'local' || connectivityStatus === 'offline' || (typeof navigator !== 'undefined' && !navigator.onLine);
  const filteredEventos = useMemo(
    () => eventos.filter((evento) => matchesReproducaoSearch(evento, search)),
    [eventos, search],
  );

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
    clearCowSelection,
    modalOpen,
    setModalOpen,
    eventoToDelete,
    setEventoToDelete,
    formData,
    setFormData,
    matrizes,
    matrizesDisponiveis,
    lotes,
    selectedLoteId,
    setSelectedLoteId,
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
    setSelectedEventoIds([]);
    setSlideOpen(false);
    setModalOpen(false);
    setEventoToDelete(null);
  }, [offline, setSelectedEventoIds, setSlideOpen, setModalOpen, setEventoToDelete]);

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
            <p className="font-semibold">
              {source === 'local' && !isOffline ? 'Exibindo dados baixados (somente leitura).' : 'Histórico reprodutivo offline (somente leitura).'}
            </p>
            {coverageStart && coverageEnd ? (
              <p className="mt-0.5 text-xs">
                Cache sincronizado em {capturedAt ? new Date(capturedAt).toLocaleString('pt-BR') : 'data não informada'} · cobertura: {coverageStart} a {coverageEnd}.
              </p>
            ) : (
              <p className="mt-0.5 text-xs">O cache dos últimos 30 dias ainda não está disponível. Conecte-se para sincronizar o histórico.</p>
            )}
          </div>
        </div>
      )}

      {/* Card de Filtros (com alinhamento visual uniforme e campos padronizados) */}
      <ReprodutivoFilters
        search={search}
        onSearchChange={setSearch}
        protocolo={protocolo}
        onProtocoloChange={setProtocolo}
        periodo={periodo}
        onPeriodoChange={handlePeriodoChange}
        dataInicio={dataInicio}
        onDataInicioChange={setDataInicio}
        dataFim={dataFim}
        onDataFimChange={setDataFim}
        dateRangeError={dateRangeError}
        onClearFilters={handleClearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Tabela de Listagem de Eventos Reprodutivos */}
      <ReprodutivoTable
        eventos={filteredEventos}
        total={totalEventos}
        page={page}
        onPageChange={setPage}
        isLoading={isLoading}
        isOffline={offline}
        isError={isError}
        error={error}
        diagnostic={diagnostic}
        filterValidationMessage={dateRangeError}
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
        clearCowSelection={clearCowSelection}
        matrizes={matrizes}
        matrizesDisponiveis={matrizesDisponiveis}
        lotes={lotes}
        selectedLoteId={selectedLoteId}
        setSelectedLoteId={setSelectedLoteId}
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
