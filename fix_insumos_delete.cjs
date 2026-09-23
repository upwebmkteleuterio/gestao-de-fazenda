const fs = require('fs');
const path = 'src/services/insumosService.ts';
let content = fs.readFileSync(path, 'utf8');

const oldDelete = `  delete: async (id: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const list = getStoredInsumos();
        setStoredInsumos(list.filter(i => i.id !== id));
        resolve(true);
      }, 180);
    });
  },`;

const newDelete = `  delete: async (id: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const list = getStoredInsumos();
        setStoredInsumos(list.filter(i => i.id !== id));
        
        // Cascata: Remove as movimentacoes atreladas a esse insumo
        try {
          const rawMovs = localStorage.getItem('farmnexus_mov_insumos_db');
          if (rawMovs) {
            const movs = JSON.parse(rawMovs);
            localStorage.setItem('farmnexus_mov_insumos_db', JSON.stringify(movs.filter(m => m.insumo_id !== id)));
          }
        } catch(e) {}
        
        resolve(true);
      }, 180);
    });
  },`;

content = content.replace(oldDelete, newDelete);
fs.writeFileSync(path, content);
