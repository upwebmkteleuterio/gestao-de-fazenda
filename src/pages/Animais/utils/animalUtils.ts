import { Animal } from '@/types/database';

/**
 * Calcula idade formatada amigável a partir da data de nascimento
 */
export const calcularIdadeFormatada = (dataNasc: string): string => {
  if (!dataNasc) return 'N/I';
  const nasc = new Date(dataNasc);
  const hoje = new Date();
  const diffMeses = (hoje.getFullYear() - nasc.getFullYear()) * 12 + (hoje.getMonth() - nasc.getMonth());

  if (diffMeses < 1) return 'Recém-nascido';
  if (diffMeses < 12) return `${diffMeses} mes${diffMeses > 1 ? 'es' : ''}`;
  const anos = Math.floor(diffMeses / 12);
  const mesesRestantes = diffMeses % 12;
  return `${anos} ano${anos > 1 ? 's' : ''}${mesesRestantes > 0 ? ` e ${mesesRestantes}m` : ''}`;
};

/**
 * Exporta lista de animais para arquivo CSV/Excel compatível
 */
export const exportarAnimaisCSV = (animais: Animal[]): boolean => {
  if (!animais || animais.length === 0) {
    return false;
  }
  const headers = ['Brinco', 'Tipo', 'Categoria', 'Sexo', 'Raça', 'Data Nascimento', 'CDC (ABCZ)', 'CDN (ABCZ)', 'Status', 'Peso'];
  const csvContent = [
    headers.join(','),
    ...animais.map((a) => [
      a.brinco,
      a.tipo_animal,
      a.categoria || '',
      a.sexo,
      a.raca || '',
      a.data_nascimento,
      a.cdc || '',
      a.cdn || '',
      a.status,
      a.peso_atual || '',
    ].join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `relatorio_rebanho_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  return true;
};
