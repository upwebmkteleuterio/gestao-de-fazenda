import React from 'react';
import { Search } from 'lucide-react';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { Select } from '@/components/Select';

interface PastagensFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFiltro: 'todos' | 'normal' | 'excedido' | 'vazio';
  onStatusChange: (value: 'todos' | 'normal' | 'excedido' | 'vazio') => void;
}

export const PastagensFilters: React.FC<PastagensFiltersProps> = ({
  searchTerm,
  onSearchChange,
  statusFiltro,
  onStatusChange,
}) => {
  return (
    <Card>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Barra de Busca por Nome do Pasto */}
        <div className="md:col-span-2">
          <Input
            noMargin
            id="search_pasto"
            placeholder="Buscar por Nome do Pasto ou Tipo de Capim..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            icon={Search}
          />
        </div>

        {/* Filtro Status de Ocupação */}
        <div>
          <Select
            noMargin
            id="filtro_status_ocupacao"
            value={statusFiltro}
            onChange={(e) => onStatusChange(e.target.value as any)}
            options={[
              { label: 'Todos os Status de Ocupação', value: 'todos' },
              { label: 'Normal (Ocupação Regular)', value: 'normal' },
              { label: 'Excedido (Capacidade Ultrapassada)', value: 'excedido' },
              { label: 'Vazio (Área Sem Animais)', value: 'vazio' },
            ]}
          />
        </div>
      </div>
    </Card>
  );
};
