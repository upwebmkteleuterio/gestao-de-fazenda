import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye } from 'lucide-react';
import { Button } from '@/components/Button';

interface ReprodutivoHeaderProps {
  onNovoRegistro: () => void;
}

export const ReprodutivoHeader: React.FC<ReprodutivoHeaderProps> = ({ onNovoRegistro }) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight mt-1">
          Histórico Reprodutivo
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Centralização de todos os eventos reprodutivos (IATF, Monta Natural, TETF e Diagnósticos de Gestação).
        </p>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <Button
          variant="secondary"
          icon={Eye}
          onClick={() => navigate('/relatorios?tab=inseminacoes')}
          title="Visualizar relatório de inseminações por data"
        >
          Visualizar Relatório
        </Button>
        <Button variant="primary" icon={Plus} onClick={onNovoRegistro}>
          Novo Registro Reprodutivo
        </Button>
      </div>
    </div>
  );
};

