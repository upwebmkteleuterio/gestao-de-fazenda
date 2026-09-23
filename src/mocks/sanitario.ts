import { ManejoSanitario } from '../types/database';

export const mockManejosSanitarios: ManejoSanitario[] = [
  {
    id: 'man-001',
    nome_lote: 'Lote de Matrizes Pasto 01',
    data_manejo: '2026-06-15',
    responsavel_tecnico: 'Dr. Roberto Vet',
    tipo_manejo: 'Vacinação',
    observacoes: 'Campanha de vacinação contra febre aftosa e brucelose nas fêmeas.',
    status: 'concluido',
    medicamentos: [
      {
        insumo_id: 'ins-002',
        nome_produto: 'Vacina Aftosa 50 doses',
        dose: '2 ml / animal',
        quantidade_total: 4,
      }
    ],
    animais_ids: ['ani-001', 'ani-002'],
    status_sincronizacao: true,
    createdAt: '2026-06-15T10:00:00Z',
  },
  {
    id: 'man-002',
    nome_lote: 'Lote Bezerros Desmama',
    data_manejo: '2026-07-02',
    responsavel_tecnico: 'Carlos Silva',
    tipo_manejo: 'Vermifugação',
    observacoes: 'Aplicação preventiva de endectocida.',
    status: 'concluido',
    medicamentos: [
      {
        insumo_id: 'ins-001',
        nome_produto: 'Ivermectina 3.15%',
        dose: '1 ml / 50kg',
        quantidade_total: 2,
      }
    ],
    animais_ids: ['ani-004', 'ani-006'],
    status_sincronizacao: true,
    createdAt: '2026-07-02T10:00:00Z',
  }
];
