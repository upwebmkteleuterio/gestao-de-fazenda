import { useState, useEffect } from 'react';
import { useAnimais } from '@/hooks/useAnimais';
import { useLotes } from '@/hooks/useLotes';
import { useConnectivityStore } from '@/store/useConnectivityStore';
import { usePastagens } from '@/hooks/usePastagens';
import { useUIStore } from '@/store/useUIStore';
import { exportarAnimaisXLSX } from '../utils/animalUtils';

export const useAnimaisTable = () => {
  const {
    showToast,
    selectedAnimalIds,
    toggleSelectAnimal,
    selectAllAnimals,
    clearSelectedAnimals,
  } = useUIStore();

  const { lotes, createLote, moverPasto } = useLotes();
  const { pastagens } = usePastagens();
  const { status: connectivityStatus } = useConnectivityStore();
  const isOffline = connectivityStatus === 'offline' || (typeof navigator !== 'undefined' && navigator.onLine === false);

  // Filtros de busca e paginação
  const [search, setSearch] = useState('');
  const [sexo, setSexo] = useState('all');
  const [status, setStatus] = useState('all');
  const [categoria, setCategoria] = useState('all');
  const [tipo, setTipo] = useState('all');
  const [page, setPage] = useState(1);
  const limit = 10;

  const [mainTab, setMainTab] = useState<'rebanho' | 'descartadas' | 'lotes'>('rebanho');

  // Consulta paginada e filtrada
  const { animais, total, source, lastSyncedAt, isLoading, isError, error, refetch } = useAnimais({
    search,
    sexo,
    status,
    categoria,
    tipo,
    page,
    limit,
  });

  // Consulta geral para descarte e exportação
  const { animais: todosAnimais, source: allSource, lastSyncedAt: allLastSyncedAt } = useAnimais();
  const vacasDescartadas = todosAnimais.filter((a) => a.status === 'descarte');

  // Resetar para página 1 ao alterar qualquer filtro
  useEffect(() => {
    setPage(1);
  }, [search, sexo, status, categoria, tipo]);

  // Modais de gerenciamento de Lote a partir dos selecionados
  const [loteModalOpen, setLoteModalOpen] = useState(false);
  const [nomeLote, setNomeLote] = useState('');
  const [pastoIdLote, setPastoIdLote] = useState('');
  const [isCreatingLote, setIsCreatingLote] = useState(false);

  // Modal para visualização rápida de animais de um lote
  const [viewLoteModalOpen, setViewLoteModalOpen] = useState(false);
  const [selectedLote, setSelectedLote] = useState<any>(null);

  const handleCriarLoteComSelecionados = () => {
    if (isOffline) {
      showToast('Ações de Lote ficam disponíveis quando a conexão voltar.', 'info');
      return;
    }
    setNomeLote('');
    setPastoIdLote('');
    setLoteModalOpen(true);
  };

  const confirmarCriacaoLote = async () => {
    if (isOffline || !nomeLote.trim()) return;
    setIsCreatingLote(true);
    try {
      const pastoEscolhido = pastagens.find((p) => p.id === pastoIdLote);
      await createLote({
        nome: nomeLote.trim(),
        animais_ids: selectedAnimalIds,
        pasto_id: pastoIdLote || undefined,
        pasto_nome: pastoEscolhido?.nome_pasto || undefined,
      });

      if (selectedAnimalIds.length > 0) {
        showToast(
          `Lote "${nomeLote.trim()}" criado com ${selectedAnimalIds.length} animais${pastoEscolhido ? ` no pasto ${pastoEscolhido.nome_pasto}` : ''}.`,
          'success'
        );
      } else {
        showToast(`Lote "${nomeLote.trim()}" criado com sucesso.`, 'success');
      }
      setLoteModalOpen(false);
      setNomeLote('');
      setPastoIdLote('');
      clearSelectedAnimals();
    } catch {
      showToast('Erro ao criar lote', 'error');
    } finally {
      setIsCreatingLote(false);
    }
  };

  const handleMudarPastoLote = async (loteId: string, novoPastoId: string) => {
    if (isOffline) {
      showToast('Ações de Pasto ficam disponíveis quando a conexão voltar.', 'info');
      return;
    }
    const pastoEscolhido = pastagens.find((p) => p.id === novoPastoId);
    if (!pastoEscolhido) return;
    try {
      await moverPasto({
        loteId,
        pastoId: novoPastoId,
        pastoNome: pastoEscolhido.nome_pasto,
      });
      showToast(`Lote transferido para o pasto ${pastoEscolhido.nome_pasto}!`, 'success');
      if (selectedLote && selectedLote.id === loteId) {
        setSelectedLote({
          ...selectedLote,
          pasto_id: novoPastoId,
          pasto_nome: pastoEscolhido.nome_pasto,
        });
      }
    } catch {
      showToast('Erro ao mover lote de pasto', 'error');
    }
  };

  const handleOpenLoteView = (lote: any) => {
    setSelectedLote(lote);
    setViewLoteModalOpen(true);
  };

  const handleExportRelatorio = () => {
    const success = exportarAnimaisXLSX(todosAnimais);
    if (!success) {
      showToast('Nenhum animal para exportar.', 'error');
    } else {
      showToast('Relatório Excel baixado com sucesso!', 'success');
    }
  };

  return {
    // Filtros e paginação
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

    // Dados
    animais,
    todosAnimais,
    vacasDescartadas,
    total,
    isLoading,
    isError,
    error,
    refetch,
    isLocal: source === 'local' || allSource === 'local',
    lastSyncedAt: allLastSyncedAt || lastSyncedAt,
    isOffline,

    // Seleção em lote
    selectedAnimalIds,
    toggleSelectAnimal,
    selectAllAnimals,
    clearSelectedAnimals,

    // Lotes
    lotes,
    pastagens,
    loteModalOpen,
    setLoteModalOpen,
    nomeLote,
    setNomeLote,
    pastoIdLote,
    setPastoIdLote,
    isCreatingLote,
    handleCriarLoteComSelecionados,
    confirmarCriacaoLote,
    handleMudarPastoLote,
    viewLoteModalOpen,
    setViewLoteModalOpen,
    selectedLote,
    handleOpenLoteView,

    // Ações
    handleExportRelatorio,
  };
};
