import React from 'react';
import { SlidePanel } from '../../../components/SlidePanel';
import { Input } from '../../../components/Input';
import { Select } from '../../../components/Select';
import { Button } from '../../../components/Button';
import type { TransacaoFinanceira } from '../../../types/database';

type FinanceiroFormData = Partial<TransacaoFinanceira>;
type FinanceiroSlidePanelProps = {
  slideOpen: boolean;
  setSlideOpen: React.Dispatch<React.SetStateAction<boolean>>;
  selectedTransacao: TransacaoFinanceira | null;
  formData: FinanceiroFormData;
  setFormData: React.Dispatch<React.SetStateAction<FinanceiroFormData>>;
  handleSave: (event: React.FormEvent<HTMLFormElement>) => void | Promise<void>;
  isSaving: boolean;
};

export const FinanceiroSlidePanel: React.FC<FinanceiroSlidePanelProps> = ({
  slideOpen, setSlideOpen, formData, setFormData, handleSave, isSaving,
}) => {
  const close = () => {
    if (!isSaving) setSlideOpen(false);
  };

  return (
    <SlidePanel
      isOpen={slideOpen}
      onClose={close}
      title="Lançamento Financeiro"
      actions={
        <>
          <Button variant="ghost" onClick={close} disabled={isSaving} className="min-h-[44px]">Cancelar</Button>
          <Button variant="primary" onClick={() => void handleSave({ preventDefault: () => undefined } as React.FormEvent<HTMLFormElement>)} disabled={isSaving} className="min-h-[44px]">
            {isSaving ? 'Salvando...' : 'Salvar Lançamento'}
          </Button>
        </>
      }
    >
      <form onSubmit={(event) => void handleSave(event)} className="space-y-4">
        <Input
          label="Descrição do Lançamento *"
          id="descricao"
          value={formData.descricao ?? ''}
          maxLength={200}
          onChange={(event) => setFormData((current) => ({ ...current, descricao: event.target.value }))}
          placeholder="Ex: Venda de 10 garrotes desmama"
          required
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Tipo de Operação *"
            id="tipo"
            value={formData.tipo ?? 'receita'}
            onChange={(event) => setFormData((current) => ({ ...current, tipo: event.target.value as TransacaoFinanceira['tipo'] }))}
            options={[
              { label: 'Receita (Entrada)', value: 'receita' },
              { label: 'Despesa (Saída)', value: 'despesa' },
            ]}
          />
          <Select
            label="Categoria *"
            id="categoria"
            value={formData.categoria ?? 'outros'}
            onChange={(event) => setFormData((current) => ({ ...current, categoria: event.target.value as TransacaoFinanceira['categoria'] }))}
            options={[
              { label: 'Venda de Gado', value: 'venda_gado' },
              { label: 'Venda de Leite', value: 'venda_leite' },
              { label: 'Compra de Insumos', value: 'compra_insumo' },
              { label: 'Manutenção', value: 'manutencao' },
              { label: 'Veterinário', value: 'veterinario' },
              { label: 'Salários', value: 'salarios' },
              { label: 'Outros', value: 'outros' },
            ]}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Valor Total (R$) *"
            id="valor"
            type="number"
            min="0"
            max="1000000000000"
            step="0.01"
            value={formData.valor ?? ''}
            onChange={(event) => setFormData((current) => ({ ...current, valor: event.target.value === '' ? undefined : Number(event.target.value) }))}
            required
          />
          <Input
            label="Data da Transação *"
            id="data"
            type="date"
            value={formData.data ?? ''}
            onChange={(event) => setFormData((current) => ({ ...current, data: event.target.value }))}
            required
          />
        </div>
        <Select
          label="Status do Pagamento *"
          id="status"
          value={formData.status ?? 'pago'}
          onChange={(event) => setFormData((current) => ({ ...current, status: event.target.value as TransacaoFinanceira['status'] }))}
          options={[
            { label: 'Pago / Recebido', value: 'pago' },
            { label: 'Pendente', value: 'pendente' },
          ]}
        />
      </form>
    </SlidePanel>
  );
};

export default FinanceiroSlidePanel;
