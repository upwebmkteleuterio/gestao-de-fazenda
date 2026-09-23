import React from 'react';
import { Card } from '@/components/Card';
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
    pastagens,
    handleMudarPastoLote,
    isCreatingLote,
    handleCriarLoteComSelecionados,
    confirmarCriacaoLote,
    viewLoteModalOpen,
    setViewLoteModalOpen,
    selectedLote,
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
    handleOpenCreate,
    handleOpenView,
    handleCreateFilho,
    handleActionClick,
    handleAddToque,
    handleRemoveToque,
    handleSave,
    handleDeleteConfirm,
  } = useAnimalForm();

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Cabeçalho com estatísticas e botões de ação */}
      <AnimaisHeader
        selectedCount={selectedAnimalIds.length}
        onCriarLote={handleCriarLoteComSelecionados}
        onExportar={handleExportRelatorio}
        onCadastrar={() => handleOpenCreate()}
      />

      {/* Card da Listagem com Abas e Filtros Integrados */}
      <Card noPadding>
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
          onChange={(t) => setMainTab(t as any)}
        />

        {mainTab === 'rebanho' ? (
          <>
            <AnimaisFilters
              search={search}
              onSearchChange={setSearch}
              tipo={tipo}
              onTipoChange={setTipo}
              sexo={sexo}
              onSexoChange={setSexo}
              status={status}
              onStatusChange={setStatus}
              categoria={categoria}
              onCategoriaChange={setCategoria}
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
      />

      {/* SlidePanel de Criação / Edição / Ficha Técnica */}
      <AnimaisSlidePanel
        animais={todosAnimais}
        handleCreateFilho={handleCreateFilho}
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
      />

      {/* Modal de Exclusão */}
      <AnimaisModals
        modalOpen={modalOpen}
        setModalOpen={setModalOpen}
        animalToDelete={animalToDelete}
        handleDelete={handleDeleteConfirm}
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
