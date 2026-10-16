import React from 'react';
import { Search } from 'lucide-react';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { Tabs } from '@/components/Tabs';

// Hooks locais especializados
import { useAnimaisTable } from './Animais/hooks/useAnimaisTable';
import { useAnimalForm } from './Animais/hooks/useAnimalForm';
import { calcularIdadeFormatada } from './Animais/utils/animalUtils';

// Sub-componentes da página Animais
import { AnimaisHeader } from './Animais/components/AnimaisHeader';
import { AnimaisFilters } from './Animais/components/AnimaisFilters';
import { AnimaisTable } from './Animais/components/AnimaisTable';
import { AnimaisDescarteTab } from './Animais/components/AnimaisDescarteTab';
import { AnimaisBatchBar } from './Animais/components/AnimaisBatchBar';
import { LoteModals } from './Animais/components/LoteModals';
import { AnimaisModals } from './Animais/components/AnimaisModals';
import { AnimaisSlidePanel } from './Animais/components/AnimaisSlidePanel';

export const AnimaisPage: React.FC = () => {
  // Hook de Listagem, Filtros, Seleção e Ações em Lote
  const {
    search,
    setSearch,
    sexo,
    setSexo,
    status,
    setStatus,
    categoria,
    setCategoria,
    tipo,
    setTipo,
    sortBy,
    sortDir,
    setSortBy,
    setSortDir,
    page,
    setPage,
    limit,
    mainTab,
    setMainTab,
    animais,
    todosAnimais,
    vacasDescartadas,
    total,
    isLoading,
    isError,
    refetch,
    isLocal,
    lastSyncedAt,
    isOffline,
    selectedAnimalIds,
    toggleSelectAnimal,
    selectAllAnimals,
    clearSelectedAnimals,
    loteModalOpen,
    setLoteModalOpen,
    nomeLote,
    setNomeLote,
    pastoIdLote,
    setPastoIdLote,
    lotes,
    pastagens,
    handleMudarPastoLote,
    isCreatingLote,
    handleCriarLoteComSelecionados,
    confirmarCriacaoLote,
    viewLoteModalOpen,
    setViewLoteModalOpen,
    selectedLote,
    handleOpenLoteView,
    handleExportRelatorio,
  } = useAnimaisTable();

  // Hook de Formulário, Cadastro, Edição, Visualização e Exclusão
  const {
    slideOpen,
    setSlideOpen,
    slideMode,
    setSlideMode,
    selectedAnimal,
    formData,
    setFormData,
    isSaving,
    matrizTab,
    setMatrizTab,
    novoToqueData,
    setNovoToqueData,
    novoToqueResultado,
    setNovoToqueResultado,
    novoToqueObs,
    setNovoToqueObs,
    modalOpen,
    setModalOpen,
    animalToDelete,
    isDeleting,
    handleOpenCreate,
    handleOpenView,
    handleCreateFilho,
    handleActionClick,
    handleAddToque,
    handleRemoveToque,
    handleSave,
    handleDeleteConfirm,
    showToast,
  } = useAnimalForm(todosAnimais);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Cabeçalho com estatísticas e botões de ação */}
      <AnimaisHeader
        selectedCount={selectedAnimalIds.length}
        onCriarLote={handleCriarLoteComSelecionados}
        onExportar={handleExportRelatorio}
        onCadastrar={() => handleOpenCreate()}
        isOffline={isOffline}
      />

      {isLocal && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200" role="status">
          <span>Exibindo dados locais{lastSyncedAt ? ` · última sincronização ${new Date(lastSyncedAt).toLocaleString('pt-BR')}` : ''}.</span>
        </div>
      )}

      {/* Card da Listagem com Abas e Filtros Integrados */}
      <Card noPadding>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Tabs
            tabs={[
              { id: 'rebanho', label: 'Rebanho Geral' },
              {
                id: 'descartadas',
                label: 'Vacas Descartadas',
                badge: vacasDescartadas.length > 0 ? vacasDescartadas.length : undefined,
              },
            ]}
            activeTab={mainTab}
            onChange={(t) => setMainTab(t as 'rebanho' | 'descartadas')}
          />
          <div className="w-full lg:w-[420px] lg:shrink-0">
            <Input
              noMargin
              id="search-animais"
              icon={Search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar brinco, CDC, CDN..."
            />
          </div>
        </div>

        {mainTab === 'rebanho' ? (
          <>
            <AnimaisFilters
              tipo={tipo}
              onTipoChange={setTipo}
              sexo={sexo}
              onSexoChange={setSexo}
              status={status}
              onStatusChange={setStatus}
              categoria={categoria}
              onCategoriaChange={setCategoria}
              sortBy={sortBy}
              sortDir={sortDir}
              onSortByChange={setSortBy}
              onSortDirChange={setSortDir}
            />

            <AnimaisTable
              animais={animais}
              isLoading={isLoading}
              isError={isError}
              onRetry={refetch}
              onNovoAnimal={() => handleOpenCreate()}
              total={total}
              page={page}
              limit={limit}
              onPageChange={setPage}
              selectedIds={selectedAnimalIds}
              onToggleSelect={toggleSelectAnimal}
              onSelectAll={() => {
                if (selectedAnimalIds.length === animais.length) clearSelectedAnimals();
                else selectAllAnimals(animais.map((a) => a.id));
              }}
              onRowClick={handleOpenView}
              onAction={handleActionClick}
            />
          </>
        ) : (
          <AnimaisDescarteTab
            vacasDescartadas={vacasDescartadas}
            onRegistrarDescarte={() => {
              handleOpenCreate({
                tipo_animal: 'vaca',
                status: 'descarte',
                data_descarte: new Date().toISOString().split('T')[0],
              });
            }}
            onRowClick={handleOpenView}
            onAction={handleActionClick}
          />
        )}
      </Card>

      {/* Barra de Ação Flutuante para Seleção em Lote */}
      <AnimaisBatchBar
        selectedCount={selectedAnimalIds.length}
        onCriarLote={handleCriarLoteComSelecionados}
        onLimparSelecao={clearSelectedAnimals}
        isOffline={isOffline}
      />

      {/* SlidePanel de Criação / Edição / Ficha Técnica */}
      <AnimaisSlidePanel
        animais={todosAnimais}
        pastagens={pastagens}
        lotes={lotes}
        handleOpenLote={(lote) => {
          setSlideOpen(false);
          handleOpenLoteView(lote);
        }}
        handleCreateFilho={handleCreateFilho}
        handleOpenChild={handleOpenView}
        slideOpen={slideOpen}
        setSlideOpen={setSlideOpen}
        slideMode={slideMode}
        setSlideMode={setSlideMode}
        selectedAnimal={selectedAnimal}
        formData={formData}
        setFormData={setFormData}
        handleSave={handleSave}
        matrizTab={matrizTab}
        setMatrizTab={setMatrizTab}
        novoToqueData={novoToqueData}
        setNovoToqueData={setNovoToqueData}
        novoToqueResultado={novoToqueResultado}
        setNovoToqueResultado={setNovoToqueResultado}
        novoToqueObs={novoToqueObs}
        setNovoToqueObs={setNovoToqueObs}
        handleAddToque={handleAddToque}
        handleRemoveToque={handleRemoveToque}
        isSaving={isSaving}
        calcularIdadeFormatada={calcularIdadeFormatada}
        showToast={showToast}
      />

      {/* Modal de Exclusão */}
      <AnimaisModals
        modalOpen={modalOpen}
        setModalOpen={setModalOpen}
        animalToDelete={animalToDelete}
        handleDelete={handleDeleteConfirm}
        isDeleting={isDeleting}
      />

      {/* Modais de Criar e Visualizar Lotes */}
      <LoteModals
        loteModalOpen={loteModalOpen}
        onCloseLoteModal={() => setLoteModalOpen(false)}
        selectedCount={selectedAnimalIds.length}
        nomeLote={nomeLote}
        onNomeLoteChange={setNomeLote}
        pastoIdLote={pastoIdLote}
        onPastoIdLoteChange={setPastoIdLote}
        pastagens={pastagens}
        onMudarPastoLote={handleMudarPastoLote}
        onConfirmarCriacao={confirmarCriacaoLote}
        isCreatingLote={isCreatingLote}
        isOffline={isOffline}
        viewLoteModalOpen={viewLoteModalOpen}
        onCloseViewLoteModal={() => setViewLoteModalOpen(false)}
        selectedLote={selectedLote}
        todosAnimais={todosAnimais}
        onRowClickAnimal={handleOpenView}
      />
    </div>
  );
};

export default AnimaisPage;
