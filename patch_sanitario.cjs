const fs = require('fs');

// 1. Patch Service
const svcPath = 'src/services/sanitarioService.ts';
let svcCode = fs.readFileSync(svcPath, 'utf8');

const oldGetAll = `  getAll: async (filters?: { search?: string; tipo?: string; status?: string }): Promise<ManejoSanitario[]> => {
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
        resolve(list);
      }, 180);
    });
  },`;

const newGetAll = `  getAll: async (filters?: { search?: string; tipo?: string; status?: string; page?: number; limit?: number }): Promise<{data: ManejoSanitario[], total: number}> => {
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
  },`;
svcCode = svcCode.replace(oldGetAll, newGetAll);
fs.writeFileSync(svcPath, svcCode);

// 2. Patch Hook
const hookPath = 'src/hooks/useSanitario.ts';
let hookCode = fs.readFileSync(hookPath, 'utf8');

hookCode = hookCode.replace(
  "export const useSanitario = (filters?: { search?: string; tipo?: string; status?: string }) => {",
  "export const useSanitario = (filters?: { search?: string; tipo?: string; status?: string; page?: number; limit?: number }) => {"
);
hookCode = hookCode.replace(
  "manejos: query.data || [],",
  "manejos: query.data?.data || [],\n    totalManejos: query.data?.total || 0,"
);
fs.writeFileSync(hookPath, hookCode);
