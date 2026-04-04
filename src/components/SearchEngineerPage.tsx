'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Shield,
  Clock,
  Phone,
  Mail,
  Loader2,
  AlertCircle,
  Calendar,
  ArrowLeft,
} from 'lucide-react';
import { clsx } from 'clsx';
import { supabase } from '@/lib/supabase';
import {
  Engineer,
  EngineerAvailabilityResponse,
  EngineerDayAvailability,
} from '@/types';

// ── Constants ──
type DateRangePreset = 'today' | '3days' | '7days' | '14days' | 'custom';

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

function formatLeaveRange(start: string, end: string): string {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  return s.getTime() === e.getTime() ? fmt(s) : `${fmt(s)} – ${fmt(e)}`;
}

function formatDate(d: Date) {
  return d.toISOString().split('T')[0];
}

// ── Availability Grid (reusable) ──
function AvailabilityGrid({
  availability,
  leaveDates,
  scrollIndex,
  onScrollChange,
}: {
  availability: EngineerDayAvailability[];
  leaveDates: string[];
  scrollIndex: number;
  onScrollChange: (idx: number) => void;
}) {
  const VISIBLE_DAYS = 3;
  const maxIndex = Math.max(0, availability.length - VISIBLE_DAYS);
  const visibleDays = availability.slice(scrollIndex, scrollIndex + VISIBLE_DAYS);
  const leaveSet = new Set(leaveDates);

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

      <div
        className="grid gap-2 flex-1"
        style={{
          gridTemplateColumns: `repeat(${Math.min(visibleDays.length, VISIBLE_DAYS)}, minmax(0, 1fr))`,
        }}
      >
        {visibleDays.map((day) => {
          const isOnLeave = leaveSet.has(day.date) || day.on_leave === true;

          return (
            <div
              key={day.date}
              className={clsx(
                'rounded-lg p-2 border',
                isOnLeave
                  ? 'bg-red-500/5 border-red-500/20'
                  : 'bg-[var(--color-bg-secondary)] border-[var(--color-border)]'
              )}
            >
              <p
                className={clsx(
                  'text-xs font-semibold mb-2 text-center',
                  isOnLeave
                    ? 'text-red-400'
                    : day.is_today
                    ? 'text-blue-400'
                    : 'text-[var(--color-text-secondary)]'
                )}
              >
                {day.label}
                {day.is_today && (
                  <span className="ml-1 text-[10px] inline-flex items-center px-1.5 py-0 rounded-full bg-blue-500/20 text-blue-400">
                    TODAY
                  </span>
                )}
                {isOnLeave && (
                  <span className="ml-1 text-[10px] inline-flex items-center px-1.5 py-0 rounded-full bg-red-500/20 text-red-400">
                    ON LEAVE
                  </span>
                )}
              </p>

              {isOnLeave ? (
                <div className="flex flex-col items-center justify-center py-4 text-center">
                  <Calendar className="w-5 h-5 text-red-400/40 mb-1" />
                  <p className="text-[10px] text-red-400/60 font-medium">ON LEAVE</p>
                  <p className="text-[10px] text-[var(--color-text-muted)]">0h free</p>
                </div>
              ) : (
                <>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
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
                            {slot.postcode ? (
                              <span className="text-[10px] text-red-400 font-medium">📍 {slot.postcode}</span>
                            ) : (
                              <span className="text-[10px]">(booked)</span>
                            )}
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
                </>
              )}
            </div>
          );
        })}
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

// ── Date Range Selector ──
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

// ── Main component ──
export default function SearchEngineerPage() {
  const [allEngineers, setAllEngineers] = useState<Engineer[]>([]);
  const [engineersLoading, setEngineersLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selectedEngineer, setSelectedEngineer] = useState<Engineer | null>(null);
  const [availability, setAvailability] = useState<EngineerAvailabilityResponse | null>(null);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [datePreset, setDatePreset] = useState<DateRangePreset>('7days');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [scrollIndex, setScrollIndex] = useState(0);

  // Load engineers from Supabase
  useEffect(() => {
    async function loadEngineers() {
      setEngineersLoading(true);
      const { data, error } = await supabase
        .from('engineers')
        .select('*')
        .eq('is_active', true)
        .order('display_name');
      if (error) {
        console.error('Error loading engineers:', error);
      } else {
        setAllEngineers(data || []);
      }
      setEngineersLoading(false);
    }
    loadEngineers();
  }, []);

  const getDateRange = useCallback(
    (preset: DateRangePreset) => {
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
          if (customDateFrom && customDateTo) {
            return { date_from: customDateFrom, date_to: customDateTo };
          }
          return { date_from: formatDate(today), days: 7 };
        }
      }
    },
    [customDateFrom, customDateTo]
  );

  const fetchAvailability = useCallback(
    async (engineer: Engineer, preset: DateRangePreset, showAsRefresh = false) => {
      if (showAsRefresh) setIsRefreshing(true);
      else setIsLoadingAvailability(true);
      setError(null);
      setScrollIndex(0);

      const range = getDateRange(preset);

      try {
        const res = await fetch(
          'https://n8n.srv1177154.hstgr.cloud/webhook/engineer-availability',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              staff_uuid: engineer.sm8_uuid,
              ...range,
            }),
          }
        );

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data: EngineerAvailabilityResponse = await res.json();
        if (data.error) throw new Error('Availability service returned an error');

        setAvailability(data);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load availability';
        setError(message);
      } finally {
        setIsLoadingAvailability(false);
        setIsRefreshing(false);
      }
    },
    [getDateRange]
  );

  const handleSelectEngineer = (engineer: Engineer) => {
    setSelectedEngineer(engineer);
    setDatePreset('7days');
    fetchAvailability(engineer, '7days');
  };

  const handlePresetChange = (preset: DateRangePreset) => {
    setDatePreset(preset);
    if (preset !== 'custom' && selectedEngineer) {
      fetchAvailability(selectedEngineer, preset, true);
    }
  };

  const handleApplyCustom = () => {
    if (customDateFrom && customDateTo && selectedEngineer) {
      fetchAvailability(selectedEngineer, 'custom', true);
    }
  };

  const handleBack = () => {
    setSelectedEngineer(null);
    setAvailability(null);
    setError(null);
  };

  const filtered = allEngineers.filter(
    (e) =>
      e.display_name.toLowerCase().includes(query.toLowerCase()) ||
      e.full_name.toLowerCase().includes(query.toLowerCase()) ||
      e.trades.some((t) => t.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <div className="animate-fade-in space-y-6">
      {/* If an engineer is selected, show availability card */}
      {selectedEngineer ? (
        <>
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to all engineers
          </button>

          {/* Engineer identity card */}
          <div className="card">
            <div className="flex items-start gap-4">
              <div
                className={clsx(
                  'w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0 relative',
                  AVATAR_COLORS[selectedEngineer.display_name.charCodeAt(0) % AVATAR_COLORS.length]
                )}
              >
                {selectedEngineer.display_name.charAt(0).toUpperCase()}
                {availability?.engineer.on_leave_today && (
                  <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-[var(--color-bg-card)]" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
                    {selectedEngineer.display_name}
                  </h2>
                  <span className="text-sm text-[var(--color-text-muted)]">
                    ({selectedEngineer.full_name})
                  </span>
                  {availability?.engineer.on_leave_today && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
                      ON LEAVE TODAY
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 text-sm text-[var(--color-text-secondary)] mt-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{selectedEngineer.area_display}</span>
                </div>

                <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-[var(--color-text-muted)]">
                  {selectedEngineer.mobile && (
                    <a href={`tel:${selectedEngineer.mobile}`} className="flex items-center gap-1 hover:text-emerald-400 transition-colors">
                      <Phone className="w-3 h-3" /> {selectedEngineer.mobile}
                    </a>
                  )}
                  {selectedEngineer.email && (
                    <a href={`mailto:${selectedEngineer.email}`} className="flex items-center gap-1 hover:text-blue-400 transition-colors">
                      <Mail className="w-3 h-3" /> {selectedEngineer.email}
                    </a>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5 mt-2">
                  {selectedEngineer.trades.map((t) => (
                    <span key={t} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)]">
                      {t}
                    </span>
                  ))}
                  {selectedEngineer.certifications.map((c) => (
                    <span key={c} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400">
                      <Shield className="w-3 h-3 mr-0.5" /> {c}
                    </span>
                  ))}
                </div>

                {/* Leave periods */}
                {availability?.engineer.leave_periods && availability.engineer.leave_periods.length > 0 && (
                  <div className="mt-2">
                    {availability.engineer.leave_periods.map((lp, i) => (
                      <p key={i} className="text-xs text-amber-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {lp.leave_type}: {formatLeaveRange(lp.leave_start, lp.leave_end)}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              {/* Week summary */}
              {availability && (
                <div className="flex-shrink-0 text-right">
                  <div className="flex items-center gap-4 text-xs text-[var(--color-text-secondary)]">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Week: {availability.week_summary.total_free_hours}h free
                    </span>
                    <span>Today: {availability.week_summary.today_free_hours}h free</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Date range + availability grid */}
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

          {isLoadingAvailability && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="spinner mb-4" />
              <p className="text-[var(--color-text-secondary)] font-medium">
                Loading availability from ServiceM8...
              </p>
            </div>
          )}

          {error && !isLoadingAvailability && (
            <div className="card border-red-500/30 bg-red-500/5 max-w-lg mx-auto text-center py-8">
              <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
              <p className="text-sm text-red-400 mb-4">{error}</p>
              <button
                onClick={() => fetchAvailability(selectedEngineer, datePreset)}
                className="btn btn-primary text-sm"
              >
                Try Again
              </button>
            </div>
          )}

          {!isLoadingAvailability && !error && availability && (
            <div className={clsx('card', isRefreshing && 'opacity-60 pointer-events-none transition-opacity')}>
              <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-3">
                Availability · {availability.request.date_from} to {availability.request.date_to}
              </p>
              <AvailabilityGrid
                availability={availability.availability}
                leaveDates={availability.engineer.leave_dates || []}
                scrollIndex={scrollIndex}
                onScrollChange={setScrollIndex}
              />
            </div>
          )}
        </>
      ) : (
        /* Engineer list */
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search engineer by name or trade..."
              className="input pl-9 text-sm"
            />
          </div>

          {engineersLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="card text-center py-8">
              <p className="text-sm text-[var(--color-text-muted)]">No engineers found</p>
            </div>
          ) : (
            <div className="grid gap-2">
              {filtered.map((eng) => {
                const avatarColor = AVATAR_COLORS[eng.display_name.charCodeAt(0) % AVATAR_COLORS.length];
                return (
                  <button
                    key={eng.id}
                    onClick={() => handleSelectEngineer(eng)}
                    className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)] hover:border-[var(--color-border-light)] hover:bg-[var(--color-bg-hover)] transition-all text-left w-full"
                  >
                    <div className={clsx('w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0', avatarColor)}>
                      {eng.display_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                        {eng.display_name}
                      </p>
                      <div className="flex flex-wrap items-center gap-1 mt-0.5">
                        {eng.trades.map((t) => (
                          <span key={t} className="inline-flex items-center px-1.5 py-0 rounded-full text-[10px] font-medium bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)]">
                            {t}
                          </span>
                        ))}
                        {eng.certifications.map((c) => (
                          <span key={c} className="inline-flex items-center px-1.5 py-0 rounded-full text-[10px] font-medium bg-emerald-500/20 text-emerald-400">
                            {c} ✓
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-[var(--color-text-muted)] flex-shrink-0">
                      <MapPin className="w-3 h-3" />
                      {eng.area_display}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
