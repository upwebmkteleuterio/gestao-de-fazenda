export type AnimalSortField = 'brinco' | 'created_at' | 'cdc' | 'cdn';
export type SortDirection = 'asc' | 'desc';

export const DEFAULT_ANIMAL_SORT: { sortBy: AnimalSortField; sortDir: SortDirection } = {
  sortBy: 'created_at',
  sortDir: 'desc',
};

const normalizeBrincoPart = (value: string) => value.toLocaleLowerCase().replace(/[\s\-_./]/g, '');

export const compareBrincoNatural = (left: string, right: string): number => {
  const leftTrimmed = left.trim();
  const rightTrimmed = right.trim();
  const leftMatch = leftTrimmed.match(/^(.*?)(\d+)\s*$/);
  const rightMatch = rightTrimmed.match(/^(.*?)(\d+)\s*$/);
  const leftPrefix = normalizeBrincoPart(leftMatch ? leftMatch[1] : leftTrimmed);
  const rightPrefix = normalizeBrincoPart(rightMatch ? rightMatch[1] : rightTrimmed);
  const prefixComparison = leftPrefix.localeCompare(rightPrefix);
  if (prefixComparison !== 0) return prefixComparison;

  if (leftMatch && rightMatch) {
    const numberComparison = Number(leftMatch[2]) - Number(rightMatch[2]);
    if (numberComparison !== 0) return numberComparison;
  } else if (leftMatch || rightMatch) {
    return leftMatch ? -1 : 1;
  } else {
    const textComparison = leftPrefix.localeCompare(rightPrefix);
    if (textComparison !== 0) return textComparison;
  }

  return left.localeCompare(right);
};

export const sortAnimalList = <T extends { brinco: string; createdAt?: string; cdc?: string; cdn?: string }>(
  items: T[],
  sortBy: AnimalSortField = DEFAULT_ANIMAL_SORT.sortBy,
  sortDir: SortDirection = DEFAULT_ANIMAL_SORT.sortDir,
): T[] => {
  const compare = (left: T, right: T): number => {
    if (sortBy === 'brinco') return compareBrincoNatural(left.brinco, right.brinco);
    if (sortBy === 'created_at') return (left.createdAt ?? '').localeCompare(right.createdAt ?? '');

    const leftValue = left[sortBy] ?? '';
    const rightValue = right[sortBy] ?? '';
    if (!leftValue || !rightValue) {
      if (!leftValue && !rightValue) return 0;
      return leftValue ? -1 : 1;
    }
    return leftValue.localeCompare(rightValue);
  };

  return [...items].sort((left, right) => {
    const result = compare(left, right);
    return sortDir === 'desc' ? -result : result;
  });
};
