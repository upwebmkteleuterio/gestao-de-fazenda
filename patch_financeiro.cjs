const fs = require('fs');

// 1. Patch Service
const svcPath = 'src/services/financeiroService.ts';
let svcCode = fs.readFileSync(svcPath, 'utf8');

// Replace getAll
const oldGetAll = `  getAll: async (filters?: { tipo?: string; categoria?: string; status?: string }): Promise<TransacaoFinanceira[]> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        let list = getStoredData();
        if (filters) {
          if (filters.tipo && filters.tipo !== 'all') {
            list = list.filter(t => t.tipo === filters.tipo);
          }
          if (filters.categoria && filters.categoria !== 'all') {
            list = list.filter(t => t.categoria === filters.categoria);
          }
          if (filters.status && filters.status !== 'all') {
            list = list.filter(t => t.status === filters.status);
          }
        }
        resolve(list);
      }, 180);
    });
  },`;

const newGetAll = `  getAll: async (filters?: { tipo?: string; categoria?: string; status?: string; page?: number; limit?: number }): Promise<{data: TransacaoFinanceira[], total: number}> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        let list = getStoredData();
        if (filters) {
          if (filters.tipo && filters.tipo !== 'all') {
            list = list.filter(t => t.tipo === filters.tipo);
          }
          if (filters.categoria && filters.categoria !== 'all') {
            list = list.filter(t => t.categoria === filters.categoria);
          }
          if (filters.status && filters.status !== 'all') {
            list = list.filter(t => t.status === filters.status);
          }
        }
        
        list.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
        
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
const hookPath = 'src/hooks/useFinanceiro.ts';
let hookCode = fs.readFileSync(hookPath, 'utf8');

hookCode = hookCode.replace(
  "export const useFinanceiro = (filters?: { tipo?: string; categoria?: string; status?: string }) => {",
  "export const useFinanceiro = (filters?: { tipo?: string; categoria?: string; status?: string; page?: number; limit?: number }) => {"
);
hookCode = hookCode.replace(
  "transacoes: transacoesQuery.data || [],",
  "transacoes: transacoesQuery.data?.data || [],\n    totalTransacoes: transacoesQuery.data?.total || 0,"
);
fs.writeFileSync(hookPath, hookCode);
