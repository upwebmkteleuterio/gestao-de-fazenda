import { Pesagem } from '../types/database';
import { mockPesagens } from '../mocks/pesagens';
import { animaisService } from './animaisService';

const STORAGE_KEY = 'farmnexus_pesagens_db';

const getStoredData = (): Pesagem[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) return JSON.parse(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockPesagens));
    return mockPesagens;
  } catch (err) {
    return mockPesagens;
  }
};

const setStoredData = (data: Pesagem[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Erro ao salvar pesagens:', err);
  }
};

// Lógica de cálculo automático do Ganho Médio Diário (GMD) e busca da pesagem anterior
const calcularGMD = (animalId: string, novoPeso: number, dataNova: string, pesagensExistentes: Pesagem[]) => {
  // Ordena por data decrescente
  const pesagensAnteriores = pesagensExistentes
    .filter(p => p.animal_id === animalId && p.data_pesagem < dataNova)
    .sort((a, b) => new Date(b.data_pesagem).getTime() - new Date(a.data_pesagem).getTime());

  if (pesagensAnteriores.length === 0) {
    return { 
      gmd: undefined, 
      diasIntervalo: undefined,
      pesoAnterior: undefined,
      dataAnterior: undefined,
      ganhoPeso: undefined
    };
  }

  const ultimaPesagem = pesagensAnteriores[0];
  const d1 = new Date(ultimaPesagem.data_pesagem);
  const d2 = new Date(dataNova);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  const diasCorridos = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diasCorridos <= 0) {
    return { 
      gmd: undefined, 
      diasIntervalo: undefined,
      pesoAnterior: ultimaPesagem.peso_kg,
      dataAnterior: ultimaPesagem.data_pesagem,
      ganhoPeso: 0
    };
  }

  const ganho = novoPeso - ultimaPesagem.peso_kg;
  const gmd = Number((ganho / diasCorridos).toFixed(2));
  return { 
    gmd, 
    diasIntervalo: diasCorridos,
    pesoAnterior: ultimaPesagem.peso_kg,
    dataAnterior: ultimaPesagem.data_pesagem,
    ganhoPeso: Number(ganho.toFixed(2))
  };
};

// Enriquecer pesagens para garantir que ambas as pesagens (anterior e atual) estejam presentes
const enrichPesagensComComparativo = (list: Pesagem[]): Pesagem[] => {
  return list.map(item => {
    const calc = calcularGMD(item.animal_id, item.peso_kg, item.data_pesagem, list.filter(p => p.id !== item.id));
    return {
      ...item,
      peso_anterior: item.peso_anterior ?? calc.pesoAnterior,
      data_pesagem_anterior: item.data_pesagem_anterior ?? calc.dataAnterior,
      ganho_peso_kg: item.ganho_peso_kg ?? calc.ganhoPeso,
      gmd_calculado: item.gmd_calculado ?? calc.gmd,
      dias_intervalo: item.dias_intervalo ?? calc.diasIntervalo,
    };
  });
};

