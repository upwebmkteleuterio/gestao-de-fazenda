import React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/Input';
import { Animal } from '@/types/database';

interface TouroSearchInputProps {
  value?: string;
  onChange: (value: string | undefined) => void;
  animais: Animal[];
}

const isEligibleBull = (animal: Animal) => animal.sexo === 'M' && animal.status === 'ativo';
const bullLabel = (animal: Animal) => `${animal.brinco} · ${animal.tipo_animal}${animal.raca ? ` · ${animal.raca}` : ''}`;

export const TouroSearchInput: React.FC<TouroSearchInputProps> = ({ value, onChange, animais }) => {
  const eligibleAnimals = animais.filter(isEligibleBull);
  const selected = eligibleAnimals.find((animal) => animal.id === value || animal.brinco === value);
  const selectedLabel = selected ? bullLabel(selected) : value || '';
  const [inputValue, setInputValue] = React.useState(selectedLabel);
  const [isOpen, setIsOpen] = React.useState(false);
  const previousValue = React.useRef(value);
  const comboboxRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (previousValue.current === value) return;
    previousValue.current = value;
    setInputValue(selected ? bullLabel(selected) : value || '');
  }, [selected, value]);

  React.useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (comboboxRef.current && !comboboxRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const normalizedSearch = inputValue.trim().toLocaleLowerCase();
  const searchValue = inputValue === selectedLabel ? '' : normalizedSearch;
  const candidates = eligibleAnimals.filter((animal) => (
    !searchValue
      || animal.brinco.toLocaleLowerCase().includes(searchValue)
      || animal.id.toLocaleLowerCase().includes(searchValue)
  ));

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;
    setInputValue(nextValue);
    setIsOpen(true);
    if (value) {
      previousValue.current = undefined;
      onChange(undefined);
    }
  };

  const handleSelect = (animal: Animal) => {
    previousValue.current = animal.id;
    onChange(animal.id);
    setInputValue(bullLabel(animal));
    setIsOpen(false);
  };

  const clearSelection = () => {
    previousValue.current = undefined;
    onChange(undefined);
    setInputValue('');
    setIsOpen(false);
  };

  return (
    <div ref={comboboxRef} className="relative">
      <Input
        label="Touro Cobertura (Opcional)"
        id="touro_cobertura"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={(event) => {
          event.currentTarget.select();
          setIsOpen(true);
        }}
        placeholder="Busque pelo brinco ou ID do touro"
        icon={Search}
        autoComplete="off"
        role="combobox"
        aria-expanded={isOpen}
        aria-controls="touro-cobertura-options"
        trailingAction={value ? (
          <button
            type="button"
            onClick={clearSelection}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
            aria-label="Remover touro de cobertura"
          >
            <X className="h-4 w-4" />
          </button>
        ) : undefined}
        hint={selected ? `Touro selecionado: ${bullLabel(selected)} (ID interno preservado)` : 'A busca considera apenas machos ativos cadastrados.'}
      />
      {isOpen && (
        <div id="touro-cobertura-options" role="listbox" className="absolute z-20 -mt-3 max-h-56 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
          {candidates.length > 0 ? candidates.map((animal) => (
            <button
              key={animal.id}
              type="button"
              role="option"
              aria-selected={animal.id === value}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => handleSelect(animal)}
              className="flex w-full items-start justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
            >
              <span className="font-semibold text-gray-900 dark:text-gray-100">{bullLabel(animal)}</span>
              <span className="ml-3 text-right text-xs text-gray-500 dark:text-gray-400">ID: {animal.id}</span>
            </button>
          )) : (
            <p className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">Nenhum touro ativo encontrado para esta busca.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default TouroSearchInput;
