import React from 'react';
import { SlidePanel } from '../../../components/SlidePanel';
import { Tabs } from '../../../components/Tabs';
import { Select } from '../../../components/Select';
import { Input } from '../../../components/Input';
import { Button } from '../../../components/Button';
import { Badge } from '../../../components/Badge';
import { Plus, Edit, Trash2, Calendar, Scale, TrendingUp, ArrowRight, Info } from 'lucide-react';
import { Pesagem, Animal } from '../../../types/database';

interface PesagemSlidePanelProps {
  slideOpen: boolean;
  setSlideOpen: (val: boolean) => void;
  slideMode: 'create' | 'edit' | 'view';
  setSlideMode: (mode: 'create' | 'edit' | 'view') => void;
  selectedPesagem: Pesagem | null;
  formData: Partial<Pesagem>;
  setFormData: (data: Partial<Pesagem>) => void;
  isSaving: boolean;
  handleSave: (e: React.FormEvent) => void;
  activeTabPanel: 'individual' | 'grupo';
  setActiveTabPanel: (tab: 'individual' | 'grupo') => void;
  grupoRows: { animal_id: string; brinco_animal: string; peso_kg: number }[];
  setGrupoRows: (rows: { animal_id: string; brinco_animal: string; peso_kg: number }[]) => void;
  animais: Animal[];
}

