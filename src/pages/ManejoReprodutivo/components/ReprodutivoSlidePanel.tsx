import React from 'react';
import { SlidePanel } from '../../../components/SlidePanel';
import { Tabs } from '../../../components/Tabs';
import { Select } from '../../../components/Select';
import { Input } from '../../../components/Input';
import { Button } from '../../../components/Button';
import { Badge } from '../../../components/Badge';
import { Button as DummyButton } from '../../../components/Button';
import { Edit, HeartHandshake, Baby, Plus, Calendar, Filter, Check, X, Trash2, Clock, ChevronRight, Sparkles, Layers, Activity, CheckCircle2, AlertTriangle, HelpCircle, FileText, List, PenLine } from 'lucide-react';
import { MontaNaturalIcon } from '../../../components/MontaNaturalIcon';
import { InseminacaoIcon } from '../../../components/InseminacaoIcon';
import { MatrizIdentificacaoCard } from './MatrizIdentificacaoCard';
import { EventoReproducao, DGToqueResultado, Animal } from '../../../types/database';
import { isSameSearchText } from '@/utils/searchText';

export const ReprodutivoSlidePanel = ({
  slideOpen, setSlideOpen, slideMode, setSlideMode, selectedEvento,
  formData, setFormData, isSaving, handleSave, activeTab, setActiveTab,
  selectedCowIds, toggleCowSelection, toggleAllCows, clearCowSelection, animais, matrizes, matrizesDisponiveis, touros,
  lotes, selectedLoteId, setSelectedLoteId,
  isFormValid, calcularPrevisaoParto, setModalOpen, setEventoToDelete, mutationsDisabled = false
}: any) => {
  const [modoManualIatf, setModoManualIatf] = React.useState(false);
  const [modoManualTouroMonta, setModoManualTouroMonta] = React.useState(false);
  const [modoManualDg, setModoManualDg] = React.useState(false);
  const [modoManualTouro, setModoManualTouro] = React.useState(false);
  const [modoManualTipoSemen, setModoManualTipoSemen] = React.useState(false);
  const [modoManualEcc, setModoManualEcc] = React.useState(false);
  const [modoManualTipoEmbriao, setModoManualTipoEmbriao] = React.useState(false);
  const [modoManualReceptora, setModoManualReceptora] = React.useState(false);

  const padroesSemen = ['Convencional', 'Sexado de Fêmea', 'Sexado de Macho'];
  const padroesEmbriao = ['Vitrificado FIV', 'Fresco FIV', 'Congelado Sexado'];
  const padroesEcc = [
    '1.0 (Muito Magra)',
    '2.0 (Magra)',
    '2.5 (Regular)',
    '3.0 (Regular/Boa)',
    '3.5 (Boa)',
    '4.0 (Gorda)',
    '5.0 (Obesa)',
  ];
  const tourosMonta = (touros ?? []) as Animal[];
  const touroMontaLabel = (touro: Animal) => `Touro #${touro.brinco} (${touro.raca || 'Sem raça'})`;

  React.useEffect(() => {
    if (formData.brinco_matriz && (!formData.animal_id || !matrizes.some((m: any) => m.id === formData.animal_id))) {
      setModoManualIatf(true);
      setModoManualDg(true);
    }
  }, [formData.animal_id, formData.brinco_matriz, matrizes]);

  React.useEffect(() => {
    if (formData.tipo_semen && !padroesSemen.includes(formData.tipo_semen)) {
      setModoManualTipoSemen(true);
    }
  }, [formData.tipo_semen]);

  React.useEffect(() => {
    if (formData.tipo_embriao && !padroesEmbriao.includes(formData.tipo_embriao)) {
      setModoManualTipoEmbriao(true);
    }
  }, [formData.tipo_embriao]);

  React.useEffect(() => {
    const rec = formData.receptora || formData.brinco_matriz;
    if (rec && (!formData.animal_id || !matrizes.some((m: any) => m.id === formData.animal_id))) {
      setModoManualReceptora(true);
    }
  }, [formData.animal_id, formData.receptora, formData.brinco_matriz, matrizes]);

  React.useEffect(() => {
    if (formData.condicao_corporal && !padroesEcc.includes(formData.condicao_corporal)) {
      setModoManualEcc(true);
    }
  }, [formData.condicao_corporal]);

  React.useEffect(() => {
    if (formData.touro && touros && touros.length > 0) {
      const match = touros.some(
        (t: any) =>
          (t.nome && formData.touro.includes(t.nome)) ||
          formData.touro.includes(t.brinco)
      );
      if (!match) {
        setModoManualTouro(true);
      }
    }
  }, [formData.touro, touros]);

  React.useEffect(() => {
    if (formData.nome_touro_monta && !tourosMonta.some((touro) => touroMontaLabel(touro) === formData.nome_touro_monta)) {
      setModoManualTouroMonta(true);
    }
  }, [formData.nome_touro_monta, tourosMonta]);

  return (
    <>
      <SlidePanel
        isOpen={slideOpen}
        onClose={() => setSlideOpen(false)}
        title={slideMode === 'create'
          ? 'Novo Lançamento Reprodutivo'
          : `${slideMode === 'edit' ? 'Editar Registro Reprodutivo' : 'Detalhes do Registro Reprodutivo'}${formData.brinco_matriz ? ` · #${formData.brinco_matriz}` : ''}`}
        subtitle="Inserção e atualização segmentada por protocolo reprodutivo."
        width="lg"
        actions={
          <div className="flex items-center justify-between w-full">
            {slideMode === 'view' || mutationsDisabled ? (
              <div />
            ) : slideMode === 'edit' && selectedEvento ? (
              <Button
                variant="ghost"
                onClick={() => {
                  setEventoToDelete(selectedEvento);
                  setModalOpen(true);
                }}
                className="text-xs text-red-600 hover:text-red-700 dark:text-red-400"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Excluir Registro
              </Button>
            ) : <div />}

            <div className="flex space-x-3">
              {slideMode === 'view' ? (
                !mutationsDisabled ? (
                  <Button variant="primary" icon={Edit} onClick={() => setSlideMode('edit')}>
                    Editar Registro
                  </Button>
                ) : null
              ) : (
                <>
                  <Button variant="ghost" onClick={() => setSlideOpen(false)}>
                    Cancelar
                  </Button>
                  <Button variant="primary" onClick={handleSave} disabled={mutationsDisabled || isSaving} loading={isSaving}>
                    {isSaving ? 'Salvando lançamento...' : 'Salvar Lançamento'}
                  </Button>
                </>
              )}
            </div>
          </div>
        }
      >
        <fieldset disabled={slideMode === 'view' || mutationsDisabled} className="space-y-6 border-0 p-0 m-0 min-w-0">
          {slideMode !== 'create' && (
            <MatrizIdentificacaoCard
              animal={animais.find((a: Animal) => a.id === formData.animal_id) ?? animais.find((a: Animal) => isSameSearchText(a.brinco, formData.brinco_matriz))}
              brinco={formData.brinco_matriz}
            />
          )}
          {/* TABS SUPERIORES PARA SEGMENTAÇÃO DE PROTOCOLO (TELA 4.1) */}
          <div className="flex border-b border-gray-200 dark:border-gray-800 overflow-x-auto pb-1">
            <button
              onClick={() => setActiveTab('iatf')}
              className={`pb-3 px-3 font-bold text-xs sm:text-sm border-b-2 whitespace-nowrap transition-colors flex items-center space-x-1.5 ${
                activeTab === 'iatf'
                  ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              <InseminacaoIcon className="w-4 h-4" />
              <span>IATF</span>
            </button>

            <button
              onClick={() => setActiveTab('monta_natural')}
              className={`pb-3 px-3 font-bold text-xs sm:text-sm border-b-2 whitespace-nowrap transition-colors flex items-center space-x-1.5 ${
                activeTab === 'monta_natural'
                  ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              <MontaNaturalIcon className="w-4 h-3.5" />
              <span>Monta Natural</span>
            </button>

            <button
              onClick={() => setActiveTab('tetf')}
              className={`pb-3 px-3 font-bold text-xs sm:text-sm border-b-2 whitespace-nowrap transition-colors flex items-center space-x-1.5 ${
                activeTab === 'tetf'
                  ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              <Baby className="w-4 h-4" />
              <span>TETF (Embrião)</span>
            </button>

            {selectedEvento?.tipo_protocolo === 'dg' && (
              <button
                onClick={() => setActiveTab('dg')}
                className={`pb-3 px-3 font-bold text-xs sm:text-sm border-b-2 whitespace-nowrap transition-colors flex items-center space-x-1.5 ${
                  activeTab === 'dg'
                    ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
                }`}
              >
                <Activity className="w-4 h-4" />
                <span>Diagnóstico (DG)</span>
              </button>
            )}
          </div>

          {/* TAB 1: IATF (CAMPOS SOLICITADOS PELO CLIENTE) */}
          {activeTab === 'iatf' && (
            <div className="space-y-4">
              <div className="bg-emerald-50/60 dark:bg-emerald-950/30 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
                <h4 className="text-xs font-bold uppercase text-emerald-800 dark:text-emerald-300 mb-1">
                  Inseminação em Tempo Fixo (IATF)
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Informe a data D10 da inseminação, o touro/sêmen utilizado e o diagnóstico prévio ou pós-ultrassom.
                </p>
              </div>

              {/* Brinco Matriz (Seleção da Lista ou Inserção Manual) */}
              {slideMode === 'create' && (
              <div>
                <div className="flex flex-col justify-between gap-1.5 mb-2">
                  <label htmlFor="iatf_matriz" className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Brinco da Matriz (Vaca/Fêmea) *
                  </label>
                  <div className="flex items-center space-x-1 text-xs bg-gray-100 dark:bg-gray-800/90 p-1 rounded-lg border border-gray-200 dark:border-gray-700 w-fit">
                    <button
                      type="button"
                      onClick={() => setModoManualIatf(false)}
                      className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center space-x-1.5 cursor-pointer ${
                        !modoManualIatf
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
                      }`}
                    >
                      <List className="w-3.5 h-3.5" />
                      <span>Lista de Matrizes</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        clearCowSelection();
                        setModoManualIatf(true);
                      }}
                      className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center space-x-1.5 cursor-pointer ${
                        modoManualIatf
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
                      }`}
                    >
                      <PenLine className="w-3.5 h-3.5" />
                      <span>Digitar Manualmente</span>
                    </button>
                  </div>
                </div>

                {!modoManualIatf ? (
                  <div className="space-y-3">
                    <Select
                      label="Lote de matrizes"
                      id="iatf_lote"
                      value={selectedLoteId}
                      onChange={(e) => setSelectedLoteId(e.target.value)}
                      options={[
                        { label: 'Todos os animais (sem lote)', value: '' },
                        ...lotes.map((lote: { id: string; nome: string }) => ({ label: lote.nome, value: lote.id })),
                      ]}
                    />
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          Vacas / Matrizes Selecionadas ({selectedCowIds.length} de {matrizesDisponiveis.length}) *
                        </label>
                        <Button variant="ghost" onClick={toggleAllCows} className="text-xs text-emerald-600 dark:text-emerald-400">
                          {selectedCowIds.length === matrizesDisponiveis.length ? 'Desmarcar Todas' : 'Selecionar Todas'}
                        </Button>
                      </div>
                      <div className="max-h-52 overflow-y-auto border border-gray-200 dark:border-gray-800 rounded-xl p-2 space-y-1 bg-white dark:bg-gray-900">
                        {matrizesDisponiveis.length === 0 ? (
                          <p className="text-xs text-gray-400 p-3 text-center">Nenhuma fêmea cadastrada neste lote.</p>
                        ) : (
                          matrizesDisponiveis.map((cow: Animal) => {
                            const isSelected = selectedCowIds.includes(cow.id);
                            return (
                              <div
                                key={cow.id}
                                onClick={() => toggleCowSelection(cow.id)}
                                className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-all text-xs font-medium ${
                                  isSelected
                                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                                    : 'bg-gray-50/50 dark:bg-gray-800/40 border border-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                                }`}
                              >
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => {}}
                                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                                  />
                                  <span className="font-bold">Brinco #{cow.brinco}</span>
                                  <span className="text-gray-400">&bull; {cow.raca || 'Nelore'}</span>
                                </div>
                                <Badge variant="neutral">{cow.status_reprodutivo || 'Solteira'}</Badge>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex gap-2 items-start">
                      <div className="flex-1 min-w-0">
                        <Input
                          id="iatf_matriz"
                          type="text"
                          list="lista-sugestoes-iatf"
                          placeholder="Digite o brinco da matriz cadastrada (Ex: 1042)"
                          value={formData.brinco_matriz || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            const found = matrizes.find((m: any) => isSameSearchText(m.brinco, val));
                            setFormData({
                              ...formData,
                              brinco_matriz: val,
                              animal_id: found?.id || '',
                            });
                          }}
                          required
                          noMargin
                        />
                        <datalist id="lista-sugestoes-iatf">
                          {matrizes.map((m: any) => (
                            <option key={m.id} value={m.brinco}>
                              {`Brinco #${m.brinco} - ${m.raca || 'Nelore'} (${m.status_reprodutivo || 'Solteira'})`}
                            </option>
                          ))}
                        </datalist>
                      </div>
                      <button
                        type="button"
                        onClick={() => setModoManualIatf(false)}
                        className="px-3.5 py-2.5 text-xs font-semibold rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 flex items-center gap-1.5 whitespace-nowrap shadow-2xs transition-all cursor-pointer"
                        title="Voltar para a seleção da lista de matrizes"
                      >
                        <List className="w-4 h-4" />
                        <span className="hidden sm:inline">Ver</span> Lista
                      </button>
                    </div>
                    <div className="flex items-center justify-between text-[11px] px-1 pt-0.5">
                      <span className="text-gray-500 dark:text-gray-400">
                        {formData.brinco_matriz && matrizes.some((m: any) => isSameSearchText(m.brinco, formData.brinco_matriz)) ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                            ✓ Matriz identificada no rebanho ({matrizes.find((m: any) => isSameSearchText(m.brinco, formData.brinco_matriz))?.raca || 'Nelore'})
                          </span>
                        ) : formData.brinco_matriz ? (
                          <span className="text-amber-600 dark:text-amber-400 font-medium">
                            ✏️ Brinco ainda não identificado no cadastro; cadastre o animal antes de salvar
                          </span>
                        ) : (
                          'Digite o número do brinco ou escolha das sugestões do rebanho'
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => setModoManualIatf(false)}
                        className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium inline-flex items-center gap-1"
                      >
                        <List className="w-3 h-3" />
                        Voltar para seleção em lista
                      </button>
                    </div>
                  </div>
                )}
              </div>
              )}

              {slideMode === 'edit' && (
                <div>
                  <label htmlFor="iatf_matriz" className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Brinco da Matriz (Vaca/Fêmea) *
                  </label>
                  <Input
                    id="iatf_matriz"
                    type="text"
                    list="lista-sugestoes-iatf"
                    placeholder="Digite o brinco da matriz cadastrada (Ex: 1042)"
                    value={formData.brinco_matriz || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      const found = matrizes.find((m: Animal) => isSameSearchText(m.brinco, val));
                      setFormData({ ...formData, brinco_matriz: val, animal_id: found?.id || '' });
                    }}
                    required
                    noMargin
                  />
                  <datalist id="lista-sugestoes-iatf">
                    {matrizes.map((m: Animal) => (
                      <option key={m.id} value={m.brinco}>
                        {`Brinco #${m.brinco} - ${m.raca || 'Nelore'} (${m.status_reprodutivo || 'Solteira'})`}
                      </option>
                    ))}
                  </datalist>
                  <div className="text-[11px] px-1 pt-0.5">
                    <span className="text-gray-500 dark:text-gray-400">
                      {formData.brinco_matriz && matrizes.some((m: Animal) => isSameSearchText(m.brinco, formData.brinco_matriz)) ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                          ✓ Matriz identificada no rebanho ({matrizes.find((m: Animal) => isSameSearchText(m.brinco, formData.brinco_matriz))?.raca || 'Nelore'})
                        </span>
                      ) : formData.brinco_matriz ? (
                        <span className="text-amber-600 dark:text-amber-400 font-medium">
                          ✏️ Brinco ainda não identificado no cadastro; cadastre o animal antes de salvar
                        </span>
                      ) : (
                        'Digite o número do brinco ou escolha das sugestões do rebanho'
                      )}
                    </span>
                  </div>
                </div>
              )}

              {/* Data D10 da inseminação */}
              <div>
                <Input
                  label="Data D10 (Inseminação) *"
                  id="iatf_d10"
                  type="date"
                  value={formData.d10}
                  onChange={(e) => {
                    const newD10 = e.target.value;
                    setFormData({
                      ...formData,
                      d10: newD10,
                      data_principal: newD10 || formData.data_principal,
                      previsao_parto: typeof formData.dias_previsao_parto === 'number'
                        ? calcularPrevisaoParto(newD10 || formData.data_principal, formData.dias_previsao_parto)
                        : '',
                    });
                  }}
                  required={!formData.d0}
                />
              </div>

              {/* Previsão de Parto (Cálculo em Dias Futuros) */}
              <div className="bg-emerald-50/70 dark:bg-emerald-950/40 p-3.5 rounded-xl border border-emerald-200/80 dark:border-emerald-800/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Baby className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 uppercase tracking-wide">
                      Previsão de Parto (Inseminação)
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-200 bg-emerald-100 dark:bg-emerald-950 px-2.5 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                    Cálculo Automático
                  </span>
                </div>

                <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-3">
                  <Input
                    label="Dias de Gestação (Ex: 300 dias)"
                    id="iatf_dias_previsao"
                    type="number"
                    min={200}
                    max={400}
                    value={formData.dias_previsao_parto}
                    onChange={(e) => {
                      const dias = e.target.value === '' ? '' : Number(e.target.value);
                      const baseDate = formData.d10 || formData.data_principal;
                      const previsaoParto = typeof dias === 'number' && Number.isFinite(dias)
                        ? calcularPrevisaoParto(baseDate, dias)
                        : '';
                      setFormData({
                        ...formData,
                        dias_previsao_parto: dias,
                        previsao_parto: previsaoParto,
                      });
                    }}
                    placeholder="300"
                  />
                  <Input
                    label="Data Prevista do Parto"
                    id="iatf_previsao_parto"
                    type="date"
                    value={formData.previsao_parto}
                    onChange={(e) => setFormData({ ...formData, previsao_parto: e.target.value })}
                    readOnly
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-4">
                {/* Touro Reprodutor / Sêmen (Seleção ou Inserção Manual) */}
                <div>
                  <div className="flex flex-col items-start gap-1.5 mb-1.5">
                    <label htmlFor="iatf_touro" className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Touro Usado / Sêmen *
                    </label>
                    <div className="flex items-center space-x-1 text-xs bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg border border-gray-200 dark:border-gray-700">
                      <button
                        type="button"
                        onClick={() => setModoManualTouro(false)}
                        className={`px-2 py-0.5 rounded-md font-medium transition-all flex items-center space-x-1 ${
                          !modoManualTouro
                            ? 'bg-white dark:bg-gray-700 text-emerald-700 dark:text-emerald-300 shadow-xs'
                            : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
                        }`}
                        title="Selecionar touro cadastrado no rebanho"
                      >
                        <List className="w-3 h-3" />
                        <span className="text-[11px]">Touros</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setModoManualTouro(true)}
                        className={`px-2 py-0.5 rounded-md font-medium transition-all flex items-center space-x-1 ${
                          modoManualTouro
                            ? 'bg-white dark:bg-gray-700 text-emerald-700 dark:text-emerald-300 shadow-xs'
                            : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
                        }`}
                        title="Digitar código de sêmen ou touro manualmente"
                      >
                        <PenLine className="w-3 h-3" />
                        <span className="text-[11px]">Manual</span>
                      </button>
                    </div>
                  </div>

                  {!modoManualTouro && touros && touros.length > 0 ? (
                    <div className="space-y-1">
                      <Select
                        id="iatf_touro"
                        value={formData.touro || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '__manual__') {
                            setModoManualTouro(true);
                            return;
                          }
                          setFormData({ ...formData, touro: val });
                        }}
                        options={[
                          { label: 'Selecione o touro do rebanho...', value: '' },
                          ...touros.map((t: any) => ({
                            label: `${t.nome ? `${t.nome} - ` : ''}Brinco #${t.brinco} (${t.raca || 'Nelore'})`,
                            value: t.nome ? `${t.nome} (Brinco #${t.brinco})` : `Touro #${t.brinco}`,
                          })),
                          { label: '✏️ Inserir outro touro/código sêmen manualmente...', value: '__manual__' },
                        ]}
                        noMargin
                      />
                      <div className="flex items-center justify-between text-[11px] text-gray-400 px-1 pt-0.5">
                        <span>{touros.length} touros cadastrados</span>
                        <button
                          type="button"
                          onClick={() => setModoManualTouro(true)}
                          className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                        >
                          Digitar código de sêmen
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Input
                        id="iatf_touro"
                        value={formData.touro || ''}
                        onChange={(e) => setFormData({ ...formData, touro: e.target.value })}
                        placeholder="Ex: Touro Nelore Elite PO #001, ABS 29NE300..."
                        required
                        noMargin
                      />
                      <div className="flex items-center justify-between text-[11px] px-1 pt-0.5">
                        <span className="text-gray-400">
                          {touros && touros.length > 0 ? 'Inserção manual de touro / código de central' : 'Nenhum touro cadastrado'}
                        </span>
                        {touros && touros.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setModoManualTouro(false)}
                            className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                          >
                            Selecionar touro da lista
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Tipo de Sêmen (Seleção ou Inserção Manual) */}
                <div>
                  <div className="flex flex-col items-start gap-1.5 mb-1.5">
                    <label htmlFor="iatf_tipo_semen" className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Tipo de Sêmen *
                    </label>
                    <div className="flex items-center space-x-1 text-xs bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg border border-gray-200 dark:border-gray-700">
                      <button
                        type="button"
                        onClick={() => {
                          setModoManualTipoSemen(false);
                          if (!padroesSemen.includes(formData.tipo_semen)) {
                            setFormData({ ...formData, tipo_semen: 'Convencional' });
                          }
                        }}
                        className={`px-2 py-0.5 rounded-md font-medium transition-all flex items-center space-x-1 ${
                          !modoManualTipoSemen
                            ? 'bg-white dark:bg-gray-700 text-emerald-700 dark:text-emerald-300 shadow-xs'
                            : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
                        }`}
                        title="Opções padrão de tipo de sêmen"
                      >
                        <List className="w-3 h-3" />
                        <span className="text-[11px]">Padrão</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setModoManualTipoSemen(true)}
                        className={`px-2 py-0.5 rounded-md font-medium transition-all flex items-center space-x-1 ${
                          modoManualTipoSemen
                            ? 'bg-white dark:bg-gray-700 text-emerald-700 dark:text-emerald-300 shadow-xs'
                            : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
                        }`}
                        title="Digitar tipo de sêmen manualmente"
                      >
                        <PenLine className="w-3 h-3" />
                        <span className="text-[11px]">Manual</span>
                      </button>
                    </div>
                  </div>

                  {!modoManualTipoSemen ? (
                    <div className="space-y-1">
                      <Select
                        id="iatf_tipo_semen"
                        value={formData.tipo_semen || 'Convencional'}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '__manual__') {
                            setModoManualTipoSemen(true);
                            setFormData({ ...formData, tipo_semen: '' });
                            return;
                          }
                          setFormData({ ...formData, tipo_semen: val });
                        }}
                        options={[
                          { label: 'Convencional', value: 'Convencional' },
                          { label: 'Sexado de Fêmea', value: 'Sexado de Fêmea' },
                          { label: 'Sexado de Macho', value: 'Sexado de Macho' },
                          { label: '✏️ Inserir outro tipo manualmente...', value: '__manual__' },
                        ]}
                        noMargin
                      />
                      <div className="flex items-center justify-end text-[11px] text-gray-400 px-1 pt-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setModoManualTipoSemen(true);
                            setFormData({ ...formData, tipo_semen: '' });
                          }}
                          className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                        >
                          Digitar tipo personalizado
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Input
                        id="iatf_tipo_semen"
                        value={formData.tipo_semen || ''}
                        onChange={(e) => setFormData({ ...formData, tipo_semen: e.target.value })}
                        placeholder="Ex: Sexado 4M, Heterospérmico, Palheta Dupla..."
                        noMargin
                      />
                      <div className="flex items-center justify-between text-[11px] px-1 pt-0.5">
                        <span className="text-gray-400">Tipo de sêmen personalizado</span>
                        <button
                          type="button"
                          onClick={() => {
                            setModoManualTipoSemen(false);
                            setFormData({ ...formData, tipo_semen: 'Convencional' });
                          }}
                          className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                        >
                          Voltar para opções padrão
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-4">
                {/* Condição Corporal (ECC) (Seleção da Escala ou Inserção Manual) */}
                <div>
                  <div className="flex flex-col items-start gap-1.5 mb-1.5">
                    <label htmlFor="iatf_ecc" className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Condição Corporal (ECC)
                    </label>
                    <div className="flex items-center space-x-1 text-xs bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg border border-gray-200 dark:border-gray-700">
                      <button
                        type="button"
                        onClick={() => {
                          setModoManualEcc(false);
                          if (!padroesEcc.includes(formData.condicao_corporal)) {
                            setFormData({ ...formData, condicao_corporal: '3.0 (Regular/Boa)' });
                          }
                        }}
                        className={`px-2 py-0.5 rounded-md font-medium transition-all flex items-center space-x-1 ${
                          !modoManualEcc
                            ? 'bg-white dark:bg-gray-700 text-emerald-700 dark:text-emerald-300 shadow-xs'
                            : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
                        }`}
                        title="Escala padrão de 1 a 5"
                      >
                        <List className="w-3 h-3" />
                        <span className="text-[11px]">Escala</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setModoManualEcc(true)}
                        className={`px-2 py-0.5 rounded-md font-medium transition-all flex items-center space-x-1 ${
                          modoManualEcc
                            ? 'bg-white dark:bg-gray-700 text-emerald-700 dark:text-emerald-300 shadow-xs'
                            : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
                        }`}
                        title="Digitar nota de ECC manualmente"
                      >
                        <PenLine className="w-3 h-3" />
                        <span className="text-[11px]">Manual</span>
                      </button>
                    </div>
                  </div>

                  {!modoManualEcc ? (
                    <div className="space-y-1">
                      <Select
                        id="iatf_ecc"
                        value={formData.condicao_corporal || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '__manual__') {
                            setModoManualEcc(true);
                            setFormData({ ...formData, condicao_corporal: '' });
                            return;
                          }
                          setFormData({ ...formData, condicao_corporal: val });
                        }}
                        options={[
                          { label: 'Selecione a nota ECC...', value: '' },
                          { label: '1.0 - Muito Magra', value: '1.0 (Muito Magra)' },
                          { label: '2.0 - Magra', value: '2.0 (Magra)' },
                          { label: '2.5 - Regular', value: '2.5 (Regular)' },
                          { label: '3.0 - Regular / Boa', value: '3.0 (Regular/Boa)' },
                          { label: '3.5 - Boa (Ideal IATF)', value: '3.5 (Boa)' },
                          { label: '4.0 - Muito Boa / Gorda', value: '4.0 (Gorda)' },
                          { label: '5.0 - Obesa', value: '5.0 (Obesa)' },
                          { label: '✏️ Inserir nota/ECC manualmente...', value: '__manual__' },
                        ]}
                        noMargin
                      />
                      <div className="flex items-center justify-end text-[11px] text-gray-400 px-1 pt-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setModoManualEcc(true);
                            setFormData({ ...formData, condicao_corporal: '' });
                          }}
                          className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                        >
                          Digitar nota manual (ex: 2.75, 3.25)
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Input
                        id="iatf_ecc"
                        value={formData.condicao_corporal || ''}
                        onChange={(e) => setFormData({ ...formData, condicao_corporal: e.target.value })}
                        placeholder="Ex: 2.75, 3.25, Regular+, 4.2..."
                        noMargin
                      />
                      <div className="flex items-center justify-between text-[11px] px-1 pt-0.5">
                        <span className="text-gray-400">Nota ou observação de ECC livre</span>
                        <button
                          type="button"
                          onClick={() => {
                            setModoManualEcc(false);
                            setFormData({ ...formData, condicao_corporal: '3.0 (Regular/Boa)' });
                          }}
                          className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                        >
                          Voltar para escala 1 a 5
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <Input
                  label="Data do Ultrassom / DG"
                  id="iatf_ultrassom"
                  type="date"
                  value={formData.data_ultrassom}
                  onChange={(e) => setFormData({ ...formData, data_ultrassom: e.target.value })}
                />
              </div>

              {/* DG Radio: Prenha / Vazia / Pendente */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Diagnóstico DG (Resultado)
                </label>
                <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-3">
                  <label className={`cursor-pointer p-3 rounded-lg border text-center text-xs font-bold flex items-center justify-center space-x-2 transition-all ${
                    formData.dg_radio === 'cheia'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700'
                  }`}>
                    <input
                      type="radio"
                      name="dg_radio_group"
                      value="cheia"
                      checked={formData.dg_radio === 'cheia'}
                      onChange={() => setFormData({ ...formData, dg_radio: 'cheia' })}
                      className="sr-only"
                    />
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Prenha</span>
                  </label>

                  <label className={`cursor-pointer p-3 rounded-lg border text-center text-xs font-bold flex items-center justify-center space-x-2 transition-all ${
                    formData.dg_radio === 'vazia'
                      ? 'bg-red-600 text-white border-red-600 shadow'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700'
                  }`}>
                    <input
                      type="radio"
                      name="dg_radio_group"
                      value="vazia"
                      checked={formData.dg_radio === 'vazia'}
                      onChange={() => setFormData({ ...formData, dg_radio: 'vazia' })}
                      className="sr-only"
                    />
                    <X className="w-4 h-4" />
                    <span>Vazia</span>
                  </label>

                  <label className={`cursor-pointer p-3 rounded-lg border text-center text-xs font-bold flex items-center justify-center space-x-2 transition-all ${
                    formData.dg_radio === 'pendente'
                      ? 'bg-amber-500 text-white border-amber-500 shadow'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700'
                  }`}>
                    <input
                      type="radio"
                      name="dg_radio_group"
                      value="pendente"
                      checked={formData.dg_radio === 'pendente'}
                      onChange={() => setFormData({ ...formData, dg_radio: 'pendente' })}
                      className="sr-only"
                    />
                    <Clock className="w-4 h-4" />
                    <span>Pendente</span>
                  </label>
                </div>
              </div>

              <div>
                <label htmlFor="iatf_obs" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Observações
                </label>
                <textarea
                  id="iatf_obs"
                  rows={3}
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                  placeholder="Anotações do veterinário, condição corporal..."
                />
              </div>
            </div>
          )}

          {/* TAB 2: MONTA NATURAL */}
          {activeTab === 'monta_natural' && (
            <div className="space-y-4">
              <div className="bg-amber-50/60 dark:bg-amber-950/30 p-4 rounded-xl border border-amber-100 dark:border-amber-900/40">
                <h4 className="text-xs font-bold uppercase text-amber-800 dark:text-amber-300 mb-1">
                  Lançamento de Monta Natural
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Informe a data, o reprodutor e selecione as vacas do lote cobertas no pasto.
                </p>
              </div>

              <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-4">
                <Input
                  label="Data do Evento de Monta *"
                  id="monta_data"
                  type="date"
                  value={formData.data_principal}
                  onChange={(e) => setFormData({ ...formData, data_principal: e.target.value })}
                  required
                />
                {slideMode === 'create' && (
                  <Select
                    label="Lote de matrizes"
                    id="monta_lote"
                    value={selectedLoteId}
                    onChange={(e) => setSelectedLoteId(e.target.value)}
                    options={[
                      { label: 'Todos os animais (sem lote)', value: '' },
                      ...lotes.map((lote: { id: string; nome: string }) => ({ label: lote.nome, value: lote.id })),
                    ]}
                  />
                )}
                {!modoManualTouroMonta ? (
                  <Select
                    label="Touro cadastrado *"
                    id="monta_touro"
                    value={formData.nome_touro_monta || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '__manual__') {
                        setModoManualTouroMonta(true);
                        return;
                      }
                      setFormData({ ...formData, nome_touro_monta: value });
                    }}
                    options={[
                      { label: 'Selecione um touro cadastrado...', value: '' },
                      ...tourosMonta.map((touro) => ({ label: touroMontaLabel(touro), value: touroMontaLabel(touro) })),
                      { label: '✏️ Digitar touro manualmente...', value: '__manual__' },
                    ]}
                    required
                  />
                ) : (
                  <div>
                    <Input
                      label="Nome / Código do Touro *"
                      id="monta_touro"
                      value={formData.nome_touro_monta}
                      onChange={(e) => setFormData({ ...formData, nome_touro_monta: e.target.value })}
                      placeholder="Ex: Touro PO Nelore #01"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setModoManualTouroMonta(false)}
                      className="mt-1 text-xs font-medium text-emerald-600 hover:underline dark:text-emerald-400"
                    >
                      Selecionar touro cadastrado
                    </button>
                  </div>
                )}
              </div>

              {/* Checkbox List com as Vacas Selecionadas */}
              {slideMode === 'create' && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Vacas / Matrizes Selecionadas ({selectedCowIds.length} de {matrizesDisponiveis.length}) *
                  </label>
                  <Button variant="ghost" onClick={toggleAllCows} className="text-xs text-emerald-600 dark:text-emerald-400">
                    {selectedCowIds.length === matrizesDisponiveis.length ? 'Desmarcar Todas' : 'Selecionar Todas'}
                  </Button>
                </div>

                <div className="max-h-52 overflow-y-auto border border-gray-200 dark:border-gray-800 rounded-xl p-2 space-y-1 bg-white dark:bg-gray-900">
                  {matrizesDisponiveis.length === 0 ? (
                    <p className="text-xs text-gray-400 p-3 text-center">Nenhuma fêmea cadastrada neste lote.</p>
                  ) : (
                    matrizesDisponiveis.map((cow) => {
                      const isSelected = selectedCowIds.includes(cow.id);
                      return (
                        <div
                          key={cow.id}
                          onClick={() => toggleCowSelection(cow.id)}
                          className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-all text-xs font-medium ${
                            isSelected
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                              : 'bg-gray-50/50 dark:bg-gray-800/40 border border-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                            />
                            <span className="font-bold">Brinco #{cow.brinco}</span>
                            <span className="text-gray-400">&bull; {cow.raca || 'Nelore'}</span>
                          </div>
                          <Badge variant="neutral">{cow.status_reprodutivo || 'Solteira'}</Badge>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
              )}

              <div>
                <label htmlFor="monta_obs" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Observações
                </label>
                <textarea
                  id="monta_obs"
                  rows={3}
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                  placeholder="Anotações do lote ou pasto da monta..."
                />
              </div>
            </div>
          )}

          {/* TAB 3: TETF (TRANSFERÊNCIA DE EMBRIÃO) */}
          {activeTab === 'tetf' && (
            <div className="space-y-4">
              <div className="bg-purple-50/60 dark:bg-purple-950/30 p-4 rounded-xl border border-purple-100 dark:border-purple-900/40">
                <h4 className="text-xs font-bold uppercase text-purple-800 dark:text-purple-300 mb-1">
                  Transferência de Embrião em Tempo Fixo (TETF)
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Cadastre o acasalamento de doadora, touro genético, tipo de embrião e a vaca receptora.
                </p>
              </div>

              <Input
                label="Data da Transferência *"
                id="tetf_data"
                type="date"
                value={formData.data_principal}
                onChange={(e) => setFormData({ ...formData, data_principal: e.target.value })}
                required
              />

              <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-4">
                <Select
                  label="Doadora (Matriz Doadora) *"
                  id="tetf_doadora"
                  value={formData.doadora || ''}
                  onChange={(e) => setFormData({ ...formData, doadora: e.target.value })}
                  options={[
                    { label: 'Selecione a doadora ativa cadastrada...', value: '' },
                    ...matrizes.map((m: any) => ({
                      label: `Brinco #${m.brinco} (${m.raca || 'Matriz'})`,
                      value: m.brinco,
                    })),
                  ]}
                  required
                />
                <Input
                  label="Touro (Pai) *"
                  id="tetf_touro"
                  value={formData.touro}
                  onChange={(e) => setFormData({ ...formData, touro: e.target.value })}
                  placeholder="Ex: Touro Grande Campeão"
                  required
                />
              </div>

              <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-4">
                {/* Tipo de Embrião (Seleção ou Inserção Manual) */}
                <div>
                  <div className="flex flex-col items-start gap-1.5 mb-1.5">
                    <label htmlFor="tetf_tipo_embriao" className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Tipo de Embrião *
                    </label>
                    <div className="flex items-center space-x-1 text-xs bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg border border-gray-200 dark:border-gray-700">
                      <button
                        type="button"
                        onClick={() => {
                          setModoManualTipoEmbriao(false);
                          if (!padroesEmbriao.includes(formData.tipo_embriao)) {
                            setFormData({ ...formData, tipo_embriao: 'Vitrificado FIV' });
                          }
                        }}
                        className={`px-2 py-0.5 rounded-md font-medium transition-all flex items-center space-x-1 ${
                          !modoManualTipoEmbriao
                            ? 'bg-white dark:bg-gray-700 text-purple-700 dark:text-purple-300 shadow-xs'
                            : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
                        }`}
                        title="Opções padrão de tipo de embrião"
                      >
                        <List className="w-3 h-3" />
                        <span className="text-[11px]">Padrão</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setModoManualTipoEmbriao(true)}
                        className={`px-2 py-0.5 rounded-md font-medium transition-all flex items-center space-x-1 ${
                          modoManualTipoEmbriao
                            ? 'bg-white dark:bg-gray-700 text-purple-700 dark:text-purple-300 shadow-xs'
                            : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
                        }`}
                        title="Digitar tipo de embrião manualmente"
                      >
                        <PenLine className="w-3 h-3" />
                        <span className="text-[11px]">Manual</span>
                      </button>
                    </div>
                  </div>

                  {!modoManualTipoEmbriao ? (
                    <div className="space-y-1">
                      <Select
                        id="tetf_tipo_embriao"
                        value={formData.tipo_embriao || 'Vitrificado FIV'}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '__manual__') {
                            setModoManualTipoEmbriao(true);
                            setFormData({ ...formData, tipo_embriao: '' });
                            return;
                          }
                          setFormData({ ...formData, tipo_embriao: val });
                        }}
                        options={[
                          { label: 'Vitrificado FIV', value: 'Vitrificado FIV' },
                          { label: 'Fresco FIV', value: 'Fresco FIV' },
                          { label: 'Congelado Sexado', value: 'Congelado Sexado' },
                          { label: '✏️ Inserir outro tipo de embrião manualmente...', value: '__manual__' },
                        ]}
                        noMargin
                      />
                      <div className="flex items-center justify-end text-[11px] text-gray-400 px-1 pt-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setModoManualTipoEmbriao(true);
                            setFormData({ ...formData, tipo_embriao: '' });
                          }}
                          className="text-purple-600 dark:text-purple-400 hover:underline font-medium"
                        >
                          Digitar tipo personalizado
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Input
                        id="tetf_tipo_embriao"
                        value={formData.tipo_embriao || ''}
                        onChange={(e) => setFormData({ ...formData, tipo_embriao: e.target.value })}
                        placeholder="Ex: DTA, PIV Sexado Macho, Clivado D7..."
                        noMargin
                      />
                      <div className="flex items-center justify-between text-[11px] px-1 pt-0.5">
                        <span className="text-gray-400">Tipo de embrião livre</span>
                        <button
                          type="button"
                          onClick={() => {
                            setModoManualTipoEmbriao(false);
                            setFormData({ ...formData, tipo_embriao: 'Vitrificado FIV' });
                          }}
                          className="text-purple-600 dark:text-purple-400 hover:underline font-medium"
                        >
                          Voltar para opções padrão
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Vaca Receptora (Seleção da Lista ou Inserção Manual) */}
                <div>
                  <div className="flex flex-col items-start gap-1.5 mb-1.5">
                    <label htmlFor="tetf_receptora" className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Vaca Receptora (Brinco) *
                    </label>
                    <div className="flex items-center space-x-1 text-xs bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg border border-gray-200 dark:border-gray-700">
                      <button
                        type="button"
                        onClick={() => setModoManualReceptora(false)}
                        className={`px-2 py-0.5 rounded-md font-medium transition-all flex items-center space-x-1 ${
                          !modoManualReceptora
                            ? 'bg-white dark:bg-gray-700 text-purple-700 dark:text-purple-300 shadow-xs'
                            : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
                        }`}
                        title="Selecionar receptora cadastrada no rebanho"
                      >
                        <List className="w-3 h-3" />
                        <span className="text-[11px]">Lista</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setModoManualReceptora(true)}
                        className={`px-2 py-0.5 rounded-md font-medium transition-all flex items-center space-x-1 ${
                          modoManualReceptora
                            ? 'bg-white dark:bg-gray-700 text-purple-700 dark:text-purple-300 shadow-xs'
                            : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
                        }`}
                        title="Digitar o brinco da receptora cadastrada"
                      >
                        <PenLine className="w-3 h-3" />
                        <span className="text-[11px]">Manual</span>
                      </button>
                    </div>
                  </div>

                  {!modoManualReceptora ? (
                    <div className="space-y-1">
                      <Select
                        id="tetf_receptora"
                        value={formData.animal_id || ''}
                        onChange={(e) => {
                          const id = e.target.value;
                          if (id === '__manual__') {
                            setModoManualReceptora(true);
                            return;
                          }
                          const found = matrizes.find((m: any) => m.id === id);
                          setFormData({
                            ...formData,
                            animal_id: id,
                            brinco_matriz: found?.brinco || '',
                            receptora: found?.brinco || '',
                          });
                        }}
                        options={[
                          { label: 'Selecione a receptora da lista de matrizes...', value: '' },
                          ...matrizes.map((m: any) => ({
                            label: `Brinco #${m.brinco} (${m.raca || 'Receptora'} - ${m.status_reprodutivo || 'Disponível'})`,
                            value: m.id,
                          })),
                          { label: '✏️ Digitar brinco da receptora cadastrada...', value: '__manual__' },
                        ]}
                        noMargin
                      />
                      <div className="flex items-center justify-between text-[11px] text-gray-400 px-1 pt-0.5">
                        <span>{matrizes.length} receptoras cadastradas</span>
                        <button
                          type="button"
                          onClick={() => setModoManualReceptora(true)}
                          className="text-purple-600 dark:text-purple-400 hover:underline font-medium"
                        >
                          Digitar receptora manualmente
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Input
                        id="tetf_receptora"
                        value={formData.receptora || formData.brinco_matriz || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          const found = matrizes.find((m: any) => isSameSearchText(m.brinco, val));
                          setFormData({
                            ...formData,
                            receptora: val,
                            brinco_matriz: val,
                            animal_id: found?.id || '',
                          });
                        }}
                        placeholder="Digite o brinco da receptora ativa cadastrada (Ex: 2045)"
                        required
                        noMargin
                      />
                      <div className="flex items-center justify-between text-[11px] px-1 pt-0.5">
                        <span className="text-gray-400">
                          {formData.receptora && matrizes.some((m: any) => isSameSearchText(m.brinco, formData.receptora)) ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                              ✓ Receptora cadastrada no rebanho
                            </span>
                          ) : (
                            'Brinco não identificado; cadastre a receptora ativa antes de salvar'
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={() => setModoManualReceptora(false)}
                          className="text-purple-600 dark:text-purple-400 hover:underline font-medium"
                        >
                          Voltar para seleção em lista
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="tetf_obs" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Observações TETF
                </label>
                <textarea
                  id="tetf_obs"
                  rows={3}
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                  placeholder="Anotações da equipe veterinária / laboratório..."
                />
              </div>
            </div>
          )}

          {/* TAB 4: DIAGNÓSTICO (DG) */}
          {activeTab === 'dg' && selectedEvento?.tipo_protocolo === 'dg' && (
            <div className="space-y-4">
              <div className="bg-blue-50/60 dark:bg-blue-950/30 p-4 rounded-xl border border-blue-100 dark:border-blue-900/40">
                <h4 className="text-xs font-bold uppercase text-blue-800 dark:text-blue-300 mb-1">
                  Exame e Diagnóstico de Gestação (DG Toque / Ultrassom)
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Ao salvar um diagnóstico como <strong>PRENHA</strong>, o status reprodutivo da matriz na tabela de animais é atualizado automaticamente e a previsão de parto é calculada (+300 dias).
                </p>
              </div>

              <Input
                label="Data do Diagnóstico (DG) *"
                id="dg_data_exame"
                type="date"
                value={formData.data_dg_exame}
                onChange={(e) => setFormData({ ...formData, data_dg_exame: e.target.value })}
                required
              />

              {/* Vaca / Matriz para Diagnóstico (Seleção da Lista ou Digitação do Brinco) */}
              <div>
                <div className="flex flex-col items-start gap-1.5 mb-1.5">
                  <label htmlFor="dg_vaca_select" className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Vaca / Matriz (Brinco ou Identificação) *
                  </label>
                  <div className="flex items-center space-x-1 text-xs bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg border border-gray-200 dark:border-gray-700">
                    <button
                      type="button"
                      onClick={() => setModoManualDg(false)}
                      className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center space-x-1 ${
                        !modoManualDg
                          ? 'bg-white dark:bg-gray-700 text-blue-700 dark:text-blue-300 shadow-xs'
                          : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
                      }`}
                    >
                      <List className="w-3.5 h-3.5" />
                      <span>Selecionar da Lista</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setModoManualDg(true)}
                      className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center space-x-1 ${
                        modoManualDg
                          ? 'bg-white dark:bg-gray-700 text-blue-700 dark:text-blue-300 shadow-xs'
                          : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
                      }`}
                    >
                      <PenLine className="w-3.5 h-3.5" />
                      <span>Inserção Manual</span>
                    </button>
                  </div>
                </div>

                {!modoManualDg ? (
                  <div className="space-y-1.5">
                    <div className="flex gap-2 items-start">
                      <div className="flex-1 min-w-0">
                        <Select
                          id="dg_vaca_select"
                          value={formData.animal_id || ''}
                          onChange={(e) => {
                            const id = e.target.value;
                            if (id === '__manual__') {
                              setModoManualDg(true);
                              return;
                            }
                            const found = matrizes.find((m: any) => m.id === id);
                            setFormData({ ...formData, animal_id: id, brinco_matriz: found?.brinco || '' });
                          }}
                          options={[
                            { label: 'Selecione a vaca da lista de matrizes...', value: '' },
                            ...matrizes.map((m: any) => ({
                              label: `Brinco #${m.brinco} (${m.raca || 'Nelore'} - ${m.status_reprodutivo || 'Sem DG'})`,
                              value: m.id,
                            })),
                            { label: '✏️ Digitar brinco da vaca cadastrada...', value: '__manual__' },
                          ]}
                          noMargin
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setModoManualDg(true)}
                        className="px-3.5 py-2.5 text-xs font-semibold rounded-lg border border-blue-300 dark:border-blue-700 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 flex items-center gap-1.5 whitespace-nowrap shadow-2xs transition-all cursor-pointer"
                        title="Alternar para lançamento manual de vaca"
                      >
                        <PenLine className="w-4 h-4" />
                        <span className="hidden sm:inline">Lançar</span> Manual
                      </button>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 px-1 pt-0.5">
                      <span>{matrizes.length} matrizes cadastradas disponíveis</span>
                      <button
                        type="button"
                        onClick={() => setModoManualDg(true)}
                        className="text-blue-600 dark:text-blue-400 hover:underline font-medium inline-flex items-center gap-1"
                      >
                        <PenLine className="w-3 h-3" />
                        Digitar o brinco da vaca cadastrada
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex gap-2 items-start">
                      <div className="flex-1 min-w-0">
                        <Input
                          id="dg_vaca_select"
                          type="text"
                          list="lista-sugestoes-dg"
                          placeholder="Digite o brinco da vaca cadastrada (Ex: 2045)"
                          value={formData.brinco_matriz || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            const found = matrizes.find((m: any) => isSameSearchText(m.brinco, val));
                            setFormData({
                              ...formData,
                              brinco_matriz: val,
                              animal_id: found?.id || '',
                            });
                          }}
                          required
                          noMargin
                        />
                        <datalist id="lista-sugestoes-dg">
                          {matrizes.map((m: any) => (
                            <option key={m.id} value={m.brinco}>
                              {`Brinco #${m.brinco} - ${m.raca || 'Nelore'} (${m.status_reprodutivo || 'Sem DG'})`}
                            </option>
                          ))}
                        </datalist>
                      </div>
                      <button
                        type="button"
                        onClick={() => setModoManualDg(false)}
                        className="px-3.5 py-2.5 text-xs font-semibold rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 flex items-center gap-1.5 whitespace-nowrap shadow-2xs transition-all cursor-pointer"
                        title="Voltar para a seleção da lista de matrizes"
                      >
                        <List className="w-4 h-4" />
                        <span className="hidden sm:inline">Ver</span> Lista
                      </button>
                    </div>
                    <div className="flex items-center justify-between text-[11px] px-1 pt-0.5">
                      <span className="text-gray-500 dark:text-gray-400">
                        {formData.brinco_matriz && matrizes.some((m: any) => isSameSearchText(m.brinco, formData.brinco_matriz)) ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                            ✓ Vaca cadastrada no rebanho ({matrizes.find((m: any) => isSameSearchText(m.brinco, formData.brinco_matriz))?.raca || 'Nelore'})
                          </span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400 font-medium">
                            ★ Brinco não identificado; cadastre a vaca antes de salvar
                          </span>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => setModoManualDg(false)}
                        className="text-blue-600 dark:text-blue-400 hover:underline font-medium inline-flex items-center gap-1"
                      >
                        <List className="w-3 h-3" />
                        Voltar para seleção em lista
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Diagnóstico Radio: Prenha / Vazia */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Diagnóstico Constatado *
                </label>
                <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-4">
                  <label className={`cursor-pointer p-4 rounded-xl border text-center text-sm font-bold flex flex-col items-center justify-center space-y-1 transition-all ${
                    formData.dg_resultado === 'cheia'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-400'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700'
                  }`}>
                    <input
                      type="radio"
                      name="dg_resultado_group"
                      value="cheia"
                      checked={formData.dg_resultado === 'cheia'}
                      onChange={() => setFormData({ ...formData, dg_resultado: 'cheia' })}
                      className="sr-only"
                    />
                    <CheckCircle2 className="w-6 h-6" />
                    <span>PRENHA (CHEIA)</span>
                    <span className="text-[10px] font-normal opacity-90">Atualiza animal para Gestante + Calcula Parto</span>
                  </label>

                  <label className={`cursor-pointer p-4 rounded-xl border text-center text-sm font-bold flex flex-col items-center justify-center space-y-1 transition-all ${
                    formData.dg_resultado === 'vazia'
                      ? 'bg-red-600 text-white border-red-600 shadow-md ring-2 ring-red-400'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700'
                  }`}>
                    <input
                      type="radio"
                      name="dg_resultado_group"
                      value="vazia"
                      checked={formData.dg_resultado === 'vazia'}
                      onChange={() => setFormData({ ...formData, dg_resultado: 'vazia' })}
                      className="sr-only"
                    />
                    <X className="w-6 h-6" />
                    <span>VAZIA</span>
                    <span className="text-[10px] font-normal opacity-90">Atualiza animal para Vazia / Solteira</span>
                  </label>
                </div>
              </div>

              <div>
                <label htmlFor="dg_obs" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Observações do Diagnóstico
                </label>
                <textarea
                  id="dg_obs"
                  rows={3}
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                  placeholder="Anotações adicionais do toque ou ultrassonografia..."
                />
              </div>
            </div>
          )}
        </fieldset>
      </SlidePanel>
    </>
  );
};
