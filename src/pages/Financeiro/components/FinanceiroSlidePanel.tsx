import React from 'react';
import { SlidePanel } from '../../../components/SlidePanel';
import { Input } from '../../../components/Input';
import { Select } from '../../../components/Select';
import { Button } from '../../../components/Button';

export const FinanceiroSlidePanel = ({
  slideOpen, setSlideOpen, selectedTransacao, formData, setFormData, handleSave, isSaving
}: any) => (
  <SlidePanel
    isOpen={slideOpen}
    onClose={() => setSlideOpen(false)}
    title="Lançamento Financeiro"
    actions={
      <>
        <Button variant="ghost" onClick={() => setSlideOpen(false)} className="min-h-[44px]">Cancelar</Button>
        <Button variant="primary" onClick={handleSave} disabled={isSaving} className="min-h-[44px]">
          {isSaving ? 'Salvando...' : 'Salvar Lançamento'}
        </Button>
      </>
    }
  >
    <form onSubmit={handleSave} className="space-y-4">
      <Input
        label="Descrição do Lançamento *"
        id="descricao"
        value={formData.descricao || ''}
        onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
        placeholder="Ex: Venda de 10 garrotes desmama"
        required
      />
      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Tipo de Operação *"
          id="tipo"
          value={formData.tipo || 'receita'}
          onChange={(e) => setFormData({ ...formData, tipo: e.target.value as any })}
          options={[
            { label: 'Receita (Entrada)', value: 'receita' },
            { label: 'Despesa (Saída)', value: 'despesa' },
          ]}
        />
        <Input
          label="Valor Total (R$) *"
          id="valor"
          type="number"
          step="0.01"
          value={formData.valor || ''}
          onChange={(e) => setFormData({ ...formData, valor: Number(e.target.value) })}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Data da Transação"
          id="data"
          type="date"
          value={formData.data || ''}
          onChange={(e) => setFormData({ ...formData, data: e.target.value })}
        />
        <Select
          label="Status do Pagamento"
          id="status"
          value={formData.status || 'pago'}
          onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
          options={[
            { label: 'Pago / Recebido', value: 'pago' },
            { label: 'Pendente', value: 'pendente' },
          ]}
        />
      </div>
    </form>
  </SlidePanel>
);
