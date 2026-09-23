const fs = require('fs');

// 1. lotesService.ts
const lotesServicePath = 'src/services/lotesService.ts';
let lotesService = fs.readFileSync(lotesServicePath, 'utf8');

const newCreate = `  create: async (nome: string, animais_ids: string[]): Promise<Lote> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const list = getStoredData();
        const created: Lote = {
          id: \`lote-\${Date.now()}\`,
          nome,
          data_criacao: new Date().toISOString(),
          animais_ids,
        };
        setStoredData([created, ...list]);
        resolve(created);
      }, 180);
    });
  },`;
  
const newDelete = `
  delete: async (id: string): Promise<void> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const list = getStoredData();
        setStoredData(list.filter(l => l.id !== id));
        resolve();
      }, 180);
    });
  },`;

if (!lotesService.includes('delete: async')) {
  lotesService = lotesService.replace(newCreate, newCreate + newDelete);
  fs.writeFileSync(lotesServicePath, lotesService);
}

// 2. useLotes.ts
const useLotesPath = 'src/hooks/useLotes.ts';
let useLotes = fs.readFileSync(useLotesPath, 'utf8');

const useQueryImport = "import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';";
const oldCreateMut = `  const createMutation = useMutation({
    mutationFn: ({ nome, animais_ids }: { nome: string; animais_ids: string[] }) =>
      lotesService.create(nome, animais_ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lotes'] });
    },
  });`;

const newDeleteMut = `
  const deleteMutation = useMutation({
    mutationFn: (id: string) => lotesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lotes'] });
    },
  });`;

if (!useLotes.includes('deleteMutation')) {
  useLotes = useLotes.replace(oldCreateMut, oldCreateMut + newDeleteMut);
  useLotes = useLotes.replace('isCreating: createMutation.isPending,', 'isCreating: createMutation.isPending,\n    deleteLote: deleteMutation.mutateAsync,');
  fs.writeFileSync(useLotesPath, useLotes);
}

