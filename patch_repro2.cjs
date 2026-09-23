const fs = require('fs');
// 2. Patch Hook
const hookPath = 'src/hooks/useReproducao.ts';
let hookCode = fs.readFileSync(hookPath, 'utf8');

hookCode = hookCode.replace(
  "export const useReproducao = (filters?: { search?: string; protocolo?: string; startDate?: string; endDate?: string }) => {",
  "export const useReproducao = (filters?: { search?: string; protocolo?: string; startDate?: string; endDate?: string; page?: number; limit?: number }) => {"
);
hookCode = hookCode.replace(
  "eventos: eventosQuery.data || [],",
  "eventos: eventosQuery.data?.data || [],\n    totalEventos: eventosQuery.data?.total || 0,"
);
fs.writeFileSync(hookPath, hookCode);
