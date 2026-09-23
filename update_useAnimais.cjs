const fs = require('fs');

const path = 'src/hooks/useAnimais.ts';
let content = fs.readFileSync(path, 'utf8');

const signatureOld = `export const useAnimais = (filters?: {
  search?: string;
  sexo?: string;
  status?: string;
  categoria?: string;
  tipo?: string;
  pasto_id?: string;
}) => {`;

const signatureNew = `export const useAnimais = (filters?: {
  search?: string;
  sexo?: string;
  status?: string;
  categoria?: string;
  tipo?: string;
  pasto_id?: string;
  page?: number;
  limit?: number;
}) => {`;

content = content.replace(signatureOld, signatureNew);

content = content.replace('animais: query.data || [],', 'animais: query.data?.data || [],\n    total: query.data?.total || 0,');

fs.writeFileSync(path, content);
console.log('useAnimais patched!');