export const PesagemSlidePanel: React.FC<PesagemSlidePanelProps> = ({
  slideOpen, setSlideOpen, slideMode, setSlideMode, selectedPesagem,
  formData, setFormData, isSaving, handleSave, activeTabPanel, setActiveTabPanel,
  grupoRows, setGrupoRows, animais
}) => {
  return (
    <SlidePanel
      isOpen={slideOpen}
      onClose={() => { if (!isSaving) setSlideOpen(false); }}
      title={slideMode === 'create' ? 'Nova Pesagem' : slideMode === 'edit' ? 'Editar Pesagem' : 'Detalhes e Comparativo de Pesagem'}
      subtitle="Acompanhe as duas pesagens, intervalo de dias e ganho diário (GMD)."
      width="lg"
      actions={
        <div className="flex items-center space-x-2">
          {slideMode === 'view' ? (
            <Button variant="primary" icon={Edit} onClick={() => setSlideMode('edit')}>
              Editar Registro
            </Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setSlideOpen(false)} disabled={isSaving} className="min-h-[44px]">
                Cancelar
              </Button>
              <Button variant="primary" onClick={handleSave} loading={isSaving} disabled={isSaving} className="min-h-[44px]">
                {isSaving ? 'Salvando...' : 'Salvar Pesagem'}
              </Button>
            </>
          )}
        </div>
      }
    >
      <fieldset disabled={slideMode === 'view'} className="space-y-6 border-0 p-0 m-0 min-w-0">
        {slideMode === 'view' && selectedPesagem ? (
          <div className="space-y-6">
            {/* Animal Header */}
            <div className="flex items-center space-x-4 bg-emerald-50 dark:bg-emerald-950/40 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/80">
              <div className="w-12 h-12 bg-white dark:bg-emerald-900 rounded-full flex items-center justify-center font-bold text-emerald-700 dark:text-emerald-300 text-lg shadow-sm">
                {selectedPesagem.brinco_animal}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Animal Identificado</p>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-semibold uppercase tracking-wider">
                    {selectedPesagem.tipo_animal || 'Bovino'}
                  </span>
                </div>
                <p className="font-bold text-gray-900 dark:text-white text-base">Brinco: {selectedPesagem.brinco_animal}</p>
                {selectedPesagem.brinco_duplicado && <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">Brinco duplicado legado: este histórico permanece separado pelo animal_id.</p>}
              </div>
            </div>

            {/* Painel de Apresentação das Duas Pesagens na Mesma Tela */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Comparativo das Duas Pesagens
                </h4>
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  {selectedPesagem.dias_intervalo ? `${selectedPesagem.dias_intervalo} dias de intervalo` : 'Registro inicial'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative">
                {/* 1ª Pesagem (Anterior) */}
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200/80 dark:border-gray-700 flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-200/70 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                      1ª Pesagem (Anterior)
                    </span>
                    <Calendar className="w-4 h-4 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Data da 1ª Pesagem</p>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                      {selectedPesagem.data_pesagem_anterior || 'Data inicial (1ª pesagem)'}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-gray-200/60 dark:border-gray-700/60">
                    <p className="text-xs text-gray-400 mb-0.5">Peso Registrado</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      {selectedPesagem.peso_anterior !== undefined ? `${selectedPesagem.peso_anterior} kg` : `${selectedPesagem.peso_kg} kg`}
                    </p>
                  </div>
                </div>

                {/* 2ª Pesagem (Atual) */}
                <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                      2ª Pesagem (Atual)
                    </span>
                    <Scale className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs text-emerald-800/70 dark:text-emerald-300/70 mb-0.5">Data da 2ª Pesagem</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {selectedPesagem.data_pesagem}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-800/60">
                    <p className="text-xs text-emerald-800/70 dark:text-emerald-300/70 mb-0.5">Peso Registrado</p>
                    <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                      {selectedPesagem.peso_kg} kg
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Painel do GMD Resultante das Duas Pesagens */}
            <div className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                    Ganho Médio Diário (GMD) das Duas Pesagens
                  </span>
                </div>
                {selectedPesagem.gmd_calculado !== undefined ? (
                  <Badge variant={selectedPesagem.gmd_calculado > 0.8 ? 'success' : selectedPesagem.gmd_calculado >= 0 ? 'warning' : 'danger'}>
                    {selectedPesagem.gmd_calculado > 0.8 ? 'Excelente (+0.8 kg/d)' : selectedPesagem.gmd_calculado >= 0 ? 'Moderado' : 'Perda de Peso'}
                  </Badge>
                ) : (
                  <Badge variant="neutral">Primeira Pesagem</Badge>
                )}
              </div>

              {selectedPesagem.gmd_calculado !== undefined ? (
                <>
                  <div className="grid grid-cols-3 gap-3 pt-2 text-center">
                    <div className="bg-gray-50 dark:bg-gray-800/60 p-2.5 rounded-lg border border-gray-100 dark:border-gray-700">
                      <p className="text-xs text-gray-400">Ganho de Peso</p>
                      <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {selectedPesagem.ganho_peso_kg !== undefined 
                          ? (selectedPesagem.ganho_peso_kg >= 0 ? `+${selectedPesagem.ganho_peso_kg} kg` : `${selectedPesagem.ganho_peso_kg} kg`)
                          : selectedPesagem.peso_anterior !== undefined 
                            ? `+${(selectedPesagem.peso_kg - selectedPesagem.peso_anterior).toFixed(1)} kg` 
                            : '-'}
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800/60 p-2.5 rounded-lg border border-gray-100 dark:border-gray-700">
                      <p className="text-xs text-gray-400">Intervalo</p>
                      <p className="text-base font-bold text-gray-900 dark:text-gray-100 mt-0.5">
                        {selectedPesagem.dias_intervalo ? `${selectedPesagem.dias_intervalo} dias` : '-'}
                      </p>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                      <p className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold">GMD Real</p>
                      <p className="text-base font-extrabold text-emerald-700 dark:text-emerald-400 mt-0.5">
                        +{selectedPesagem.gmd_calculado} kg/dia
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg text-xs text-gray-600 dark:text-gray-400 flex items-center justify-between">
                    <span className="font-mono">
                      ({selectedPesagem.peso_kg} kg - {selectedPesagem.peso_anterior ?? selectedPesagem.peso_kg} kg) ÷ {selectedPesagem.dias_intervalo || 1} dias
                    </span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      = +{selectedPesagem.gmd_calculado} kg/dia
                    </span>
                  </div>
                </>
              ) : (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 flex items-start space-x-2">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Aguardando intervalo: esta é a primeira pesagem deste animal ou há outra pesagem na mesma data ({selectedPesagem.peso_kg} kg em {selectedPesagem.data_pesagem}). O GMD só será calculado entre pesagens do mesmo animal em datas diferentes.
                  </span>
                </div>
              )}
            </div>

            {/* Observações */}
            {selectedPesagem.observacoes && (
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Observações do Manejo</p>
                <p className="text-sm text-gray-800 dark:text-gray-200 italic">"{selectedPesagem.observacoes}"</p>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-5">
            {slideMode === 'create' && (
              <Tabs
                tabs={[
                  { id: 'individual', label: 'Pesagem Individual' },
                  { id: 'grupo', label: 'Pesagem em Grupo' },
                ]}
                activeTab={activeTabPanel}
                onChange={(t) => setActiveTabPanel(t as 'individual' | 'grupo')}
              />
            )}

            {activeTabPanel === 'individual' ? (
              <div className="space-y-4 pt-2">
                <Select
                  label="Selecione o Animal (Brinco/ID)"
                  id="animal_select"
                  value={formData.animal_id || ''}
                  onChange={(e) => {
                    const selId = e.target.value;
                    const found = animais.find(a => a.id === selId);
                    setFormData({
                      ...formData,
                      animal_id: selId,
                      brinco_animal: found?.brinco || '',
                      tipo_animal: found?.tipo_animal || 'vaca',
                    });
                  }}
                  options={animais.map(a => ({
                    label: `${a.brinco} - ${a.tipo_animal} (${a.raca || 'Nelore'})`,
                    value: a.id,
                  }))}
                />

                <Input
                  label="Data da Pesagem *"
                  id="data_pesagem"
                  type="date"
                  value={formData.data_pesagem || ''}
                  onChange={(e) => setFormData({ ...formData, data_pesagem: e.target.value })}
                  max={new Date().toISOString().split('T')[0]}
                  required
                />

                <Input
                  label="Peso Atual (kg) *"
                  id="peso_kg"
                  type="number"
                  min={0.1}
                  max={5000}
                  step="0.1"
                  value={formData.peso_kg ?? ''}
                  onChange={(e) => setFormData({ ...formData, peso_kg: Number(e.target.value) })}
                  hint="Valores muito fora da faixa usual serão sinalizados, sem bloquear a conferência pecuária."
                  required
                />
              </div>
            ) : (
              /* MODO GRUPO */
              <div className="space-y-4 pt-2">
                <Input
                  label="Data da Pesagem em Grupo *"
                  id="data_grupo"
                  type="date"
                  value={formData.data_pesagem || ''}
                  onChange={(e) => setFormData({ ...formData, data_pesagem: e.target.value })}
                  max={new Date().toISOString().split('T')[0]}
                  required
                />
                
                <p className="text-xs font-bold uppercase text-gray-500">Animais e Pesos</p>
                {grupoRows.map((row, idx) => {
                  const selectedIds = grupoRows.map(r => r.animal_id).filter(id => id && id !== row.animal_id);
                  const animalOptions = animais.map(a => ({
                    label: a.brinco,
                    value: a.id,
                    disabled: selectedIds.includes(a.id)
                  })).sort((a, b) => {
                    if (a.disabled && !b.disabled) return 1;
                    if (!a.disabled && b.disabled) return -1;
                    return a.label.localeCompare(b.label);
                  });

                  return (
                  <div key={idx} className="flex items-center space-x-2">
                    <div className="flex-1">
                      <Select
                        id={`grupo_animal_${idx}`}
                        value={row.animal_id}
                        onChange={(e) => {
                          const id = e.target.value;
                          const found = animais.find(a => a.id === id);
                          const copy = [...grupoRows];
                          copy[idx] = { ...copy[idx], animal_id: id, brinco_animal: found?.brinco || '' };
                          setGrupoRows(copy);
                        }}
                        options={[
                          { label: 'Selecione o animal...', value: '' },
                          ...animalOptions
                        ]}
                        noMargin
                      />
                    </div>
                    <div className="w-24">
                      <Input
                        id={`grupo_peso_${idx}`}
                        type="number"
                        min={0.1}
                        max={5000}
                        step="0.1"
                        placeholder="kg"
                        value={row.peso_kg || ''}
                        onChange={(e) => {
                          const copy = [...grupoRows];
                          copy[idx] = { ...copy[idx], peso_kg: Number(e.target.value) };
                          setGrupoRows(copy);
                        }}
                        noMargin
                      />
                    </div>
                    {grupoRows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const copy = [...grupoRows];
                          copy.splice(idx, 1);
                          setGrupoRows(copy);
                        }}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors mt-0 shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )})}
                
                <Button
                  type="button"
                  variant="secondary"
                  icon={Plus}
                  onClick={() => setGrupoRows([...grupoRows, { animal_id: '', brinco_animal: '', peso_kg: 0 }])}
                  className="w-full justify-center text-xs mt-2"
                >
                  Adicionar animal
                </Button>
              </div>
            )}

            <div className="w-full">
              <label htmlFor="obs_pesagem" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Observações
              </label>
              <textarea
                id="obs_pesagem"
                rows={3}
                value={formData.observacoes || ''}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                maxLength={2000}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-3 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Condições do animal, jejum..."
              />
            </div>
          </form>
        )}
      </fieldset>
    </SlidePanel>
  );
};
