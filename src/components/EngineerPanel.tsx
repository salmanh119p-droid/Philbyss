'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Shield,
  Clock,
  Phone,
  Mail,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { clsx } from 'clsx';
import {
  Job,
  EngineerSearchResponse,
  EngineerMatch,
  EngineerDayAvailability,
} from '@/types';

// ── Types ──
type DateRangePreset = 'today' | '3days' | '7days' | '14days' | 'custom';

interface EngineerPanelProps {
  job: Job;
  onClose: () => void;
  onToast: (message: string) => void;
}

// ── Avatar colors ──
const AVATAR_COLORS = [
  'bg-blue-500',
  'bg-purple-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-pink-500',
  'bg-cyan-500',
  'bg-red-500',
  'bg-indigo-500',
];

// ── Score color helper ──
function scoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-400 bg-emerald-500/20';
  if (score >= 50) return 'text-amber-400 bg-amber-500/20';
  if (score > 0) return 'text-red-400 bg-red-500/20';
  return 'text-[var(--color-text-muted)] bg-[var(--color-bg-secondary)]';
}

// ── Sub-components ──

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
      <div className="spinner mb-4" />
      <p className="text-[var(--color-text-secondary)] font-medium">
        Searching ServiceM8 for available engineers...
      </p>
      <p className="text-xs text-[var(--color-text-muted)] mt-1">
        Checking availability, trades, and location matches
      </p>
    </div>
  );
}

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="card border-red-500/30 bg-red-500/5 max-w-lg mx-auto text-center py-8">
      <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
      <p className="text-sm text-red-400 mb-4">{error}</p>
      <button onClick={onRetry} className="btn btn-primary text-sm">
        Try Again
      </button>
    </div>
  );
}

