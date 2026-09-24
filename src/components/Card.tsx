import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
  action?: React.ReactNode;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  children,
  className = '',
  noPadding = false,
  action,
  onClick,
  ...props
}) => (
  <div
    className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/80 overflow-hidden ${className} ${
      onClick ? 'cursor-pointer hover:border-gray-300 dark:hover:border-gray-600 transition-colors' : ''
    }`}
    onClick={onClick}
    {...props}
  >
    {(title || action) && (
      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700/80 flex justify-between items-center bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm z-20 relative">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
          {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
    )}
    <div className={`${noPadding ? '' : 'p-6'} relative h-full flex flex-col`}>
      {children}
    </div>
  </div>
);
