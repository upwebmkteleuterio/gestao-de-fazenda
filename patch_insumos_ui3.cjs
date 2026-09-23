const fs = require('fs');
const path = 'src/pages/Insumos.tsx';
let content = fs.readFileSync(path, 'utf8');

const oldCall = `  const { 
    insumos, 
    movimentacoes, 
    isLoadingInsumos, 
    createInsumo, 
    updateInsumo, 
    deleteInsumo, 
    registrarMovimentacao 
  } = useInsumos(categoriaFilter);`;

const newCall = `  const { 
    insumos, 
    totalInsumos,
    movimentacoes, 
    isLoadingInsumos, 
    createInsumo, 
    updateInsumo, 
    deleteInsumo, 
    registrarMovimentacao 
  } = useInsumos(categoriaFilter, { search, estoqueBaixo: apenasEstoqueBaixo, page, limit });`;

if (content.includes(oldCall)) {
  content = content.replace(oldCall, newCall);
} else {
  // Try another match
  const oldCall2 = `  const { 
    insumos, 
    totalInsumos,
    movimentacoes, 
    isLoadingInsumos, 
    createInsumo, 
    updateInsumo, 
    deleteInsumo, 
    registrarMovimentacao 
  } = useInsumos(categoriaFilter);`;
  if (content.includes(oldCall2)) {
    content = content.replace(oldCall2, newCall);
  } else {
    // manual fallback
    content = content.replace(
      "} = useInsumos(categoriaFilter);",
      "} = useInsumos(categoriaFilter, { search, estoqueBaixo: apenasEstoqueBaixo, page, limit });"
    );
    if (!content.includes('totalInsumos,')) {
      content = content.replace(
        "insumos,",
        "insumos,\n    totalInsumos,"
      );
    }
  }
}

fs.writeFileSync(path, content);
