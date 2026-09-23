import * as XLSX from 'xlsx';
import { Animal, Pesagem } from '@/types/database';

export interface ZootecnicoGmdPasto {
  pasto_id: string;
  pasto_nome: string;
  gmd_medio: number | null;
  pesagens_count: number;
}

export interface ZootecnicoKpis {
  taxaDescarte: string;
  descartesCount: number;
  gmdMedio: string;
  taxaPrenhez: string;
  custoMedio: string;
  bezerros: number;
  vacas: number;
  matrizes: number;
  touros: number;
  totalAnimais: number;
}

export const formatarNumero = (value: number | null | undefined, fractionDigits = 2) =>
  value === null || value === undefined || Number.isNaN(value) ? '-' : value.toLocaleString('pt-BR', { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits });

export function exportarZootecnicosXLSX(animais: Animal[], pesagens: Pesagem[], kpis: ZootecnicoKpis, pastos: ZootecnicoGmdPasto[] = []) {
  if (!animais.length && !pesagens.length) return false;
  const workbook = XLSX.utils.book_new();
  const resumo = [
    ['FARMNEXUS AGROPECUÁRIA - RELATÓRIO ZOOTÉCNICO E KPIS'],
    ['Data de Emissão', new Date().toLocaleDateString('pt-BR')],
    [],
    ['Indicador', 'Valor'],
    ['Taxa de Descarte', `${kpis.taxaDescarte}%`],
    ['GMD Médio Geral', kpis.gmdMedio],
    ['Taxa de Prenhez IATF', kpis.taxaPrenhez],
    ['Custo Médio por Cabeça/Mês', kpis.custoMedio],
    ['Total de Animais', kpis.totalAnimais],
    ['Bezerros(as)', kpis.bezerros],
    ['Vacas / Novilhas', kpis.vacas],
    ['Matrizes / Doadoras', kpis.matrizes],
    ['Touros / Reprodutores', kpis.touros],
  ];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(resumo), 'Resumo');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(pastos.map((pasto) => ({
    Pasto: pasto.pasto_nome,
    'GMD Médio (kg/dia)': pasto.gmd_medio,
    Pesagens: pasto.pesagens_count,
  }))), 'GMD por Pasto');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(pesagens.map((p) => ({
    Brinco: p.brinco_animal,
    Tipo: p.tipo_animal || '-',
    'Data Pesagem': p.data_pesagem,
    'Peso (kg)': p.peso_kg,
    'Peso Anterior (kg)': p.peso_anterior ?? '-',
    'GMD (kg/dia)': p.gmd_calculado ?? '-',
    'Dias Intervalo': p.dias_intervalo ?? '-',
    Observações: p.observacoes || '',
  }))), 'Pesagens');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(animais.map((animal) => ({
    Brinco: animal.brinco,
    Tipo: animal.tipo_animal,
    Categoria: animal.categoria,
    Status: animal.status,
    Pasto: animal.pasto_nome || '-',
  }))), 'Animais');
  XLSX.writeFile(workbook, `relatorio-zootecnico-${new Date().toISOString().split('T')[0]}.xlsx`);
  return true;
}
