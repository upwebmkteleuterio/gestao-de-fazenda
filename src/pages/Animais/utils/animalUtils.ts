import * as XLSX from 'xlsx';
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
 * Exporta a lista completa de animais para um workbook Excel válido.
 */
export const exportarAnimaisXLSX = (animais: Animal[]): boolean => {
  if (!animais || animais.length === 0) {
    return false;
  }

  const rows = animais.map((animal) => ({
    'ID / Brinco': [
      animal.brinco,
      animal.tipo_animal,
      animal.tipo_cobertura === 'Inseminacao' ? 'Inseminação' : animal.tipo_cobertura === 'Monta' ? 'Monta Natural' : animal.tipo_cobertura,
      animal.cdc || animal.cdn ? `ABCZ${animal.cdn ? ` · CDN: ${animal.cdn}` : ` · CDC: ${animal.cdc}`}` : undefined,
    ].filter(Boolean).join(' · '),
    'Sexo / Raça': `${animal.sexo === 'F' ? 'Fêmea' : 'Macho'} · ${animal.raca || 'Nelore'}`,
    'Data Nasc. / Idade': `${calcularIdadeFormatada(animal.data_nascimento)} · ${animal.data_nascimento}`,
    Categoria: animal.categoria,
    'Peso Atual': animal.peso_atual ? `${animal.peso_atual} kg` : 'N/I',
    Status: animal.status.toUpperCase(),
  }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Animais');
  XLSX.writeFile(workbook, `relatorio_rebanho_${new Date().toISOString().split('T')[0]}.xlsx`);
  return true;
};
