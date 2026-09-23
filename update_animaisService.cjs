const fs = require('fs');

const path = 'src/services/animaisService.ts';
let content = fs.readFileSync(path, 'utf8');

const signatureOld = `getAll: async (filters?: {
    search?: string;
    sexo?: string;
    status?: string;
    categoria?: string;
    tipo?: string;
    pasto_id?: string;
  }): Promise<Animal[]> => {`;

const signatureNew = `getAll: async (filters?: {
    search?: string;
    sexo?: string;
    status?: string;
    categoria?: string;
    tipo?: string;
    pasto_id?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: Animal[]; total: number }> => {`;

content = content.replace(signatureOld, signatureNew);

const returnOld = `resolve(list);
      }, 180);
    });
  },`;

const returnNew = `
        const total = list.length;
        if (filters && filters.page && filters.limit) {
          const start = (filters.page - 1) * filters.limit;
          const end = start + filters.limit;
          list = list.slice(start, end);
        }

        resolve({ data: list, total });
      }, 180);
    });
  },`;

content = content.replace(returnOld, returnNew);

fs.writeFileSync(path, content);
console.log('animaisService patched!');
