const fs = require('fs');
const path = 'src/services/pesagensService.ts';
let content = fs.readFileSync(path, 'utf8');

const oldDelete = `  delete: async (id: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const list = getStoredData();
        const filtered = list.filter(p => p.id !== id);
        setStoredData(filtered);
        resolve(true);
      }, 180);
    });
  },`;

const newDelete = `  delete: async (id: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setTimeout(async () => {
        const list = getStoredData();
        const pesagemToDel = list.find(p => p.id === id);
        const filtered = list.filter(p => p.id !== id);
        setStoredData(filtered);
        
        if (pesagemToDel) {
          // Achar a última pesagem desse animal para atualizar o peso atual
          const lastPesagens = filtered
            .filter(p => p.animal_id === pesagemToDel.animal_id)
            .sort((a, b) => new Date(b.data_pesagem).getTime() - new Date(a.data_pesagem).getTime());
          
          if (lastPesagens.length > 0) {
            await animaisService.updatePesoAtual(pesagemToDel.animal_id, lastPesagens[0].peso_kg, lastPesagens[0].data_pesagem);
          } else {
            // Se não houver mais pesagens, podemos colocar 0 ou ignorar
            await animaisService.updatePesoAtual(pesagemToDel.animal_id, 0, '');
          }
        }
        
        resolve(true);
      }, 180);
    });
  },`;

content = content.replace(oldDelete, newDelete);
fs.writeFileSync(path, content);
