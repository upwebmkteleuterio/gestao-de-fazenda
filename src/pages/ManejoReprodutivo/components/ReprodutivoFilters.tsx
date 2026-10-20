import React from 'react';
import { Search, RotateCcw } from 'lucide-react';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { Select } from '@/components/Select';
import { Button } from '@/components/Button';
import { CATEGORIA_ANIMAL_OPTIONS } from '@/utils/categoriaAnimal';
import type { ReprodutivoPeriod } from '../hooks/useReproducaoTable';
import { formatarDataBR } from '../utils/reproducaoUtils';

interface ReprodutivoFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  protocolo: string;
  onProtocoloChange: (value: string) => void;
  categoria: string;
  onCategoriaChange: (value: string) => void;
  periodo: ReprodutivoPeriod;
  onPeriodoChange: (value: ReprodutivoPeriod) => void;
  dataInicio: string;
  onDataInicioChange: (value: string) => void;
  dataFim: string;
  onDataFimChange: (value: string) => void;
  dateRangeError?: string;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
  disabled?: boolean;
}

export const ReprodutivoFilters: React.FC<ReprodutivoFiltersProps> = ({
  search,
  onSearchChange,
  protocolo,
  onProtocoloChange,
  categoria,
  onCategoriaChange,
  periodo,
  onPeriodoChange,
  dataInicio,
  onDataInicioChange,
  dataFim,
  onDataFimChange,
  dateRangeError,
  onClearFilters,
  hasActiveFilters,
  disabled = false,
}) => {
  return (
    <Card>
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
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
              disabled={disabled}
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
              disabled={disabled}
              options={[
                { label: 'Todos os Protocolos', value: 'all' },
                { label: 'IATF (Inseminação)', value: 'iatf' },
                { label: 'Monta Natural', value: 'monta_natural' },
                { label: 'TETF (Transferência Embrião)', value: 'tetf' },
                { label: 'Diagnóstico DG', value: 'dg' },
              ]}
            />
          </div>

          {/* Filtro Categoria */}
          <div>
            <Select
              noMargin
              id="filter_categoria"
              label="Categoria"
              value={categoria}
              onChange={(e) => onCategoriaChange(e.target.value)}
              options={CATEGORIA_ANIMAL_OPTIONS}
              disabled={disabled}
            />
          </div>

          {/* Seletor de período */}
          <div>
            <Select
              noMargin
              id="filter_periodo"
              label="Período"
              value={periodo}
              onChange={(e) => onPeriodoChange(e.target.value as ReprodutivoPeriod)}
              disabled={disabled}
              options={[
                { label: 'Últimos 7 dias', value: '7' },
                { label: 'Últimos 15 dias', value: '15' },
                { label: 'Últimos 30 dias', value: '30' },
                { label: 'Últimos 2 meses (60 dias)', value: '60' },
                { label: 'Últimos 3 meses (90 dias)', value: '90' },
                { label: 'Período personalizado', value: 'custom' },
                { label: 'Todo o histórico', value: 'all' },
              ]}
            />
          </div>

          {periodo === 'custom' ? (
            <>
              {/* Filtro Período: De */}
              <div>
                <Input
                  noMargin
                  id="filter_data_inicio"
                  type="date"
                  label="Período De"
                  value={dataInicio}
                  onChange={(e) => onDataInicioChange(e.target.value)}
                  disabled={disabled}
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
                  disabled={disabled}
                  error={dateRangeError}
                />
              </div>
            </>
          ) : (
            <div className="flex min-h-[68px] flex-col justify-end rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800/50">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Período selecionado</span>
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                {periodo === 'all'
                  ? 'Todo o histórico'
                  : `${formatarDataBR(dataInicio)} a ${formatarDataBR(dataFim)}`}
              </span>
            </div>
          )}
        </div>
        {dateRangeError && (
          <p className="text-xs font-medium text-red-600 dark:text-red-400" role="alert">
            Ajuste o período para realizar a busca.
          </p>
        )}

        {/* Barra de ação auxiliar se houver filtros ativos */}
        {hasActiveFilters && (
          <div className="flex justify-end pt-1">
            <Button
              variant="ghost"
              icon={RotateCcw}
              onClick={onClearFilters}
              disabled={disabled}
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
