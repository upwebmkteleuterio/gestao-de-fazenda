import React from 'react';
import { Calendar, FileText, Hash, Tag } from 'lucide-react';
import { Select } from '@/components/Select';
import { AnimalSortField, SortDirection } from '@/utils/animalSort';
import { CATEGORIA_ANIMAL_OPTIONS } from '@/utils/categoriaAnimal';

interface AnimaisFiltersProps {
  tipo: string;
  onTipoChange: (value: string) => void;
  sexo: string;
  onSexoChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  categoria: string;
  onCategoriaChange: (value: string) => void;
  sortBy: AnimalSortField;
  sortDir: SortDirection;
  onSortByChange: (value: AnimalSortField) => void;
  onSortDirChange: (value: SortDirection) => void;
}

export const AnimaisFilters: React.FC<AnimaisFiltersProps> = ({
  tipo,
  onTipoChange,
  sexo,
  onSexoChange,
  status,
  onStatusChange,
  categoria,
  onCategoriaChange,
  sortBy,
  sortDir,
  onSortByChange,
  onSortDirChange,
}) => {
  return (
    <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
      <Select
        id="filter-ordenacao"
        value={`${sortBy}:${sortDir}`}
        onChange={(event) => {
          const [field, direction] = event.target.value.split(':') as [AnimalSortField, SortDirection];
          onSortByChange(field);
          onSortDirChange(direction);
        }}
        options={[
          { label: 'Data de cadastro (mais recentes)', value: 'created_at:desc', icon: Calendar },
          { label: 'Data de cadastro (mais antigos)', value: 'created_at:asc', icon: Calendar },
          { label: 'Brinco (número crescente)', value: 'brinco:asc', icon: Hash },
          { label: 'Brinco (número decrescente)', value: 'brinco:desc', icon: Hash },
          { label: 'CDC (crescente)', value: 'cdc:asc', icon: FileText },
          { label: 'CDC (decrescente)', value: 'cdc:desc', icon: FileText },
          { label: 'CDN (crescente)', value: 'cdn:asc', icon: Tag },
          { label: 'CDN (decrescente)', value: 'cdn:desc', icon: Tag },
        ]}
      />

      <Select
        id="filter-tipo"
        value={tipo}
        onChange={(e) => onTipoChange(e.target.value)}
        options={[
          { label: 'Todos os Tipos', value: 'all' },
          { label: 'Vaca', value: 'vaca' },
          { label: 'Touro', value: 'touro' },
          { label: 'Bezerra', value: 'bezerra' },
          { label: 'Bezerro', value: 'bezerro' },
          { label: 'Novilha', value: 'novilha' },
          { label: 'Garrote', value: 'garrote' },
          { label: 'Novilho', value: 'novilho' },
          { label: 'Matriz', value: 'matriz' },
        ]}
      />

      <Select
        id="filter-sexo"
        value={sexo}
        onChange={(e) => onSexoChange(e.target.value)}
        options={[
          { label: 'Todos os Sexos', value: 'all' },
          { label: 'Fêmea', value: 'F' },
          { label: 'Macho', value: 'M' },
        ]}
      />

      <Select
        id="filter-status"
        value={status}
        onChange={(e) => onStatusChange(e.target.value)}
        options={[
          { label: 'Todos os Status', value: 'all' },
          { label: 'Ativos', value: 'ativo' },
          { label: 'Descarte', value: 'descarte' },
        ]}
      />

      <Select
        id="filter-categoria"
        value={categoria}
        onChange={(e) => onCategoriaChange(e.target.value)}
        options={CATEGORIA_ANIMAL_OPTIONS}
      />
    </div>
  );
};
