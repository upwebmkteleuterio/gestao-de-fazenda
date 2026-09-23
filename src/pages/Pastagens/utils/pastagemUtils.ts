/**
 * Utilitários para gestão e monitoramento de pastagens
 */

/**
 * Checa se a data prevista de saída do pasto está vencida em relação ao dia atual
 */
export const checkSaidaVencida = (dataSaida?: string): boolean => {
  if (!dataSaida) return false;
  const hoje = new Date().toISOString().split('T')[0];
  return dataSaida < hoje;
};

/**
 * Retorna as informações de lotação calculadas (porcentagem, variante de badge e rótulo)
 */
export const calcularStatusLotacao = (
  qtdAnimais: number = 0,
  lotacaoMaxima: number = 1
) => {
  const max = Math.max(lotacaoMaxima, 1);
  const percentual = Math.round((qtdAnimais / max) * 100);

  let badgeVariant: 'success' | 'warning' | 'danger' | 'neutral' = 'success';
  let statusLabel = 'Normal';

  if (qtdAnimais === 0) {
    badgeVariant = 'neutral';
    statusLabel = 'Vazio';
  } else if (qtdAnimais > max) {
    badgeVariant = 'danger';
    statusLabel = 'Excedido';
  } else if (percentual >= 85) {
    badgeVariant = 'warning';
    statusLabel = 'Capacidade Alta';
  }

  return {
    qtd: qtdAnimais,
    max,
    percentual,
    badgeVariant,
    statusLabel,
    isExcedido: qtdAnimais > max,
  };
};
