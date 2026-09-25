import React from 'react';
import { SlidePanel } from '../../../components/SlidePanel';
import { Input } from '../../../components/Input';
import { Select } from '../../../components/Select';
import { Button } from '../../../components/Button';
import { Trash2 } from 'lucide-react';
import { Insumo } from '../../../types/database';

type CadastroForm = {
  nome_produto: string;
  categoria: Insumo['categoria'];
  unidade_medida: Insumo['unidade_medida'];
  quantidade_inicial: number;
  estoque_minimo: number;
  custo_unitario: number;
};

type BaixaForm = {
  insumo_id: string;
  quantidade_utilizada: number;
  data: string;
  observacao_motivo: string;
};

type InsumosSlidePanelProps = {
  slideOpen: boolean;
  setSlideOpen: (open: boolean) => void;
  slideMode: 'cadastro' | 'baixa';
  setSlideMode: React.Dispatch<React.SetStateAction<'cadastro' | 'baixa'>>;
  selectedInsumo: Insumo | null;
  formCadastro: CadastroForm;
  setFormCadastro: React.Dispatch<React.SetStateAction<CadastroForm>>;
  handleSaveCadastro: (event?: React.FormEvent) => Promise<void>;
  formBaixa: BaixaForm;
  setFormBaixa: React.Dispatch<React.SetStateAction<BaixaForm>>;
  handleSaveBaixa: (event?: React.FormEvent) => Promise<void>;
  setItemToDelete: React.Dispatch<React.SetStateAction<Insumo | null>>;
  setModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  insumos: Insumo[];
  isMovimentacaoDisabledOffline: boolean;
  isMutating: boolean;
  isSaving: boolean;
};

