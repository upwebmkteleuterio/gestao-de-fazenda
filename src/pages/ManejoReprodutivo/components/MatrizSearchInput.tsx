import React from 'react';
import { Input } from '@/components/Input';
import { Animal } from '@/types/database';
import { sortAnimalList } from '@/utils/animalSort';
import { matchesSearchTerm } from '@/utils/searchText';

type MatrizSearchInputProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  matrizes: Animal[];
  placeholder: string;
  optionSuffix: (matriz: Animal) => string;
  required?: boolean;
  testId: string;
  panelOpen: boolean;
};

export const MatrizSearchInput: React.FC<MatrizSearchInputProps> = ({
  id,
  value,
  onChange,
  matrizes,
  placeholder,
  optionSuffix,
  required = false,
  testId,
  panelOpen,
}) => {
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const [highlightedIndex, setHighlightedIndex] = React.useState(0);
  const listId = `${id}-sugestoes`;

  const filteredMatrizes = React.useMemo(
    () => sortAnimalList(matrizes, 'brinco', 'asc').filter((matriz) => matchesSearchTerm(matriz.brinco, value)),
    [matrizes, value],
  );
  const visibleMatrizes = filteredMatrizes.slice(0, 40);

  React.useEffect(() => {
    if (!panelOpen) setDropdownOpen(false);
  }, [panelOpen]);

  React.useEffect(() => {
    if (!dropdownOpen) return;

    const handleMouseDown = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [dropdownOpen]);

  const selectMatriz = (matriz: Animal) => {
    onChange(matriz.brinco);
    setDropdownOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape' && dropdownOpen) {
      event.preventDefault();
      event.stopPropagation();
      setDropdownOpen(false);
      return;
    }

    if (!dropdownOpen) return;

    if (event.key === 'ArrowDown' && visibleMatrizes.length > 0) {
      event.preventDefault();
      setHighlightedIndex((current) => (current + 1) % visibleMatrizes.length);
    } else if (event.key === 'ArrowUp' && visibleMatrizes.length > 0) {
      event.preventDefault();
      setHighlightedIndex((current) => (current - 1 + visibleMatrizes.length) % visibleMatrizes.length);
    } else if (event.key === 'Enter' && visibleMatrizes[highlightedIndex]) {
      event.preventDefault();
      selectMatriz(visibleMatrizes[highlightedIndex]);
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <Input
        id={id}
        type="text"
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setHighlightedIndex(0);
        }}
        onFocus={() => {
          setDropdownOpen(true);
          setHighlightedIndex(0);
        }}
        onClick={() => setDropdownOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={dropdownOpen}
        aria-controls={listId}
        required={required}
        noMargin
      />
      {dropdownOpen && (
        <div
          id={listId}
          data-testid={testId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-700 dark:bg-gray-800"
        >
          {visibleMatrizes.length > 0 ? visibleMatrizes.map((matriz, index) => (
            <button
              key={matriz.id}
              type="button"
              role="option"
              aria-selected={index === highlightedIndex}
              className={`flex min-h-11 w-full items-center rounded-lg px-3 py-2.5 text-left text-sm text-gray-700 dark:text-gray-200 ${
                index === highlightedIndex
                  ? 'bg-emerald-50 dark:bg-emerald-950/40'
                  : 'hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
              }`}
              onMouseEnter={() => setHighlightedIndex(index)}
              onClick={() => selectMatriz(matriz)}
            >
              <span className="font-medium">{`Brinco #${matriz.brinco} ${optionSuffix(matriz)}`}</span>
            </button>
          )) : (
            <p className="px-3 py-2.5 text-sm text-gray-500 dark:text-gray-400">Nenhuma matriz encontrada.</p>
          )}
          {filteredMatrizes.length > 40 && (
            <p className="px-3 py-2 text-center text-xs text-gray-500 dark:text-gray-400">
              Mostrando 40 de {filteredMatrizes.length} — continue digitando para refinar
            </p>
          )}
        </div>
      )}
    </div>
  );
};
