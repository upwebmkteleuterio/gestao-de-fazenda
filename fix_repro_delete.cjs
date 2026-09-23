const fs = require('fs');
const path = 'src/services/reproducaoService.ts';
let content = fs.readFileSync(path, 'utf8');

const oldDelete = `  delete: async (id: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const list = getStoredData();
        setStoredData(list.filter(e => e.id !== id));
        resolve(true);
      }, 180);
    });
  }`;

const newDelete = `  delete: async (id: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const list = getStoredData();
        const eventToDel = list.find(e => e.id === id);
        const filtered = list.filter(e => e.id !== id);
        setStoredData(filtered);
        
        if (eventToDel) {
          // Achar o último evento da matriz para tentar restaurar o status
          const lastEventos = filtered
            .filter(e => e.animal_id === eventToDel.animal_id)
            .sort((a, b) => new Date(b.data_principal || '').getTime() - new Date(a.data_principal || '').getTime());
            
          if (lastEventos.length > 0) {
            const last = lastEventos[0];
            syncMatrizStatus(last.animal_id, last.brinco_matriz, last.resultado_dg, last.tipo_protocolo, last.dados_protocolo?.touro);
          } else {
            // Se não houver mais eventos, volta para Vazia / Apta
            try {
              const raw = localStorage.getItem('farmnexus_animais_db');
              if (raw) {
                const animais = JSON.parse(raw);
                const index = animais.findIndex((a) => a.id === eventToDel.animal_id);
                if (index !== -1) {
                  animais[index].status_reprodutivo = 'Vazia';
                  animais[index].touro_cobertura = undefined;
                  localStorage.setItem('farmnexus_animais_db', JSON.stringify(animais));
                }
              }
            } catch (e) {}
          }
        }
        
        resolve(true);
      }, 180);
    });
  }`;

content = content.replace(oldDelete, newDelete);
fs.writeFileSync(path, content);
