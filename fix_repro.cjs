const fs = require('fs');

const path = 'src/services/reproducaoService.ts';
let code = fs.readFileSync(path, 'utf8');

const oldGetAll = `  getAll: async (filters?: { search?: string; protocolo?: string; resultadoDg?: string; dataInicio?: string; dataFim?: string }): Promise<EventoReproducao[]> => {
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
        resolve(list);
      }, 180);
    });
  },`;

const newGetAll = `  getAll: async (filters?: { search?: string; protocolo?: string; resultadoDg?: string; dataInicio?: string; dataFim?: string; page?: number; limit?: number }): Promise<{data: EventoReproducao[], total: number}> => {
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
  },`;

code = code.replace(oldGetAll, newGetAll);
fs.writeFileSync(path, code);