function NoMatchesFallback() {
  return (
    <div className="card text-center py-8 border-amber-500/20">
      <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
      <p className="text-sm text-amber-400 font-medium">No trade-matched engineers found</p>
      <p className="text-xs text-[var(--color-text-muted)] mt-1">
        Showing other available engineers below — pick manually
      </p>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  return (
    <div className={clsx('text-2xl font-bold rounded-xl px-3 py-1.5 text-center flex-shrink-0', scoreColor(score))}>
      {score}
      <p className="text-[9px] uppercase tracking-wider font-semibold opacity-70">match</p>
    </div>
  );
}

function DateRangeSelector({
  preset,
  onPresetChange,
  customFrom,
  customTo,
  onCustomFromChange,
  onCustomToChange,
  onApplyCustom,
  isRefreshing,
}: {
  preset: DateRangePreset;
  onPresetChange: (p: DateRangePreset) => void;
  customFrom: string;
  customTo: string;
  onCustomFromChange: (v: string) => void;
  onCustomToChange: (v: string) => void;
  onApplyCustom: () => void;
  isRefreshing: boolean;
}) {
  const presets: { key: DateRangePreset; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: '3days', label: '3 Days' },
    { key: '7days', label: '7 Days' },
    { key: '14days', label: '14 Days' },
    { key: 'custom', label: 'Custom' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {presets.map((p) => (
        <button
          key={p.key}
          onClick={() => onPresetChange(p.key)}
          className={clsx(
            'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
            preset === p.key
              ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
              : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:border-[var(--color-border-light)]'
          )}
        >
          {p.label}
          {preset === p.key && p.key !== 'custom' && ' ✓'}
        </button>
      ))}
      {isRefreshing && <Loader2 className="w-4 h-4 animate-spin text-purple-400" />}
      {preset === 'custom' && (
        <div className="flex flex-wrap items-center gap-2 mt-2 w-full sm:mt-0 sm:w-auto">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => onCustomFromChange(e.target.value)}
            className="input text-sm py-1.5 w-40"
          />
          <span className="text-[var(--color-text-muted)] text-sm">to</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => onCustomToChange(e.target.value)}
            className="input text-sm py-1.5 w-40"
          />
          <button
            onClick={onApplyCustom}
            disabled={!customFrom || !customTo}
            className={clsx(
              'btn btn-primary text-sm px-3 py-1.5',
              (!customFrom || !customTo) && 'opacity-50 cursor-not-allowed'
            )}
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}

function AvailabilityGrid({
  availability,
  scrollIndex,
  onScrollChange,
}: {
  availability: EngineerDayAvailability[];
  scrollIndex: number;
  onScrollChange: (idx: number) => void;
}) {
  const VISIBLE_DAYS = 3;
  const maxIndex = Math.max(0, availability.length - VISIBLE_DAYS);
  const visibleDays = availability.slice(scrollIndex, scrollIndex + VISIBLE_DAYS);

  if (availability.length === 0) {
    return (
      <p className="text-xs text-[var(--color-text-muted)] text-center py-4">
        No availability data
      </p>
    );
  }

  return (
    <div className="flex items-start gap-1">
      {availability.length > VISIBLE_DAYS && (
        <button
          onClick={() => onScrollChange(Math.max(0, scrollIndex - 1))}
          disabled={scrollIndex === 0}
          className={clsx(
            'p-1 rounded mt-6 flex-shrink-0',
            scrollIndex === 0
              ? 'text-[var(--color-text-muted)] opacity-30'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
          )}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}

      <div className={clsx('grid gap-2 flex-1', `grid-cols-1 sm:grid-cols-${Math.min(visibleDays.length, VISIBLE_DAYS)}`)}>
        {visibleDays.map((day) => (
          <div
            key={day.date}
            className="bg-[var(--color-bg-secondary)] rounded-lg p-2 border border-[var(--color-border)]"
          >
            <p
              className={clsx(
                'text-xs font-semibold mb-2 text-center',
                day.is_today ? 'text-blue-400' : 'text-[var(--color-text-secondary)]'
              )}
            >
              {day.label}
              {day.is_today && (
                <span className="ml-1 text-[10px] inline-flex items-center px-1.5 py-0 rounded-full bg-blue-500/20 text-blue-400">
                  TODAY
                </span>
              )}
            </p>

            <div className="space-y-1 max-h-48 overflow-y-auto">
              {/* Interleave booked and free slots chronologically */}
              {[
                ...day.booked_slots.map((s) => ({ ...s, type: 'booked' as const })),
                ...day.free_slots.map((s) => ({ ...s, type: 'free' as const, job_uuid: '' })),
              ]
                .sort((a, b) => a.start.localeCompare(b.start))
                .map((slot, i) =>
                  slot.type === 'booked' ? (
                    <div
                      key={`b-${i}`}
                      className="text-[11px] px-1.5 py-1 rounded bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-muted)]"
                    >
                      {slot.start}–{slot.end}{' '}
                      <span className="text-[10px]">(booked)</span>
                    </div>
                  ) : (
                    <div
                      key={`f-${i}`}
                      className="text-[11px] px-1.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 cursor-pointer hover:bg-emerald-500/20 transition-colors"
                    >
                      ✓ {slot.start}–{slot.end}{' '}
                      <span className="text-[10px]">({slot.hours}h free)</span>
                    </div>
                  )
                )}

              {day.free_slots.length === 0 && day.booked_slots.length === 0 && (
                <p className="text-[10px] text-[var(--color-text-muted)] text-center py-2">
                  No data
                </p>
              )}
            </div>

            <p className="text-[10px] text-[var(--color-text-muted)] mt-1 text-center border-t border-[var(--color-border)] pt-1">
              {day.total_free_hours}h free · {day.booking_count} bookings
            </p>
          </div>
        ))}
      </div>

      {availability.length > VISIBLE_DAYS && (
        <button
          onClick={() => onScrollChange(Math.min(maxIndex, scrollIndex + 1))}
          disabled={scrollIndex >= maxIndex}
          className={clsx(
            'p-1 rounded mt-6 flex-shrink-0',
            scrollIndex >= maxIndex
              ? 'text-[var(--color-text-muted)] opacity-30'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
          )}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

function EngineerCard({
  engineer,
  scrollIndex,
  onScrollChange,
}: {
  engineer: EngineerMatch;
  scrollIndex: number;
  onScrollChange: (idx: number) => void;
}) {
  const avatarColor = AVATAR_COLORS[engineer.name.charCodeAt(0) % AVATAR_COLORS.length];
  const initial = engineer.name.charAt(0).toUpperCase();

  return (
    <div className="card card-hover animate-fade-in">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Left column: identity */}
        <div className="flex items-start gap-3 lg:w-64 flex-shrink-0">
          <div
            className={clsx(
              'w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0',
              avatarColor
            )}
          >
            {initial}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-[var(--color-text-primary)]">{engineer.name}</h3>
              {engineer.badge && (
                <span className="inline-flex items-center px-1.5 py-0 rounded-full text-[10px] font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  ⭐ {engineer.badge}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)] mt-0.5">
              <MapPin className="w-3 h-3" />
              <span>{engineer.area}</span>
              {engineer.area_match && (
                <span className="text-emerald-400 text-[10px]">✓ match</span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-[var(--color-text-muted)]">
              {engineer.mobile && (
                <a
                  href={`tel:${engineer.mobile}`}
                  className="flex items-center gap-1 hover:text-emerald-400 transition-colors"
                >
                  <Phone className="w-3 h-3" /> {engineer.mobile}
                </a>
              )}
              {engineer.email && (
                <a
                  href={`mailto:${engineer.email}`}
                  className="flex items-center gap-1 hover:text-blue-400 transition-colors truncate"
                >
                  <Mail className="w-3 h-3" /> {engineer.email}
                </a>
              )}
            </div>

            {engineer.certifications.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {engineer.certifications.map((cert) => (
                  <span
                    key={cert}
                    className="inline-flex items-center px-1.5 py-0 rounded-full text-[10px] font-medium bg-emerald-500/20 text-emerald-400"
                  >
                    <Shield className="w-2.5 h-2.5 mr-0.5" /> {cert}
                  </span>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-1 mt-1.5">
              {engineer.trades.map((trade) => (
                <span
                  key={trade}
                  className="inline-flex items-center px-1.5 py-0 rounded-full text-[10px] font-medium bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)]"
                >
                  {trade}
                </span>
              ))}
            </div>

            <p className="text-[10px] text-[var(--color-text-muted)] mt-1 italic">
              {engineer.trade_match_reason}
            </p>
          </div>

          <ScoreBadge score={engineer.match_score} />
        </div>

        {/* Right column: info boxes + availability */}
        <div className="flex-1 min-w-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            {[
              { label: 'TRAVEL', value: '—' },
              { label: '+15min BREAK', value: '—' },
              { label: 'SUGGESTED', value: '~1.5h' },
              { label: 'SET HOURS', value: null },
            ].map((box) => (
              <div
                key={box.label}
                className="bg-[var(--color-bg-secondary)] rounded-lg p-2 border border-[var(--color-border)] text-center"
              >
                <p className="text-[9px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">
                  {box.label}
                </p>
                {box.value !== null ? (
                  <p className="text-sm font-semibold text-[var(--color-text-primary)] mt-0.5">
                    {box.value}
                  </p>
                ) : (
                  <input
                    type="number"
                    placeholder="0h"
                    className="w-full mt-0.5 text-sm text-center bg-transparent border-b border-[var(--color-border)] text-[var(--color-text-primary)] outline-none focus:border-purple-500"
                  />
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4 mb-2 text-xs text-[var(--color-text-secondary)]">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Week: {engineer.week_summary.total_free_hours}h free
            </span>
            <span>Today: {engineer.week_summary.today_free_hours}h free</span>
          </div>

          <AvailabilityGrid
            availability={engineer.availability}
            scrollIndex={scrollIndex}
            onScrollChange={onScrollChange}
          />

          <p className="text-xs text-purple-400 mt-2 text-center opacity-70">
            Click a free slot to assign this engineer
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Main component ──
export default function EngineerPanel({ job, onClose, onToast }: EngineerPanelProps) {
  const [response, setResponse] = useState<EngineerSearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [datePreset, setDatePreset] = useState<DateRangePreset>('7days');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [availabilityScrollIndex, setAvailabilityScrollIndex] = useState<
    Record<string, number>
  >({});

  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  const getDateRange = useCallback(
    (preset: DateRangePreset, cFrom?: string, cTo?: string) => {
      const today = new Date();
      switch (preset) {
        case 'today':
          return { date_from: formatDate(today), days: 1 };
        case '3days':
          return { date_from: formatDate(today), days: 3 };
        case '7days':
          return { date_from: formatDate(today), days: 7 };
        case '14days':
          return { date_from: formatDate(today), days: 14 };
        case 'custom': {
          if (cFrom && cTo) {
            return { date_from: cFrom, date_to: cTo };
          }
          return { date_from: formatDate(today), days: 7 };
        }
      }
    },
    []
  );

  const fetchEngineers = useCallback(
    async (preset: DateRangePreset, showAsRefresh = false) => {
      if (showAsRefresh) setIsRefreshing(true);
      else setIsLoading(true);
      setError(null);

      const range = getDateRange(preset, customDateFrom, customDateTo);

      try {
        const res = await fetch(
          'https://n8n.srv1177154.hstgr.cloud/webhook/find-engineer',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              job_ref: job.job_ref,
              trade: job.trade,
              job_title: job.job_title,
              job_description: job.job_description,
              postcode: job.postcode,
              priority: job.priority,
              ...range,
            }),
          }
        );

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data: EngineerSearchResponse = await res.json();
        if (data.error) throw new Error('The engineer matching service returned an error');

        setResponse(data);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to find engineers';
        setError(message);
        onToast('Failed to search for engineers. Please try again.');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [job, customDateFrom, customDateTo, getDateRange, onToast]
  );

  // Initial fetch
  useEffect(() => {
    fetchEngineers('7days');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handlePresetChange = (preset: DateRangePreset) => {
    setDatePreset(preset);
    if (preset !== 'custom') {
      fetchEngineers(preset, true);
    }
  };

  const handleApplyCustom = () => {
    if (customDateFrom && customDateTo) {
      fetchEngineers('custom', true);
    }
  };

  const getScrollIndex = (staffUuid: string) =>
    availabilityScrollIndex[staffUuid] || 0;

  const setScrollIndex = (staffUuid: string, idx: number) => {
    setAvailabilityScrollIndex((prev) => ({ ...prev, [staffUuid]: idx }));
  };

  const allEngineers = [
    ...(response?.matched_engineers || []),
    ...(response?.other_engineers || []),
  ];

  return (
    <div className="fixed inset-0 z-50 bg-[var(--color-bg-primary)]/95 backdrop-blur-sm overflow-y-auto">
      {/* Header banner */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-purple-600/90 to-blue-600/90 backdrop-blur-sm border-b border-purple-500/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-white" />
              <h2 className="text-lg font-bold text-white">Engineer Matches</h2>
            </div>
            <p className="text-sm text-purple-200/80 mt-0.5">
              {job.job_ref} · {job.trade} · {job.postcode}
              {response &&
                ` · ${response.total_matched} matched, ${response.total_others} others`}
            </p>
            <p className="text-xs text-purple-300/60">
              Ranked by trade · location · ServiceM8 availability · certifications
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Date Range Selector */}
        <DateRangeSelector
          preset={datePreset}
          onPresetChange={handlePresetChange}
          customFrom={customDateFrom}
          customTo={customDateTo}
          onCustomFromChange={setCustomDateFrom}
          onCustomToChange={setCustomDateTo}
          onApplyCustom={handleApplyCustom}
          isRefreshing={isRefreshing}
        />

        {/* Loading */}
        {isLoading && <LoadingState />}

        {/* Error */}
        {error && !isLoading && (
          <ErrorState error={error} onRetry={() => fetchEngineers(datePreset)} />
        )}

        {/* Results */}
        {!isLoading && !error && response && (
          <div className={clsx(isRefreshing && 'opacity-60 pointer-events-none transition-opacity')}>
            {response.total_matched === 0 && <NoMatchesFallback />}

            {response.matched_engineers.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                  Matched Engineers ({response.total_matched})
                </h3>
                {response.matched_engineers.map((eng) => (
                  <EngineerCard
                    key={eng.staff_uuid}
                    engineer={eng}
                    scrollIndex={getScrollIndex(eng.staff_uuid)}
                    onScrollChange={(idx) => setScrollIndex(eng.staff_uuid, idx)}
                  />
                ))}
              </div>
            )}

            {response.other_engineers.length > 0 && (
              <div className="space-y-4 mt-8">
                <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                  Other Available Engineers ({response.total_others})
                </h3>
                {response.other_engineers.map((eng) => (
                  <EngineerCard
                    key={eng.staff_uuid}
                    engineer={eng}
                    scrollIndex={getScrollIndex(eng.staff_uuid)}
                    onScrollChange={(idx) => setScrollIndex(eng.staff_uuid, idx)}
                  />
                ))}
              </div>
            )}

            {allEngineers.length === 0 && (
              <div className="card text-center py-8">
                <p className="text-sm text-[var(--color-text-muted)]">
                  No engineers available for this trade and date range.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
