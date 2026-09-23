const fs = require('fs');
const path = 'src/services/sanitarioService.ts';
let content = fs.readFileSync(path, 'utf8');

const oldDelete = `  delete: async (id: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const list = getStoredData();
        setStoredData(list.filter(m => m.id !== id));
        resolve(true);
      }, 180);
    });
  }`;

const newDelete = `  delete: async (id: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const list = getStoredData();
        const manejoToDel = list.find(m => m.id === id);
        setStoredData(list.filter(m => m.id !== id));
        
        if (manejoToDel && manejoToDel.status === 'concluido' && manejoToDel.medicamentos.length > 0) {
          try {
            const rawMovs = localStorage.getItem('farmnexus_mov_insumos_db');
            if (rawMovs) {
              let movs = JSON.parse(rawMovs);
              const movsToDelete = movs.filter(mov => mov.origem_manejo_id === id);
              
              const rawInsumos = localStorage.getItem('farmnexus_insumos_db');
              if (rawInsumos) {
                let insumos = JSON.parse(rawInsumos);
                // Rollback estoque
                for (const mDel of movsToDelete) {
                  const idx = insumos.findIndex(ins => ins.id === mDel.insumo_id);
                  if (idx !== -1 && mDel.tipo === 'saida') {
                    insumos[idx].estoque_atual += mDel.quantidade;
                  }
                }
                localStorage.setItem('farmnexus_insumos_db', JSON.stringify(insumos));
              }
              
              // Remove as movimentações geradas por este manejo
              movs = movs.filter(mov => mov.origem_manejo_id !== id);
              localStorage.setItem('farmnexus_mov_insumos_db', JSON.stringify(movs));
            }
          } catch(e) {
            console.error('Erro ao reverter movimentacoes do manejo sanitario', e);
          }
        }
        
        resolve(true);
      }, 180);
    });
  }`;

content = content.replace(oldDelete, newDelete);
fs.writeFileSync(path, content);
