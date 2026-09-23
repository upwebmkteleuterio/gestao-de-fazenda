const fs = require('fs');
const path = 'src/hooks/usePesagens.ts';
let content = fs.readFileSync(path, 'utf8');

const oldHook = `export const usePesagens = (filters?: {
  search?: string;
  tipoAnimal?: string;
  startDate?: string;
  endDate?: string;
}) => {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['pesagens', filters],
    queryFn: () => pesagensService.getAll(filters),
  });`;

const newHook = `export const usePesagens = (filters?: {
  search?: string;
  tipoAnimal?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}) => {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['pesagens', filters],
    queryFn: () => pesagensService.getAll(filters),
  });`;

content = content.replace(oldHook, newHook);

const oldReturn = `  return {
    pesagens: query.data || [],
    isLoading: query.isLoading,`;
    
const newReturn = `  return {
    pesagens: query.data?.data || [],
    total: query.data?.total || 0,
    isLoading: query.isLoading,`;

content = content.replace(oldReturn, newReturn);
fs.writeFileSync(path, content);
console.log('usePesagens updated');
