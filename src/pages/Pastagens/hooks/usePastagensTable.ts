import { useState, useEffect } from 'react';
import { usePastagens } from '@/hooks/usePastagens';
import { Pastagem } from '@/types/database';

export const usePastagensTable = (selectedPastoId?: string) => {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFiltro, setStatusFiltro] = useState<'todos' | 'normal' | 'excedido' | 'vazio'>('todos');
  const [selectedPastoIds, setSelectedPastoIds] = useState<string[]>([]);

  // Reseta para a página 1 ao alterar filtros
  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFiltro]);

  const {
    pastagens,
    total,
    source,
    capturedAt,
    servicos,
    isLoadingPastagens,
    isErrorPastagens,
    errorPastagens,
    refetchPastagens,
    createPastagem,
    updatePastagem,
    deletePastagem,
    addServico,
    syncLocalMutation,
  } = usePastagens(
    { search: searchTerm, status: statusFiltro, page, limit: 10 },
    selectedPastoId
  );

  const pastagensFiltradas = pastagens;

  const handleToggleSelectPasto = (id: string) => {
    setSelectedPastoIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllPastos = () => {
    if (selectedPastoIds.length === pastagensFiltradas.length) {
      setSelectedPastoIds([]);
    } else {
      setSelectedPastoIds(pastagensFiltradas.map((p) => p.id));
    }
  };

  return {
    page,
    setPage,
    searchTerm,
    setSearchTerm,
    statusFiltro,
    setStatusFiltro,
    selectedPastoIds,
    setSelectedPastoIds,
    handleToggleSelectPasto,
    handleSelectAllPastos,
    pastagens: pastagensFiltradas,
    total,
    source,
    capturedAt,
    servicos,
    isLoadingPastagens,
    isErrorPastagens,
    errorPastagens,
    refetchPastagens,
    createPastagem,
    updatePastagem,
    deletePastagem,
    addServico,
    syncLocalMutation,
  };
};
