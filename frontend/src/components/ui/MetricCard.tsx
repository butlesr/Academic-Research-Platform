'use client';

import { cn } from '@/lib/utils';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';

const colorMap = {
  blue:   { bg: 'bg-blue-50 dark:bg-blue-900/20',   icon: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400',   text: 'text-blue-700 dark:text-blue-300' },
  green:  { bg: 'bg-emerald-50 dark:bg-emerald-900/20', icon: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400', text: 'text-emerald-700 dark:text-emerald-300' },
  red:    { bg: 'bg-red-50 dark:bg-red-900/20',     icon: 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400',     text: 'text-red-700 dark:text-red-300' },
  purple: { bg: 'bg-purple-50 dark:bg-purple-900/20', icon: 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400', text: 'text-purple-700 dark:text-purple-300' },
  amber:  { bg: 'bg-amber-50 dark:bg-amber-900/20', icon: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400', text: 'text-amber-700 dark:text-amber-300' },
};

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color?: keyof typeof colorMap;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  subtitle?: string;
}

export function MetricCard({ title, value, icon, color = 'blue', change, changeType = 'neutral', subtitle }: MetricCardProps) {
  const colors = colorMap[color];

  return (
    <div className="metric-card">
      <div className="flex items-start justify-between">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', colors.icon)}>
          {icon}
        </div>
        {change && (
          <div className={cn(
            'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg',
            changeType === 'positive' ? 'text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/20' :
            changeType === 'negative' ? 'text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-900/20' :
            'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-800'
          )}>
            {changeType === 'positive' ? <TrendingUp className="w-3 h-3" /> :
             changeType === 'negative' ? <TrendingDown className="w-3 h-3" /> :
             <Minus className="w-3 h-3" />}
            {change}
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{title}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}
