import { Animal } from '../types/database';
import { mockAnimais } from '../mocks/animais';

const STORAGE_KEY = 'farmnexus_animais_db';

const getStoredData = (): Animal[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockAnimais));
    return mockAnimais;
  } catch (err) {
    console.error('Erro ao ler localStorage animais:', err);
    return mockAnimais;
  }
};

const setStoredData = (data: Animal[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Erro ao salvar localStorage animais:', err);
  }
};

export const animaisService = {
  getAll: async (filters?: {
    search?: string;
    sexo?: string;
    status?: string;
    categoria?: string;
    tipo?: string;
    pasto_id?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: Animal[]; total: number }> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        let list = getStoredData();
        if (filters) {
          if (filters.search) {
            const query = filters.search.toLowerCase();
            list = list.filter(a => 
              a.brinco.toLowerCase().includes(query) || 
              (a.raca && a.raca.toLowerCase().includes(query)) ||
              (a.cdc && a.cdc.toLowerCase().includes(query)) ||
              (a.cdn && a.cdn.toLowerCase().includes(query))
            );
          }
          if (filters.sexo && filters.sexo !== 'all') {
            list = list.filter(a => a.sexo === filters.sexo);
          }
          if (filters.status && filters.status !== 'all') {
            list = list.filter(a => a.status === filters.status);
          }
          if (filters.categoria && filters.categoria !== 'all') {
            list = list.filter(a => a.categoria === filters.categoria);
          }
          if (filters.tipo && filters.tipo !== 'all') {
            list = list.filter(a => a.tipo_animal === filters.tipo);
          }
          if (filters.pasto_id && filters.pasto_id !== 'all') {
            list = list.filter(a => a.pasto_id === filters.pasto_id);
          }
        }
        
        const total = list.length;
        if (filters && filters.page && filters.limit) {
          const start = (filters.page - 1) * filters.limit;
          const end = start + filters.limit;
          list = list.slice(start, end);
        }

        resolve({ data: list, total });
      }, 180);
    });
  },

  getById: async (id: string): Promise<Animal | null> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const list = getStoredData();
        const found = list.find(a => a.id === id) || null;
        resolve(found);
      }, 180);
    });
  },

  create: async (newAnimal: Omit<Animal, 'id' | 'createdAt' | 'status_sincronizacao'>): Promise<Animal> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const list = getStoredData();

        // Se status for descarte, calcular qtd de descartes para este mesmo brinco
        let qtdDescartes = newAnimal.qtd_descartes_brinco || 0;
        if (newAnimal.status === 'descarte') {
          const descartesAnteriores = list.filter(a => a.brinco === newAnimal.brinco && a.status === 'descarte').length;
          qtdDescartes = descartesAnteriores + 1;
        }

        const created: Animal = {
          ...newAnimal,
          id: `ani-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          qtd_descartes_brinco: qtdDescartes,
          status_sincronizacao: false, // Entra local, sync futuro
          createdAt: new Date().toISOString(),
        };

        const updated = [created, ...list];
        setStoredData(updated);
        resolve(created);
      }, 180);
    });
  },

  update: async (id: string, updates: Partial<Animal>): Promise<Animal> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const list = getStoredData();
        const index = list.findIndex(a => a.id === id);
        if (index === -1) {
          return reject(new Error('Animal não encontrado'));
        }

        let qtdDescartes = list[index].qtd_descartes_brinco || 0;
        if (updates.status === 'descarte' && list[index].status !== 'descarte') {
          const brincoTarget = updates.brinco || list[index].brinco;
          const descartesAnteriores = list.filter(a => a.brinco === brincoTarget && a.status === 'descarte').length;
          qtdDescartes = descartesAnteriores + 1;
        }

        const updatedItem: Animal = {
          ...list[index],
          ...updates,
          qtd_descartes_brinco: qtdDescartes,
          status_sincronizacao: false,
        };

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
        const filtered = list.filter(a => a.id !== id);
        setStoredData(filtered);
        
        // Cascata: Excluir pesagens deste animal
        try {
          const pesagens = JSON.parse(localStorage.getItem('farmnexus_pesagens_db') || '[]');
          localStorage.setItem('farmnexus_pesagens_db', JSON.stringify(pesagens.filter((p) => p.animal_id !== id)));
        } catch(e) {}
        
        // Cascata: Excluir eventos reprodutivos deste animal
        try {
          const repro = JSON.parse(localStorage.getItem('farmnexus_reproducao_db') || '[]');
          localStorage.setItem('farmnexus_reproducao_db', JSON.stringify(repro.filter((r) => r.animal_id !== id)));
        } catch(e) {}

        // Cascata: Remover animal dos manejos sanitários
        try {
          const sanitarios = JSON.parse(localStorage.getItem('farmnexus_sanitario_db') || '[]');
          const newSanitarios = sanitarios.map(m => {
            return {
              ...m,
              animais_ids: m.animais_ids ? m.animais_ids.filter(aId => aId !== id) : []
            };
          });
          localStorage.setItem('farmnexus_sanitario_db', JSON.stringify(newSanitarios));
        } catch(e) {}

        resolve(true);
      }, 180);
    });
  },

  // Helper para atualizar peso após pesagem
  updatePesoAtual: async (animalId: string, peso: number, dataPesagem: string): Promise<void> => {
    const list = getStoredData();
    const index = list.findIndex(a => a.id === animalId);
    if (index !== -1) {
      list[index].peso_atual = peso;
      list[index].data_pesagem_atual = dataPesagem;
      setStoredData(list);
    }
  }
};
