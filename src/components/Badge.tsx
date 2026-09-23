import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'neutral' | 'info';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'success',
  className = '',
}) => {
  const variants = {
    success: "bg-emerald-100 text-emerald-950 dark:bg-emerald-900/80 dark:text-emerald-100 border border-emerald-300 dark:border-emerald-700 font-bold",
    warning: "bg-amber-100 text-amber-950 dark:bg-amber-900/80 dark:text-amber-100 border border-amber-300 dark:border-amber-700 font-bold",
    danger: "bg-red-100 text-red-950 dark:bg-red-900/80 dark:text-red-100 border border-red-300 dark:border-red-700 font-bold",
    info: "bg-blue-100 text-blue-950 dark:bg-blue-900/80 dark:text-blue-100 border border-blue-300 dark:border-blue-700 font-bold",
    neutral: "bg-gray-200 text-gray-950 dark:bg-gray-800 dark:text-gray-100 border border-gray-300 dark:border-gray-600 font-bold",
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};
