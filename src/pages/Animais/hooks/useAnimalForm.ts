import { useState, useEffect, FormEvent } from 'react';
import { Animal } from '@/types/database';
import { useAnimais } from '@/hooks/useAnimais';
import { usePastagens } from '@/hooks/usePastagens';
import { useUIStore } from '@/store/useUIStore';

const INITIAL_FORM_DATA: Partial<Animal> = {
  brinco: '',
  tipo_animal: 'vaca',
  sexo: 'F',
  raca: 'Nelore',
  cor: 'Branca',
  data_nascimento: new Date().toISOString().split('T')[0],
  status: 'ativo',
  categoria: 'PO',
  motivo_descarte: '',
  pasto_id: '',
  cdc: '',
  cdn: '',
  status_reprodutivo: 'Solteira',
  touro_cobertura: '',
  tipo_cobertura: 'Monta Natural',
  observacoes: '',
  peso_atual: 420,
};

export const useAnimalForm = () => {
  const { slidePanel, closeSlidePanel, showToast } = useUIStore();
  const { pastagens } = usePastagens();
  const { createAnimal, updateAnimal, deleteAnimal } = useAnimais();

  const [slideOpen, setSlideOpen] = useState(false);
  const [slideMode, setSlideMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);
  const [formData, setFormData] = useState<Partial<Animal>>(INITIAL_FORM_DATA);
  const [isSaving, setIsSaving] = useState(false);

  // Sub-abas do formulário de matriz / toques
  const [matrizTab, setMatrizTab] = useState<'cobertas' | 'paridas' | 'solteiras' | 'toque'>('cobertas');
  const [novoToqueData, setNovoToqueData] = useState(new Date().toISOString().split('T')[0]);
  const [novoToqueResultado, setNovoToqueResultado] = useState<'cheia' | 'vazia'>('vazia');
  const [novoToqueObs, setNovoToqueObs] = useState('');

  // Modal de exclusão
  const [modalOpen, setModalOpen] = useState(false);
  const [animalToDelete, setAnimalToDelete] = useState<Animal | null>(null);

  const handleOpenCreate = (overrides?: Partial<Animal>) => {
    setSelectedAnimal(null);
    setFormData({
      ...INITIAL_FORM_DATA,
      data_nascimento: new Date().toISOString().split('T')[0],
      pasto_id: pastagens[0]?.id || '',
      ...(overrides || {}),
    });
    setSlideMode('create');
    setSlideOpen(true);
  };

  const handleOpenEdit = (animal: Animal) => {
    setSelectedAnimal(animal);
    setFormData({ ...animal });
    setSlideMode('edit');
    setSlideOpen(true);
  };

  const handleOpenView = (animal: Animal) => {
    setSelectedAnimal(animal);
    setFormData({ ...animal });
    setSlideMode('view');
    setSlideOpen(true);
  };

  const handleCreateFilho = (maeId: string) => {
    setSelectedAnimal(null);
    setFormData({
      ...INITIAL_FORM_DATA,
      tipo_animal: 'bezerro',
      sexo: 'M',
      mae_id: maeId,
      status: 'ativo',
      data_nascimento: new Date().toISOString().split('T')[0],
    });
    setSlideMode('create');
    setSlideOpen(true);
  };

  // Observa gatilhos globais de abertura vindos de outras telas (ex: atalhos do teclado Alt+A na Dashboard)
  useEffect(() => {
    if (slidePanel.isOpen && slidePanel.entityType === 'animal') {
      if (slidePanel.mode === 'create') {
        handleOpenCreate();
      } else if (slidePanel.mode === 'edit' && slidePanel.data) {
        handleOpenEdit(slidePanel.data);
      } else if (slidePanel.mode === 'view' && slidePanel.data) {
        handleOpenView(slidePanel.data);
      }
      closeSlidePanel();
    }
  }, [slidePanel.isOpen, slidePanel.entityType]);

  const handleActionClick = (action: 'edit' | 'delete' | 'view', animal: Animal) => {
    if (action === 'edit') handleOpenEdit(animal);
    else if (action === 'view') handleOpenView(animal);
    else if (action === 'delete') {
      setAnimalToDelete(animal);
      setModalOpen(true);
    }
  };

  const handleAddToque = () => {
    if (!novoToqueData || !novoToqueResultado) return;
    const novo = {
      id: Math.random().toString(36).substring(2, 11),
      data: novoToqueData,
      ano: parseInt(novoToqueData.split('-')[0]),
      resultado: novoToqueResultado,
      observacoes: novoToqueObs,
      brinco: formData.brinco || '',
    };
    setFormData((prev) => ({
      ...prev,
      historico_toque: [...(prev.historico_toque || []), novo],
    }));
    setNovoToqueData(new Date().toISOString().split('T')[0]);
    setNovoToqueObs('');
  };

  const handleRemoveToque = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      historico_toque: (prev.historico_toque || []).filter((t) => t.id !== id),
    }));
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.brinco?.trim()) {
      showToast('Por favor, informe o Brinco/ID do animal.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      if (slideMode === 'create') {
        await createAnimal(formData as Omit<Animal, 'id' | 'createdAt' | 'status_sincronizacao'>);
        showToast(`Animal ${formData.brinco} cadastrado com sucesso!`);
      } else if (slideMode === 'edit' && selectedAnimal) {
        await updateAnimal({ id: selectedAnimal.id, updates: formData });
        showToast(`Animal ${formData.brinco} atualizado com sucesso!`);
      }
      setSlideOpen(false);
    } catch {
      showToast('Erro ao salvar animal.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!animalToDelete) return;
    try {
      await deleteAnimal(animalToDelete.id);
      showToast(`Animal ${animalToDelete.brinco} excluído com sucesso.`, 'info');
      setModalOpen(false);
    } catch {
      showToast('Erro ao excluir animal.', 'error');
    }
  };

  return {
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
    handleOpenEdit,
    handleOpenView,
    handleCreateFilho,
    handleActionClick,
    handleAddToque,
    handleRemoveToque,
    handleSave,
    handleDeleteConfirm,
  };
};
