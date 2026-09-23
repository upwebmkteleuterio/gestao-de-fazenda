import React from 'react';
import { useUIStore } from '@/store/useUIStore';

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
    eventos,
    isLoading,
    isError,
    refetch,
    selectedEventoIds,
    setSelectedEventoIds,
    handleToggleSelectEvento,
    handleSelectAllEventos,
    handleClearFilters,
    hasActiveFilters,
    createEvento,
    updateEvento,
    deleteEvento,
  } = useReproducaoTable();

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
  } = useReproducaoForm({
    createEvento,
    updateEvento,
    deleteEvento,
  });

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
      <ReprodutivoHeader onNovoRegistro={handleOpenCreate} />

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
      />

      {/* Tabela de Listagem de Eventos Reprodutivos */}
      <ReprodutivoTable
        eventos={eventos}
        total={totalEventos}
        page={page}
        onPageChange={setPage}
        isLoading={isLoading}
        isError={isError}
        onRetry={refetch}
        onNovoEvento={handleOpenCreate}
        selectedIds={selectedEventoIds}
        onToggleSelect={handleToggleSelectEvento}
        onSelectAll={handleSelectAllEventos}
        onRowClick={handleOpenView}
        onEdit={handleOpenEdit}
        onDelete={(evento) => {
          setEventoToDelete(evento);
          setModalOpen(true);
        }}
      />

      {/* Barra Flutuante para Seleção em Lote */}
      <ReprodutivoBatchBar
        selectedCount={selectedEventoIds.length}
        onRegistrarLote={handleRegistrarLote}
        onLimparSelecao={() => setSelectedEventoIds([])}
      />

      {/* SlidePanel Lateral de Criação, Edição e Visualização */}
      <ReprodutivoSlidePanel
        slideOpen={slideOpen}
        setSlideOpen={setSlideOpen}
        slideMode={slideMode}
        setSlideMode={setSlideMode}
        selectedEvento={selectedEvento}
        formData={formData}
        setFormData={setFormData}
        isSaving={false}
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
