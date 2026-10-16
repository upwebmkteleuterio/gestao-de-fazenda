import { useState, useMemo, FormEvent } from 'react';
import { Animal, Pastagem, ServicoPastagem } from '@/types/database';
import { validatePastagemFields, validateServicoPastagemFields } from '@/services/domainValidation';
import { useAnimais } from '@/hooks/useAnimais';
import { useLotes } from '@/hooks/useLotes';
import { useUIStore } from '@/store/useUIStore';

const INITIAL_PASTO_FORM: Partial<Pastagem> = {
  nome_pasto: '',
  tipo_capim: 'Brachiaria Brizantha',
  area_ha: 12,
  lotacao_maxima: 30,
  data_entrada: new Date().toISOString().split('T')[0],
  data_saida_prevista: '',
};

export type ServicoFormValues = {
  tipo_servico: ServicoPastagem['tipo_servico'];
  data: string;
  responsavel: string;
  observacoes: string;
};

const INITIAL_SERVICO_FORM: ServicoFormValues = {
  tipo_servico: 'Adubação',
  data: new Date().toISOString().split('T')[0],
  responsavel: '',
  observacoes: '',
};

interface UsePastagemFormParams {
  createPastagem: (data: Omit<Pastagem, 'id' | 'createdAt'>) => Promise<Pastagem>;
  updatePastagem: (params: { id: string; updates: Partial<Pastagem> }) => Promise<Pastagem>;
  deletePastagem: (id: string) => Promise<boolean>;
  addServico: (data: Omit<ServicoPastagem, 'id' | 'createdAt'>) => Promise<ServicoPastagem>;
  servicos: ServicoPastagem[];
  syncLocalMutation: () => Promise<void>;
}

