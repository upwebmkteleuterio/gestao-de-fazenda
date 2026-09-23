const fs = require('fs');
const path = 'src/services/lotesService.ts';
let content = fs.readFileSync(path, 'utf8');

const toFind = `        resolve(created);      }, 180);    });  }};`;
const toReplace = `        resolve(created);      }, 180);    });  },  delete: async (id: string): Promise<void> => {    return new Promise((resolve) => {      setTimeout(() => {        const list = getStoredData();        setStoredData(list.filter(l => l.id !== id));        resolve();      }, 180);    });  }};`;

if (!content.includes('delete: async (id: string)')) {
  content = content.replace(toFind, toReplace);
  fs.writeFileSync(path, content);
}
