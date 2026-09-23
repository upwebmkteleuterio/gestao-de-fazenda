const fs = require('fs');

// 1. Patch Service
const svcPath = 'src/services/lotesService.ts';
let svcCode = fs.readFileSync(svcPath, 'utf8');

// Replace getAll
const oldGetAll = `  getAll: async (): Promise<Lote[]> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(getStoredData());
      }, 180);
    });
  },`;

const newGetAll = `  getAll: async (filters?: { page?: number; limit?: number }): Promise<{data: Lote[], total: number}> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        let list = getStoredData();
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
const hookPath = 'src/hooks/useLotes.ts';
let hookCode = fs.readFileSync(hookPath, 'utf8');

hookCode = hookCode.replace(
  "export const useLotes = () => {",
  "export const useLotes = (filters?: { page?: number; limit?: number }) => {"
);
hookCode = hookCode.replace(
  "queryFn: () => lotesService.getAll(),",
  "queryKey: ['lotes', filters],\n    queryFn: () => lotesService.getAll(filters),"
);
hookCode = hookCode.replace(
  "queryKey: ['lotes']",
  "// replaced above"
);
hookCode = hookCode.replace(
  "lotes: lotesQuery.data || [],",
  "lotes: lotesQuery.data?.data || [],\n    totalLotes: lotesQuery.data?.total || 0,"
);
fs.writeFileSync(hookPath, hookCode);
