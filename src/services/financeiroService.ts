import { TransacaoFinanceira } from '../types/database';
import { mockTransacoesFinanceiras } from '../mocks/financeiro';

const STORAGE_KEY = 'farmnexus_financeiro_db';

const getStoredData = (): TransacaoFinanceira[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) return JSON.parse(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockTransacoesFinanceiras));
    return mockTransacoesFinanceiras;
  } catch (err) {
    return mockTransacoesFinanceiras;
  }
};

const setStoredData = (data: TransacaoFinanceira[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Erro ao salvar financeiro:', err);
  }
};

export const financeiroService = {
  getAll: async (filters?: { search?: string; tipo?: string; categoria?: string; status?: string; page?: number; limit?: number }): Promise<{data: TransacaoFinanceira[], total: number}> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        let list = getStoredData();
        if (filters) {
          if (filters.search) {
            const q = filters.search.toLowerCase();
            list = list.filter(t => t.descricao.toLowerCase().includes(q) || t.categoria.toLowerCase().includes(q));
          }
          if (filters.tipo && filters.tipo !== 'all') {
            list = list.filter(t => t.tipo === filters.tipo);
          }
          if (filters.categoria && filters.categoria !== 'all') {
            list = list.filter(t => t.categoria === filters.categoria);
          }
          if (filters.status && filters.status !== 'all') {
            list = list.filter(t => t.status === filters.status);
          }
        }
        
        list.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
        
        const total = list.length;
        if (filters?.page && filters?.limit) {
          const startIndex = (filters.page - 1) * filters.limit;
          list = list.slice(startIndex, startIndex + filters.limit);
        }
        
        resolve({ data: list, total });
      }, 180);
    });
  },

  getById: async (id: string): Promise<TransacaoFinanceira | null> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const list = getStoredData();
        resolve(list.find(t => t.id === id) || null);
      }, 180);
    });
  },

  create: async (item: Omit<TransacaoFinanceira, 'id' | 'createdAt'>): Promise<TransacaoFinanceira> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const list = getStoredData();
        const created: TransacaoFinanceira = {
          ...item,
          id: `fin-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          createdAt: new Date().toISOString(),
        };
        const updated = [created, ...list];
        setStoredData(updated);
        resolve(created);
      }, 180);
    });
  },

  update: async (id: string, updates: Partial<TransacaoFinanceira>): Promise<TransacaoFinanceira> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const list = getStoredData();
        const index = list.findIndex(t => t.id === id);
        if (index === -1) return reject(new Error('Transação não encontrada'));

        const updatedItem = { ...list[index], ...updates };
        list[index] = updatedItem;
        setStoredData(list);
        resolve(updatedItem);
      }, 180);
    });
  },

  delete: async (id: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const list = getStoredData();
        setStoredData(list.filter(t => t.id !== id));
        resolve(true);
      }, 180);
    });
  },

  getResumo: async () => {
    return new Promise<{ receitas: number; despesas: number; saldo: number; pendentes: number }>((resolve) => {
      setTimeout(() => {
        const list = getStoredData();
        let receitas = 0;
        let despesas = 0;
        let pendentes = 0;

        for (const t of list) {
          if (t.status === 'pago') {
            if (t.tipo === 'receita') receitas += t.valor;
            if (t.tipo === 'despesa') despesas += t.valor;
          } else {
            pendentes += t.valor;
          }
        }

        resolve({
          receitas,
          despesas,
          saldo: receitas - despesas,
          pendentes
        });
      }, 180);
    });
  }
};
