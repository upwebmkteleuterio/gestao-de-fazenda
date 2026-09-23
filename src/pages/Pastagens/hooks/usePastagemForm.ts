import { useState, useMemo, FormEvent } from 'react';
import { Pastagem, ServicoPastagem } from '@/types/database';
import { useAnimais } from '@/hooks/useAnimais';
import { useUIStore } from '@/store/useUIStore';

const INITIAL_PASTO_FORM: Partial<Pastagem> = {
  nome_pasto: '',
  tipo_capim: 'Brachiaria Brizantha',
  area_ha: 12,
  lotacao_maxima: 30,
  data_entrada: new Date().toISOString().split('T')[0],
  data_saida_prevista: '',
};

const INITIAL_SERVICO_FORM = {
  tipo_servico: 'Adubação' as const,
  data: new Date().toISOString().split('T')[0],
  responsavel: '',
  observacoes: '',
};

interface UsePastagemFormParams {
  createPastagem: (data: Omit<Pastagem, 'id' | 'createdAt'>) => Promise<Pastagem>;
  updatePastagem: (params: { id: string; updates: Partial<Pastagem> }) => Promise<Pastagem>;
  deletePastagem: (id: string) => Promise<any>;
  addServico: (data: Omit<ServicoPastagem, 'id' | 'createdAt'>) => Promise<any>;
  servicos: ServicoPastagem[];
}

export const usePastagemForm = ({
  createPastagem,
  updatePastagem,
  deletePastagem,
  addServico,
  servicos,
}: UsePastagemFormParams) => {
  const { showToast } = useUIStore();
  const { animais } = useAnimais();

  const [slideOpen, setSlideOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'dados' | 'servicos'>('dados');
  const [selectedPasto, setSelectedPasto] = useState<Pastagem | null>(null);

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
    if (!pastoForm.nome_pasto?.trim()) {
      showToast('Informe o nome da área/pasto.', 'error');
      return;
    }

    try {
      if (isEditing && selectedPasto) {
        await updatePastagem({ id: selectedPasto.id, updates: pastoForm });
        showToast('Parâmetros da área atualizados com sucesso!');
      } else {
        const created = await createPastagem(pastoForm as Omit<Pastagem, 'id' | 'createdAt'>);
        showToast('Novo piquete/pasto criado com sucesso!');
        setSelectedPasto(created);
      }
      setSlideOpen(false);
    } catch {
      showToast('Erro ao salvar pastagem.', 'error');
    }
  };

  // Salvar Novo Serviço de Terra na Aba de Anotação de Serviços
  const handleAddServico = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedPasto) {
      showToast('Selecione ou salve o pasto primeiro para lançar serviço.', 'error');
      return;
    }

    try {
      await addServico({
        pasto_id: selectedPasto.id,
        nome_pasto: selectedPasto.nome_pasto,
        tipo_servico: servicoForm.tipo_servico,
        data: servicoForm.data,
        responsavel: servicoForm.responsavel,
        observacoes: servicoForm.observacoes,
      });
      showToast('Anotação de serviço de solo registrada!');
      setServicoForm({
        ...INITIAL_SERVICO_FORM,
        data: new Date().toISOString().split('T')[0],
      });
    } catch {
      showToast('Erro ao registrar serviço.', 'error');
    }
  };

  const handleDeletePasto = async () => {
    if (!pastoToDelete) return;
    try {
      await deletePastagem(pastoToDelete.id);
      showToast('Pasto excluído com sucesso.', 'info');
      setModalOpen(false);
      setSlideOpen(false);
    } catch {
      showToast('Erro ao excluir pasto.', 'error');
    }
  };

  // Animais presentes neste pasto selecionado
  const animaisNoPasto = useMemo(() => {
    if (!selectedPasto) return [];
    return animais.filter((a) => a.pasto_id === selectedPasto.id && a.status === 'ativo');
  }, [animais, selectedPasto]);

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
    resumoRebanhoPasto,
    servicosDoPasto,
  };
};
