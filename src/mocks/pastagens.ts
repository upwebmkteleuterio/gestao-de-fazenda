import { Pastagem, ServicoPastagem } from '../types/database';

export const mockPastagens: Pastagem[] = [
  {
    id: 'pas-001',
    nome_pasto: 'Pasto Rotacionado 01',
    tipo_capim: 'Brachiaria Brizantha',
    area_ha: 15.5,
    lotacao_maxima: 30,
    data_entrada: '2026-06-01',
    data_saida_prevista: '2026-07-15', // Vencida (Alerta de Saída)
    qtd_animais: 4,
    vacas_count: 1,
    bezerros_count: 2,
    matrizes_count: 1,
    touros_count: 0,
    createdAt: '2026-01-01T10:00:00Z',
  },
  {
    id: 'pas-002',
    nome_pasto: 'Pasto do Reprodutor',
    tipo_capim: 'Panicum Maximum (Mombaça)',
    area_ha: 8.0,
    lotacao_maxima: 10,
    data_entrada: '2026-05-15',
    data_saida_prevista: '2026-08-30',
    qtd_animais: 1,
    vacas_count: 0,
    bezerros_count: 0,
    matrizes_count: 0,
    touros_count: 1,
    createdAt: '2026-01-01T10:00:00Z',
  },
  {
    id: 'pas-003',
    nome_pasto: 'Pasto de Retenção',
    tipo_capim: 'Brachiaria Decumbens',
    area_ha: 12.0,
    lotacao_maxima: 25,
    data_entrada: '2026-06-10',
    data_saida_prevista: '2026-07-20', // Vencida
    qtd_animais: 1,
    vacas_count: 1,
    bezerros_count: 0,
    matrizes_count: 0,
    touros_count: 0,
    createdAt: '2026-01-01T10:00:00Z',
  },
  {
    id: 'pas-004',
    nome_pasto: 'Pasto Manguinho Lote Norte',
    tipo_capim: 'Panicum Maximum (Tanzânia)',
    area_ha: 20.0,
    lotacao_maxima: 2,
    data_entrada: '2026-07-01',
    data_saida_prevista: '2026-08-15',
    qtd_animais: 3, // Excedido (3/2)
    vacas_count: 2,
    bezerros_count: 1,
    matrizes_count: 0,
    touros_count: 0,
    createdAt: '2026-01-01T10:00:00Z',
  },
  {
    id: 'pas-005',
    nome_pasto: 'Pasto da Baixada (Pouso)',
    tipo_capim: 'Capim Vaquero',
    area_ha: 10.0,
    lotacao_maxima: 20,
    data_entrada: '2026-07-10',
    data_saida_prevista: '2026-09-01',
    qtd_animais: 0, // Vazio
    vacas_count: 0,
    bezerros_count: 0,
    matrizes_count: 0,
    touros_count: 0,
    createdAt: '2026-01-01T10:00:00Z',
  }
];

export const mockServicosPastagem: ServicoPastagem[] = [
  {
    id: 'ser-001',
    pasto_id: 'pas-001',
    nome_pasto: 'Pasto Rotacionado 01',
    tipo_servico: 'Adubação',
    data: '2026-05-02',
    responsavel: 'João do Campo',
    observacoes: 'Aplicação de NPK 20-05-20 na entrada das chuvas.',
    createdAt: '2026-05-02T10:00:00Z',
  },
  {
    id: 'ser-002',
    pasto_id: 'pas-002',
    nome_pasto: 'Pasto do Reprodutor',
    tipo_servico: 'Roçagem',
    data: '2026-06-12',
    responsavel: 'Carlos Silva',
    observacoes: 'Roçagem mecânica de invasoras.',
    createdAt: '2026-06-12T10:00:00Z',
  }
];
