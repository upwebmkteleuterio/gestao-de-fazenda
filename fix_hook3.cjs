const fs = require('fs');
const path = 'src/hooks/usePesagens.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace("endDate?: string;", "endDate?: string;\n  page?: number;\n  limit?: number;");

if (content.includes("pesagens: query.data || [],")) {
  content = content.replace("pesagens: query.data || [],", "pesagens: query.data?.data || [],\n    total: query.data?.total || 0,");
}

fs.writeFileSync(path, content);
