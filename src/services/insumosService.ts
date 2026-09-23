import { Insumo, MovimentacaoInsumo } from '../types/database';
import { mockInsumos, mockMovimentacoesInsumos } from '../mocks/insumos';

const STORAGE_KEY_INSUMOS = 'farmnexus_insumos_db';
const STORAGE_KEY_MOV = 'farmnexus_mov_insumos_db';

const getStoredInsumos = (): Insumo[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY_INSUMOS);
    if (data) return JSON.parse(data);
    localStorage.setItem(STORAGE_KEY_INSUMOS, JSON.stringify(mockInsumos));
    return mockInsumos;
  } catch (err) {
    return mockInsumos;
  }
};

const setStoredInsumos = (data: Insumo[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY_INSUMOS, JSON.stringify(data));
  } catch (err) {
    console.error('Erro ao salvar insumos:', err);
  }
};

const getStoredMov = (): MovimentacaoInsumo[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY_MOV);
    if (data) return JSON.parse(data);
    localStorage.setItem(STORAGE_KEY_MOV, JSON.stringify(mockMovimentacoesInsumos));
    return mockMovimentacoesInsumos;
  } catch (err) {
    return mockMovimentacoesInsumos;
  }
};

const setStoredMov = (data: MovimentacaoInsumo[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY_MOV, JSON.stringify(data));
  } catch (err) {
    console.error('Erro ao salvar movimentacoes insumos:', err);
  }
};

export const insumosService = {
  getAll: async (categoria?: string, filters?: { search?: string; estoqueBaixo?: boolean; page?: number; limit?: number }): Promise<{data: Insumo[], total: number}> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        let list = getStoredInsumos();
        if (categoria && categoria !== 'all') {
          list = list.filter(i => i.categoria === categoria);
        }
        if (filters?.search) {
          const q = filters.search.toLowerCase();
          list = list.filter(i => i.nome_produto.toLowerCase().includes(q));
        }
        if (filters?.estoqueBaixo) {
          list = list.filter(i => i.estoque_atual <= i.estoque_minimo);
        }
        
        list.sort((a, b) => a.nome_produto.localeCompare(b.nome_produto));
        
        const total = list.length;
        if (filters?.page && filters?.limit) {
          const startIndex = (filters.page - 1) * filters.limit;
          list = list.slice(startIndex, startIndex + filters.limit);
        }
        resolve({ data: list, total });
      }, 180);
    });
  },

  getById: async (id: string): Promise<Insumo | null> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const list = getStoredInsumos();
        resolve(list.find(i => i.id === id) || null);
      }, 180);
    });
  },

  create: async (item: Omit<Insumo, 'id' | 'createdAt'>): Promise<Insumo> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const list = getStoredInsumos();
        const created: Insumo = {
          ...item,
          id: `ins-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          createdAt: new Date().toISOString(),
        };
        const updated = [created, ...list];
        setStoredInsumos(updated);
        resolve(created);
      }, 180);
    });
  },

  update: async (id: string, updates: Partial<Insumo>): Promise<Insumo> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const list = getStoredInsumos();
        const index = list.findIndex(i => i.id === id);
        if (index === -1) return reject(new Error('Insumo não encontrado'));

        const updatedItem = { ...list[index], ...updates };
        list[index] = updatedItem;
        setStoredInsumos(list);
        resolve(updatedItem);
      }, 180);
    });
  },

  delete: async (id: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const list = getStoredInsumos();
        setStoredInsumos(list.filter(i => i.id !== id));
        
        // Cascata: Remove as movimentacoes atreladas a esse insumo
        try {
          const rawMovs = localStorage.getItem('farmnexus_mov_insumos_db');
          if (rawMovs) {
            const movs = JSON.parse(rawMovs);
            localStorage.setItem('farmnexus_mov_insumos_db', JSON.stringify(movs.filter(m => m.insumo_id !== id)));
          }
        } catch(e) {}
        
        resolve(true);
      }, 180);
    });
  },

  // Simulação do Trigger de Baixa/Entrada Automática
  registrarMovimentacao: async (mov: Omit<MovimentacaoInsumo, 'id' | 'createdAt'>): Promise<MovimentacaoInsumo> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const insumos = getStoredInsumos();
        let insIndex = insumos.findIndex(i => i.id === mov.insumo_id);

        if (insIndex === -1 && mov.nome_insumo) {
          insIndex = insumos.findIndex(i => i.nome_produto.toLowerCase().trim() === mov.nome_insumo.toLowerCase().trim());
        }

        if (insIndex === -1 && mov.insumo_id) {
          // Tenta combinar 'ins-1' com 'ins-001'
          const numStr = mov.insumo_id.replace(/\D/g, '');
          if (numStr) {
            insIndex = insumos.findIndex(i => i.id.includes(numStr));
          }
        }

        if (insIndex !== -1) {
          // Atualiza saldo do estoque existente
          const insumo = insumos[insIndex];
          let novoEstoque = insumo.estoque_atual;
          if (mov.tipo === 'entrada') {
            novoEstoque += mov.quantidade;
          } else {
            novoEstoque = Math.max(0, novoEstoque - mov.quantidade);
          }

          insumos[insIndex].estoque_atual = novoEstoque;
          setStoredInsumos(insumos);
        } else if (mov.nome_insumo) {
          // Se não encontrou insumo anterior, cadastra o insumo no estoque automaticamente
          const createdInsumo: Insumo = {
            id: mov.insumo_id || `ins-${Date.now()}`,
            nome_produto: mov.nome_insumo,
            unidade_medida: 'Unidade',
            categoria: 'medicamento',
            estoque_minimo: 10,
            estoque_atual: mov.tipo === 'entrada' ? mov.quantidade : 0,
            custo_unitario: 0,
            createdAt: new Date().toISOString(),
          };
          setStoredInsumos([createdInsumo, ...insumos]);
        }

        // Registra movimentação
        const movList = getStoredMov();
        const createdMov: MovimentacaoInsumo = {
          ...mov,
          id: `mov-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          createdAt: new Date().toISOString(),
        };

        setStoredMov([createdMov, ...movList]);
        resolve(createdMov);
      }, 180);
    });
  },

  getMovimentacoes: async (insumoId?: string): Promise<MovimentacaoInsumo[]> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        let movs = getStoredMov();
        if (insumoId) {
          movs = movs.filter(m => m.insumo_id === insumoId);
        }
        resolve(movs);
      }, 180);
    });
  }
};
