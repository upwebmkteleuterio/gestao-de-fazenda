import { useState, useEffect, FormEvent } from 'react';
import { Animal } from '@/types/database';
import { useAnimais } from '@/hooks/useAnimais';
import { usePastagens } from '@/hooks/usePastagens';
import { useUIStore } from '@/store/useUIStore';
import { classifyAnimalType } from '@/services/animalClassification';
import { isFutureDate, isValidDate, validateAnimalFields } from '@/services/domainValidation';

const EMPTY_ANIMALS: Animal[] = [];
const INITIAL_FORM_DATA: Partial<Animal> = {
  brinco: '',
  tipo_animal: 'vaca',
  sexo: 'F',
  raca: 'Nelore',
  cor: '',
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
  peso_atual: 0,
};

export const useAnimalForm = (animals: Animal[] = EMPTY_ANIMALS) => {
  const { slidePanel, closeSlidePanel, showToast } = useUIStore();
  const { pastagens } = usePastagens();
  const { createAnimal, updateAnimal, deleteAnimal, isDeleting, syncLocalMutation } = useAnimais();

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

  useEffect(() => {
    const tipoAnimal = classifyAnimalType(formData, animals);
    if (tipoAnimal !== formData.tipo_animal) {
      setFormData((previous) => ({ ...previous, tipo_animal: tipoAnimal }));
    }
  }, [animals, formData.data_nascimento, formData.filhos_ids, formData.mae_id, formData.sexo, formData.status_reprodutivo, formData.tipo_animal, formData.touro_cobertura]);

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
    if (!isValidDate(novoToqueData) || isFutureDate(novoToqueData)) {
      showToast('Informe uma data de toque válida e não futura.', 'error');
      return;
    }
    if (novoToqueObs.trim().length > 2000) {
      showToast('As observações do toque devem ter no máximo 2.000 caracteres.', 'error');
      return;
    }
    if ((formData.historico_toque || []).some((toque) => toque.data === novoToqueData)) {
      showToast('Já existe um toque registrado para este animal nesta data.', 'error');
      return;
    }
    const novo = {
      id: `toq-${crypto.randomUUID()}`,
      data: novoToqueData,
      ano: Number(novoToqueData.slice(0, 4)),
      resultado: novoToqueResultado,
      observacoes: novoToqueObs.trim() || undefined,
      brinco: formData.brinco || '',
    };
    setFormData((prev) => ({
      ...prev,
      historico_toque: [...(prev.historico_toque || []), novo],
      status_reprodutivo: novoToqueResultado === 'cheia' ? 'Gestante' : 'Vazia',
    }));
    setNovoToqueData(new Date().toISOString().split('T')[0]);
    setNovoToqueResultado('vazia');
    setNovoToqueObs('');
    showToast('Exame de toque registrado com sucesso!', 'success');
  };

  const handleRemoveToque = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      historico_toque: (prev.historico_toque || []).filter((t) => t.id !== id),
    }));
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    const classifiedFormData = {
      ...formData,
      tipo_animal: classifyAnimalType(formData, animals),
    };
    setFormData(classifiedFormData);
    try {
      validateAnimalFields(classifiedFormData);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Confira os dados do animal.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      if (slideMode === 'create') {
        await createAnimal(classifiedFormData as Omit<Animal, 'id' | 'createdAt' | 'status_sincronizacao'>);
        setSlideOpen(false);
        showToast(`Animal ${classifiedFormData.brinco} cadastrado com sucesso!`);
        syncLocalMutation();
      } else if (slideMode === 'edit' && selectedAnimal) {
        await updateAnimal({ id: selectedAnimal.id, updates: classifiedFormData });
        setSlideOpen(false);
        showToast(`Animal ${classifiedFormData.brinco} atualizado com sucesso!`);
        syncLocalMutation();
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erro ao salvar animal.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!animalToDelete || isDeleting) return;
    try {
      await deleteAnimal(animalToDelete.id);
      setModalOpen(false);
      showToast(`Animal ${animalToDelete.brinco} excluído com sucesso.`, 'info');
      syncLocalMutation();
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
    isDeleting,
    handleOpenCreate,
    handleOpenEdit,
    handleOpenView,
    handleCreateFilho,
    handleActionClick,
    handleAddToque,
    handleRemoveToque,
    handleSave,
    handleDeleteConfirm,
    showToast,
  };
};
