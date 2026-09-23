import { Insumo, MovimentacaoInsumo } from '../types/database';

export const mockInsumos: Insumo[] = [
  {
    id: 'ins-001',
    nome_produto: 'Ivermectina 3.15%',
    unidade_medida: 'Frasco',
    categoria: 'medicamento',
    estoque_minimo: 5,
    estoque_atual: 12,
    custo_unitario: 145.00,
    createdAt: '2026-01-01T10:00:00Z',
  },
  {
    id: 'ins-002',
    nome_produto: 'Vacina Aftosa 50 doses',
    unidade_medida: 'Frasco',
    categoria: 'medicamento',
    estoque_minimo: 3,
    estoque_atual: 2, // Alerta: abaixo do estoque mínimo
    custo_unitario: 210.00,
    createdAt: '2026-01-01T10:00:00Z',
  },
  {
    id: 'ins-003',
    nome_produto: 'Sal Mineral Proteinado 30kg',
    unidade_medida: 'Saco',
    categoria: 'suplemento',
    estoque_minimo: 20,
    estoque_atual: 45,
    custo_unitario: 88.50,
    createdAt: '2026-01-01T10:00:00Z',
  },
  {
    id: 'ins-004',
    nome_produto: 'Ração Bezerro Creep Feeding',
    unidade_medida: 'Saco',
    categoria: 'racao',
    estoque_minimo: 10,
    estoque_atual: 28,
    custo_unitario: 115.00,
    createdAt: '2026-01-01T10:00:00Z',
  },
  {
    id: 'ins-005',
    nome_produto: 'Suplemento Mineral Fossa Sepa',
    unidade_medida: 'Kg',
    categoria: 'suplemento',
    estoque_minimo: 100,
    estoque_atual: 80, // Alerta
    custo_unitario: 12.00,
    createdAt: '2026-01-01T10:00:00Z',
  }
];

export const mockMovimentacoesInsumos: MovimentacaoInsumo[] = [
  {
    id: 'mov-001',
    insumo_id: 'ins-001',
    nome_insumo: 'Ivermectina 3.15%',
    tipo: 'entrada',
    quantidade: 10,
    data_movimento: '2026-06-01',
    observacao: 'Compra via distribuidor agro',
    createdAt: '2026-06-01T10:00:00Z',
  },
  {
    id: 'mov-002',
    insumo_id: 'ins-002',
    nome_insumo: 'Vacina Aftosa 50 doses',
    tipo: 'saida',
    quantidade: 4,
    data_movimento: '2026-06-15',
    origem_manejo_id: 'man-001',
    observacao: 'Baixa automática via Manejo Sanitário Lote Matrizes',
    createdAt: '2026-06-15T10:00:00Z',
  }
];