export const InsumosSlidePanel: React.FC<InsumosSlidePanelProps> = ({
  slideOpen, setSlideOpen, slideMode, selectedInsumo,
  formCadastro, setFormCadastro, handleSaveCadastro,
  formBaixa, setFormBaixa, handleSaveBaixa,
  setItemToDelete, setModalOpen, insumos, isMovimentacaoDisabledOffline,
  isMutating, isSaving,
}) => (
  <SlidePanel
    isOpen={slideOpen}
    onClose={() => { if (!isMutating) setSlideOpen(false); }}
    title={slideMode === 'cadastro' ? (selectedInsumo ? 'Editar Insumo' : 'Cadastro de Insumo') : 'Baixa de Estoque'}
    subtitle={
      slideMode === 'cadastro'
        ? 'Inserção do produto com especificação da categoria, saldo inicial e alerta mínimo.'
        : 'Registrar consumo manual ou de rotina com abatimento em tempo real do saldo.'
    }
    width="md"
    actions={
      <div className="flex items-center justify-between w-full">
        {slideMode === 'cadastro' && selectedInsumo ? (
          <Button
            variant="ghost"
            onClick={() => {
              setItemToDelete(selectedInsumo);
              setModalOpen(true);
            }}
            disabled={isMutating}
            className="text-xs text-red-600 hover:text-red-700 dark:text-red-400"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Excluir
          </Button>
        ) : <div />}

        <div className="flex space-x-3">
          <Button variant="ghost" onClick={() => setSlideOpen(false)} disabled={isMutating}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={slideMode === 'cadastro' ? handleSaveCadastro : handleSaveBaixa}
            loading={isSaving}
            disabled={isMutating || (slideMode === 'baixa' && isMovimentacaoDisabledOffline)}
            title={slideMode === 'baixa' && isMovimentacaoDisabledOffline ? 'Offline: movimentações indisponíveis' : undefined}
          >
            {isSaving ? 'Salvando...' : slideMode === 'cadastro' ? 'Salvar Insumo' : 'Confirmar Baixa'}
          </Button>
        </div>
      </div>
    }
  >
    {slideMode === 'cadastro' ? (
      <form onSubmit={handleSaveCadastro} className="space-y-4">
        <div className="bg-emerald-50/60 dark:bg-emerald-950/30 p-3.5 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
          <h4 className="text-xs font-bold uppercase text-emerald-800 dark:text-emerald-300 mb-1">
            Cadastro de Novo Insumo no Almoxarifado
          </h4>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Defina o alerta de estoque mínimo para receber avisos visuais automáticos quando o saldo estiver baixo.
          </p>
        </div>

        <Input
          label="Nome do Produto *"
          id="cad_nome_produto"
          value={formCadastro.nome_produto}
          onChange={(e) => setFormCadastro({ ...formCadastro, nome_produto: e.target.value })}
          placeholder="Ex: Vacina Aftosa Ouro 50ml, Ração Confinamento..."
          required
        />
        <Select
          label="Categoria *"
          id="cad_categoria"
          value={formCadastro.categoria}
          onChange={(e) => setFormCadastro({ ...formCadastro, categoria: e.target.value as Insumo['categoria'] })}
          options={[
            { label: 'Medicamento / Vacina', value: 'medicamento' },
            { label: 'Suplemento / Sal Mineral', value: 'suplemento' },
            { label: 'Ração / Concentrado', value: 'racao' },
            { label: 'Defensivo / Herbicida', value: 'defensivo' },
            { label: 'Outros', value: 'outros' },
          ]}
        />
        <Select
          label="Unidade de Medida *"
          id="cad_unidade"
          value={formCadastro.unidade_medida}
          onChange={(e) => setFormCadastro({ ...formCadastro, unidade_medida: e.target.value as Insumo['unidade_medida'] })}
          options={[
            { label: 'Frasco', value: 'Frasco' },
            { label: 'Dose', value: 'Dose' },
            { label: 'Saco (30kg / 50kg)', value: 'Saco' },
            { label: 'Kg (Quilograma)', value: 'Kg' },
            { label: 'Litro', value: 'Litro' },
            { label: 'Unidade', value: 'Unidade' },
          ]}
        />
        <Input
          label="Quantidade Inicial em Estoque *"
          id="cad_qtd_inicial"
          type="number"
          value={formCadastro.quantidade_inicial}
          onChange={(e) => setFormCadastro({ ...formCadastro, quantidade_inicial: Number(e.target.value) })}
          placeholder="Ex: 20"
          required
        />
        <div className="p-3 bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-xl space-y-2">
          <Input
            label="Alerta de Estoque Mínimo (Quantidade Limite) *"
            id="cad_estoque_minimo"
            type="number"
            value={formCadastro.estoque_minimo}
            onChange={(e) => setFormCadastro({ ...formCadastro, estoque_minimo: Number(e.target.value) })}
            placeholder="Ex: 5"
            required
          />
          <p className="text-[11px] text-red-600 dark:text-red-400 font-medium">
            Quando o Saldo Atual for menor ou igual a este limite, o sistema emitirá um alerta vermelho na listagem.
          </p>
        </div>
        <Input
          label="Custo Unitário Estimado (R$)"
          id="cad_custo_unit"
          type="number"
          step="0.01"
          value={formCadastro.custo_unitario}
          onChange={(e) => setFormCadastro({ ...formCadastro, custo_unitario: Number(e.target.value) })}
          placeholder="Ex: 120.00"
        />
      </form>
    ) : (
      <form onSubmit={handleSaveBaixa} className="space-y-4">
        <div className="bg-amber-50/60 dark:bg-amber-950/30 p-3.5 rounded-xl border border-amber-100 dark:border-amber-900/40">
          <h4 className="text-xs font-bold uppercase text-amber-800 dark:text-amber-300 mb-1">
            Lançamento Manual de Baixa de Estoque
          </h4>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            A baixa de estoque reduz imediatamente o saldo do produto selecionado.
          </p>
        </div>
        <Select
          label="Produto *"
          id="baixa_produto_select"
          value={formBaixa.insumo_id}
          onChange={(e) => setFormBaixa({ ...formBaixa, insumo_id: e.target.value })}
          options={insumos.map((i) => ({
            label: `${i.nome_produto} (Saldo: ${i.estoque_atual} ${i.unidade_medida}s)`,
            value: i.id,
          }))}
        />
        <Input
          label="Quantidade Utilizada *"
          id="baixa_qtd_utilizada"
          type="number"
          value={formBaixa.quantidade_utilizada}
          onChange={(e) => setFormBaixa({ ...formBaixa, quantidade_utilizada: Number(e.target.value) })}
          placeholder="Ex: 2"
          required
        />
        <Input
          label="Data da Baixa *"
          id="baixa_data"
          type="date"
          value={formBaixa.data}
          onChange={(e) => setFormBaixa({ ...formBaixa, data: e.target.value })}
          required
        />
        <div>
          <label htmlFor="baixa_obs" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Observação / Motivo
          </label>
          <textarea
            id="baixa_obs"
            rows={3}
            value={formBaixa.observacao_motivo}
            onChange={(e) => setFormBaixa({ ...formBaixa, observacao_motivo: e.target.value })}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
            placeholder="Ex: Aplicação de vermífugo em bezerrada, validade vencida, avaria..."
          />
        </div>
      </form>
    )}
  </SlidePanel>
);

export type { CadastroForm, BaixaForm };
