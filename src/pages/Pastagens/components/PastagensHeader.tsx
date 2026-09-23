import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/Button';

interface PastagensHeaderProps {
  onNovoPiquete: () => void;
}

export const PastagensHeader: React.FC<PastagensHeaderProps> = ({ onNovoPiquete }) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight mt-1">
          Gestão de Pastagens e Piquetes
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Visão estratégica da ocupação das áreas, capacidade de suporte, lotação e rodízio de pasto.
        </p>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <Button variant="primary" icon={Plus} onClick={onNovoPiquete}>
          Novo Piquete
        </Button>
      </div>
    </div>
  );
};
