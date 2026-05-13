'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { clsx } from 'clsx';
import DateRangePicker from '@/components/reviews/DateRangePicker';
import EngineerLeaderboard from '@/components/reviews/EngineerLeaderboard';
import { fetchEngineerReviewCounts } from '@/lib/reviews/queries';
import {
  resolvePreset,
  type EngineerReviewCount,
  type ReviewRefreshResponse,
  type UnresolvedName,
} from '@/lib/reviews/types';

const REFRESH_RANGE_CAP_DAYS = 90;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

export default function ReviewsClient() {
  const router = useRouter();
  const initial = resolvePreset('last_30_days')!;

  const [from, setFrom] = useState<Date>(initial.from);
  const [to, setTo] = useState<Date>(initial.to);
  const [counts, setCounts] = useState<EngineerReviewCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSummary, setLastSummary] = useState<
    ReviewRefreshResponse['summary'] | null
  >(null);
  const [unresolved, setUnresolved] = useState<UnresolvedName[]>([]);
  const [unresolvedOpen, setUnresolvedOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rangeDays = Math.max(
    1,
    Math.ceil((to.getTime() - from.getTime()) / MS_PER_DAY)
  );
  const rangeTooBig = rangeDays > REFRESH_RANGE_CAP_DAYS;

  const loadCached = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEngineerReviewCounts(from, to);
      setCounts(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load reviews';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    loadCached();
  }, [loadCached]);

  const handleRefresh = async () => {
    if (rangeTooBig) {
      setError(
        `Refreshing is capped at ${REFRESH_RANGE_CAP_DAYS} days — each review is one OpenAI call. Narrow the range and try again.`
      );
      return;
    }
    setRefreshing(true);
    setError(null);
    try {
      const res = await fetch('/api/reviews/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_date: from.toISOString(),
          to_date: to.toISOString(),
        }),
      });
      const data: ReviewRefreshResponse & { error?: string } = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? 'Refresh failed');
      }
      setCounts(data.engineer_counts);
      setLastSummary(data.summary);
      setUnresolved(data.unresolved_names ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Refresh failed';
      setError(message);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 bg-[var(--color-bg-primary)]/80 backdrop-blur-xl border-b border-[var(--color-border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="btn btn-secondary p-2"
                title="Back to dashboard"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <span className="text-lg font-bold text-white">P</span>
              </div>
              <div>
                <h1 className="text-lg font-semibold">
                  Engineer Review Performance
                </h1>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Google reviews matched to engineers
                </p>
              </div>
            </div>

            <button
              onClick={handleRefresh}
              disabled={refreshing || rangeTooBig}
              className="btn btn-primary"
              title={
                rangeTooBig
                  ? `Range exceeds ${REFRESH_RANGE_CAP_DAYS} days`
                  : 'Re-run AI matching against Google reviews'
              }
            >
              {refreshing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Refreshing from Google…
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh from Google
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="card">
          <h2 className="section-title">Date range</h2>
          <DateRangePicker
            from={from}
            to={to}
            onChange={(f, t) => {
              setFrom(f);
              setTo(t);
            }}
          />
          <p
            className={clsx(
              'mt-3 text-xs',
              rangeTooBig
                ? 'text-amber-400'
                : 'text-[var(--color-text-muted)]'
            )}
          >
            {rangeDays} day{rangeDays === 1 ? '' : 's'} selected.{' '}
            {rangeTooBig
              ? `Refreshing capped at ${REFRESH_RANGE_CAP_DAYS} days — each review is one OpenAI call.`
              : 'Refresh re-runs AI engineer matching against Google reviews for this period.'}
          </p>
        </div>

        {error && (
          <div className="card border-red-500/30 bg-red-500/10 flex items-start gap-2 text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="text-sm">{error}</div>
          </div>
        )}

        {lastSummary && (
          <div className="card text-sm text-[var(--color-text-secondary)]">
            Last refresh:{' '}
            <span className="text-[var(--color-text-primary)]">
              {new Date(lastSummary.ran_at).toLocaleString('en-GB')}
            </span>{' '}
            — processed {lastSummary.total_reviews_processed} reviews,{' '}
            {lastSummary.reviews_with_engineer_match} matched to engineers,{' '}
            {lastSummary.reviews_unmatched} unmatched.
          </div>
        )}

        <div className="card">
          {loading ? (
            <div className="flex items-center text-[var(--color-text-secondary)] py-8">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : (
            <EngineerLeaderboard counts={counts} />
          )}
        </div>

        {unresolved.length > 0 && (
          <div className="card">
            <button
              type="button"
              onClick={() => setUnresolvedOpen((v) => !v)}
              className="w-full flex items-center justify-between text-left"
            >
              <div>
                <h2 className="section-title mb-0">
                  Unresolved names ({unresolved.length})
                </h2>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  Names mentioned in reviews that we couldn&apos;t map to an
                  active engineer.
                </p>
              </div>
              {unresolvedOpen ? (
                <ChevronUp className="w-5 h-5 text-[var(--color-text-muted)]" />
              ) : (
                <ChevronDown className="w-5 h-5 text-[var(--color-text-muted)]" />
              )}
            </button>
            {unresolvedOpen && (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--color-border)]">
                      <th className="table-cell table-header">Name</th>
                      <th className="table-cell table-header">Review ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unresolved.map((u, i) => (
                      <tr
                        key={`${u.review_id}-${i}`}
                        className="border-b border-[var(--color-border)]"
                      >
                        <td className="table-cell font-medium">{u.name}</td>
                        <td className="table-cell font-mono text-xs text-[var(--color-text-muted)]">
                          {u.review_id}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
