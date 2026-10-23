import React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/Input';
import { Animal } from '@/types/database';
import { useMaeCandidates } from '@/hooks/useAnimais';
import { isSameSearchText } from '@/utils/searchText';

interface MaeSearchInputProps {
  value?: string;
  onChange: (value: string | undefined) => void;
  excludeId?: string;
  availableAnimals?: Animal[];
}

const motherLabel = (animal: Animal): string => `${animal.brinco} · ${animal.tipo_animal}${animal.raca ? ` · ${animal.raca}` : ''}`;

export const MaeSearchInput: React.FC<MaeSearchInputProps> = ({
  value,
  onChange,
  excludeId,
  availableAnimals = [],
}) => {
  const availableSelected = availableAnimals.find((animal) => animal.id === value || isSameSearchText(animal.brinco, value));
  const [selectedResult, setSelectedResult] = React.useState<Animal | undefined>();
  const selected = selectedResult?.id === value ? selectedResult : availableSelected;
  const selectedLabel = selected ? motherLabel(selected) : value || '';
  const [inputValue, setInputValue] = React.useState(selectedLabel);
  const previousValue = React.useRef(value);

  React.useEffect(() => {
    if (previousValue.current === value) return;
    previousValue.current = value;
    setSelectedResult(undefined);
    setInputValue(availableSelected ? motherLabel(availableSelected) : value || '');
  }, [availableSelected, value]);

  const searchValue = inputValue === selectedLabel ? '' : inputValue;
  const candidatesQuery = useMaeCandidates(searchValue, excludeId);
  const candidates = candidatesQuery.data?.data ?? [];

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  };

  const handleSelect = (animal: Animal) => {
    previousValue.current = animal.id;
    setSelectedResult(animal);
    onChange(animal.id);
    setInputValue(motherLabel(animal));
  };

  const clearSelection = () => {
    onChange(undefined);
    setInputValue('');
  };

  return (
    <div className="relative">
      <Input
        label="Mãe (busque pelo número do brinco)"
        id="mae_id"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => {
          if (value) setInputValue('');
        }}
        onBlur={() => {
          if (value && !inputValue.trim()) setInputValue(selectedLabel);
        }}
        placeholder="Digite o brinco para pesquisar"
        icon={Search}
        trailingAction={value ? (
          <button
            type="button"
            onClick={clearSelection}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
            aria-label="Remover mãe selecionada"
          >
            <X className="h-4 w-4" />
          </button>
        ) : undefined}
        hint={selected && searchValue === '' ? `Selecionada: ${motherLabel(selected)} (ID interno preservado)` : 'A seleção salva o ID interno da mãe em mae_id.'}
      />

      {searchValue.trim() && (
        <div className="absolute z-20 mt-[-0.75rem] max-h-56 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
          {candidatesQuery.isLoading && (
            <p className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">Buscando mães...</p>
          )}
          {candidatesQuery.isError && (
            <p className="px-3 py-2 text-xs text-red-600 dark:text-red-400">Não foi possível buscar no banco. Tente novamente ou confira o cache local.</p>
          )}
          {!candidatesQuery.isLoading && !candidatesQuery.isError && candidates.length === 0 && (
            <p className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">Nenhuma vaca, matriz ou novilha adulta encontrada para este brinco.</p>
          )}
          {candidates.map((animal) => (
            <button
              key={animal.id}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => handleSelect(animal)}
              className="flex w-full items-start justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
            >
              <span className="font-semibold text-gray-900 dark:text-gray-100">{animal.brinco}</span>
              <span className="ml-3 text-right text-xs text-gray-500 dark:text-gray-400">{animal.tipo_animal}{animal.raca ? ` · ${animal.raca}` : ''}</span>
            </button>
          ))}
          {candidatesQuery.data?.source === 'local' && (
            <p className="border-t border-gray-100 px-3 py-2 text-[11px] text-amber-700 dark:border-gray-700 dark:text-amber-300">Resultados do cache local/offline.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default MaeSearchInput;
