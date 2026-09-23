import { Pastagem, ServicoPastagem } from '../types/database';
import { mockPastagens, mockServicosPastagem } from '../mocks/pastagens';
import { animaisService } from './animaisService';

const STORAGE_KEY_PASTOS = 'farmnexus_pastagens_db';
const STORAGE_KEY_SERVICOS = 'farmnexus_servicos_pastagens_db';

const getStoredPastos = (): Pastagem[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY_PASTOS);
    if (data) return JSON.parse(data);
    localStorage.setItem(STORAGE_KEY_PASTOS, JSON.stringify(mockPastagens));
    return mockPastagens;
  } catch (err) {
    return mockPastagens;
  }
};

const setStoredPastos = (data: Pastagem[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY_PASTOS, JSON.stringify(data));
  } catch (err) {
    console.error('Erro ao salvar pastagens:', err);
  }
};

const getStoredServicos = (): ServicoPastagem[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY_SERVICOS);
    if (data) return JSON.parse(data);
    localStorage.setItem(STORAGE_KEY_SERVICOS, JSON.stringify(mockServicosPastagem));
    return mockServicosPastagem;
  } catch (err) {
    return mockServicosPastagem;
  }
};

const setStoredServicos = (data: ServicoPastagem[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY_SERVICOS, JSON.stringify(data));
  } catch (err) {
    console.error('Erro ao salvar servicos pastagens:', err);
  }
};

export const pastagensService = {
  getAll: async (filters?: { search?: string; status?: string; page?: number; limit?: number }): Promise<{ data: Pastagem[], total: number }> => {
    return new Promise((resolve) => {
      setTimeout(async () => {
        const pastos = getStoredPastos();
        // Recalcula contagem dinâmica de animais por pastagem
        const res = await animaisService.getAll();
        const animais = res.data;
        
        let pastosComContagem = pastos.map(pasto => {
          const animaisNoPasto = animais.filter(a => a.pasto_id === pasto.id && a.status === 'ativo');
          const autoQtd = animaisNoPasto.length;
          const qtdFinal = (pasto.usar_qtd_manual && typeof pasto.qtd_manual === 'number') 
            ? pasto.qtd_manual 
            : (typeof pasto.qtd_manual === 'number' && pasto.qtd_manual > 0 && autoQtd === 0)
            ? pasto.qtd_manual
            : autoQtd;

          return {
            ...pasto,
            qtd_animais: qtdFinal,
            vacas_count: pasto.vacas_count_manual ?? animaisNoPasto.filter(a => ['vaca', 'novilha'].includes(a.tipo_animal)).length,
            bezerros_count: pasto.bezerros_count_manual ?? animaisNoPasto.filter(a => ['bezerro', 'bezerra'].includes(a.tipo_animal)).length,
            matrizes_count: pasto.matrizes_count_manual ?? animaisNoPasto.filter(a => a.tipo_animal === 'matriz').length,
            touros_count: pasto.touros_count_manual ?? animaisNoPasto.filter(a => ['touro', 'garrote'].includes(a.tipo_animal)).length,
          };
        });

        // Aplicar filtros
        if (filters?.search) {
          const s = filters.search.toLowerCase();
          pastosComContagem = pastosComContagem.filter(p => 
            p.nome_pasto.toLowerCase().includes(s) || 
            p.tipo_capim.toLowerCase().includes(s)
          );
        }

        if (filters?.status && filters.status !== 'todos') {
          pastosComContagem = pastosComContagem.filter(p => {
            if (filters.status === 'vazio') return p.qtd_animais === 0;
            if (filters.status === 'excedido') return p.qtd_animais > p.lotacao_maxima;
            if (filters.status === 'normal') return p.qtd_animais > 0 && p.qtd_animais <= p.lotacao_maxima;
            return true;
          });
        }

        const total = pastosComContagem.length;

        // Paginação
        if (filters?.page && filters?.limit) {
          const start = (filters.page - 1) * filters.limit;
          const end = start + filters.limit;
          pastosComContagem = pastosComContagem.slice(start, end);
        }

        resolve({ data: pastosComContagem, total });
      }, 180);
    });
  },

  getById: async (id: string): Promise<Pastagem | null> => {
    return new Promise((resolve) => {
      setTimeout(async () => {
        const res = await pastagensService.getAll();
        resolve(res.data.find(p => p.id === id) || null);
      }, 180);
    });
  },

  create: async (item: Omit<Pastagem, 'id' | 'createdAt'>): Promise<Pastagem> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const list = getStoredPastos();
        const created: Pastagem = {
          ...item,
          id: `pas-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          qtd_animais: 0,
          createdAt: new Date().toISOString(),
        };
        const updated = [created, ...list];
        setStoredPastos(updated);
        resolve(created);
      }, 180);
    });
  },

  update: async (id: string, updates: Partial<Pastagem>): Promise<Pastagem> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const list = getStoredPastos();
        const index = list.findIndex(p => p.id === id);
        if (index === -1) return reject(new Error('Pasto não encontrado'));

        const updatedItem = { ...list[index], ...updates };
        list[index] = updatedItem;
        setStoredPastos(list);
        resolve(updatedItem);
      }, 180);
    });
  },

  delete: async (id: string): Promise<boolean> => {
    return new Promise(async (resolve) => {
      // Remover pasto_id dos animais que estavam nele
      try {
        const resAnimais = await animaisService.getAll();
        const animaisNoPasto = resAnimais.data.filter(a => a.pasto_id === id);
        for (const animal of animaisNoPasto) {
          await animaisService.update(animal.id, { pasto_id: undefined });
        }
      } catch (e) {
        console.error('Erro ao limpar animais do pasto removido', e);
      }
      
      setTimeout(() => {
        // Remover pasto
        const list = getStoredPastos();
        setStoredPastos(list.filter(p => p.id !== id));
        
        // Cascata: Remover servicos desse pasto
        const servicos = getStoredServicos();
        setStoredServicos(servicos.filter(s => s.pasto_id !== id));
        
        resolve(true);
      }, 180);
    });
  },

  // Serviços de Manejo de Pastagem
  getServicos: async (pastoId?: string): Promise<ServicoPastagem[]> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        let servicos = getStoredServicos();
        if (pastoId) {
          servicos = servicos.filter(s => s.pasto_id === pastoId);
        }
        resolve(servicos);
      }, 180);
    });
  },

  addServico: async (item: Omit<ServicoPastagem, 'id' | 'createdAt'>): Promise<ServicoPastagem> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const list = getStoredServicos();
        const created: ServicoPastagem = {
          ...item,
          id: `ser-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          createdAt: new Date().toISOString(),
        };
        const updated = [created, ...list];
        setStoredServicos(updated);
        resolve(created);
      }, 180);
    });
  }
};
