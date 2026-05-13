'use client';

import { clsx } from 'clsx';
import { resolvePreset, type DateRangePreset } from '@/lib/reviews/types';

interface DateRangePickerProps {
  from: Date;
  to: Date;
  onChange: (from: Date, to: Date) => void;
}

const PRESETS: { id: DateRangePreset; label: string }[] = [
  { id: 'last_7_days', label: 'Last 7 days' },
  { id: 'last_30_days', label: 'Last 30 days' },
  { id: 'last_90_days', label: 'Last 90 days' },
  { id: 'this_month', label: 'This month' },
  { id: 'last_month', label: 'Last month' },
];

function toInputValue(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function fromInputValue(value: string, endOfDay = false): Date {
  const [yyyy, mm, dd] = value.split('-').map(Number);
  if (endOfDay) return new Date(yyyy, (mm ?? 1) - 1, dd ?? 1, 23, 59, 59, 999);
  return new Date(yyyy, (mm ?? 1) - 1, dd ?? 1, 0, 0, 0, 0);
}

function matchesPreset(from: Date, to: Date, preset: DateRangePreset): boolean {
  const resolved = resolvePreset(preset);
  if (!resolved) return false;
  return (
    toInputValue(resolved.from) === toInputValue(from) &&
    toInputValue(resolved.to) === toInputValue(to)
  );
}

export default function DateRangePicker({
  from,
  to,
  onChange,
}: DateRangePickerProps) {
  const handlePreset = (id: DateRangePreset) => {
    const resolved = resolvePreset(id);
    if (resolved) onChange(resolved.from, resolved.to);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((preset) => {
          const active = matchesPreset(from, to, preset.id);
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => handlePreset(preset.id)}
              className={clsx(
                'btn px-3 py-1.5 text-sm border',
                active
                  ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                  : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]'
              )}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">
            From
          </label>
          <input
            type="date"
            value={toInputValue(from)}
            max={toInputValue(to)}
            onChange={(e) =>
              onChange(fromInputValue(e.target.value, false), to)
            }
            className="input"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">
            To
          </label>
          <input
            type="date"
            value={toInputValue(to)}
            min={toInputValue(from)}
            onChange={(e) =>
              onChange(from, fromInputValue(e.target.value, true))
            }
            className="input"
          />
        </div>
      </div>
    </div>
  );
}
