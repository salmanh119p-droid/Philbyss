'use client';

import { useMemo, useState } from 'react';
import { clsx } from 'clsx';
import { ChevronDown, ChevronUp, Star } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import type { EngineerReviewCount } from '@/lib/reviews/types';

interface EngineerLeaderboardProps {
  counts: EngineerReviewCount[];
}

type SortKey =
  | 'engineer_name'
  | 'review_count'
  | 'average_rating'
  | 'five_star_count'
  | 'low_rating_count'
  | 'last_review_date';

type SortDir = 'asc' | 'desc';

function formatDate(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function StarRating({ value }: { value: number }) {
  if (!value) {
    return <span className="text-[var(--color-text-muted)] text-sm">—</span>;
  }
  const rounded = Math.round(value * 2) / 2;
  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((i) => {
          const filled = i <= Math.floor(rounded);
          const half = !filled && i - 0.5 === rounded;
          return (
            <Star
              key={i}
              className={clsx(
                'w-3.5 h-3.5',
                filled
                  ? 'fill-amber-400 text-amber-400'
                  : half
                    ? 'fill-amber-400/50 text-amber-400'
                    : 'text-[var(--color-border-light)]'
              )}
            />
          );
        })}
      </div>
      <span className="text-sm tabular-nums text-[var(--color-text-secondary)]">
        {value.toFixed(2)}
      </span>
    </div>
  );
}

export default function EngineerLeaderboard({
  counts,
}: EngineerLeaderboardProps) {
  const [sortKey, setSortKey] = useState<SortKey>('review_count');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir(key === 'engineer_name' ? 'asc' : 'desc');
    }
  };

  const sorted = useMemo(() => {
    const copy = [...counts];
    copy.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'engineer_name') {
        cmp = a.engineer_name.localeCompare(b.engineer_name);
      } else if (sortKey === 'last_review_date') {
        const av = a.last_review_date ? new Date(a.last_review_date).getTime() : 0;
        const bv = b.last_review_date ? new Date(b.last_review_date).getTime() : 0;
        cmp = av - bv;
      } else {
        cmp = (a[sortKey] as number) - (b[sortKey] as number);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [counts, sortKey, sortDir]);

  const allZero = counts.every((c) => c.review_count === 0);

  const chartData = useMemo(
    () =>
      [...counts]
        .filter((c) => c.review_count > 0)
        .sort((a, b) => b.review_count - a.review_count)
        .slice(0, 10)
        .map((c) => ({ name: c.engineer_name, reviews: c.review_count })),
    [counts]
  );

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) {
      return (
        <ChevronDown className="w-3.5 h-3.5 opacity-30 inline-block ml-1" />
      );
    }
    return sortDir === 'asc' ? (
      <ChevronUp className="w-3.5 h-3.5 inline-block ml-1" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 inline-block ml-1" />
    );
  };

  return (
    <div className="space-y-6">
      {chartData.length > 0 && (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--color-border)"
                horizontal={false}
              />
              <XAxis
                type="number"
                allowDecimals={false}
                stroke="var(--color-text-muted)"
                fontSize={12}
              />
              <YAxis
                type="category"
                dataKey="name"
                stroke="var(--color-text-muted)"
                fontSize={12}
                width={100}
              />
              <Tooltip
                cursor={{ fill: 'rgba(59,130,246,0.08)' }}
                contentStyle={{
                  background: 'var(--color-bg-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Bar
                dataKey="reviews"
                fill="var(--color-accent-blue)"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--color-border)]">
              <th
                className="table-cell table-header cursor-pointer"
                onClick={() => handleSort('engineer_name')}
              >
                Engineer
                <SortIcon k="engineer_name" />
              </th>
              <th
                className="table-cell table-header cursor-pointer text-right"
                onClick={() => handleSort('review_count')}
              >
                Reviews
                <SortIcon k="review_count" />
              </th>
              <th
                className="table-cell table-header cursor-pointer"
                onClick={() => handleSort('average_rating')}
              >
                Avg rating
                <SortIcon k="average_rating" />
              </th>
              <th
                className="table-cell table-header cursor-pointer text-right"
                onClick={() => handleSort('five_star_count')}
              >
                5★
                <SortIcon k="five_star_count" />
              </th>
              <th
                className="table-cell table-header cursor-pointer text-right"
                onClick={() => handleSort('low_rating_count')}
              >
                ≤3★
                <SortIcon k="low_rating_count" />
              </th>
              <th
                className="table-cell table-header cursor-pointer"
                onClick={() => handleSort('last_review_date')}
              >
                Last review
                <SortIcon k="last_review_date" />
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 || allZero ? (
              <tr>
                <td
                  colSpan={6}
                  className="table-cell text-center text-[var(--color-text-muted)] py-8"
                >
                  No reviews in this period
                </td>
              </tr>
            ) : (
              sorted.map((row) => (
                <tr
                  key={row.engineer_id}
                  className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg-hover)] transition-colors"
                >
                  <td className="table-cell">
                    <div className="font-medium">{row.engineer_name}</div>
                    {row.full_name && row.full_name !== row.engineer_name && (
                      <div className="text-xs text-[var(--color-text-muted)]">
                        {row.full_name}
                      </div>
                    )}
                  </td>
                  <td className="table-cell text-right tabular-nums font-semibold">
                    {row.review_count}
                  </td>
                  <td className="table-cell">
                    <StarRating value={row.average_rating} />
                  </td>
                  <td className="table-cell text-right tabular-nums text-emerald-400">
                    {row.five_star_count || '—'}
                  </td>
                  <td className="table-cell text-right tabular-nums text-red-400">
                    {row.low_rating_count || '—'}
                  </td>
                  <td className="table-cell text-[var(--color-text-secondary)]">
                    {formatDate(row.last_review_date)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
