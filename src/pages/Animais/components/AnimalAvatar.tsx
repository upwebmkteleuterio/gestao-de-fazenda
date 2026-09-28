import React from 'react';
import { TipoAnimal } from '../../../types/database';

type AnimalAvatarConfig = {
  src: string;
  label: string;
};

const ANIMAL_AVATARS: Record<TipoAnimal, AnimalAvatarConfig> = {
  vaca: { src: '/assets/animais/Vaca.png', label: 'Vaca' },
  touro: { src: '/assets/animais/Touro.png', label: 'Touro' },
  bezerra: { src: '/assets/animais/Bezerra.png', label: 'Bezerra' },
  bezerro: { src: '/assets/animais/Bezerro.png', label: 'Bezerro' },
  novilha: { src: '/assets/animais/Novilha.png', label: 'Novilha' },
  garrote: { src: '/assets/animais/Garrote.png', label: 'Garrote' },
  matriz: { src: '/assets/animais/Vaca.png', label: 'Matriz (representada por Vaca)' },
};

interface AnimalAvatarProps {
  tipo?: TipoAnimal;
}

export const AnimalAvatar: React.FC<AnimalAvatarProps> = ({ tipo }) => {
  const avatar = tipo ? ANIMAL_AVATARS[tipo] : ANIMAL_AVATARS.vaca;

  return (
    <div className="flex justify-center" aria-label={`Avatar de ${avatar.label}`}>
      <img
        src={avatar.src}
        alt={`Avatar de ${avatar.label}`}
        className="h-24 w-24 shrink-0 rounded-full border-4 border-emerald-100 bg-emerald-50 object-cover shadow-sm dark:border-emerald-800 dark:bg-emerald-950 sm:h-28 sm:w-28"
      />
    </div>
  );
};
