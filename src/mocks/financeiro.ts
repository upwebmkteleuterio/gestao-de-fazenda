import { TransacaoFinanceira } from '../types/database';

export const mockTransacoesFinanceiras: TransacaoFinanceira[] = [
  {
    id: 'fin-001',
    tipo: 'receita',
    categoria: 'venda_gado',
    descricao: 'Venda de 5 garrotes Nelore para recria',
    valor: 18500.00,
    data: '2026-07-05',
    status: 'pago',
    createdAt: '2026-07-05T10:00:00Z',
  },
  {
    id: 'fin-002',
    tipo: 'despesa',
    categoria: 'compra_insumo',
    descricao: 'Aquisição de Sal Proteinado e Vacinas (NFe 1842)',
    valor: 3450.00,
    data: '2026-07-02',
    status: 'pago',
    createdAt: '2026-07-02T10:00:00Z',
  },
  {
    id: 'fin-003',
    tipo: 'despesa',
    categoria: 'manutencao',
    descricao: 'Manutenção da Cerca Pasto Rotacionado 01',
    valor: 1200.00,
    data: '2026-06-25',
    status: 'pago',
    createdAt: '2026-06-25T10:00:00Z',
  },
  {
    id: 'fin-004',
    tipo: 'receita',
    categoria: 'venda_leite',
    descricao: 'Laticínio Boa Vista - Produção de Junho',
    valor: 9200.00,
    data: '2026-07-01',
    status: 'pago',
    createdAt: '2026-07-01T10:00:00Z',
  },
  {
    id: 'fin-005',
    tipo: 'despesa',
    categoria: 'veterinario',
    descricao: 'Honorários Veterinário e Ultrassom IATF',
    valor: 2500.00,
    data: '2026-07-15',
    status: 'pendente',
    createdAt: '2026-07-15T10:00:00Z',
  }
];
