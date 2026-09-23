const fs = require('fs');
const path = 'src/services/pesagensService.ts';
let content = fs.readFileSync(path, 'utf8');

const oldGetAll = `  getAll: async (filters?: {
    search?: string;
    tipoAnimal?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<Pesagem[]> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        let list = getStoredData();
        if (filters) {
          if (filters.search) {
            const query = filters.search.toLowerCase();
            list = list.filter(p => p.brinco_animal.toLowerCase().includes(query));
          }
          if (filters.tipoAnimal && filters.tipoAnimal !== 'all') {
            list = list.filter(p => p.tipo_animal === filters.tipoAnimal);
          }
          if (filters.startDate) {
            list = list.filter(p => p.data_pesagem >= filters.startDate!);
          }
          if (filters.endDate) {
            list = list.filter(p => p.data_pesagem <= filters.endDate!);
          }
        }
        // Ordena por data mais recente primeiro
        list.sort((a, b) => new Date(b.data_pesagem).getTime() - new Date(a.data_pesagem).getTime());
        resolve(list);
      }, 180);
    });
  },`;

const newGetAll = `  getAll: async (filters?: {
    search?: string;
    tipoAnimal?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: Pesagem[], total: number }> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        let list = getStoredData();
        if (filters) {
          if (filters.search) {
            const query = filters.search.toLowerCase();
            list = list.filter(p => p.brinco_animal.toLowerCase().includes(query));
          }
          if (filters.tipoAnimal && filters.tipoAnimal !== 'all') {
            list = list.filter(p => p.tipo_animal === filters.tipoAnimal);
          }
          if (filters.startDate) {
            list = list.filter(p => p.data_pesagem >= filters.startDate!);
          }
          if (filters.endDate) {
            list = list.filter(p => p.data_pesagem <= filters.endDate!);
          }
        }
        // Ordena por data mais recente primeiro
        list.sort((a, b) => new Date(b.data_pesagem).getTime() - new Date(a.data_pesagem).getTime());
        
        const total = list.length;
        
        if (filters?.page && filters?.limit) {
          const startIndex = (filters.page - 1) * filters.limit;
          list = list.slice(startIndex, startIndex + filters.limit);
        }
        
        resolve({ data: list, total });
      }, 180);
    });
  },`;

content = content.replace(oldGetAll, newGetAll);
fs.writeFileSync(path, content);
console.log('pesagensService updated');
