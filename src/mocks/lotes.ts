import { Lote } from '../types/database';

export const mockLotes: Lote[] = [
  {
    id: 'lote-001',
    nome: 'Lote Nelore Desmame 2026',
    data_criacao: '2026-03-01T08:00:00.000Z',
    animais_ids: ['ani-001', 'ani-002'],
    pasto_id: 'pas-001',
    pasto_nome: 'Pasto Rotacionado 01',
  },
  {
    id: 'lote-002',
    nome: 'Lote Vacinação Piquete 1',
    data_criacao: '2026-04-15T09:30:00.000Z',
    animais_ids: ['ani-003', 'ani-004'],
    pasto_id: 'pas-002',
    pasto_nome: 'Pasto do Reprodutor',
  },
];
