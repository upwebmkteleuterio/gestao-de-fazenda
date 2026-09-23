const fs = require('fs');
let reproCode = fs.readFileSync('src/hooks/useReproducao.ts', 'utf8');
reproCode = reproCode.replace(
  "export const useReproducao = (filters?: { search?: string; protocolo?: string; resultadoDg?: string; dataInicio?: string; dataFim?: string }) => {",
  "export const useReproducao = (filters?: { search?: string; protocolo?: string; resultadoDg?: string; dataInicio?: string; dataFim?: string; page?: number; limit?: number }) => {"
);
fs.writeFileSync('src/hooks/useReproducao.ts', reproCode);
