import React, { Dispatch, FormEvent, SetStateAction } from 'react';
import { SlidePanel } from '../../../components/SlidePanel';
import { Input } from '../../../components/Input';
import { Select } from '../../../components/Select';
import { Button } from '../../../components/Button';
import { Badge } from '../../../components/Badge';
import { 
  Plus, Map, Sprout, Search, AlertTriangle, Calendar, Users, Edit3, Trash2, 
  Clock, CheckCircle2, ShieldAlert, Layers, Wrench, ChevronRight, Filter, X
} from 'lucide-react';
import { Animal, Pastagem, ServicoPastagem } from '../../../types/database';
import type { ServicoFormValues } from '../hooks/usePastagemForm';

type ResumoRebanhoPasto = { vacas: number; bezerras: number; bezerros: number; matrizes: number; touros: number; total: number; isManual: boolean };

interface PastagensSlidePanelProps {
  slideOpen: boolean;
  setSlideOpen: Dispatch<SetStateAction<boolean>>;
  isEditing: boolean;
  isSaving: boolean;
  isDeleting: boolean;
  isAddingServico: boolean;
  activeTab: 'dados' | 'servicos';
  setActiveTab: Dispatch<SetStateAction<'dados' | 'servicos'>>;
  selectedPasto: Pastagem | null;
  pastoForm: Partial<Pastagem>;
  setPastoForm: Dispatch<SetStateAction<Partial<Pastagem>>>;
  servicoForm: ServicoFormValues;
  setServicoForm: Dispatch<SetStateAction<ServicoFormValues>>;
  handleSavePasto: (event?: FormEvent) => Promise<void>;
  handleAddServico: (event: FormEvent) => Promise<void>;
  setModalOpen: Dispatch<SetStateAction<boolean>>;
  setPastoToDelete: Dispatch<SetStateAction<Pastagem | null>>;
  animaisNoPasto: Animal[];
  animaisDisponiveis: Animal[];
  animaisSelecionados: Animal[];
  onSelectAnimal: (animal: Animal) => void;
  onRemoveSelectedAnimal: (animalId: string) => void;
  resumoRebanhoPasto: ResumoRebanhoPasto;
  servicosDoPasto: ServicoPastagem[];
  checkSaidaVencida: (date?: string) => boolean;
}

