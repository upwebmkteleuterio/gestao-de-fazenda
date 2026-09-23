import * as XLSX from 'xlsx';
import { Animal } from '@/types/database';

export interface InseminacaoRelatorioItem {
  id: string;
  brinco_matriz: string;
  animal?: Animal;
  tipo_protocolo: string;
  data_inseminacao: string;
  touro: string;
  tipo_semen: string;
  condicao_corporal: string;
  previsao_dg: string;
  resultado_dg?: string;
  data_dg?: string;
  previsao_parto?: string;
  observacoes?: string;
}

export const formatarDataBR = (dataIso?: string): string => {
  if (!dataIso) return '-';
  const parts = dataIso.split('T')[0].split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dataIso;
};

const protocoloLabel = (protocolo: string) => protocolo === 'iatf' ? 'IATF' : protocolo === 'monta_natural' ? 'Monta Natural' : 'TETF';
const resultadoLabel = (resultado?: string) => resultado === 'cheia' ? 'Gestante (Prenha)' : resultado === 'vazia' ? 'Vazia' : 'Aguardando DG';

export const exportarInseminacoesXLSX = (itens: InseminacaoRelatorioItem[], tituloPeriodo: string): boolean => {
  if (!itens.length) return false;
  const rows = itens.map((item) => ({
    'Brinco da Matriz': item.brinco_matriz,
    Categoria: item.animal?.categoria || '-',
    Raça: item.animal?.raca || '-',
    'Data da Inseminação': formatarDataBR(item.data_inseminacao),
    Protocolo: protocoloLabel(item.tipo_protocolo),
    'Touro / Reprodutor': item.touro || '-',
    'Tipo de Sêmen': item.tipo_semen || '-',
    'Condição Corporal (ECC)': item.condicao_corporal || '-',
    'Previsão DG (Toque)': formatarDataBR(item.previsao_dg),
    'Resultado DG': resultadoLabel(item.resultado_dg),
    'Previsão de Parto': formatarDataBR(item.previsao_parto),
    Observações: item.observacoes || '',
  }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Inseminações');
  XLSX.writeFile(workbook, `relatorio_inseminacoes_${tituloPeriodo.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
  return true;
};
