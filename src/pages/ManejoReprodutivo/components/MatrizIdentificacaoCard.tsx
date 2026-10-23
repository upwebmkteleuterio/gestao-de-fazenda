import React from 'react';
import { AnimalAvatar } from '@/components/AnimalAvatar';
import { Badge } from '@/components/Badge';
import { Animal } from '@/types/database';
import { calcularIdadeFormatada } from '@/utils/animalAge';
import { CATEGORIA_ANIMAL_OPTIONS } from '@/utils/categoriaAnimal';

interface MatrizIdentificacaoCardProps {
  animal?: Animal;
  brinco: string;
}

export const MatrizIdentificacaoCard: React.FC<MatrizIdentificacaoCardProps> = ({ animal, brinco }) => {
  const categoria = animal
    ? CATEGORIA_ANIMAL_OPTIONS.find((option) => option.value === animal.categoria)?.label || animal.categoria
    : undefined;

  return (
    <section data-testid="matriz-identificacao" className="space-y-4">
      {animal && <AnimalAvatar tipo={animal.tipo_animal} />}
      <div className="bg-emerald-50/70 dark:bg-emerald-950/40 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800/50 flex justify-between items-center">
        <div>
          <p className="text-xs uppercase font-bold text-emerald-600 dark:text-emerald-400">Identificação</p>
          <p className="text-2xl font-extrabold text-gray-900 dark:text-white">{brinco}</p>
          {animal && (
            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
              {animal.tipo_animal} · {animal.raca || 'Nelore'}
            </p>
          )}
        </div>
        {animal && (
          <Badge variant={animal.status === 'ativo' ? 'success' : 'danger'}>
            {animal.status.toUpperCase()}
          </Badge>
        )}
      </div>
      {animal && (
        <div className="grid grid-cols-2 gap-4 text-sm bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
          <div>
            <p className="text-xs text-gray-400 uppercase font-semibold">Sexo</p>
            <p className="font-medium text-gray-800 dark:text-gray-200">{animal.sexo === 'F' ? 'Fêmea' : 'Macho'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase font-semibold">Idade Calculada</p>
            <p className="font-medium text-gray-800 dark:text-gray-200">{calcularIdadeFormatada(animal.data_nascimento)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase font-semibold">Data de Nascimento</p>
            <p className="font-medium text-gray-800 dark:text-gray-200">
              {animal.data_nascimento ? new Date(`${animal.data_nascimento}T00:00:00`).toLocaleDateString('pt-BR') : 'N/I'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase font-semibold">Categoria</p>
            <p className="font-medium text-gray-800 dark:text-gray-200">{categoria}</p>
          </div>
        </div>
      )}
    </section>
  );
};
