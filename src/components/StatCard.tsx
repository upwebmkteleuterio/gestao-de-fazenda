import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { Card } from './Card';

export interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon | React.ComponentType<{ className?: string }>;
  trend?: 'up' | 'down';
  trendValue?: string;
  subtitle?: string;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  trendValue,
  subtitle,
  onClick,
}) => {
  const isPositive = trend === 'up';

  return (
    <Card className="relative group hover:shadow-md transition-all duration-300" noPadding onClick={onClick}>
      {/* Visual background details: Subtle dots pattern top-left & emerald glow top-right */}
      <div 
        className="absolute top-0 left-0 w-24 h-24 opacity-20 dark:opacity-10 pointer-events-none z-0" 
        style={{ 
          backgroundImage: 'radial-gradient(#9ca3af 2px, transparent 2px)', 
          backgroundSize: '14px 14px', 
          backgroundPosition: '2px 2px' 
        }} 
      />
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-400/20 dark:bg-emerald-500/10 blur-3xl rounded-full pointer-events-none z-0 transition-transform duration-700 group-hover:scale-125" />

      <div className="p-6 flex flex-col justify-between h-full relative z-10">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{title}</p>
            <h4 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{value}</h4>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-800/50 shadow-sm rounded-xl text-emerald-600 dark:text-emerald-400">
            <Icon className="w-6 h-6" />
          </div>
        </div>
        {(trendValue || subtitle) && (
          <div className="mt-4 flex items-center text-sm">
            {trendValue && (
              <span className={`flex items-center font-medium px-2 py-0.5 rounded-full text-xs ${
                isPositive 
                  ? 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' 
                  : 'bg-red-50 dark:bg-red-900/40 text-red-700 dark:text-red-300'
              }`}>
                {isPositive ? <TrendingUp className="w-3.5 h-3.5 mr-1" /> : <TrendingDown className="w-3.5 h-3.5 mr-1" />}
                {trendValue}
              </span>
            )}
            {subtitle && (
              <span className="text-gray-500 dark:text-gray-400 ml-2 text-xs font-medium tracking-wide uppercase">
                {subtitle}
              </span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};
