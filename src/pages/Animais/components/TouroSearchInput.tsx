import React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/Input';
import { Animal } from '@/types/database';
import { isSameSearchText, matchesSearchTerm } from '@/utils/searchText';

interface TouroSearchInputProps {
  value?: string;
  onChange: (value: string | undefined) => void;
  animais: Animal[];
}

type BullMode = 'touros' | 'manual';

const isEligibleBull = (animal: Animal) => animal.sexo === 'M' && animal.status === 'ativo';
const bullLabel = (animal: Animal) => `${animal.brinco} · ${animal.tipo_animal}${animal.raca ? ` · ${animal.raca}` : ''}`;

export const TouroSearchInput: React.FC<TouroSearchInputProps> = ({ value, onChange, animais }) => {
  const eligibleAnimals = React.useMemo(() => animais.filter(isEligibleBull), [animais]);
  const selected = eligibleAnimals.find((animal) => animal.id === value || isSameSearchText(animal.brinco, value));
  const selectedLabel = selected ? bullLabel(selected) : value || '';
  const [mode, setMode] = React.useState<BullMode>(() => selected ? 'touros' : 'manual');
  const [inputValue, setInputValue] = React.useState(() => selected ? bullLabel(selected) : value || '');
  const [isOpen, setIsOpen] = React.useState(false);
  const previousValue = React.useRef(value);
  const lastInternalValue = React.useRef(value);
  const userInteracted = React.useRef(false);
  const comboboxRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (previousValue.current !== value) {
      previousValue.current = value;
      if (lastInternalValue.current === value) {
        lastInternalValue.current = undefined;
        return;
      }
      userInteracted.current = false;
      setMode(selected ? 'touros' : 'manual');
      setInputValue(selected ? bullLabel(selected) : value || '');
      return;
    }

    if (userInteracted.current) return;
    if (selected && mode === 'manual') {
      setMode('touros');
      setInputValue(bullLabel(selected));
    } else if (!selected && mode === 'touros' && value) {
      setMode('manual');
      setInputValue(value);
    }
  }, [value, selected, mode]);

  React.useEffect(() => {
    if (mode === 'touros' && selected && inputValue !== bullLabel(selected)) {
      setInputValue(bullLabel(selected));
    }
  }, [mode, selected, inputValue]);

  React.useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (comboboxRef.current && !comboboxRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const updateValue = (nextValue: string) => {
    const next = nextValue || undefined;
    lastInternalValue.current = next;
    onChange(next);
  };

  const selectMode = (nextMode: BullMode) => {
    userInteracted.current = true;
    setMode(nextMode);
    setIsOpen(nextMode === 'touros');
    setInputValue(nextMode === 'touros' ? selectedLabel : selected?.brinco || value || '');
  };

  const normalizedSearch = inputValue.trim().toLocaleLowerCase();
  const searchValue = mode === 'touros' && selected && inputValue === selectedLabel ? '' : normalizedSearch;
  const candidates = eligibleAnimals.filter((animal) => (
    !searchValue
      || matchesSearchTerm(animal.brinco, searchValue)
      || animal.id.toLocaleLowerCase().includes(searchValue)
  ));

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;
    userInteracted.current = true;
    setInputValue(nextValue);
    if (mode === 'touros') setIsOpen(true);
    updateValue(nextValue);
  };

  const handleSelect = (animal: Animal) => {
    userInteracted.current = true;
    updateValue(animal.id);
    setInputValue(bullLabel(animal));
    setIsOpen(false);
  };

  const clearSelection = () => {
    userInteracted.current = true;
    updateValue('');
    setInputValue('');
    setIsOpen(false);
  };

  return (
    <div ref={comboboxRef} className="relative">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-wide text-purple-800 dark:text-purple-300">Modo de seleção</span>
        <div className="inline-flex rounded-lg border border-purple-200 bg-white p-0.5 dark:border-purple-800 dark:bg-gray-800" role="group" aria-label="Modo do touro de cobertura">
          <button
            type="button"
            aria-pressed={mode === 'touros'}
            onClick={() => selectMode('touros')}
            className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${mode === 'touros' ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-purple-50 dark:text-gray-300 dark:hover:bg-purple-950/40'}`}
          >
            Touros
          </button>
          <button
            type="button"
            aria-pressed={mode === 'manual'}
            onClick={() => selectMode('manual')}
            className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${mode === 'manual' ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-purple-50 dark:text-gray-300 dark:hover:bg-purple-950/40'}`}
          >
            Manual
          </button>
        </div>
      </div>
      <Input
        label="Touro Cobertura (Opcional)"
        id="touro_cobertura"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={(event) => {
          if (mode === 'touros') event.currentTarget.select();
          setIsOpen(mode === 'touros');
        }}
        placeholder={mode === 'touros' ? 'Busque pelo brinco ou ID do touro' : 'Digite o touro de cobertura'}
        icon={Search}
        autoComplete="off"
        role="combobox"
        aria-expanded={mode === 'touros' && isOpen}
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
        hint={mode === 'manual'
          ? 'Digite livremente. Textos antigos continuam editáveis e serão salvos como texto.'
          : selected ? `Touro selecionado: ${bullLabel(selected)} (ID interno preservado)` : 'A busca considera apenas machos ativos cadastrados; uma referência não encontrada pode ser salva como texto.'}
      />
      {mode === 'touros' && isOpen && (
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
