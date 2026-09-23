import React from 'react';

export interface SelectOption {
  label: string;
  value: string | number;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
  noMargin?: boolean;
}

export const Select: React.FC<SelectProps> = ({
  label,
  id,
  error,
  options = [],
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
    <div className="w-full">
      <select
        id={id}
        disabled={disabled}
        className={`block w-full rounded-lg border ${
          error 
            ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
            : 'border-gray-300 dark:border-gray-700 focus:ring-emerald-500 focus:border-emerald-500'
        } bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm text-sm px-3.5 py-2 outline-none transition-colors disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:text-gray-500 ${className}`}
        {...props}
      >
        {options.map((opt, i) => (
          <option key={i} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
    {error && <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">{error}</p>}
  </div>
);
