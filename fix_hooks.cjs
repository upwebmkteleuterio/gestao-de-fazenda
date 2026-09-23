const fs = require('fs');

// Fix useLotes
let lotesCode = fs.readFileSync('src/hooks/useLotes.ts', 'utf8');
lotesCode = lotesCode.replace("lotes: query.data || [],", "lotes: query.data?.data || [],\n    totalLotes: query.data?.total || 0,");
fs.writeFileSync('src/hooks/useLotes.ts', lotesCode);

// Fix useReproducao
let reproCode = fs.readFileSync('src/hooks/useReproducao.ts', 'utf8');
reproCode = reproCode.replace("eventos: query.data || [],", "eventos: query.data?.data || [],\n    totalEventos: query.data?.total || 0,");
fs.writeFileSync('src/hooks/useReproducao.ts', reproCode);

