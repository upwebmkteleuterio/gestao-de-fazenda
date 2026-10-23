/**
 * Normalização de busca por brinco/nome: espaços são ignorados, de forma que
 * "MFJF 27", "MFJF27" e "mf jf 27" encontrem o mesmo registro.
 */
export const compactSearchTerm = (value: string): string => value.replace(/\s+/g, '');

/** Compara brincos para identificação ignorando espaços e maiúsculas. */
export const isSameSearchText = (value: string | null | undefined, other: string | null | undefined): boolean =>
  compactSearchTerm(value ?? '').toLocaleLowerCase() === compactSearchTerm(other ?? '').toLocaleLowerCase();

/** Converte um termo digitado no padrão normalizado usado pelas consultas. */
export const toSearchPattern = (value: string): string => compactSearchTerm(value).toLocaleUpperCase();

/** Compara um valor cadastrado com o termo digitado ignorando espaços e maiúsculas. */
export const matchesSearchTerm = (value: string | null | undefined, term: string): boolean => {
  const compactTerm = compactSearchTerm(term).toLocaleLowerCase();
  if (!compactTerm) return true;
  return compactSearchTerm(value ?? '').toLocaleLowerCase().includes(compactTerm);
};
