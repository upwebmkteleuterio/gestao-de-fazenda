import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
  noMargin?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  id,
  error,
  hint,
  icon: Icon,
  className = '',
  disabled,
  noMargin = false,
  ...props
}) => (
  <div className={`w-full flex flex-col ${noMargin ? '' : 'mb-4'}`}>
    {label && (
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 leading-snug">
        {label}
      </label>
    )}
    <div className="relative w-full">
      {Icon && (
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
          <Icon className="w-4 h-4" />
        </div>
      )}
      <input
        id={id}
        disabled={disabled}
        className={`block w-full rounded-lg border ${
          error 
            ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
            : 'border-gray-300 dark:border-gray-700 focus:ring-emerald-500 focus:border-emerald-500'
        } bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm text-sm ${
          Icon ? 'pl-9 pr-3.5' : 'px-3.5'
        } py-2 outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:text-gray-500 ${className}`}
        {...props}
      />
    </div>
    {hint && !error && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{hint}</p>}
    {error && <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">{error}</p>}
  </div>
);
