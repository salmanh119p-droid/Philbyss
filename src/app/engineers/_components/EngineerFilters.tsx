'use client';

import { Search } from 'lucide-react';
import { clsx } from 'clsx';
import { ENGINEER_AREAS, TRADE_OPTIONS, type EngineerArea } from '@/types/engineers';

interface Props {
  search: string;
  onSearch: (value: string) => void;
  area: EngineerArea | 'any';
  onArea: (value: EngineerArea | 'any') => void;
  trades: string[];
  onTradesToggle: (trade: string) => void;
  tab: 'active' | 'all';
  onTab: (value: 'active' | 'all') => void;
}

export default function EngineerFilters({
  search,
  onSearch,
  area,
  onArea,
  trades,
  onTradesToggle,
  tab,
  onTab,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b border-[var(--color-border)]">
        {(['active', 'all'] as const).map((t) => (
          <button
            key={t}
            onClick={() => onTab(t)}
            className={clsx(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              tab === t
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            )}
          >
            {t === 'active' ? 'Active' : 'All'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="relative md:col-span-2">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-[var(--color-text-muted)]" />
          </div>
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="input pl-9"
          />
        </div>
        <select
          value={area}
          onChange={(e) => onArea(e.target.value as EngineerArea | 'any')}
          className="input"
        >
          <option value="any">Any area</option>
          {ENGINEER_AREAS.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-2">
        {TRADE_OPTIONS.map((trade) => {
          const active = trades.includes(trade);
          return (
            <button
              key={trade}
              type="button"
              onClick={() => onTradesToggle(trade)}
              className={clsx(
                'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                active
                  ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                  : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:border-[var(--color-border-light)]'
              )}
            >
              {trade}
            </button>
          );
        })}
        {trades.length > 0 && (
          <button
            type="button"
            onClick={() => trades.forEach((t) => onTradesToggle(t))}
            className="px-3 py-1.5 rounded-full text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