export const pesagensService = {
  getAll: async (filters?: {
    search?: string;
    tipoAnimal?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: Pesagem[], total: number }> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        let list = enrichPesagensComComparativo(getStoredData());
        if (filters) {
          if (filters.search) {
            const query = filters.search.toLowerCase();
            list = list.filter(p => p.brinco_animal.toLowerCase().includes(query));
          }
          if (filters.tipoAnimal && filters.tipoAnimal !== 'all') {
            list = list.filter(p => p.tipo_animal === filters.tipoAnimal);
          }
          if (filters.startDate) {
            list = list.filter(p => p.data_pesagem >= filters.startDate!);
          }
          if (filters.endDate) {
            list = list.filter(p => p.data_pesagem <= filters.endDate!);
          }
        }
        // Ordena por data mais recente primeiro
        list.sort((a, b) => new Date(b.data_pesagem).getTime() - new Date(a.data_pesagem).getTime());
        
        const total = list.length;
        
        if (filters?.page && filters?.limit) {
          const startIndex = (filters.page - 1) * filters.limit;
          list = list.slice(startIndex, startIndex + filters.limit);
        }
        
        resolve({ data: list, total });
      }, 180);
    });
  },

  getById: async (id: string): Promise<Pesagem | null> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const list = enrichPesagensComComparativo(getStoredData());
        resolve(list.find(p => p.id === id) || null);
      }, 180);
    });
  },

  create: async (item: Omit<Pesagem, 'id' | 'createdAt' | 'status_sincronizacao'>): Promise<Pesagem> => {
    return new Promise((resolve) => {
      setTimeout(async () => {
        const list = getStoredData();
        
        // Calcula GMD e busca pesagem anterior automaticamente
        const calc = calcularGMD(item.animal_id, item.peso_kg, item.data_pesagem, list);

        const created: Pesagem = {
          ...item,
          id: `pes-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          peso_anterior: calc.pesoAnterior,
          data_pesagem_anterior: calc.dataAnterior,
          ganho_peso_kg: calc.ganhoPeso,
          gmd_calculado: calc.gmd,
          dias_intervalo: calc.diasIntervalo,
          status_sincronizacao: false,
          createdAt: new Date().toISOString(),
        };

        const updated = [created, ...list];
        setStoredData(updated);

        // Atualiza peso atual no animal
        await animaisService.updatePesoAtual(item.animal_id, item.peso_kg, item.data_pesagem);

        resolve(created);
      }, 180);
    });
  },

  createGroup: async (pesagens: Omit<Pesagem, 'id' | 'createdAt' | 'status_sincronizacao'>[]): Promise<Pesagem[]> => {
    return new Promise((resolve) => {
      setTimeout(async () => {
        const list = getStoredData();
        const createdList: Pesagem[] = [];

        for (const p of pesagens) {
          const calc = calcularGMD(p.animal_id, p.peso_kg, p.data_pesagem, list);
          const newItem: Pesagem = {
            ...p,
            id: `pes-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            peso_anterior: calc.pesoAnterior,
            data_pesagem_anterior: calc.dataAnterior,
            ganho_peso_kg: calc.ganhoPeso,
            gmd_calculado: calc.gmd,
            dias_intervalo: calc.diasIntervalo,
            status_sincronizacao: false,
            createdAt: new Date().toISOString(),
          };
          createdList.push(newItem);
          await animaisService.updatePesoAtual(p.animal_id, p.peso_kg, p.data_pesagem);
        }

        const updated = [...createdList, ...list];
        setStoredData(updated);
        resolve(createdList);
      }, 180);
    });
  },

  update: async (id: string, updates: Partial<Pesagem>): Promise<Pesagem> => {
    return new Promise((resolve, reject) => {
      setTimeout(async () => {
        const list = getStoredData();
        const index = list.findIndex(p => p.id === id);
        if (index === -1) return reject(new Error('Pesagem não encontrada'));

        const current = list[index];
        const novoPeso = updates.peso_kg ?? current.peso_kg;
        const novaData = updates.data_pesagem ?? current.data_pesagem;

        const calc = calcularGMD(current.animal_id, novoPeso, novaData, list.filter(p => p.id !== id));

        const updatedItem: Pesagem = {
          ...current,
          ...updates,
          peso_anterior: calc.pesoAnterior,
          data_pesagem_anterior: calc.dataAnterior,
          ganho_peso_kg: calc.ganhoPeso,
          gmd_calculado: calc.gmd,
          dias_intervalo: calc.diasIntervalo,
          status_sincronizacao: false,
        };

        list[index] = updatedItem;
        setStoredData(list);

        await animaisService.updatePesoAtual(current.animal_id, novoPeso, novaData);

        resolve(updatedItem);
      }, 180);
    });
  },

  delete: async (id: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const list = getStoredData();
        const filtered = list.filter(p => p.id !== id);
        setStoredData(filtered);
        resolve(true);
      }, 180);
    });
  }
};
