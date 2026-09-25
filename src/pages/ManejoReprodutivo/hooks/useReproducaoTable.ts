import { useState, useEffect } from 'react';
import { useReproducao } from '@/hooks/useReproducao';

export const useReproducaoTable = () => {
  // Filtros de busca
  const [search, setSearch] = useState('');
  const [protocolo, setProtocolo] = useState('all');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  // Reseta para a página 1 ao alterar filtros
  useEffect(() => {
    setPage(1);
  }, [search, protocolo, dataInicio, dataFim]);

  const {
    eventos,
    totalEventos,
    source,
    capturedAt,
    isOffline,
    isLoading,
    isError,
    error,
    refetch,
    createEvento,
    updateEvento,
    deleteEvento,
  } = useReproducao({
    search,
    protocolo,
    dataInicio,
    dataFim,
    page,
    limit,
  }, {
    useOfflineCache: true,
  });

  // Seleção em lote de eventos
  const [selectedEventoIds, setSelectedEventoIds] = useState<string[]>([]);

  const handleToggleSelectEvento = (id: string) => {
    setSelectedEventoIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllEventos = () => {
    if (selectedEventoIds.length === eventos.length) {
      setSelectedEventoIds([]);
    } else {
      setSelectedEventoIds(eventos.map((e) => e.id));
    }
  };

  const handleClearFilters = () => {
    setSearch('');
    setProtocolo('all');
    setDataInicio('');
    setDataFim('');
    setPage(1);
  };

  const hasActiveFilters = Boolean(
    search || protocolo !== 'all' || dataInicio || dataFim
  );

  return {
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
    limit,
    eventos,
    totalEventos,
    source,
    capturedAt,
    isOffline,
    isLoading,
    isError,
    error,
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
  };
};
