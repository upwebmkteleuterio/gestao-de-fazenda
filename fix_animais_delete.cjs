const fs = require('fs');
const path = 'src/services/animaisService.ts';
let content = fs.readFileSync(path, 'utf8');

const oldDelete = `  delete: async (id: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const list = getStoredData();
        const filtered = list.filter(a => a.id !== id);
        setStoredData(filtered);
        resolve(true);
      }, 180);
    });
  },`;

const newDelete = `  delete: async (id: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const list = getStoredData();
        const filtered = list.filter(a => a.id !== id);
        setStoredData(filtered);
        
        // Cascata: Excluir pesagens deste animal
        try {
          const pesagens = JSON.parse(localStorage.getItem('farmnexus_pesagens_db') || '[]');
          localStorage.setItem('farmnexus_pesagens_db', JSON.stringify(pesagens.filter((p) => p.animal_id !== id)));
        } catch(e) {}
        
        // Cascata: Excluir eventos reprodutivos deste animal
        try {
          const repro = JSON.parse(localStorage.getItem('farmnexus_reproducao_db') || '[]');
          localStorage.setItem('farmnexus_reproducao_db', JSON.stringify(repro.filter((r) => r.animal_id !== id)));
        } catch(e) {}

        resolve(true);
      }, 180);
    });
  },`;

content = content.replace(oldDelete, newDelete);
fs.writeFileSync(path, content);
