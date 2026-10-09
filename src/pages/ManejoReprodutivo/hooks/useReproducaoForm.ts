import { useState, useMemo, FormEvent, useRef } from 'react';
import { EventoReproducao, DGToqueResultado } from '@/types/database';
import { useAnimais } from '@/hooks/useAnimais';
import { useLotes } from '@/hooks/useLotes';
import { useUIStore } from '@/store/useUIStore';
import { calcularPrevisaoParto } from '../utils/reproducaoUtils';

interface UseReproducaoFormParams {
  createEvento: (data: any) => Promise<any>;
  createEventosBatch: (data: any[]) => Promise<any>;
  updateEvento: (params: { id: string; updates: any }) => Promise<any>;
  deleteEvento: (id: string) => Promise<any>;
  isSaving: boolean;
}

export const useReproducaoForm = ({
  createEvento,
  updateEvento,
  deleteEvento,
  createEventosBatch,
  isSaving: mutationIsSaving,
}: UseReproducaoFormParams) => {
  const { showToast } = useUIStore();
  const { animais } = useAnimais();
  const { lotes } = useLotes();
  const [selectedLoteId, setSelectedLoteIdState] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  // Estado SlidePanel
  const [slideOpen, setSlideOpen] = useState(false);
  const [slideMode, setSlideMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedEvento, setSelectedEvento] = useState<EventoReproducao | null>(null);

  // Tab do Lançamento Reprodutivo
  const [activeTab, setActiveTab] = useState<'monta_natural' | 'iatf' | 'tetf' | 'dg'>('iatf');

  // Multi-seleção de vacas para Monta Natural
  const [selectedCowIds, setSelectedCowIds] = useState<string[]>([]);

  // Modal exclusão
  const [modalOpen, setModalOpen] = useState(false);
  const [eventoToDelete, setEventoToDelete] = useState<EventoReproducao | null>(null);

  // Form State Geral para IATF, TETF, DG e Monta
  const [formData, setFormData] = useState<{
    animal_id: string;
    brinco_matriz: string;
    data_principal: string;
    d0: string;
    d8: string;
    d10: string;
    touro: string;
    tipo_semen: string;
    condicao_corporal: string;
    data_ultrassom: string;
    dg_radio: DGToqueResultado;
    nome_touro_monta: string;
    doadora: string;
    tipo_embriao: string;
    receptora: string;
    data_dg_exame: string;
    dg_resultado: DGToqueResultado;
    dias_previsao_parto: number | '';
    previsao_parto: string;
    observacoes: string;
  }>({
    animal_id: '',
    brinco_matriz: '',
    data_principal: new Date().toISOString().split('T')[0],
    d0: '',
    d8: '',
    d10: '',
    touro: '',
    tipo_semen: 'Convencional',
    condicao_corporal: '',
    data_ultrassom: '',
    dg_radio: 'pendente',
    nome_touro_monta: '',
    doadora: '',
    tipo_embriao: 'Vitrificado FIV',
    receptora: '',
    data_dg_exame: new Date().toISOString().split('T')[0],
    dg_resultado: 'pendente',
    dias_previsao_parto: 300,
    previsao_parto: calcularPrevisaoParto(new Date().toISOString().split('T')[0], 300),
    observacoes: '',
  });

  // Lista de Fêmeas/Matrizes da fazenda
  const matrizes = useMemo(() => {
    return animais.filter((a) => a.sexo === 'F' && a.status === 'ativo');
  }, [animais]);
  const loteSelecionado = lotes.find((lote) => lote.id === selectedLoteId);
  const matrizesDisponiveis = useMemo(
    () => loteSelecionado ? matrizes.filter((matriz) => loteSelecionado.animais_ids.includes(matriz.id)) : matrizes,
    [loteSelecionado, matrizes],
  );
  const setSelectedLoteId = (loteId: string) => {
    setSelectedLoteIdState(loteId);
    setSelectedCowIds([]);
  };

  // Lista de Touros da fazenda
  const tourosList = useMemo(() => {
    return animais.filter((a) => a.sexo === 'M' && a.status === 'ativo');
  }, [animais]);

  // Abertura do Slide Panel para Novo Registro
  const handleOpenCreate = () => {
    setSelectedEvento(null);
    setSlideMode('create');
    setActiveTab('iatf');
    const firstMatriz = matrizes[0];
    const today = new Date().toISOString().split('T')[0];

    setFormData({
      animal_id: firstMatriz?.id || '',
      brinco_matriz: firstMatriz?.brinco || '',
      data_principal: today,
      d0: '',
      d8: '',
      d10: '',
      touro: '',
      tipo_semen: 'Convencional',
      condicao_corporal: '',
      data_ultrassom: '',
      dg_radio: 'pendente',
      nome_touro_monta: '',
      doadora: '',
      tipo_embriao: 'Vitrificado FIV',
      receptora: firstMatriz?.brinco || '',
      data_dg_exame: today,
      dg_resultado: 'pendente',
      dias_previsao_parto: 300,
      previsao_parto: calcularPrevisaoParto(today, 300),
      observacoes: '',
    });
    setSelectedCowIds(firstMatriz ? [firstMatriz.id] : []);
    setSlideOpen(true);
  };

  // Abertura do Slide Panel para Editar
  const handleOpenEdit = (ev: EventoReproducao) => {
    setSelectedEvento(ev);
    setSlideMode('edit');
    setActiveTab(ev.tipo_protocolo);

    const baseDate = ev.dados_protocolo?.d10 || ev.dados_protocolo?.d0 || ev.data_principal;
    const dias = Number.isInteger(ev.dados_protocolo?.dias_gestacao_previsao)
      ? ev.dados_protocolo.dias_gestacao_previsao
      : 300;
    const previsaoParto = ev.previsao_parto || (typeof dias === 'number' ? calcularPrevisaoParto(baseDate, dias) : '');

    setFormData({
      animal_id: ev.animal_id,
      brinco_matriz: ev.brinco_matriz,
      data_principal: ev.data_principal || new Date().toISOString().split('T')[0],
      d0: ev.dados_protocolo?.d0 ?? '',
      d8: ev.dados_protocolo?.d8 ?? '',
      d10: ev.dados_protocolo?.d10 || '',
      touro: ev.dados_protocolo?.touro || '',
      tipo_semen: ev.dados_protocolo?.tipo_semen || 'Convencional',
      condicao_corporal: ev.dados_protocolo?.condicao_corporal || '',
      data_ultrassom: ev.dados_protocolo?.data_ultrassom || '',
      dg_radio: ev.resultado_dg || 'pendente',
      nome_touro_monta: ev.dados_protocolo?.touro || '',
      doadora: ev.dados_protocolo?.doadora || '',
      tipo_embriao: ev.dados_protocolo?.tipo_embriao || '',
      receptora: ev.dados_protocolo?.receptora || ev.brinco_matriz,
      data_dg_exame: ev.data_dg || ev.data_principal,
      dg_resultado: ev.resultado_dg || 'pendente',
      dias_previsao_parto: dias,
      previsao_parto: previsaoParto,
      observacoes: ev.dados_protocolo?.observacoes || '',
    });
    setSelectedCowIds([ev.animal_id]);
    setSlideOpen(true);
  };

  // Abertura do Slide Panel para Ver (Somente Leitura)
  const handleOpenView = (ev: EventoReproducao) => {
    setSelectedEvento(ev);
    setSlideMode('view');
    setActiveTab(ev.tipo_protocolo);

    const baseDate = ev.dados_protocolo?.d10 || ev.dados_protocolo?.d0 || ev.data_principal;
    const dias = Number.isInteger(ev.dados_protocolo?.dias_gestacao_previsao)
      ? ev.dados_protocolo.dias_gestacao_previsao
      : 300;
    const previsaoParto = ev.previsao_parto || (typeof dias === 'number' ? calcularPrevisaoParto(baseDate, dias) : '');

    setFormData({
      animal_id: ev.animal_id,
      brinco_matriz: ev.brinco_matriz,
      data_principal: ev.data_principal || new Date().toISOString().split('T')[0],
      d0: ev.dados_protocolo?.d0 ?? '',
      d8: ev.dados_protocolo?.d8 ?? '',
      d10: ev.dados_protocolo?.d10 || '',
      touro: ev.dados_protocolo?.touro || '',
      tipo_semen: ev.dados_protocolo?.tipo_semen || 'Convencional',
      condicao_corporal: ev.dados_protocolo?.condicao_corporal || '',
      data_ultrassom: ev.dados_protocolo?.data_ultrassom || '',
      dg_radio: ev.resultado_dg || 'pendente',
      nome_touro_monta: ev.dados_protocolo?.touro || '',
      doadora: ev.dados_protocolo?.doadora || '',
      tipo_embriao: ev.dados_protocolo?.tipo_embriao || '',
      receptora: ev.dados_protocolo?.receptora || ev.brinco_matriz,
      data_dg_exame: ev.data_dg || ev.data_principal,
      dg_resultado: ev.resultado_dg || 'pendente',
      dias_previsao_parto: dias,
      previsao_parto: previsaoParto,
      observacoes: ev.dados_protocolo?.observacoes || '',
    });
    setSelectedCowIds([ev.animal_id]);
    setSlideOpen(true);
  };

  // Toggle seleção de vaca na Tab Monta
  const toggleCowSelection = (id: string) => {
    setSelectedCowIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const selectAllCows = () => {
    if (selectedCowIds.length === matrizesDisponiveis.length) {
      setSelectedCowIds([]);
    } else {
      setSelectedCowIds(matrizesDisponiveis.map((m) => m.id));
    }
  };

  // Salvar formulário
  const handleSave = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (submittingRef.current || mutationIsSaving) return;
    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      if (activeTab === 'monta_natural') {
        if (slideMode === 'edit' && selectedEvento) {
          await updateEvento({
            id: selectedEvento.id,
            updates: {
              data_principal: formData.data_principal,
              dados_protocolo: {
                touro: formData.nome_touro_monta,
                observacoes: formData.observacoes,
              },
            },
          });
          showToast('Registro de Monta Natural atualizado!');
        } else {
          if (selectedCowIds.length === 0) {
            showToast('Selecione ao menos uma vaca para registrar a Monta Natural.', 'error');
            return;
          }

          const cows = selectedCowIds.map((cowId) => matrizes.find((m) => m.id === cowId));
          if (cows.some((cow) => !cow)) {
            showToast('Uma das matrizes selecionadas não está mais cadastrada como ativa. Atualize a lista e tente novamente.', 'error');
            return;
          }
          await createEventosBatch(cows.map((cow) => ({
            animal_id: cow!.id,
            brinco_matriz: cow!.brinco,
            tipo_protocolo: 'monta_natural' as const,
            data_principal: formData.data_principal,
            dados_protocolo: {
              touro: formData.nome_touro_monta,
              observacoes: formData.observacoes,
            },
            resultado_dg: 'pendente' as const,
          })));
          showToast(`${selectedCowIds.length} registro(s) de Monta Natural lançado(s) com sucesso!`);
        }
      } else if (activeTab === 'iatf') {
        const isBatchIatf = slideMode !== 'edit' && selectedCowIds.length > 0;
        if (!isBatchIatf && !formData.brinco_matriz && !formData.animal_id) {
          showToast('Informe ou selecione o brinco da matriz.', 'error');
          return;
        }

        const baseInseminacaoDate = formData.d10 || formData.data_principal;
        const calculatedParto = typeof formData.dias_previsao_parto === 'number' && Number.isFinite(formData.dias_previsao_parto)
          ? calcularPrevisaoParto(baseInseminacaoDate, formData.dias_previsao_parto)
          : '';
        const buildIatfPayload = (animalId: string, brinco: string) => ({
          animal_id: animalId,
          brinco_matriz: brinco.trim(),
          tipo_protocolo: 'iatf' as const,
          data_principal: formData.d10 || formData.data_principal,
          dados_protocolo: {
            ...(formData.d0 ? { d0: formData.d0 } : {}),
            ...(formData.d8 ? { d8: formData.d8 } : {}),
            d10: formData.d10,
            touro: formData.touro,
            tipo_semen: formData.tipo_semen,
            condicao_corporal: formData.condicao_corporal,
            data_ultrassom: formData.data_ultrassom,
            dias_gestacao_previsao: formData.dias_previsao_parto,
            observacoes: formData.observacoes,
          },
          resultado_dg: formData.dg_radio,
          data_dg: formData.data_ultrassom || formData.data_principal,
          previsao_parto: calculatedParto,
        });

        if (slideMode === 'edit' && selectedEvento) {
          await updateEvento({ id: selectedEvento.id, updates: buildIatfPayload(formData.animal_id, formData.brinco_matriz) });
          showToast('Protocolo IATF atualizado com sucesso!');
        } else if (isBatchIatf) {
          const cows = selectedCowIds.map((cowId) => matrizes.find((matriz) => matriz.id === cowId));
          if (cows.some((cow) => !cow)) {
            showToast('Uma das matrizes selecionadas não está mais cadastrada como ativa. Atualize a lista e tente novamente.', 'error');
            return;
          }
          const payloads = cows.map((cow) => buildIatfPayload(cow!.id, cow!.brinco));
          if (payloads.length > 1) await createEventosBatch(payloads);
          else await createEvento(payloads[0]);
          showToast(`${payloads.length} protocolo(s) IATF lançado(s) com sucesso!`);
        } else {
          await createEvento(buildIatfPayload(formData.animal_id, formData.brinco_matriz));
          showToast('Protocolo IATF cadastrado com sucesso!');
        }
      } else if (activeTab === 'tetf') {
        if (!formData.receptora && !formData.brinco_matriz) {
          showToast('Informe a vaca receptora.', 'error');
          return;
        }

        const payload = {
          animal_id: formData.animal_id,
          brinco_matriz: (formData.brinco_matriz || formData.receptora).trim(),
          tipo_protocolo: 'tetf' as const,
          data_principal: formData.data_principal,
          dados_protocolo: {
            doadora: formData.doadora,
            touro: formData.touro,
            tipo_embriao: formData.tipo_embriao,
            receptora: formData.receptora,
            observacoes: formData.observacoes,
          },
          resultado_dg: 'pendente' as DGToqueResultado,
        };

        if (slideMode === 'edit' && selectedEvento) {
          await updateEvento({ id: selectedEvento.id, updates: payload });
          showToast('Registro de TETF atualizado!');
        } else {
          await createEvento(payload);
          showToast('Transferência de Embrião (TETF) registrada com sucesso!');
        }
      } else if (activeTab === 'dg') {
        if (!formData.brinco_matriz && !formData.animal_id) {
          showToast('Informe ou selecione a vaca para o Diagnóstico.', 'error');
          return;
        }

        const payload = {
          animal_id: formData.animal_id,
          brinco_matriz: formData.brinco_matriz.trim(),
          tipo_protocolo: 'dg' as const,
          data_principal: formData.data_dg_exame,
          dados_protocolo: {
            observacoes: formData.observacoes,
          },
          resultado_dg: formData.dg_resultado,
          data_dg: formData.data_dg_exame,
        };

        if (slideMode === 'edit' && selectedEvento) {
          await updateEvento({ id: selectedEvento.id, updates: payload });
          showToast('Diagnóstico de Gestação atualizado!');
        } else {
          await createEvento(payload);
          showToast(
            `Diagnóstico registrado como ${
              formData.dg_resultado === 'cheia' ? 'PRENHA' : 'VAZIA'
            }! ${formData.brinco_matriz ? `(Vaca: ${formData.brinco_matriz})` : ''}`
          );
        }
      }

      setSlideOpen(false);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erro ao salvar lançamento reprodutivo.', 'error');
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!eventoToDelete) return;
    try {
      await deleteEvento(eventoToDelete.id);
      showToast('Registro reprodutivo excluído.', 'info');
      setModalOpen(false);
      setSlideOpen(false);
    } catch {
      showToast('Erro ao excluir registro.', 'error');
    }
  };

  return {
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
    clearCowSelection: () => setSelectedCowIds([]),
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
    isSaving: mutationIsSaving || isSubmitting,
  };
};
