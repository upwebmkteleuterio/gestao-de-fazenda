import { useState, useEffect, useCallback } from 'react';
import { isValidDate } from '@/services/domainValidation';
import { useReproducao } from '@/hooks/useReproducao';

export type ReprodutivoPeriod = '7' | '15' | '30' | '60' | '90' | 'custom' | 'all';

type DateRange = { dataInicio: string; dataFim: string };

const localDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDateRange = (days: number): DateRange => {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));
  return { dataInicio: localDateString(start), dataFim: localDateString(end) };
};

const getDateRangeError = (period: ReprodutivoPeriod, dataInicio: string, dataFim: string): string | undefined => {
  if (period !== 'custom') return undefined;
  if (!dataInicio || !dataFim) return 'Informe a data inicial e a data final para usar um período personalizado.';
  if (!isValidDate(dataInicio) || !isValidDate(dataFim)) return 'Informe datas válidas para o período personalizado.';
  if (dataInicio > dataFim) return 'A data final deve ser igual ou posterior à data inicial.';
  return undefined;
};

export const useReproducaoTable = () => {
  // Filtros de busca
  const initialRange = getDateRange(30);
  const [search, setSearch] = useState('');
  const [protocolo, setProtocolo] = useState('all');
  const [periodo, setPeriodo] = useState<ReprodutivoPeriod>('30');
  const [dataInicioState, setDataInicioState] = useState(initialRange.dataInicio);
  const [dataFimState, setDataFimState] = useState(initialRange.dataFim);
  const [page, setPage] = useState(1);
  const limit = 10;
  const dateRangeError = getDateRangeError(periodo, dataInicioState, dataFimState);

  const setDataInicio = (value: string) => {
    setPeriodo('custom');
    setDataInicioState(value);
  };

  const setDataFim = (value: string) => {
    setPeriodo('custom');
    setDataFimState(value);
  };

  const handlePeriodoChange = (value: ReprodutivoPeriod) => {
    if (value === 'all') {
      setPeriodo('all');
      setDataInicioState('');
      setDataFimState('');
      return;
    }
    if (value === 'custom') {
      const range = dataInicioState && dataFimState
        ? { dataInicio: dataInicioState, dataFim: dataFimState }
        : getDateRange(30);
      setPeriodo('custom');
      setDataInicioState(range.dataInicio);
      setDataFimState(range.dataFim);
      return;
    }
    const range = getDateRange(Number(value));
    setPeriodo(value);
    setDataInicioState(range.dataInicio);
    setDataFimState(range.dataFim);
  };

  // Reseta para a página 1 ao alterar filtros
  useEffect(() => {
    setPage(1);
  }, [search, protocolo, periodo, dataInicioState, dataFimState]);

  const {
    eventos,
    totalEventos,
    source,
    capturedAt,
    isOffline,
    isLoading,
    isError,
    error,
    diagnostic,
    refetch,
    createEvento,
    createEventosBatch,
    updateEvento,
    deleteEvento,
    isSaving,
  } = useReproducao({
    search,
    protocolo,
    dataInicio: dataInicioState,
    dataFim: dataFimState,
    page,
    limit,
  }, {
    onlineOnly: true,
    enabled: !dateRangeError,
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
    const range = getDateRange(30);
    setSearch('');
    setProtocolo('all');
    setPeriodo('30');
    setDataInicioState(range.dataInicio);
    setDataFimState(range.dataFim);
    setPage(1);
  };

  const clearDateRange = useCallback(() => {
    setPeriodo('all');
    setDataInicioState('');
    setDataFimState('');
  }, []);

  const hasActiveFilters = Boolean(
    search || protocolo !== 'all' || periodo !== '30'
  );

  return {
    search,
    setSearch,
    protocolo,
    setProtocolo,
    periodo,
    handlePeriodoChange,
    dataInicio: dataInicioState,
    setDataInicio,
    dataFim: dataFimState,
    setDataFim,
    dateRangeError,
    clearDateRange,
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
    isSaving,
  };
};
