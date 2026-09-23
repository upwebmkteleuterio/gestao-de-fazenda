import React from 'react';

export interface SwitchProps {
  label?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export const Switch: React.FC<SwitchProps> = ({
  label,
  checked,
  onChange,
  disabled = false,
}) => (
  <div className="flex items-center justify-between py-2">
    {label && <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>}
    <button
      type="button"
      disabled={disabled}
      className={`${
        checked ? 'bg-emerald-600' : 'bg-gray-200 dark:bg-gray-700'
      } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed`}
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
    >
      <span
        className={`${
          checked ? 'translate-x-5' : 'translate-x-0'
        } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
      />
    </button>
  </div>
);
