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
