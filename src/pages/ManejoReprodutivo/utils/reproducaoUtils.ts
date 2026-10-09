import { EventoReproducao } from '@/types/database';

/**
 * Utilitários para cálculos e formatação de manejo reprodutivo
 */

export const normalizeReproducaoSearch = (value: string): string =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[\s#.\-]+/g, '');

export const matchesReproducaoSearch = (evento: EventoReproducao, term: string): boolean => {
  const needle = normalizeReproducaoSearch(term);
  if (!needle) return true;
  return normalizeReproducaoSearch(evento.brinco_matriz).includes(needle)
    || normalizeReproducaoSearch(evento.dados_protocolo?.touro ?? '').includes(needle);
};

/**
 * Calcula a previsão estimada de parto somando dias de gestação (padrão 300 dias para gado de corte)
 */
export const calcularPrevisaoParto = (dataBaseStr: string, dias = 300): string => {
  if (!dataBaseStr) return '';
  const dateObj = new Date(dataBaseStr + 'T00:00:00');
  if (isNaN(dateObj.getTime())) return '';
  dateObj.setDate(dateObj.getDate() + Number(dias));
  return dateObj.toISOString().split('T')[0];
};

/**
 * Formata data ISO (AAAA-MM-DD) para formato brasileiro (DD/MM/AAAA)
 */
export const formatarDataBR = (dataStr: string): string => {
  if (!dataStr) return '-';
  const parts = dataStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dataStr;
};
