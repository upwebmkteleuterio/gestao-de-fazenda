import { EventoReproducao, Animal } from '@/types/database';

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

/**
 * Formata data ISO para DD/MM/AAAA
 */
export const formatarDataBR = (dataIso?: string): string => {
  if (!dataIso) return '-';
  const parts = dataIso.split('T')[0].split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dataIso;
};

/**
 * Exporta a lista filtrada de inseminações para CSV (compatível com Excel PT-BR)
 */
export const exportarInseminacoesCSV = (
  itens: InseminacaoRelatorioItem[],
  tituloPeriodo: string
): boolean => {
  if (!itens || itens.length === 0) {
    return false;
  }

  const headers = [
    'Brinco da Matriz',
    'Categoria',
    'Raça',
    'Data da Inseminação',
    'Protocolo',
    'Touro / Reprodutor',
    'Tipo de Sêmen',
    'Condição Corporal (ECC)',
    'Previsão DG (Toque)',
    'Resultado DG',
    'Previsão de Parto',
    'Observações'
  ];

  const rows = itens.map((item) => [
    `"${item.brinco_matriz}"`,
    `"${item.animal?.categoria || 'Matriz'}"`,
    `"${item.animal?.raca || 'Nelore'}"`,
    `"${formatarDataBR(item.data_inseminacao)}"`,
    `"${item.tipo_protocolo === 'iatf' ? 'IATF' : item.tipo_protocolo === 'monta_natural' ? 'Monta Natural' : 'TETF'}"`,
    `"${item.touro || '-'}"`,
    `"${item.tipo_semen || '-'}"`,
    `"${item.condicao_corporal || '-'}"`,
    `"${formatarDataBR(item.previsao_dg)}"`,
    `"${item.resultado_dg === 'cheia' ? 'Gestante (Prenha)' : item.resultado_dg === 'vazia' ? 'Vazia' : 'Aguardando DG'}"`,
    `"${formatarDataBR(item.previsao_parto)}"`,
    `"${(item.observacoes || '').replace(/"/g, '""')}"`
  ]);

  // UTF-8 BOM (\uFEFF) para garantir acentuação correta no Excel
  const csvString = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  const dataHoje = new Date().toISOString().split('T')[0];
  link.download = `relatorio_inseminacoes_${tituloPeriodo.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${dataHoje}.csv`;
  link.click();
  return true;
};
