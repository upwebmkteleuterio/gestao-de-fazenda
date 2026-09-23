import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  badge?: string | number;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className = '',
}) => (
  <div className={`border-b border-gray-200 dark:border-gray-700/80 ${className}`}>
    <nav className="-mb-px flex space-x-6 px-6 overflow-x-auto" aria-label="Tabs">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`
              whitespace-nowrap py-3.5 px-1 border-b-2 font-medium text-sm transition-colors duration-200 flex items-center space-x-2 cursor-pointer
              ${
                isActive
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 font-semibold'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300'
              }
            `}
          >
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                isActive 
                  ? 'bg-emerald-100 text-emerald-950 dark:bg-emerald-900/80 dark:text-emerald-100 border border-emerald-300 dark:border-emerald-700' 
                  : 'bg-gray-200 text-gray-900 dark:bg-gray-800 dark:text-gray-100 border border-gray-300 dark:border-gray-600'
              }`}>
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  </div>
);
