import React, { useState, useEffect } from 'react';
import { MoreVertical, Edit, Trash2, Eye } from 'lucide-react';

export interface Column<T> {
  header: string;
  accessor?: keyof T;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  onAction?: (action: 'edit' | 'delete' | 'view', row: T) => void;
  selectedIds?: string[];
  onToggleSelect?: (id: string) => void;
  onSelectAll?: () => void;
  getRowId?: (row: T) => string;
  emptyMessage?: React.ReactNode;
}

export function Table<T extends Record<string, any>>({
  columns,
  data,
  onRowClick,
  onAction,
  selectedIds = [],
  onToggleSelect,
  onSelectAll,
  getRowId = (row) => row.id,
  emptyMessage = 'Nenhum registro encontrado.',
}: TableProps<T>) {
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);

  useEffect(() => {
    const handleClickOutside = () => setOpenDropdown(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const allSelected = data.length > 0 && selectedIds.length === data.length;

  return (
    <div className="overflow-x-auto w-full min-h-[250px] pb-24">
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50/80 dark:bg-gray-800/80 border-b border-gray-100 dark:border-gray-700/80">
          <tr>
            {onToggleSelect && (
              <th className="px-6 py-4 w-4">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => onSelectAll && onSelectAll()}
                  className="rounded border-gray-300 dark:border-gray-600 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                />
              </th>
            )}
            {columns.map((col, i) => (
              <th key={i} className={`px-6 py-4 font-semibold tracking-wider ${col.className || ''}`}>
                {col.header}
              </th>
            ))}
            {onAction && (
              <th className="px-6 py-4 text-right font-semibold tracking-wider">Ações</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
          {data.length === 0 ? (
            <tr>
              <td 
                colSpan={columns.length + (onToggleSelect ? 1 : 0) + (onAction ? 1 : 0)} 
                className="px-6 py-10 text-center text-gray-500 dark:text-gray-400 font-medium"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => {
              const rowId = getRowId(row);
              const isSelected = selectedIds.includes(rowId);
              const isOpen = openDropdown === rowIndex;
              const openUpward = data.length > 1 && rowIndex >= Math.max(1, data.length - 2);

              return (
                <tr
                  key={rowIndex}
                  style={{
                    position: 'relative',
                    zIndex: isOpen ? 50 : 'auto',
                  }}
                  className={`bg-white dark:bg-gray-800 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/40 transition-colors group cursor-pointer ${
                    isSelected ? 'bg-emerald-50/90 dark:bg-emerald-950/60' : ''
                  } ${isOpen ? '[isolation:isolate]' : ''}`}
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.closest('.actions-menu') || target.closest('input[type="checkbox"]')) return;
                    onRowClick ? onRowClick(row) : onAction && onAction('view', row);
                  }}
                >
                  {onToggleSelect && (
                    <td className="px-4 py-3 w-12 text-center" onClick={(e) => e.stopPropagation()}>
                      <label className="min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer m-auto">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onToggleSelect(rowId)}
                          className="rounded border-gray-300 dark:border-gray-600 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                        />
                      </label>
                    </td>
                  )}
                  {columns.map((col, colIndex) => (
                    <td 
                      key={colIndex} 
                      className="px-6 py-4 text-gray-700 dark:text-gray-200 whitespace-nowrap transition-colors"
                    >
                      {col.render ? col.render(row) : col.accessor ? row[col.accessor] : null}
                    </td>
                  ))}
                  {onAction && (
                    <td 
                      className="px-6 py-4 text-right relative actions-menu"
                      style={{ zIndex: isOpen ? 60 : 'auto' }}
                    >
                      <button
                        type="button"
                        className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-100/60 dark:hover:bg-gray-700 transition-colors focus:outline-none"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdown(isOpen ? null : rowIndex);
                        }}
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {/* Dropdown Menu */}
                      {isOpen && (
                        <div 
                          className={`absolute right-8 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-2xl py-1.5 border border-gray-100 dark:border-gray-700 transform transition-all ${
                            openUpward ? 'bottom-10 origin-bottom-right' : 'top-10 origin-top-right'
                          }`}
                          style={{ zIndex: 999 }}
                        >
                          <button
                            type="button"
                            className="flex w-full items-center justify-start px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAction('view', row);
                              setOpenDropdown(null);
                            }}
                          >
                            <Eye className="w-4 h-4 mr-2 text-gray-500 dark:text-gray-400" />
                            <span className="font-medium">Visualizar</span>
                          </button>
                          <button
                            type="button"
                            className="flex w-full items-center justify-start px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAction('edit', row);
                              setOpenDropdown(null);
                            }}
                          >
                            <Edit className="w-4 h-4 mr-2 text-gray-500 dark:text-gray-400" />
                            <span className="font-medium">Editar</span>
                          </button>
                          <button
                            type="button"
                            className="flex w-full items-center justify-start px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAction('delete', row);
                              setOpenDropdown(null);
                            }}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            <span className="font-medium">Excluir</span>
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
