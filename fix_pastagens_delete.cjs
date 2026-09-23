const fs = require('fs');
const path = 'src/services/pastagensService.ts';
let content = fs.readFileSync(path, 'utf8');

const oldDelete = `  delete: async (id: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const list = getStoredPastos();
        setStoredPastos(list.filter(p => p.id !== id));
        resolve(true);
      }, 180);
    });
  },`;

const newDelete = `  delete: async (id: string): Promise<boolean> => {
    return new Promise(async (resolve) => {
      // Remover pasto_id dos animais que estavam nele
      try {
        const resAnimais = await animaisService.getAll();
        const animaisNoPasto = resAnimais.data.filter(a => a.pasto_id === id);
        for (const animal of animaisNoPasto) {
          await animaisService.update(animal.id, { pasto_id: undefined });
        }
      } catch (e) {
        console.error('Erro ao limpar animais do pasto removido', e);
      }
      
      setTimeout(() => {
        // Remover pasto
        const list = getStoredPastos();
        setStoredPastos(list.filter(p => p.id !== id));
        
        // Cascata: Remover servicos desse pasto
        const servicos = getStoredServicos();
        setStoredServicos(servicos.filter(s => s.pasto_id !== id));
        
        resolve(true);
      }, 180);
    });
  },`;

content = content.replace(oldDelete, newDelete);
fs.writeFileSync(path, content);
