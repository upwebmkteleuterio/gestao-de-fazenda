import React, { useState } from 'react';
import { Edit, Trash2 } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  TABLE_ROW_EXIT_DURATION_MS,
  useAnimatedTableRows,
} from '@/hooks/useAnimatedTableRows';

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

const defaultGetRowId = (row: Record<string, unknown>) => row.id as string;

export function Table<T extends Record<string, any>>({
  columns,
  data,
  onRowClick,
  onAction,
  selectedIds = [],
  onToggleSelect,
  onSelectAll,
  getRowId = defaultGetRowId,
  emptyMessage = 'Nenhum registro encontrado.',
}: TableProps<T>) {
  const [deleteIntentId, setDeleteIntentId] = useState<string | null>(null);
  const reduceMotion = useReducedMotion() ?? false;
  const { rows: animatedRows } = useAnimatedTableRows(data, getRowId, deleteIntentId, reduceMotion);

  const allSelected = data.length > 0 && selectedIds.length === data.length;
  const rowTransition = { duration: reduceMotion ? 0 : TABLE_ROW_EXIT_DURATION_MS / 1000 };

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
          {animatedRows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length + (onToggleSelect ? 1 : 0) + (onAction ? 1 : 0)}
                className="px-6 py-10 text-center text-gray-500 dark:text-gray-400 font-medium"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            <AnimatePresence initial={false}>
              {animatedRows.map(({ row, id: rowId }) => {
                const isSelected = selectedIds.includes(rowId);

                return (
                    <motion.tr
                      key={rowId}
                      layout={!reduceMotion}
                      initial={false}
                      animate={{ opacity: 1, x: 0 }}
                      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -16 }}
                      transition={rowTransition}
                      style={{ position: 'relative' }}
                  className={`bg-white dark:bg-gray-800 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/40 transition-colors group cursor-pointer ${
                    isSelected ? 'bg-emerald-50/90 dark:bg-emerald-950/60' : ''
                  }`}
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
                    <td className="px-3 sm:px-6 py-3 text-right whitespace-nowrap actions-menu">
                      <button
                        type="button"
                        title="Editar"
                        aria-label="Editar"
                        className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-100/60 dark:hover:bg-gray-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-800"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAction('edit', row);
                        }}
                      >
                        <Edit className="w-4 h-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        title="Excluir"
                        aria-label="Excluir"
                        className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-800"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteIntentId(rowId);
                          onAction('delete', row);
                        }}
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </td>
                  )}
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          )}
        </tbody>
      </table>
    </div>
  );
}
