import { Lote } from '../types/database';
import { mockLotes } from '../mocks/lotes';

export type { Lote };

const STORAGE_KEY = 'farmnexus_lotes_db';

const getStoredData = (): Lote[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockLotes));
    return mockLotes;
  } catch (err) {
    console.error('Erro ao ler localStorage lotes:', err);
    return mockLotes;
  }
};

const setStoredData = (data: Lote[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Erro ao salvar localStorage lotes:', err);
  }
};

export interface CreateLoteDTO {
  nome: string;
  animais_ids: string[];
  pasto_id?: string;
  pasto_nome?: string;
}

const updateAnimaisPasto = (animaisIds: string[], pastoId?: string, pastoNome?: string) => {
  try {
    const raw = localStorage.getItem('farmnexus_animais_db');
    if (raw) {
      const animais = JSON.parse(raw);
      const updated = animais.map((a: any) => {
        if (animaisIds.includes(a.id)) {
          return {
            ...a,
            pasto_id: pastoId,
            pasto_nome: pastoNome,
          };
        }
        return a;
      });
      localStorage.setItem('farmnexus_animais_db', JSON.stringify(updated));
    }
  } catch (err) {
    console.error('Erro ao atualizar pasto dos animais do lote:', err);
  }
};

export const lotesService = {
  getAll: async (filters?: { search?: string; page?: number; limit?: number }): Promise<{data: Lote[], total: number}> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        let list = getStoredData();
        if (filters?.search) {
          const q = filters.search.toLowerCase();
          list = list.filter(l => l.nome.toLowerCase().includes(q));
        }
        const total = list.length;
        if (filters?.page && filters?.limit) {
          const startIndex = (filters.page - 1) * filters.limit;
          list = list.slice(startIndex, startIndex + filters.limit);
        }
        resolve({ data: list, total });
      }, 180);
    });
  },

  getById: async (id: string): Promise<Lote | null> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const list = getStoredData();
        const found = list.find(l => l.id === id) || null;
        resolve(found);
      }, 180);
    });
  },

  create: async (dataOrNome: string | CreateLoteDTO, legacy_animais_ids?: string[]): Promise<Lote> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const list = getStoredData();
        const isObject = typeof dataOrNome === 'object';
        const nome = isObject ? dataOrNome.nome : dataOrNome;
        const animais_ids = isObject ? dataOrNome.animais_ids : (legacy_animais_ids || []);
        const pasto_id = isObject ? dataOrNome.pasto_id : undefined;
        const pasto_nome = isObject ? dataOrNome.pasto_nome : undefined;

        const created: Lote = {
          id: `lote-${Date.now()}`,
          nome,
          data_criacao: new Date().toISOString(),
          animais_ids,
          pasto_id,
          pasto_nome,
        };

        if (pasto_id && animais_ids.length > 0) {
          updateAnimaisPasto(animais_ids, pasto_id, pasto_nome);
        }

        setStoredData([created, ...list]);
        resolve(created);
      }, 180);
    });
  },

  update: async (id: string, updates: Partial<Lote>): Promise<Lote> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const list = getStoredData();
        const index = list.findIndex(l => l.id === id);
        if (index === -1) {
          return reject(new Error('Lote não encontrado'));
        }

        const updated: Lote = {
          ...list[index],
          ...updates,
        };

        list[index] = updated;
        setStoredData(list);

        // Se o pasto foi atualizado, sincronizar todos os animais do lote
        if (updates.pasto_id !== undefined || updates.pasto_nome !== undefined) {
          updateAnimaisPasto(updated.animais_ids, updates.pasto_id, updates.pasto_nome);
        }

        resolve(updated);
      }, 180);
    });
  },

  moverPasto: async (loteId: string, pastoId: string, pastoNome: string): Promise<Lote> => {
    return lotesService.update(loteId, { pasto_id: pastoId, pasto_nome: pastoNome });
  },

  delete: async (id: string): Promise<void> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const list = getStoredData();
        setStoredData(list.filter(l => l.id !== id));
        resolve();
      }, 180);
    });
  }
};
