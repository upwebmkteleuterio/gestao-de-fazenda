import React, { useState, useEffect } from 'react';
import { SlidePanel } from '../../../components/SlidePanel';
import { Input } from '../../../components/Input';
import { Select } from '../../../components/Select';
import { Button } from '../../../components/Button';
import { Badge } from '../../../components/Badge';
import { Tabs } from '../../../components/Tabs';
import { 
  HeartHandshake, Edit, Trash2, Calendar, FileText, Activity, Layers, ArrowRight, Save, Plus, ChevronRight, ShieldCheck, Users, Bell,
  ShieldAlert, Syringe, Pill, TestTube, Search, Check, X, Clock, HelpCircle, AlertTriangle, List, PenLine
} from 'lucide-react';
import { Animal, Insumo, ManejoSanitario } from '../../../types/database';

type SanitarioFormData = {
  nome_lote: string;
  tipo_manejo: string;
  data_manejo: string;
  responsavel_tecnico: string;
  status: 'andamento' | 'concluido';
  observacoes: string;
  medicamentos: ManejoSanitario['medicamentos'];
  animais_ids: string[];
  criar_lembrete: boolean;
  data_lembrete: string;
};

type SanitarioSlidePanelProps = {
  slideOpen: boolean;
  setSlideOpen: (open: boolean) => void;
  slideMode: 'create' | 'edit' | 'view';
  setSlideMode: React.Dispatch<React.SetStateAction<'create' | 'edit' | 'view'>>;
  selectedManejo: ManejoSanitario | null;
  formData: SanitarioFormData;
  setFormData: React.Dispatch<React.SetStateAction<SanitarioFormData>>;
  isSaving: boolean;
  isMutating: boolean;
  handleSave: (event?: React.FormEvent) => Promise<void>;
  isOffline: boolean;
  setGroupModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setItemToDelete: React.Dispatch<React.SetStateAction<ManejoSanitario | null>>;
  setModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  currentMedInsumoId: string;
  setCurrentMedInsumoId: React.Dispatch<React.SetStateAction<string>>;
  currentMedDose: string;
  setCurrentMedDose: React.Dispatch<React.SetStateAction<string>>;
  currentMedQtd: number;
  setCurrentMedQtd: React.Dispatch<React.SetStateAction<number>>;
  insumos: Insumo[];
  handleAddMedicamento: () => void;
  handleRemoveMedicamento: (index: number) => void;
  animais: Animal[];
};

const STANDARD_TIPOS_MANEJO = [
  'Vacinação',
  'Vermifugação',
  'Tratamento',
  'Exames',
  'Outro',
];

const SUGESTOES_MANEJO = [
  'Vacinação',
  'Vermifugação',
  'Tratamento',
  'Exames',
  'Castração',
  'Descorna',
  'Casqueamento',
  'Cura de Umbigo',
  'Brincagem / Identificação',
  'Pesagem Sanitária',
  'Banho Carrapaticida',
  'Suplementação Vitamínica / ADE',
  'Outro',
];

