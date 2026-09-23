import { EventoReproducao } from '../types/database';
import { mockEventosReproducao } from '../mocks/reproducao';

const STORAGE_KEY = 'farmnexus_reproducao_db';

const getStoredData = (): EventoReproducao[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) return JSON.parse(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockEventosReproducao));
    return mockEventosReproducao;
  } catch (err) {
    return mockEventosReproducao;
  }
};

const setStoredData = (data: EventoReproducao[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Erro ao salvar reprodução:', err);
  }
};

// Helper para calcular previsão de parto (+285 dias)
const calcularPrevisaoParto = (dataRef?: string): string => {
  if (!dataRef) return '';
  const date = new Date(dataRef);
  if (isNaN(date.getTime())) return '';
  date.setDate(date.getDate() + 285);
  return date.toISOString().split('T')[0];
};

// Helper para atualizar status reprodutivo da matriz no banco de animais
const syncMatrizStatus = (animalId: string, brinco: string, resultadoDg?: string, tipoProtocolo?: string, touro?: string) => {
  try {
    const raw = localStorage.getItem('farmnexus_animais_db');
    if (!raw) return;
    const animais = JSON.parse(raw);
    const index = animais.findIndex((a: any) => a.id === animalId || a.brinco === brinco);
    if (index !== -1) {
      if (resultadoDg === 'cheia') {
        animais[index].status_reprodutivo = 'Gestante';
      } else if (resultadoDg === 'vazia') {
        animais[index].status_reprodutivo = 'Vazia';
      } else if (tipoProtocolo) {
        animais[index].status_reprodutivo = tipoProtocolo === 'iatf' ? 'Inseminada (IATF)' : tipoProtocolo === 'monta_natural' ? 'Coberta (Monta)' : tipoProtocolo === 'tetf' ? 'Receptora (TETF)' : 'Diagnóstico';
      }
      if (touro) {
        animais[index].touro_cobertura = touro;
      }
      localStorage.setItem('farmnexus_animais_db', JSON.stringify(animais));
    }
  } catch (e) {
    console.error('Erro ao sincronizar status da matriz:', e);
  }
};

export const reproducaoService = {
  getAll: async (filters?: { search?: string; protocolo?: string; resultadoDg?: string; dataInicio?: string; dataFim?: string; page?: number; limit?: number }): Promise<{data: EventoReproducao[], total: number}> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        let list = getStoredData();
        if (filters) {
          if (filters.search) {
            const query = filters.search.toLowerCase();
            list = list.filter(e => e.brinco_matriz.toLowerCase().includes(query) || (e.dados_protocolo?.touro && e.dados_protocolo.touro.toLowerCase().includes(query)));
          }
          if (filters.protocolo && filters.protocolo !== 'all') {
            list = list.filter(e => e.tipo_protocolo === filters.protocolo);
          }
          if (filters.resultadoDg && filters.resultadoDg !== 'all') {
            list = list.filter(e => e.resultado_dg === filters.resultadoDg);
          }
          if (filters.dataInicio) {
            list = list.filter(e => e.data_principal >= filters.dataInicio!);
          }
          if (filters.dataFim) {
            list = list.filter(e => e.data_principal <= filters.dataFim!);
          }
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

  getById: async (id: string): Promise<EventoReproducao | null> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const list = getStoredData();
        resolve(list.find(e => e.id === id) || null);
      }, 180);
    });
  },

  create: async (item: Omit<EventoReproducao, 'id' | 'createdAt' | 'status_sincronizacao'>): Promise<EventoReproducao> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const list = getStoredData();

        // Se DG for prenha (cheia), gerar previsão de parto se não fornecida
        let prevParto = item.previsao_parto;
        if (item.resultado_dg === 'cheia' && !prevParto) {
          prevParto = calcularPrevisaoParto(item.data_principal || item.data_dg);
        }

        const created: EventoReproducao = {
          ...item,
          previsao_parto: prevParto,
          id: `rep-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          status_sincronizacao: false,
          createdAt: new Date().toISOString(),
        };

        const updated = [created, ...list];
        setStoredData(updated);

        // Atualizar matriz
        syncMatrizStatus(item.animal_id, item.brinco_matriz, item.resultado_dg, item.tipo_protocolo, item.dados_protocolo?.touro);

        resolve(created);
      }, 180);
    });
  },

  update: async (id: string, updates: Partial<EventoReproducao>): Promise<EventoReproducao> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const list = getStoredData();
        const index = list.findIndex(e => e.id === id);
        if (index === -1) return reject(new Error('Evento não encontrado'));

        let prevParto = updates.previsao_parto || list[index].previsao_parto;
        const resDg = updates.resultado_dg || list[index].resultado_dg;
        if (resDg === 'cheia' && !prevParto) {
          prevParto = calcularPrevisaoParto(updates.data_principal || list[index].data_principal || updates.data_dg || list[index].data_dg);
        }

        const updatedItem = {
          ...list[index],
          ...updates,
          previsao_parto: prevParto,
          status_sincronizacao: false
        };
        list[index] = updatedItem;
        setStoredData(list);

        // Atualizar matriz
        syncMatrizStatus(
          updatedItem.animal_id,
          updatedItem.brinco_matriz,
          updatedItem.resultado_dg,
          updatedItem.tipo_protocolo,
          updatedItem.dados_protocolo?.touro
        );

        resolve(updatedItem);
      }, 180);
    });
  },

  delete: async (id: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const list = getStoredData();
        const eventToDel = list.find(e => e.id === id);
        const filtered = list.filter(e => e.id !== id);
        setStoredData(filtered);
        
        if (eventToDel) {
          // Achar o último evento da matriz para tentar restaurar o status
          const lastEventos = filtered
            .filter(e => e.animal_id === eventToDel.animal_id)
            .sort((a, b) => new Date(b.data_principal || '').getTime() - new Date(a.data_principal || '').getTime());
            
          if (lastEventos.length > 0) {
            const last = lastEventos[0];
            syncMatrizStatus(last.animal_id, last.brinco_matriz, last.resultado_dg, last.tipo_protocolo, last.dados_protocolo?.touro);
          } else {
            // Se não houver mais eventos, volta para Vazia / Apta
            try {
              const raw = localStorage.getItem('farmnexus_animais_db');
              if (raw) {
                const animais = JSON.parse(raw);
                const index = animais.findIndex((a) => a.id === eventToDel.animal_id);
                if (index !== -1) {
                  animais[index].status_reprodutivo = 'Vazia';
                  animais[index].touro_cobertura = undefined;
                  localStorage.setItem('farmnexus_animais_db', JSON.stringify(animais));
                }
              }
            } catch (e) {}
          }
        }
        
        resolve(true);
      }, 180);
    });
  }
};
