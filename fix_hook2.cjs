const fs = require('fs');
const path = 'src/hooks/usePesagens.ts';
let content = fs.readFileSync(path, 'utf8');

const regex = /export const usePesagens = \(filters\?: \{[\s\S]*?endDate\?: string;\}[\s]*\) => \{/;
const newHook = `export const usePesagens = (filters?: { search?: string; tipoAnimal?: string; startDate?: string; endDate?: string; page?: number; limit?: number; }) => {`;

content = content.replace(regex, newHook);
fs.writeFileSync(path, content);
