/**
 * Utilitários para cálculos e formatação de manejo reprodutivo
 */

/**
 * Calcula a previsão estimada de parto somando dias de gestação (padrão 290 dias para gado de corte)
 */
export const calcularPrevisaoParto = (dataBaseStr: string, dias = 290): string => {
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