export const SanitarioSlidePanel: React.FC<SanitarioSlidePanelProps> = ({
  slideOpen, setSlideOpen, slideMode, setSlideMode, selectedManejo,
  formData, setFormData, isSaving, isMutating, handleSave, isOffline, setGroupModalOpen,
  setItemToDelete, setModalOpen,
  currentMedInsumoId, setCurrentMedInsumoId,
  currentMedDose, setCurrentMedDose,
  currentMedQtd, setCurrentMedQtd, insumos, handleAddMedicamento, handleRemoveMedicamento, animais,
}) => {
  const [modoManualTipo, setModoManualTipo] = useState(() => {
    return Boolean(formData?.tipo_manejo && !STANDARD_TIPOS_MANEJO.includes(formData.tipo_manejo));
  });

  useEffect(() => {
    if (formData?.tipo_manejo && !STANDARD_TIPOS_MANEJO.includes(formData.tipo_manejo)) {
      setModoManualTipo(true);
    }
  }, [formData?.tipo_manejo]);

  return (
  <>
    <SlidePanel
        isOpen={slideOpen}
        onClose={() => { if (!isMutating) setSlideOpen(false); }}
        title={slideMode === 'create' ? 'Novo Manejo Sanitário' : slideMode === 'edit' ? 'Editar Manejo Sanitário' : 'Detalhes do Manejo Sanitário'}
        subtitle="Registrar aplicação de vacinas, vermífugos e tratamentos em lote."
        width="lg"
        actions={
          <div className="flex items-center justify-between w-full">
            {slideMode === 'view' ? (
              <div />
            ) : slideMode === 'edit' && selectedManejo && !isOffline ? (
              <Button
                variant="ghost"
                onClick={() => {
                  setItemToDelete(selectedManejo);
                  setModalOpen(true);
                }}
                className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 min-h-[44px]"
                disabled={isMutating}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Excluir Manejo
              </Button>
            ) : <div />}

            <div className="flex space-x-3">
              {slideMode === 'view' ? (
                !isOffline ? (
                  <Button variant="primary" icon={Edit} onClick={() => setSlideMode('edit')}>
                    Editar Registro
                  </Button>
                ) : <div />
              ) : (
                <>
                  <Button variant="ghost" onClick={() => setSlideOpen(false)} disabled={isMutating} className="min-h-[44px]">
                    Cancelar
                  </Button>
                  <Button variant="primary" onClick={handleSave} loading={isSaving} disabled={isOffline || isMutating} className="min-h-[44px]">
                    {isSaving ? 'Salvando...' : 'Salvar Manejo'}
                  </Button>
                </>
              )}
            </div>
          </div>
        }
      >
        <fieldset disabled={slideMode === 'view' || isOffline || isMutating} className="space-y-6 border-0 p-0 m-0 min-w-0">
          {/* SESSÃO 1: INFORMAÇÕES */}
          <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-4 bg-white dark:bg-gray-900 space-y-4 shadow-sm">
            <div className="flex items-center space-x-2 pb-2 border-b border-gray-100 dark:border-gray-800">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                Sessão 1: Informações do Manejo
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Data do Manejo *"
                id="data_manejo_input"
                type="date"
                value={formData.data_manejo}
                onChange={(e) => setFormData({ ...formData, data_manejo: e.target.value })}
                required
              />

              <Input
                label="Nome do Manejo / Lote *"
                id="nome_lote_input"
                value={formData.nome_lote}
                onChange={(e) => setFormData({ ...formData, nome_lote: e.target.value })}
                placeholder="Ex: Vacinação Aftosa Lote 01"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="tipo_manejo_select" className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Tipo de Manejo *
                  </label>
                  <div className="flex items-center space-x-1 text-xs bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg border border-gray-200 dark:border-gray-700">
                    <button
                      type="button"
                      onClick={() => setModoManualTipo(false)}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center space-x-1 cursor-pointer ${
                        !modoManualTipo
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
                      }`}
                    >
                      <List className="w-3.5 h-3.5" />
                      <span>Lista</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setModoManualTipo(true)}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center space-x-1 cursor-pointer ${
                        modoManualTipo
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
                      }`}
                    >
                      <PenLine className="w-3.5 h-3.5" />
                      <span>Manual</span>
                    </button>
                  </div>
                </div>

                {!modoManualTipo ? (
                  <div className="space-y-1.5">
                    <div className="flex gap-2 items-start">
                      <div className="flex-1 min-w-0">
                        <Select
                          id="tipo_manejo_select"
                          value={STANDARD_TIPOS_MANEJO.includes(formData.tipo_manejo) ? formData.tipo_manejo : '__manual__'}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '__manual__') {
                              setModoManualTipo(true);
                              return;
                            }
                            setFormData({ ...formData, tipo_manejo: val });
                          }}
                          options={[
                            { label: 'Vacinação', value: 'Vacinação' },
                            { label: 'Vermifugação', value: 'Vermifugação' },
                            { label: 'Tratamento', value: 'Tratamento' },
                            { label: 'Exames', value: 'Exames' },
                            { label: 'Outro', value: 'Outro' },
                            { label: '✏️ Digitar outro tipo manualmente...', value: '__manual__' },
                          ]}
                          noMargin
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setModoManualTipo(true)}
                        className="px-3 py-2 text-xs font-semibold rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5 whitespace-nowrap shadow-2xs transition-all cursor-pointer h-[38px]"
                        title="Digitar tipo de manejo manualmente"
                      >
                        <PenLine className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Lançar</span> Manual
                      </button>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 px-1 pt-0.5">
                      <span>Selecione da lista ou digite livremente</span>
                      <button
                        type="button"
                        onClick={() => setModoManualTipo(true)}
                        className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium inline-flex items-center gap-1"
                      >
                        <PenLine className="w-3 h-3" />
                        Digitar manualmente
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex gap-2 items-start">
                      <div className="flex-1 min-w-0">
                        <Input
                          id="tipo_manejo_select"
                          type="text"
                          list="lista-sugestoes-tipo-manejo"
                          placeholder="Ex: Castração, Casqueamento..."
                          value={formData.tipo_manejo || ''}
                          onChange={(e) => setFormData({ ...formData, tipo_manejo: e.target.value })}
                          required
                          noMargin
                        />
                        <datalist id="lista-sugestoes-tipo-manejo">
                          {SUGESTOES_MANEJO.map((s, idx) => (
                            <option key={idx} value={s} />
                          ))}
                        </datalist>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setModoManualTipo(false);
                          if (!STANDARD_TIPOS_MANEJO.includes(formData.tipo_manejo)) {
                            setFormData({ ...formData, tipo_manejo: 'Vacinação' });
                          }
                        }}
                        className="px-3 py-2 text-xs font-semibold rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 flex items-center gap-1.5 whitespace-nowrap shadow-2xs transition-all cursor-pointer h-[38px]"
                        title="Voltar para a seleção da lista padrão"
                      >
                        <List className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Ver</span> Lista
                      </button>
                    </div>
                    <div className="flex items-center justify-between text-[11px] px-1 pt-0.5">
                      <span className="text-gray-500 dark:text-gray-400">
                        {formData.tipo_manejo && !STANDARD_TIPOS_MANEJO.includes(formData.tipo_manejo) ? (
                          <span className="text-amber-600 dark:text-amber-400 font-medium">
                            ✏️ Manejo personalizado: {formData.tipo_manejo}
                          </span>
                        ) : (
                          'Digite qualquer tipo ou escolha das sugestões'
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setModoManualTipo(false);
                          if (!STANDARD_TIPOS_MANEJO.includes(formData.tipo_manejo)) {
                            setFormData({ ...formData, tipo_manejo: 'Vacinação' });
                          }
                        }}
                        className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium inline-flex items-center gap-1"
                      >
                        <List className="w-3 h-3" />
                        Voltar para lista
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <Input
                label="Responsável Técnico (Opcional)"
                id="responsavel_input"
                value={formData.responsavel_tecnico}
                onChange={(e) => setFormData({ ...formData, responsavel_tecnico: e.target.value })}
                placeholder="Ex: Dr. Roberto Veterinário"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Status do Manejo *
              </label>
              <div className="grid grid-cols-2 gap-2 sm:w-1/2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, status: 'andamento' })}
                  className={`p-2.5 rounded-lg border text-xs font-bold transition-all ${
                    formData.status === 'andamento'
                      ? 'bg-amber-500 text-white border-amber-500 shadow'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700'
                  }`}
                >
                  Em Andamento
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, status: 'concluido' })}
                  className={`p-2.5 rounded-lg border text-xs font-bold transition-all ${
                    formData.status === 'concluido'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700'
                  }`}
                >
                  Concluído (Dar Baixa)
                </button>
              </div>
            </div>

            <div className="pt-1">
              <label htmlFor="obs_sanitario" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Observações Gerais
              </label>
              <textarea
                id="obs_sanitario"
                rows={3}
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                placeholder="Anotações adicionais do lote ou do diagnóstico..."
              />
            </div>
          </div>

          {/* SESSÃO 2: MEDICAMENTOS APLICADOS */}
          <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-4 bg-white dark:bg-gray-900 space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center space-x-2">
                <Pill className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                  Sessão 2: Medicamentos Aplicados
                </h3>
              </div>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {formData.medicamentos.length} item(s) no protocolo
              </span>
            </div>

            {/* Form de Adicionar Medicamento */}
            <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-900/40 space-y-3">
              <Select
                label="Nome do Medicamento (Estoque de Insumos)"
                id="select_med_insumo"
                value={currentMedInsumoId}
                onChange={(e) => setCurrentMedInsumoId(e.target.value)}
                options={insumos.map(i => ({
                  label: `${i.nome_produto} (Estoque: ${i.estoque_atual} ${i.unidade_medida}s)`,
                  value: i.id
                }))}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                <Input
                  label="Dose por Animal (ex: 5 ml)"
                  id="dose_med_input"
                  value={currentMedDose}
                  onChange={(e) => setCurrentMedDose(e.target.value)}
                  placeholder="Ex: 5 ml / animal"
                />

                <Input
                  label="Qtd. Total Consumida (Baixa no Estoque)"
                  id="qtd_med_input"
                  type="number"
                  value={currentMedQtd}
                  onChange={(e) => setCurrentMedQtd(Number(e.target.value))}
                />
              </div>

              <Button
                variant="secondary"
                icon={Plus}
                onClick={handleAddMedicamento}
                className="w-full text-xs font-bold"
              >
                Adicionar Medicamento ao Protocolo
              </Button>
            </div>

            {/* Lista em Tela dos Medicamentos Adicionados */}
            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-2">
                Medicamentos Vinculados a este Manejo:
              </label>

              {formData.medicamentos.length === 0 ? (
                <p className="text-xs text-gray-400 italic p-3 text-center border border-dashed border-gray-300 dark:border-gray-800 rounded-lg">
                  Nenhum medicamento adicionado até o momento.
                </p>
              ) : (
                <div className="space-y-2">
                  {formData.medicamentos.map((med, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60"
                    >
                      <div className="flex items-center space-x-3">
                        <Syringe className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <div>
                          <span className="font-bold text-xs text-gray-900 dark:text-white block">
                            {med.nome_produto}
                          </span>
                          <span className="text-[11px] text-gray-500 dark:text-gray-400">
                            Dose: {med.dose} &bull; Total Consumido: {med.quantidade_total}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveMedicamento(index)}
                        className="text-red-500 hover:text-red-700 p-1 rounded-md"
                        title="Remover medicamento"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* SESSÃO 3: GRUPO DE MANEJO */}
          <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-4 bg-white dark:bg-gray-900 space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                  Sessão 3: Grupo de Manejo
                </h3>
              </div>
              <Badge variant="info">
                {formData.animais_ids.length} animais vinculados
              </Badge>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400">
              Vincule animais específicos do rebanho que receberão esta aplicação de vacina/medicação.
            </p>

            <Button
              variant="secondary"
              icon={Users}
              onClick={() => setGroupModalOpen(true)}
              className="w-full text-xs font-bold"
            >
              Criar / Alterar Grupo de Animais ({formData.animais_ids.length} selecionados)
            </Button>
          </div>

          {/* SESSÃO 4: LEMBRETES */}
          <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-4 bg-white dark:bg-gray-900 space-y-4 shadow-sm">
            <div className="flex items-center space-x-2 pb-2 border-b border-gray-100 dark:border-gray-800">
              <Bell className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                Sessão 4: Lembretes Futuros
              </h3>
            </div>

            <div className="space-y-3">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.criar_lembrete}
                  onChange={(e) => setFormData({ ...formData, criar_lembrete: e.target.checked })}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm font-bold text-gray-900 dark:text-white">
                  Criar lembrete para o próximo manejo
                </span>
              </label>

              {formData.criar_lembrete && (
                <div className="pl-7 pt-1 animate-fade-in">
                  <Input
                    label="Data Futura do Próximo Manejo / Reforço *"
                    id="data_lembrete_input"
                    type="date"
                    value={formData.data_lembrete}
                    onChange={(e) => setFormData({ ...formData, data_lembrete: e.target.value })}
                  />
                </div>
              )}
            </div>
          </div>
        </fieldset>
      </SlidePanel>
    </>
  );
};
