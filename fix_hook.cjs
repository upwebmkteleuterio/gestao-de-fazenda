const fs = require('fs');
const path = 'src/hooks/usePesagens.ts';
let content = fs.readFileSync(path, 'utf8');

const oldHook = `export const usePesagens = (filters?: {
  search?: string;
  tipoAnimal?: string;
  startDate?: string;
  endDate?: string;
}) => {`;

const newHook = `export const usePesagens = (filters?: {
  search?: string;
  tipoAnimal?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}) => {`;

// Replace ignoring spaces/newlines by using regex if needed, but the original file has no newlines!
// Wait, the file has no newlines! "import { useQuery..." is all on one line.
