const fs = require('fs');

// 1. Patch Service
const svcPath = 'src/services/insumosService.ts';
let svcCode = fs.readFileSync(svcPath, 'utf8');

const oldGetAll = `  getAll: async (categoria?: string): Promise<Insumo[]> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        let list = getStoredInsumos();
        if (categoria && categoria !== 'all') {
          list = list.filter(i => i.categoria === categoria);
        }
        resolve(list);
      }, 180);
    });
  },`;

const newGetAll = `  getAll: async (categoria?: string, filters?: { page?: number; limit?: number }): Promise<{data: Insumo[], total: number}> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        let list = getStoredInsumos();
        if (categoria && categoria !== 'all') {
          list = list.filter(i => i.categoria === categoria);
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
const hookPath = 'src/hooks/useInsumos.ts';
let hookCode = fs.readFileSync(hookPath, 'utf8');

hookCode = hookCode.replace(
  "export const useInsumos = (categoria?: string) => {",
  "export const useInsumos = (categoria?: string, filters?: { page?: number; limit?: number }) => {"
);
hookCode = hookCode.replace(
  "queryFn: () => insumosService.getAll(categoria),",
  "queryKey: ['insumos', categoria, filters],\n    queryFn: () => insumosService.getAll(categoria, filters),"
);
hookCode = hookCode.replace(
  "queryKey: ['insumos', categoria]",
  "// replaced above"
);
hookCode = hookCode.replace(
  "insumos: insumosQuery.data || [],",
  "insumos: insumosQuery.data?.data || [],\n    totalInsumos: insumosQuery.data?.total || 0,"
);
fs.writeFileSync(hookPath, hookCode);
