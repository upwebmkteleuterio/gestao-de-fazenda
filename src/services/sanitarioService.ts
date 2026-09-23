import { ManejoSanitario } from '../types/database';
import { mockManejosSanitarios } from '../mocks/sanitario';
import { insumosService } from './insumosService';

const STORAGE_KEY = 'farmnexus_sanitario_db';

const getStoredData = (): ManejoSanitario[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) return JSON.parse(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockManejosSanitarios));
    return mockManejosSanitarios;
  } catch (err) {
    return mockManejosSanitarios;
  }
};

const setStoredData = (data: ManejoSanitario[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Erro ao salvar manejo sanitario:', err);
  }
};

export const sanitarioService = {
  getAll: async (filters?: { search?: string; tipo?: string; status?: string; page?: number; limit?: number }): Promise<{data: ManejoSanitario[], total: number}> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        let list = getStoredData();
        if (filters) {
          if (filters.search) {
            const query = filters.search.toLowerCase();
            list = list.filter(m => m.nome_lote.toLowerCase().includes(query) || m.responsavel_tecnico.toLowerCase().includes(query));
          }
          if (filters.tipo && filters.tipo !== 'all') {
            list = list.filter(m => m.tipo_manejo === filters.tipo);
          }
          if (filters.status && filters.status !== 'all') {
            list = list.filter(m => m.status === filters.status);
          }
        }
        
        list.sort((a, b) => new Date(b.data_manejo).getTime() - new Date(a.data_manejo).getTime());
        
        const total = list.length;
        if (filters?.page && filters?.limit) {
          const startIndex = (filters.page - 1) * filters.limit;
          list = list.slice(startIndex, startIndex + filters.limit);
        }
        
        resolve({ data: list, total });
      }, 180);
    });
  },

  getStats: async (): Promise<{ andamento: number; concluido: number }> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const list = getStoredData();
        const andamento = list.filter(m => m.status === 'andamento').length;
        const concluido = list.filter(m => m.status === 'concluido').length;
        resolve({ andamento, concluido });
      }, 100);
    });
  },

  getById: async (id: string): Promise<ManejoSanitario | null> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const list = getStoredData();
        resolve(list.find(m => m.id === id) || null);
      }, 180);
    });
  },

  create: async (item: Omit<ManejoSanitario, 'id' | 'createdAt' | 'status_sincronizacao'>): Promise<ManejoSanitario> => {
    return new Promise((resolve) => {
      setTimeout(async () => {
        const list = getStoredData();
        const createdId = `man-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        const created: ManejoSanitario = {
          ...item,
          id: createdId,
          status_sincronizacao: false,
          createdAt: new Date().toISOString(),
        };

        // Se o manejo já for criado como 'concluido', dispara a baixa de estoque automática
        if (created.status === 'concluido' && created.medicamentos.length > 0) {
          for (const med of created.medicamentos) {
            if (med.insumo_id && med.quantidade_total > 0) {
              await insumosService.registrarMovimentacao({
                insumo_id: med.insumo_id,
                nome_insumo: med.nome_produto,
                tipo: 'saida',
                quantidade: med.quantidade_total,
                data_movimento: created.data_manejo,
                origem_manejo_id: createdId,
                observacao: `Baixa automática via Manejo Sanitário ${created.nome_lote}`,
              });
            }
          }
        }

        const updated = [created, ...list];
        setStoredData(updated);
        resolve(created);
      }, 180);
    });
  },

  update: async (id: string, updates: Partial<ManejoSanitario>): Promise<ManejoSanitario> => {
    return new Promise((resolve, reject) => {
      setTimeout(async () => {
        const list = getStoredData();
        const index = list.findIndex(m => m.id === id);
        if (index === -1) return reject(new Error('Manejo não encontrado'));

        const previous = list[index];
        const updatedItem = { ...previous, ...updates, status_sincronizacao: false };

        // Se alterou de 'andamento' para 'concluido', dispara baixa automática de estoque
        if (previous.status !== 'concluido' && updatedItem.status === 'concluido' && updatedItem.medicamentos.length > 0) {
          for (const med of updatedItem.medicamentos) {
            if (med.insumo_id && med.quantidade_total > 0) {
              await insumosService.registrarMovimentacao({
                insumo_id: med.insumo_id,
                nome_insumo: med.nome_produto,
                tipo: 'saida',
                quantidade: med.quantidade_total,
                data_movimento: updatedItem.data_manejo,
                origem_manejo_id: id,
                observacao: `Baixa automática via Conclusão do Manejo Sanitário ${updatedItem.nome_lote}`,
              });
            }
          }
        } 
        // Se alterou de 'concluido' para 'andamento', reverte a baixa (rollback)
        else if (previous.status === 'concluido' && updatedItem.status !== 'concluido') {
          try {
            const rawMovs = localStorage.getItem('farmnexus_mov_insumos_db');
            if (rawMovs) {
              let movs = JSON.parse(rawMovs);
              const movsToDelete = movs.filter((mov: any) => mov.origem_manejo_id === id);
              
              const rawInsumos = localStorage.getItem('farmnexus_insumos_db');
              if (rawInsumos) {
                let insumos = JSON.parse(rawInsumos);
                // Rollback estoque
                for (const mDel of movsToDelete) {
                  const idx = insumos.findIndex((ins: any) => ins.id === mDel.insumo_id);
                  if (idx !== -1 && mDel.tipo === 'saida') {
                    insumos[idx].estoque_atual += mDel.quantidade;
                  }
                }
                localStorage.setItem('farmnexus_insumos_db', JSON.stringify(insumos));
              }
              
              // Remove as movimentações geradas por este manejo
              movs = movs.filter((mov: any) => mov.origem_manejo_id !== id);
              localStorage.setItem('farmnexus_mov_insumos_db', JSON.stringify(movs));
            }
          } catch(e) {
            console.error('Erro ao reverter movimentacoes', e);
          }
        }

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
        const manejoToDel = list.find(m => m.id === id);
        setStoredData(list.filter(m => m.id !== id));
        
        if (manejoToDel && manejoToDel.status === 'concluido' && manejoToDel.medicamentos.length > 0) {
          try {
            const rawMovs = localStorage.getItem('farmnexus_mov_insumos_db');
            if (rawMovs) {
              let movs = JSON.parse(rawMovs);
              const movsToDelete = movs.filter(mov => mov.origem_manejo_id === id);
              
              const rawInsumos = localStorage.getItem('farmnexus_insumos_db');
              if (rawInsumos) {
                let insumos = JSON.parse(rawInsumos);
                // Rollback estoque
                for (const mDel of movsToDelete) {
                  const idx = insumos.findIndex(ins => ins.id === mDel.insumo_id);
                  if (idx !== -1 && mDel.tipo === 'saida') {
                    insumos[idx].estoque_atual += mDel.quantidade;
                  }
                }
                localStorage.setItem('farmnexus_insumos_db', JSON.stringify(insumos));
              }
              
              // Remove as movimentações geradas por este manejo
              movs = movs.filter(mov => mov.origem_manejo_id !== id);
              localStorage.setItem('farmnexus_mov_insumos_db', JSON.stringify(movs));
            }
          } catch(e) {
            console.error('Erro ao reverter movimentacoes do manejo sanitario', e);
          }
        }
        
        resolve(true);
      }, 180);
    });
  }
};