export const PastagensSlidePanel = ({
  slideOpen, setSlideOpen, isEditing, isSaving, isDeleting, isAddingServico, activeTab, setActiveTab,
  selectedPasto, pastoForm, setPastoForm, servicoForm, setServicoForm,
  handleSavePasto, handleAddServico, setModalOpen, setPastoToDelete,
  animaisNoPasto, animaisDisponiveis, animaisSelecionados, onSelectAnimal, onRemoveSelectedAnimal,
  resumoRebanhoPasto, servicosDoPasto, checkSaidaVencida
}: PastagensSlidePanelProps) => {
  const [animalSearch, setAnimalSearch] = React.useState('');
  const [animalDropdownOpen, setAnimalDropdownOpen] = React.useState(false);
  const animalComboboxRef = React.useRef<HTMLDivElement>(null);
  const selectedAnimalIds = new Set(animaisSelecionados.map((animal) => animal.id));
  const query = animalSearch.trim().toLocaleLowerCase();
  const filteredAnimais = animaisDisponiveis.filter((animal) => !selectedAnimalIds.has(animal.id) && (
    !query || [animal.brinco, animal.id, animal.tipo_animal, animal.raca, animal.cdc, animal.cdn]
      .some((value) => value?.toLocaleLowerCase().includes(query))
  ));

  React.useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (animalComboboxRef.current && !animalComboboxRef.current.contains(event.target as Node)) setAnimalDropdownOpen(false);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAnimalDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  React.useEffect(() => {
    if (!slideOpen) {
      setAnimalDropdownOpen(false);
      setAnimalSearch('');
    }
  }, [slideOpen]);

  const handleSelect = (animal: Animal) => {
    onSelectAnimal(animal);
    setAnimalSearch('');
    setAnimalDropdownOpen(false);
  };

  return (
  <>
    <SlidePanel
        isOpen={slideOpen}
        onClose={() => { if (!isSaving && !isDeleting && !isAddingServico) setSlideOpen(false); }}
        title={selectedPasto ? `Área: ${selectedPasto.nome_pasto}` : 'Criar Novo Piquete'}
        subtitle="Configuração da área, resumo automático do rebanho e anotação de serviços de solo."
        width="xl"
        actions={
          <div className="flex items-center justify-between w-full">
            {selectedPasto ? (
              <Button
                variant="ghost"
                onClick={() => {
                  setPastoToDelete(selectedPasto);
                  setModalOpen(true);
                }}
                disabled={isSaving || isDeleting || isAddingServico}
                className="text-xs text-red-600 hover:text-red-700 dark:text-red-400"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Excluir Pasto
              </Button>
            ) : <div />}

            <div className="flex space-x-3">
              <Button variant="ghost" onClick={() => setSlideOpen(false)} disabled={isSaving || isDeleting || isAddingServico}>
                Cancelar
              </Button>
              <Button variant="primary" onClick={handleSavePasto} loading={isSaving} disabled={isDeleting || isAddingServico}>
                Salvar Alterações
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Alerta no SlidePanel se Saída estiver vencida */}
          {selectedPasto && checkSaidaVencida(pastoForm.data_saida_prevista) && (
            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/80 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 flex items-start space-x-3">
              <ShieldAlert className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold">ALERTA DE ROTAÇÃO: Data de Saída Vencida</h4>
                <p className="text-xs mt-0.5 text-red-700 dark:text-red-300">
                  A data prevista de saída desta área era <strong>{pastoForm.data_saida_prevista}</strong>. Providencie a rotação dos animais para evitar sobrepastoreio e degradação do solo.
                </p>
              </div>
            </div>
          )}

          {/* TAB BAR DENTRO DA TELA 3.1 */}
          <div className="flex border-b border-gray-200 dark:border-gray-800">
            <button
              onClick={() => setActiveTab('dados')}
              className={`pb-3 px-4 font-semibold text-sm border-b-2 transition-colors flex items-center space-x-2 ${
                activeTab === 'dados'
                  ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Dados Principais & Rebanho</span>
            </button>
            <button
              onClick={() => setActiveTab('servicos')}
              className={`pb-3 px-4 font-semibold text-sm border-b-2 transition-colors flex items-center space-x-2 ${
                activeTab === 'servicos'
                  ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              <Sprout className="w-4 h-4" />
              <span>Anotação de Serviços de Solo ({servicosDoPasto.length})</span>
            </button>
          </div>

          {/* CONTEÚDO DA ABA 1: DADOS PRINCIPAIS E RESUMO AUTOMÁTICO */}
          {activeTab === 'dados' && (
            <div className="space-y-6">
              {/* Form de Edição de Dados Principais */}
              <div className="bg-white dark:bg-gray-900 p-5 rounded-xl border border-gray-200 dark:border-gray-800 space-y-4">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  Dados Principais da Área
                </h3>

                <Input
                  label="Nome da Área (Pasto) *"
                  id="nome_pasto_form"
                  value={pastoForm.nome_pasto || ''}
                  onChange={(e) => setPastoForm({ ...pastoForm, nome_pasto: e.target.value })}
                  placeholder="Ex: Pasto Manguinho Piquete Norte"
                  maxLength={200}
                  required
                />

                <Input
                  label="Tipo de Pastagem / Capim (Inserção Manual) *"
                  id="tipo_capim_form"
                  type="text"
                  value={pastoForm.tipo_capim || ''}
                  onChange={(e) => setPastoForm({ ...pastoForm, tipo_capim: e.target.value })}
                  placeholder="Ex: Brachiaria Brizantha, Mombaça, Tifton 85, Capiaçu..."
                  maxLength={200}
                  required
                />

                {!selectedPasto && (
                  <div className="space-y-3">
                    <div ref={animalComboboxRef} className="relative">
                      <Input
                        label="Adicionar animais ao novo piquete"
                        id="pastagem_animais_combobox"
                        type="search"
                        icon={Search}
                        value={animalSearch}
                        onFocus={(event) => {
                          event.currentTarget.select();
                          setAnimalDropdownOpen(true);
                        }}
                        onClick={() => setAnimalDropdownOpen(true)}
                        onChange={(event) => {
                          setAnimalSearch(event.target.value);
                          setAnimalDropdownOpen(true);
                        }}
                        placeholder="Busque por brinco, ID, raça ou categoria..."
                        autoComplete="off"
                        role="combobox"
                        aria-expanded={animalDropdownOpen}
                        aria-controls="pastagem-animais-opcoes"
                        aria-autocomplete="list"
                      />
                      {animalDropdownOpen && (
                        <div
                          id="pastagem-animais-opcoes"
                          role="listbox"
                          aria-label="Animais disponíveis"
                          className="absolute z-20 -mt-3 max-h-56 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-700 dark:bg-gray-800"
                        >
                          {filteredAnimais.length > 0 ? filteredAnimais.map((animal) => (
                            <button
                              key={animal.id}
                              type="button"
                              role="option"
                              aria-selected={false}
                              className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-emerald-50 dark:text-gray-200 dark:hover:bg-emerald-950/40"
                              onClick={() => handleSelect(animal)}
                            >
                              <span className="min-w-0">
                                <span className="block font-medium">Brinco #{animal.brinco} · {animal.tipo_animal}</span>
                                <span className="block truncate text-xs text-gray-500 dark:text-gray-400">{animal.raca || 'Raça não informada'} · ID: {animal.id}</span>
                              </span>
                            </button>
                          )) : (
                            <p className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400" role="status">
                              {animaisDisponiveis.length === 0 ? 'Nenhum animal ativo disponível.' : 'Nenhum animal encontrado.'}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    {animaisSelecionados.length > 0 ? (
                      <div className="space-y-2" aria-label="Animais selecionados">
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Selecionados ({animaisSelecionados.length})</p>
                        <ul className="flex flex-wrap gap-2">
                          {animaisSelecionados.map((animal) => (
                            <li key={animal.id} className="flex items-center gap-1.5">
                              <Badge variant="success">#{animal.brinco} · {animal.tipo_animal}</Badge>
                              <button
                                type="button"
                                onClick={() => onRemoveSelectedAnimal(animal.id)}
                                aria-label={`Remover animal ${animal.brinco} dos selecionados`}
                                className="rounded-full p-1 text-gray-500 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-gray-400 dark:hover:bg-red-950/40 dark:hover:text-red-300"
                              >
                                <X className="h-3.5 w-3.5" aria-hidden="true" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 dark:text-gray-400" role="status">Nenhum animal selecionado. Você pode criar o pasto sem vincular animais.</p>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Área em Hectares (ha) *"
                    id="area_ha_form"
                    type="number"
                    step="0.01"
                    min="0"
                    value={pastoForm.area_ha !== undefined ? pastoForm.area_ha : ''}
                    onChange={(e) => setPastoForm({ ...pastoForm, area_ha: e.target.value === '' ? '' : Number(e.target.value) })}
                    placeholder="Ex: 15.5"
                    required
                  />
                  <Input
                    label="Lotação Máxima Suportada (Cabeças) *"
                    id="lotacao_maxima_form"
                    type="number"
                    min="1"
                    step="1"
                    value={pastoForm.lotacao_maxima !== undefined ? pastoForm.lotacao_maxima : ''}
                    onChange={(e) => setPastoForm({ ...pastoForm, lotacao_maxima: e.target.value === '' ? '' : Number(e.target.value) })}
                    placeholder="Ex: 30"
                    required
                  />
                </div>

                {/* Seção de Inserção Manual de Quantidade de Gado */}
                <div className="bg-gray-50 dark:bg-gray-800/60 p-4 rounded-xl border border-gray-200 dark:border-gray-700/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>Controle de Quantidade de Gado (Cabeças)</span>
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Insira a quantidade de cabeças presentes manualmente ou utilize o vínculo automático do cadastro.
                      </p>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-700 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={Boolean(pastoForm.usar_qtd_manual)}
                        onChange={(e) => setPastoForm({ 
                          ...pastoForm, 
                          usar_qtd_manual: e.target.checked,
                          qtd_manual: e.target.checked ? (pastoForm.qtd_manual ?? resumoRebanhoPasto.total ?? 0) : undefined 
                        })}
                        className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                      />
                      <span>Inserção Manual</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <Input
                      label="Quantidade Total de Gado no Pasto"
                      id="qtd_gado_manual_form"
                      type="number"
                      min="0"
                      value={pastoForm.usar_qtd_manual ? (pastoForm.qtd_manual !== undefined ? pastoForm.qtd_manual : '') : (pastoForm.qtd_manual ?? resumoRebanhoPasto.total ?? 0)}
                      disabled={!pastoForm.usar_qtd_manual}
                      onChange={(e) => setPastoForm({ 
                        ...pastoForm, 
                        usar_qtd_manual: true,
                        qtd_manual: e.target.value === '' ? '' : Number(e.target.value) 
                      })}
                      placeholder={pastoForm.usar_qtd_manual ? "Ex: 25" : "Automático pelo rebanho"}
                      noMargin
                    />

                    <div className="flex flex-col justify-end text-xs text-gray-500 dark:text-gray-400 pb-1">
                      <span className="font-medium text-gray-700 dark:text-gray-200">
                        Taxa de Lotação Calculada:
                      </span>
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {pastoForm.area_ha && Number(pastoForm.area_ha) > 0
                          ? `${((Number(pastoForm.usar_qtd_manual ? (pastoForm.qtd_manual || 0) : resumoRebanhoPasto.total || 0)) / Number(pastoForm.area_ha)).toFixed(2)} cab/ha`
                          : 'Informe os hectares'}
                      </span>
                    </div>
                  </div>

                  {pastoForm.usar_qtd_manual && (
                    <div className="pt-2 border-t border-gray-200 dark:border-gray-700 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                      <div>
                        <label className="block text-gray-600 dark:text-gray-400 mb-1">Vacas / Novilhas</label>
                        <input
                          type="number"
                          min="0"
                          value={pastoForm.vacas_count_manual !== undefined ? pastoForm.vacas_count_manual : ''}
                          onChange={(e) => setPastoForm({ ...pastoForm, vacas_count_manual: e.target.value === '' ? undefined : Number(e.target.value) })}
                          className="w-full text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-gray-900 dark:text-gray-100"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-600 dark:text-gray-400 mb-1">Bezerros / as</label>
                        <input
                          type="number"
                          min="0"
                          value={pastoForm.bezerros_count_manual !== undefined ? pastoForm.bezerros_count_manual : ''}
                          onChange={(e) => setPastoForm({ ...pastoForm, bezerros_count_manual: e.target.value === '' ? undefined : Number(e.target.value) })}
                          className="w-full text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-gray-900 dark:text-gray-100"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-600 dark:text-gray-400 mb-1">Matrizes</label>
                        <input
                          type="number"
                          min="0"
                          value={pastoForm.matrizes_count_manual !== undefined ? pastoForm.matrizes_count_manual : ''}
                          onChange={(e) => setPastoForm({ ...pastoForm, matrizes_count_manual: e.target.value === '' ? undefined : Number(e.target.value) })}
                          className="w-full text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-gray-900 dark:text-gray-100"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-600 dark:text-gray-400 mb-1">Touros / Garrotes</label>
                        <input
                          type="number"
                          min="0"
                          value={pastoForm.touros_count_manual !== undefined ? pastoForm.touros_count_manual : ''}
                          onChange={(e) => setPastoForm({ ...pastoForm, touros_count_manual: e.target.value === '' ? undefined : Number(e.target.value) })}
                          className="w-full text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-gray-900 dark:text-gray-100"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <Input
                    label="Data de Entrada no Pasto"
                    id="data_entrada_form"
                    type="date"
                    value={pastoForm.data_entrada || ''}
                    onChange={(e) => setPastoForm({ ...pastoForm, data_entrada: e.target.value })}
                  />
                  <Input
                    label="Data Provável de Saída (Gatilho de Alerta)"
                    id="data_saida_prevista_form"
                    type="date"
                    value={pastoForm.data_saida_prevista || ''}
                    onChange={(e) => setPastoForm({ ...pastoForm, data_saida_prevista: e.target.value })}
                  />
                </div>
              </div>

              {/* TELA 3.1 - RESUMO DO REBANHO (CALCULADO OU INSERIDO MANUALMENTE) */}
              <div className="bg-emerald-950 text-white p-5 rounded-xl border border-emerald-900 shadow-md space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold tracking-wider uppercase text-emerald-300 flex items-center space-x-2">
                    <Users className="w-4 h-4" />
                    <span>
                      {pastoForm.usar_qtd_manual ? 'Resumo do Rebanho (Definido Manualmente)' : 'Resumo Automático do Rebanho Presente'}
                    </span>
                  </h3>
                  <div className="flex items-center gap-2">
                    {pastoForm.usar_qtd_manual && (
                      <span className="text-[10px] bg-emerald-800 text-emerald-300 px-2 py-0.5 rounded uppercase font-bold tracking-wide">
                        Modo Manual
                      </span>
                    )}
                    <span className="text-xs bg-emerald-900 px-2.5 py-1 rounded-full text-emerald-200 font-semibold border border-emerald-700">
                      Total: {resumoRebanhoPasto.total} cabeças
                    </span>
                  </div>
                </div>

                {/* Metric Grid Quantidades Calculadas */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                  <div className="bg-emerald-900/60 p-3 rounded-lg border border-emerald-800 text-center">
                    <span className="text-xs text-emerald-300 block font-medium">Qtde Vacas</span>
                    <span className="text-xl font-black text-white">{resumoRebanhoPasto.vacas}</span>
                  </div>

                  <div className="bg-emerald-900/60 p-3 rounded-lg border border-emerald-800 text-center">
                    <span className="text-xs text-emerald-300 block font-medium">Qtde Bezerras</span>
                    <span className="text-xl font-black text-white">{resumoRebanhoPasto.bezerras}</span>
                  </div>

                  <div className="bg-emerald-900/60 p-3 rounded-lg border border-emerald-800 text-center">
                    <span className="text-xs text-emerald-300 block font-medium">Qtde Bezerros</span>
                    <span className="text-xl font-black text-white">{resumoRebanhoPasto.bezerros}</span>
                  </div>

                  <div className="bg-emerald-900/60 p-3 rounded-lg border border-emerald-800 text-center">
                    <span className="text-xs text-emerald-300 block font-medium">Matrizes</span>
                    <span className="text-xl font-black text-white">{resumoRebanhoPasto.matrizes}</span>
                  </div>

                  <div className="bg-emerald-900/60 p-3 rounded-lg border border-emerald-800 text-center">
                    <span className="text-xs text-emerald-300 block font-medium">Touros</span>
                    <span className="text-xl font-black text-white">{resumoRebanhoPasto.touros}</span>
                  </div>

                  <div className="bg-emerald-800/80 p-3 rounded-lg border border-emerald-700 text-center">
                    <span className="text-xs text-emerald-200 block font-medium">Capacidade Suporte</span>
                    <span className="text-xl font-black text-emerald-300">
                      {pastoForm.lotacao_maxima ? `${resumoRebanhoPasto.total}/${pastoForm.lotacao_maxima}` : `${resumoRebanhoPasto.total}/-`}
                    </span>
                  </div>
                </div>

                {/* Lista Visual dos Animais no Pasto */}
                <div className="pt-3 border-t border-emerald-900">
                  <h4 className="text-xs font-bold text-emerald-300 mb-2">Animais Alocados nesta Área:</h4>
                  {animaisNoPasto.length === 0 ? (
                    <p className="text-xs text-emerald-400 italic">Nenhum animal vinculado a este pasto no momento.</p>
                  ) : (
                    <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                      {animaisNoPasto.map(a => (
                        <div key={a.id} className="text-xs bg-emerald-900/40 p-2 rounded border border-emerald-800/60 flex justify-between items-center">
                          <span className="font-bold text-white">Brinco #{a.brinco}</span>
                          <span className="text-emerald-300 capitalize">{a.tipo_animal} &middot; {a.sexo === 'M' ? 'Macho' : 'Fêmea'}</span>
                          <span className="text-emerald-200 font-medium">{a.peso_atual ? `${a.peso_atual} kg` : 'Sem peso'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* CONTEÚDO DA ABA 2: ABA DE ANOTAÇÃO DE SERVIÇOS (TELA 3.1) */}
          {activeTab === 'servicos' && (
            <div className="space-y-6">
              {/* Form Lançar Novo Serviço de Solo */}
              <form onSubmit={handleAddServico} className="bg-white dark:bg-gray-900 p-5 rounded-xl border border-gray-200 dark:border-gray-800 space-y-4">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center space-x-2">
                  <Sprout className="w-4 h-4" />
                  <span>Lançar Serviço Realizado na Terra</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Select
                    label="Tipo de Serviço *"
                    id="tipo_servico_select"
                    value={servicoForm.tipo_servico}
                    onChange={(e) => setServicoForm({ ...servicoForm, tipo_servico: e.target.value as ServicoPastagem['tipo_servico'] })}
                    options={[
                      { label: 'Roço / Roçagem Mecânica', value: 'Roçagem' },
                      { label: 'Herbicida / Pulverização de Invasoras', value: 'Pulverização' },
                      { label: 'Adubação / Calagem', value: 'Adubação' },
                      { label: 'Reforma de Pastagem', value: 'Reforma' },
                      { label: 'Manutenção de Cercas/Bebedouros', value: 'Outro' },
                    ]}
                  />

                  <Input
                    label="Data do Serviço *"
                    id="data_servico_input"
                    type="date"
                    value={servicoForm.data}
                    onChange={(e) => setServicoForm({ ...servicoForm, data: e.target.value })}
                    required
                  />
                </div>

                <Input
                  label="Responsável Técnico / Operador"
                  id="responsavel_input"
                  value={servicoForm.responsavel}
                  onChange={(e) => setServicoForm({ ...servicoForm, responsavel: e.target.value })}
                  placeholder="Ex: Carlos Silva / Equipe de Campo"
                  maxLength={200}
                />

                <div>
                  <label htmlFor="obs_servico_input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Observações do Manejo do Solo
                  </label>
                  <textarea
                    id="obs_servico_input"
                    rows={3}
                    value={servicoForm.observacoes}
                    onChange={(e) => setServicoForm({ ...servicoForm, observacoes: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                    placeholder="Detalhes dos insumos aplicados, dosagem, estado do capim..."
                    maxLength={2000}
                  />
                </div>

                <div className="text-right">
                  <Button type="submit" variant="primary" icon={Plus} loading={isAddingServico} disabled={isAddingServico || isSaving || isDeleting}>
                    Lançar Serviço na Terra
                  </Button>
                </div>
              </form>

              {/* Histórico de Serviços deste Pasto */}
              <div className="bg-white dark:bg-gray-900 p-5 rounded-xl border border-gray-200 dark:border-gray-800 space-y-3">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                  Histórico de Serviços Registrados neste Pasto
                </h3>

                {servicosDoPasto.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center italic">
                    Nenhum serviço de manejo do solo registrado nesta área até o momento.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {servicosDoPasto.map((serv) => (
                      <div key={serv.id} className="p-3.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <div>
                          <div className="flex items-center space-x-2">
                            <Badge variant="info">{serv.tipo_servico}</Badge>
                            <span className="text-xs text-gray-500 font-medium">{serv.data}</span>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                            {serv.observacoes || 'Sem observações adicionais.'}
                          </p>
                        </div>
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 shrink-0">
                          Resp: {serv.responsavel || 'Equipe'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </SlidePanel>
  </>
  );
};
