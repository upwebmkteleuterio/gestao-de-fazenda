import React from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  MorphSelect,
  MorphSelectContent,
  MorphSelectItem,
  MorphSelectTrigger,
  MorphSelectValue,
} from '@/components/ui/select-morph';

export interface SelectOption {
  label: string;
  value: string | number;
  disabled?: boolean;
  icon?: LucideIcon;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
  noMargin?: boolean;
}

const toSelectValue = (value: React.SelectHTMLAttributes<HTMLSelectElement>['value']) => {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return undefined;
};

export const Select: React.FC<SelectProps> = ({
  label,
  id,
  error,
  options = [],
  className = '',
  disabled,
  noMargin = false,
  value,
  defaultValue,
  onChange,
  'aria-describedby': ariaDescribedBy,
  'aria-errormessage': ariaErrorMessage,
  'aria-invalid': ariaInvalid,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  autoFocus,
  form,
  name,
  required,
  tabIndex,
  title,
}) => {
  const optionValues = options.map((option) => ({ ...option, value: String(option.value) }));
  const selectedValue = toSelectValue(value);
  const initialValue = selectedValue ?? toSelectValue(defaultValue) ?? optionValues[0]?.value;
  const errorId = id ? `${id}-error` : undefined;

  const handleValueChange = (nextValue: string) => {
    if (!onChange) return;
    const target = { value: nextValue, name, id };
    onChange({ target, currentTarget: target } as unknown as React.ChangeEvent<HTMLSelectElement>);
  };

  return (
    <div className={`w-full flex flex-col ${noMargin ? '' : 'mb-4'}`}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 leading-snug">
          {label}
        </label>
      )}
      <MorphSelect
        id={id}
        value={selectedValue}
        defaultValue={initialValue}
        onValueChange={handleValueChange}
        disabled={disabled}
        className="w-full"
      >
        <MorphSelectTrigger
          className={`block w-full rounded-xl border ${
            error
              ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
              : 'border-gray-300 dark:border-gray-700 focus:ring-emerald-500 focus:border-emerald-500'
          } bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm text-sm px-3.5 py-2.5 outline-none transition-colors hover:border-emerald-400 focus-visible:ring-2 focus-visible:ring-emerald-500/30 disabled:pointer-events-none disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:text-gray-500 disabled:opacity-50 ${className}`}
          aria-describedby={errorId ?? ariaDescribedBy}
          aria-errormessage={ariaErrorMessage}
          aria-invalid={ariaInvalid ?? Boolean(error)}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          aria-required={required}
          autoFocus={autoFocus}
          form={form}
          name={name}
          tabIndex={tabIndex}
          title={title}
        >
          <MorphSelectValue />
        </MorphSelectTrigger>
        <MorphSelectContent className="shadow-sm">
          {optionValues.map((option, index) => (
            <MorphSelectItem key={`${option.value}-${index}`} value={option.value} disabled={option.disabled} icon={option.icon}>
              {option.label}
            </MorphSelectItem>
          ))}
        </MorphSelectContent>
      </MorphSelect>
      {error && (
        <p id={errorId} className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
};
