const fs = require('fs');

// 1. Patch Service
const svcPath = 'src/services/reproducaoService.ts';
let svcCode = fs.readFileSync(svcPath, 'utf8');

const oldGetAll = `  getAll: async (filters?: { search?: string; protocolo?: string; startDate?: string; endDate?: string }): Promise<EventoReproducao[]> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        let list = getStoredData();
        if (filters) {
          if (filters.search) {
            const query = filters.search.toLowerCase();
            list = list.filter(e => e.brinco_matriz.toLowerCase().includes(query));
          }
          if (filters.protocolo && filters.protocolo !== 'all') {
            list = list.filter(e => e.tipo_protocolo === filters.protocolo);
          }
          if (filters.startDate) {
            list = list.filter(e => e.data_principal >= filters.startDate!);
          }
          if (filters.endDate) {
            list = list.filter(e => e.data_principal <= filters.endDate!);
          }
        }
        // Ordena por data decrescente
        list.sort((a, b) => new Date(b.data_principal || '').getTime() - new Date(a.data_principal || '').getTime());
        resolve(list);
      }, 180);
    });
  },`;

const newGetAll = `  getAll: async (filters?: { search?: string; protocolo?: string; startDate?: string; endDate?: string; page?: number; limit?: number }): Promise<{data: EventoReproducao[], total: number}> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        let list = getStoredData();
        if (filters) {
          if (filters.search) {
            const query = filters.search.toLowerCase();
            list = list.filter(e => e.brinco_matriz.toLowerCase().includes(query));
          }
          if (filters.protocolo && filters.protocolo !== 'all') {
            list = list.filter(e => e.tipo_protocolo === filters.protocolo);
          }
          if (filters.startDate) {
            list = list.filter(e => e.data_principal >= filters.startDate!);
          }
          if (filters.endDate) {
            list = list.filter(e => e.data_principal <= filters.endDate!);
          }
        }
        // Ordena por data decrescente
        list.sort((a, b) => new Date(b.data_principal || '').getTime() - new Date(a.data_principal || '').getTime());
        
        const total = list.length;
        if (filters?.page && filters?.limit) {
          const startIndex = (filters.page - 1) * filters.limit;
          list = list.slice(startIndex, startIndex + filters.limit);
        }
        
        resolve({ data: list, total });
      }, 180);
    });
  },`;
svcCode = svcCode.replace(oldGetAll, newGetAll);
fs.writeFileSync(svcPath, svcCode);

// 2. Patch Hook
const hookPath = 'src/hooks/useManejoReprodutivo.ts';
let hookCode = fs.readFileSync(hookPath, 'utf8');

hookCode = hookCode.replace(
  "export const useManejoReprodutivo = (filters?: { search?: string; protocolo?: string; startDate?: string; endDate?: string }) => {",
  "export const useManejoReprodutivo = (filters?: { search?: string; protocolo?: string; startDate?: string; endDate?: string; page?: number; limit?: number }) => {"
);
hookCode = hookCode.replace(
  "eventos: eventosQuery.data || [],",
  "eventos: eventosQuery.data?.data || [],\n    totalEventos: eventosQuery.data?.total || 0,"
);
fs.writeFileSync(hookPath, hookCode);
