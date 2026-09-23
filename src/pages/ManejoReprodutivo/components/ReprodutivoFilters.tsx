import React from 'react';
import { Search, RotateCcw } from 'lucide-react';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { Select } from '@/components/Select';
import { Button } from '@/components/Button';

interface ReprodutivoFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  protocolo: string;
  onProtocoloChange: (value: string) => void;
  dataInicio: string;
  onDataInicioChange: (value: string) => void;
  dataFim: string;
  onDataFimChange: (value: string) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

export const ReprodutivoFilters: React.FC<ReprodutivoFiltersProps> = ({
  search,
  onSearchChange,
  protocolo,
  onProtocoloChange,
  dataInicio,
  onDataInicioChange,
  dataFim,
  onDataFimChange,
  onClearFilters,
  hasActiveFilters,
}) => {
  return (
    <Card>
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Busca por Brinco da Matriz */}
          <div>
            <Input
              noMargin
              id="search_matriz"
              label="Buscar Matriz"
              placeholder="Brinco da Matriz..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              icon={Search}
            />
          </div>

          {/* Filtro Protocolo */}
          <div>
            <Select
              noMargin
              id="filter_protocolo"
              label="Tipo de Protocolo"
              value={protocolo}
              onChange={(e) => onProtocoloChange(e.target.value)}
              options={[
                { label: 'Todos os Protocolos', value: 'all' },
                { label: 'IATF (Inseminação)', value: 'iatf' },
                { label: 'Monta Natural', value: 'monta_natural' },
                { label: 'TETF (Transferência Embrião)', value: 'tetf' },
                { label: 'Diagnóstico DG', value: 'dg' },
              ]}
            />
          </div>

          {/* Filtro Período: De */}
          <div>
            <Input
              noMargin
              id="filter_data_inicio"
              type="date"
              label="Período De"
              value={dataInicio}
              onChange={(e) => onDataInicioChange(e.target.value)}
            />
          </div>

          {/* Filtro Período: Até */}
          <div>
            <Input
              noMargin
              id="filter_data_fim"
              type="date"
              label="Período Até"
              value={dataFim}
              onChange={(e) => onDataFimChange(e.target.value)}
            />
          </div>
        </div>

        {/* Barra de ação auxiliar se houver filtros ativos */}
        {hasActiveFilters && (
          <div className="flex justify-end pt-1">
            <Button
              variant="ghost"
              icon={RotateCcw}
              onClick={onClearFilters}
              className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400"
            >
              Limpar Filtros
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};