export const usePastagemForm = ({
  createPastagem,
  updatePastagem,
  deletePastagem,
  addServico,
  servicos,
  syncLocalMutation,
}: UsePastagemFormParams) => {
  const { showToast } = useUIStore();
  const { animais, updateAnimalPasture, syncLocalMutation: syncAnimaisLocalMutation } = useAnimais();
  const { lotes } = useLotes();

  const [slideOpen, setSlideOpen] = useState(false);
  const [selectedAnimalIds, setSelectedAnimalIds] = useState<string[]>([]);
  const [loteSelecionadoId, setLoteSelecionadoId] = useState('');
  const [pendingCreatedPasto, setPendingCreatedPasto] = useState<Pastagem | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'dados' | 'servicos'>('dados');
  const [selectedPasto, setSelectedPasto] = useState<Pastagem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAddingServico, setIsAddingServico] = useState(false);

  // Form Pastagem
  const [pastoForm, setPastoForm] = useState<Partial<Pastagem>>(INITIAL_PASTO_FORM);

  // Form Serviço
  const [servicoForm, setServicoForm] = useState(INITIAL_SERVICO_FORM);

  // Modal exclusão
  const [modalOpen, setModalOpen] = useState(false);
  const [pastoToDelete, setPastoToDelete] = useState<Pastagem | null>(null);

  // Abertura para Novo Piquete/Pasto
  const handleOpenCreate = () => {
    setSelectedPasto(null);
    setSelectedAnimalIds([]);
    setLoteSelecionadoId('');
    setPendingCreatedPasto(null);
    setIsEditing(false);
    setActiveTab('dados');
    setPastoForm({
      ...INITIAL_PASTO_FORM,
      data_entrada: new Date().toISOString().split('T')[0],
    });
    setSlideOpen(true);
  };

  // Abertura ao Clicar na Linha/Card (Detalhes e Configuração do Pasto)
  const handleOpenDetails = (pasto: Pastagem) => {
    setSelectedPasto(pasto);
    setSelectedAnimalIds(animais.filter((animal) => animal.status === 'ativo' && animal.pasto_id === pasto.id).map((animal) => animal.id));
    setLoteSelecionadoId('');
    setPendingCreatedPasto(null);
    setIsEditing(true);
    setActiveTab('dados');
    setPastoForm({ ...pasto });
    setServicoForm({
      ...INITIAL_SERVICO_FORM,
      data: new Date().toISOString().split('T')[0],
    });
    setSlideOpen(true);
  };

  // Salvar Pastagem (Criar ou Atualizar)
  const handleSavePasto = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (isSaving) return;
    try {
      validatePastagemFields(pastoForm);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Confira os dados da pastagem.', 'error');
      return;
    }

    setIsSaving(true);
    let pastoSincronizado = false;
    try {
      if (isEditing && selectedPasto) {
        await updatePastagem({ id: selectedPasto.id, updates: pastoForm });
        const currentAnimalIds = new Set(animais.filter((animal) => animal.status === 'ativo' && animal.pasto_id === selectedPasto.id).map((animal) => animal.id));
        const selectedAnimals = selectedAnimalIds
          .map((id) => animais.find((animal) => animal.id === id))
          .filter((animal): animal is Animal => Boolean(animal && animal.status === 'ativo'));
        const selectedAnimalIdSet = new Set(selectedAnimals.map((animal) => animal.id));
        const targetPastoNome = pastoForm.nome_pasto || selectedPasto.nome_pasto;
        const animalsToAssign = selectedAnimals.filter((animal) => animal.pasto_id !== selectedPasto.id || animal.pasto_nome !== targetPastoNome);
        const animalsToRemove = [...currentAnimalIds]
          .filter((animalId) => !selectedAnimalIdSet.has(animalId))
          .map((animalId) => animais.find((animal) => animal.id === animalId))
          .filter((animal): animal is Animal => Boolean(animal));
        await Promise.all([
          ...animalsToAssign.map((animal) => updateAnimalPasture({
            id: animal.id,
            pastoId: selectedPasto.id,
            pastoNome: targetPastoNome,
          })),
          ...animalsToRemove.map((animal) => updateAnimalPasture({
            id: animal.id,
            pastoId: undefined,
            pastoNome: undefined,
          })),
        ]);
        if (animalsToAssign.length > 0 || animalsToRemove.length > 0) {
          await syncLocalMutation();
          pastoSincronizado = true;
          syncAnimaisLocalMutation();
        }
        setSelectedAnimalIds([]);
        showToast('Parâmetros da área e animais atualizados com sucesso!');
      } else {
        const created = pendingCreatedPasto
          ? await updatePastagem({ id: pendingCreatedPasto.id, updates: pastoForm })
          : await createPastagem(pastoForm as Omit<Pastagem, 'id' | 'createdAt'>);
        setPendingCreatedPasto(created);
        const selectedAnimals = selectedAnimalIds
          .map((id) => animais.find((animal) => animal.id === id))
          .filter((animal): animal is Animal => Boolean(animal && animal.status === 'ativo'));
        await Promise.all(selectedAnimals.map((animal) => updateAnimalPasture({
          id: animal.id,
          pastoId: created.id,
          pastoNome: created.nome_pasto,
        })));
        if (selectedAnimals.length > 0) {
          await syncLocalMutation();
          pastoSincronizado = true;
          syncAnimaisLocalMutation();
        }
        setSelectedAnimalIds([]);
        setPendingCreatedPasto(null);
        showToast('Novo piquete/pasto criado com sucesso!');
      }
      setSlideOpen(false);
      if (!pastoSincronizado) await syncLocalMutation();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erro ao salvar pastagem.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Salvar Novo Serviço de Terra na Aba de Anotação de Serviços
  const handleAddServico = async (e: FormEvent) => {
    e.preventDefault();
    if (isAddingServico) return;
    if (!selectedPasto) {
      showToast('Selecione ou salve o pasto primeiro para lançar serviço.', 'error');
      return;
    }
    const serviceData = {
      pasto_id: selectedPasto.id,
      nome_pasto: selectedPasto.nome_pasto,
      tipo_servico: servicoForm.tipo_servico,
      data: servicoForm.data,
      responsavel: servicoForm.responsavel,
      observacoes: servicoForm.observacoes,
    };
    try {
      validateServicoPastagemFields(serviceData, selectedPasto.data_entrada);
      setIsAddingServico(true);
      await addServico(serviceData);
      showToast('Anotação de serviço de solo registrada!');
      setServicoForm({
        ...INITIAL_SERVICO_FORM,
        data: new Date().toISOString().split('T')[0],
      });
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erro ao registrar serviço.', 'error');
    } finally {
      setIsAddingServico(false);
    }
  };

  const handleDeletePasto = async () => {
    if (!pastoToDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      await deletePastagem(pastoToDelete.id);
      setModalOpen(false);
      setSlideOpen(false);
      showToast('Pasto excluído com sucesso.', 'info');
      syncLocalMutation();
    } catch {
      showToast('Erro ao excluir pasto.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Animais presentes neste pasto selecionado
  const animaisNoPasto = useMemo(() => {
    if (!selectedPasto) return [];
    return animais.filter((a) => a.pasto_id === selectedPasto.id && a.status === 'ativo');
  }, [animais, selectedPasto]);

  const animaisDisponiveis = useMemo(() => animais.filter((animal) => animal.status === 'ativo'), [animais]);
  const animaisSelecionados = useMemo(
    () => selectedAnimalIds.map((id) => animaisDisponiveis.find((animal) => animal.id === id)).filter((animal): animal is Animal => Boolean(animal)),
    [animaisDisponiveis, selectedAnimalIds],
  );
  const handleSelectAnimal = (animal: Animal) => {
    if (animal.status !== 'ativo') return;
    setSelectedAnimalIds((current) => current.includes(animal.id) ? current : [...current, animal.id]);
  };
  const handleAddLoteAnimais = (loteId: string) => {
    const lote = lotes.find((item) => item.id === loteId);
    if (!lote) return;
    const availableIds = new Set(animaisDisponiveis.map((animal) => animal.id));
    setSelectedAnimalIds((current) => {
      const selectedIds = new Set(current);
      const newIds = lote.animais_ids.filter((id) => availableIds.has(id) && !selectedIds.has(id));
      return [...current, ...newIds];
    });
  };
  const handleRemoveSelectedAnimal = (animalId: string) => {
    setSelectedAnimalIds((current) => current.filter((id) => id !== animalId));
  };

  // Contagens do rebanho no pasto (automáticas ou manuais inseridas pelo usuário)
  const resumoRebanhoPasto = useMemo(() => {
    const vacasAuto = animaisNoPasto.filter((a) => ['vaca', 'novilha'].includes(a.tipo_animal)).length;
    const bezerrasAuto = animaisNoPasto.filter((a) => (a.tipo_animal === 'bezerra') || (a.tipo_animal === 'bezerro' && a.sexo === 'F')).length;
    const bezerrosAuto = animaisNoPasto.filter((a) => (a.tipo_animal === 'bezerro' && a.sexo === 'M')).length;
    const matrizesAuto = animaisNoPasto.filter((a) => a.tipo_animal === 'matriz').length;
    const tourosAuto = animaisNoPasto.filter((a) => ['touro', 'garrote'].includes(a.tipo_animal)).length;
    const totalAuto = animaisNoPasto.length;

    // Se o usuário configurou contagem manual ou se o pasto form tiver qtd_manual
    const usarManual = pastoForm.usar_qtd_manual;
    const totalManual = typeof pastoForm.qtd_manual === 'number' ? pastoForm.qtd_manual : 0;
    
    const vacas = (usarManual && typeof pastoForm.vacas_count_manual === 'number') ? pastoForm.vacas_count_manual : vacasAuto;
    const bezerras = bezerrasAuto;
    const bezerros = (usarManual && typeof pastoForm.bezerros_count_manual === 'number') ? pastoForm.bezerros_count_manual : (bezerrosAuto + bezerrasAuto);
    const matrizes = (usarManual && typeof pastoForm.matrizes_count_manual === 'number') ? pastoForm.matrizes_count_manual : matrizesAuto;
    const touros = (usarManual && typeof pastoForm.touros_count_manual === 'number') ? pastoForm.touros_count_manual : tourosAuto;
    
    const total = usarManual ? totalManual : (totalAuto > 0 ? totalAuto : totalManual);

    return { vacas, bezerras, bezerros, matrizes, touros, total, isManual: Boolean(usarManual) };
  }, [animaisNoPasto, pastoForm.usar_qtd_manual, pastoForm.qtd_manual, pastoForm.vacas_count_manual, pastoForm.bezerros_count_manual, pastoForm.matrizes_count_manual, pastoForm.touros_count_manual]);

  // Serviços deste pasto
  const servicosDoPasto = useMemo(() => {
    if (!selectedPasto) return [];
    return servicos.filter((s) => s.pasto_id === selectedPasto.id);
  }, [servicos, selectedPasto]);

  return {
    slideOpen,
    setSlideOpen,
    isEditing,
    setIsEditing,
    isSaving,
    isDeleting,
    isAddingServico,
    activeTab,
    setActiveTab,
    selectedPasto,
    setSelectedPasto,
    pastoForm,
    setPastoForm,
    servicoForm,
    setServicoForm,
    modalOpen,
    setModalOpen,
    pastoToDelete,
    setPastoToDelete,
    handleOpenCreate,
    handleOpenDetails,
    handleSavePasto,
    handleAddServico,
    handleDeletePasto,
    animaisNoPasto,
    animaisDisponiveis,
    animaisSelecionados,
    lotes,
    loteSelecionadoId,
    setLoteSelecionadoId,
    handleAddLoteAnimais,
    handleSelectAnimal,
    handleRemoveSelectedAnimal,
    resumoRebanhoPasto,
    servicosDoPasto,
  };
};
