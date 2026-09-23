const fs = require('fs');

// 1. Patch Service
const svcPath = 'src/services/pastagensService.ts';
let svcCode = fs.readFileSync(svcPath, 'utf8');

// Replace getAll
const oldGetAll = `  getAll: async (filters?: { search?: string; status?: string }): Promise<Pasto[]> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        let list = getStoredData();
        if (filters) {
          if (filters.search) {
            const query = filters.search.toLowerCase();
            list = list.filter(p => p.nome.toLowerCase().includes(query));
          }
          if (filters.status && filters.status !== 'all') {
            list = list.filter(p => p.status === filters.status);
          }
        }
        resolve(list);
      }, 180);
    });
  },`;

const newGetAll = `  getAll: async (filters?: { search?: string; status?: string; page?: number; limit?: number }): Promise<{data: Pasto[], total: number}> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        let list = getStoredData();
        if (filters) {
          if (filters.search) {
            const query = filters.search.toLowerCase();
            list = list.filter(p => p.nome.toLowerCase().includes(query));
          }
          if (filters.status && filters.status !== 'all') {
            list = list.filter(p => p.status === filters.status);
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
svcCode = svcCode.replace(oldGetAll, newGetAll);
fs.writeFileSync(svcPath, svcCode);

// 2. Patch Hook
const hookPath = 'src/hooks/usePastagens.ts';
let hookCode = fs.readFileSync(hookPath, 'utf8');

hookCode = hookCode.replace(
  "export const usePastagens = (filters?: { search?: string; status?: string }) => {",
  "export const usePastagens = (filters?: { search?: string; status?: string; page?: number; limit?: number }) => {"
);
hookCode = hookCode.replace(
  "pastos: pastosQuery.data || [],",
  "pastos: pastosQuery.data?.data || [],\n    totalPastos: pastosQuery.data?.total || 0,"
);
fs.writeFileSync(hookPath, hookCode);
