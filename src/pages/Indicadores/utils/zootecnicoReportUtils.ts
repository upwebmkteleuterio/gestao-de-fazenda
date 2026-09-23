import { Animal, Pesagem } from '@/types/database';

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

export function exportarZootecnicosCSV(animais: Animal[], pesagens: Pesagem[], kpis: ZootecnicoKpis) {
  const dataHoje = new Date().toLocaleDateString('pt-BR');

  const linhas: string[] = [
    'FARMNEXUS AGROPECUÁRIA - RELATÓRIO ZOOTÉCNICO E KPIS',
    `Data de Emissão: ${dataHoje}`,
    '',
    'INDICADORES ZOOTÉCNICOS PRINCIPAIS',
    `Taxa de Descarte;${kpis.taxaDescarte}%;(${kpis.descartesCount} animais)`,
    `GMD Médio Geral;${kpis.gmdMedio}`,
    `Taxa de Prenhez IATF;${kpis.taxaPrenhez}`,
    `Custo Médio por Cabeça/Mês;${kpis.custoMedio}`,
    '',
    'ESTRUTURA DO REBANHO',
    `Total de Animais;${kpis.totalAnimais}`,
    `Bezerros(as);${kpis.bezerros}`,
    `Vacas / Novilhas;${kpis.vacas}`,
    `Matrizes / Doadoras;${kpis.matrizes}`,
    `Touros / Reprodutores;${kpis.touros}`,
    '',
    'HISTÓRICO DE PESAGENS E GANHO MÉDIO DIÁRIO (GMD)',
    'Brinco;Tipo;Observações;Data Pesagem;Peso (kg);Peso Anterior (kg);GMD (kg/dia);Dias Intervalo',
  ];

  pesagens.forEach(p => {
    const colunas = [
      p.brinco_animal || '',
      p.tipo_animal || '',
      p.observacoes || '-',
      p.data_pesagem ? new Date(p.data_pesagem).toLocaleDateString('pt-BR') : '',
      p.peso_kg ? p.peso_kg.toString() : '',
      p.peso_anterior ? p.peso_anterior.toString() : '-',
      p.gmd_calculado ? p.gmd_calculado.toString() : '-',
      p.dias_intervalo ? p.dias_intervalo.toString() : '-',
    ];
    linhas.push(colunas.join(';'));
  });

  const conteudoCsv = '\uFEFF' + linhas.join('\r\n');
  const blob = new Blob([conteudoCsv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `relatorio-zootecnico-${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
