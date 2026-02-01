'use client';

import { LucideIcon } from 'lucide-react';
import { clsx } from 'clsx';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'cyan';
  delay?: number;
}

const colorMap = {
  blue: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/20',
  },
  green: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/20',
  },
  amber: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/20',
  },
  red: {
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    border: 'border-red-500/20',
  },
  purple: {
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    border: 'border-purple-500/20',
  },
  cyan: {
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-400',
    border: 'border-cyan-500/20',
  },
};

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = 'blue',
  delay = 0,
}: StatCardProps) {
  const colors = colorMap[color];

  return (
    <div
      className={clsx(
        'card card-hover opacity-0 animate-slide-up',
        delay === 1 && 'animation-delay-100',
        delay === 2 && 'animation-delay-200',
        delay === 3 && 'animation-delay-300',
        delay === 4 && 'animation-delay-400'
      )}
      style={{ animationFillMode: 'forwards' }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="stat-label">{title}</p>
          <p className="stat-value mt-1">{value}</p>
          {subtitle && (
            <p className="text-sm text-[var(--color-text-muted)] mt-1">{subtitle}</p>
          )}
          {trend && (
            <p
              className={clsx(
                'text-sm font-medium mt-2',
                trend.isPositive ? 'text-emerald-400' : 'text-red-400'
              )}
            >
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </p>
          )}
        </div>
        <div className={clsx('p-3 rounded-xl', colors.bg, colors.border, 'border')}>
          <Icon className={clsx('w-6 h-6', colors.text)} />
        </div>
      </div>
    </div>
  );
}
