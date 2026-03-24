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
  Calendar,
  CheckCircle,
  ArrowLeft,
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

interface SlotAssignment {
  staff_uuid: string;
  staff_name: string;
  slot_date: string;
  slot_start: string;
  slot_end: string;
}

interface EngineerPanelProps {
  job: Job;
  onClose: () => void;
  onToast: (message: string) => void;
  onJobAssigned?: (jobRef: string, engineerName: string) => void;
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

function formatLeaveRange(start: string, end: string): string {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  return s.getTime() === e.getTime() ? fmt(s) : `${fmt(s)} – ${fmt(e)}`;
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
        Checking availability, trades, leave, and location matches
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
  leaveDates,
  scrollIndex,
  onScrollChange,
  onSlotClick,
}: {
  availability: EngineerDayAvailability[];
  leaveDates: string[];
  scrollIndex: number;
  onScrollChange: (idx: number) => void;
  onSlotClick?: (date: string, slotStart: string, slotEnd: string, slotHours: number) => void;
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

      <div className="grid gap-2 flex-1" style={{ gridTemplateColumns: `repeat(${Math.min(visibleDays.length, VISIBLE_DAYS)}, minmax(0, 1fr))` }}>
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
                            <span className="text-[10px]">(booked)</span>
                          </div>
                        ) : (
                          <button
                            key={`f-${i}`}
                            onClick={() => onSlotClick?.(day.date, slot.start, slot.end, slot.hours)}
                            title={`Assign on ${day.label} ${slot.start}–${slot.end}`}
                            className="text-[11px] px-1.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 cursor-pointer hover:bg-emerald-500/20 transition-colors w-full text-left"
                          >
                            ✓ {slot.start}–{slot.end}{' '}
                            <span className="text-[10px]">({slot.hours}h free)</span>
                          </button>
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

function EngineerCard({
  engineer,
  scrollIndex,
  onScrollChange,
  onSlotClick,
}: {
  engineer: EngineerMatch;
  scrollIndex: number;
  onScrollChange: (idx: number) => void;
  onSlotClick?: (assignment: SlotAssignment) => void;
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
              'w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 relative',
              avatarColor
            )}
          >
            {initial}
            {engineer.on_leave_today && (
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-red-500 border-2 border-[var(--color-bg-card)]" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-[var(--color-text-primary)]">{engineer.name}</h3>
              {engineer.badge && (
                <span className="inline-flex items-center px-1.5 py-0 rounded-full text-[10px] font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {engineer.badge}
                </span>
              )}
              {engineer.on_leave_today && (
                <span className="inline-flex items-center px-1.5 py-0 rounded-full text-[10px] font-medium bg-red-500/20 text-red-400 border border-red-500/30">
                  ON LEAVE
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

            {/* Leave dates info */}
            {engineer.leave_periods.length > 0 && (
              <div className="mt-1.5">
                {engineer.leave_periods.map((lp, i) => (
                  <p
                    key={i}
                    className="text-[10px] text-amber-400 flex items-center gap-1"
                  >
                    <Calendar className="w-2.5 h-2.5" />
                    {lp.leave_type}: {formatLeaveRange(lp.leave_start, lp.leave_end)}
                  </p>
                ))}
              </div>
            )}
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
            leaveDates={engineer.leave_dates || []}
            scrollIndex={scrollIndex}
            onScrollChange={onScrollChange}
            onSlotClick={(date, start, end) => {
              onSlotClick?.({
                staff_uuid: engineer.staff_uuid,
                staff_name: engineer.name,
                slot_date: date,
                slot_start: start,
                slot_end: end,
              });
            }}
          />

          <p className="text-xs text-purple-400 mt-2 text-center opacity-70">
            Click a free slot to assign this engineer
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Confirmation Dialog ──
function AssignConfirmDialog({
  assignment,
  job,
  isAssigning,
  onConfirm,
  onCancel,
}: {
  assignment: SlotAssignment;
  job: Job;
  isAssigning: boolean;
  onConfirm: (start: string, end: string) => void;
  onCancel: () => void;
}) {
  const slotDate = new Date(assignment.slot_date + 'T00:00:00');
  const formattedDate = slotDate.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  const [adjustedStart, setAdjustedStart] = useState(assignment.slot_start);
  const [adjustedEnd, setAdjustedEnd] = useState(() => {
    const [h, m] = assignment.slot_start.split(':').map(Number);
    const startMins = h * 60 + m;
    const defaultEndMins = startMins + 90;
    const [eh, em] = assignment.slot_end.split(':').map(Number);
    const slotEndMins = eh * 60 + em;
    const endMins = Math.min(defaultEndMins, slotEndMins);
    const endH = Math.floor(endMins / 60).toString().padStart(2, '0');
    const endM = (endMins % 60).toString().padStart(2, '0');
    return `${endH}:${endM}`;
  });

  const calculateDuration = (start: string, end: string): string => {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const diffMins = (eh * 60 + em) - (sh * 60 + sm);
    if (diffMins <= 0) return '0h';
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const isValid = adjustedStart < adjustedEnd && adjustedStart >= assignment.slot_start && adjustedEnd <= assignment.slot_end;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl animate-fade-in">
        {isAssigning ? (
          <div className="flex flex-col items-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400 mb-4" />
            <p className="text-sm font-medium text-[var(--color-text-primary)]">
              Creating job in ServiceM8 and scheduling to {assignment.staff_name}...
            </p>
          </div>
        ) : (
          <>
            <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-4">
              Assign this job to {assignment.staff_name}?
            </h3>

            <div className="space-y-2 mb-4">
              <div className="flex items-start gap-2 text-sm">
                <span className="text-[var(--color-text-muted)] w-16 flex-shrink-0">Job:</span>
                <span className="text-[var(--color-text-primary)] font-medium">
                  {job.job_title} ({job.job_ref})
                </span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <span className="text-[var(--color-text-muted)] w-16 flex-shrink-0">Address:</span>
                <span className="text-[var(--color-text-secondary)]">
                  {job.property_address}
                </span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <span className="text-[var(--color-text-muted)] w-16 flex-shrink-0">Date:</span>
                <span className="text-[var(--color-text-secondary)]">
                  {formattedDate}
                </span>
              </div>
            </div>

            <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4 border border-[var(--color-border)] mb-6">
              <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-3">
                Schedule Time
              </p>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Start</label>
                  <input
                    type="time"
                    value={adjustedStart}
                    min={assignment.slot_start}
                    max={assignment.slot_end}
                    onChange={(e) => setAdjustedStart(e.target.value)}
                    className="input text-sm w-full"
                  />
                </div>
                <span className="text-[var(--color-text-muted)] mt-5">to</span>
                <div className="flex-1">
                  <label className="text-xs text-[var(--color-text-muted)] mb-1 block">End</label>
                  <input
                    type="time"
                    value={adjustedEnd}
                    min={adjustedStart}
                    max={assignment.slot_end}
                    onChange={(e) => setAdjustedEnd(e.target.value)}
                    className="input text-sm w-full"
                  />
                </div>
              </div>
              <p className="text-[10px] text-[var(--color-text-muted)] mt-2">
                Free slot: {assignment.slot_start} – {assignment.slot_end} · Selected duration: {calculateDuration(adjustedStart, adjustedEnd)}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="btn btn-secondary flex-1 py-2.5"
              >
                Cancel
              </button>
              <button
                onClick={() => onConfirm(adjustedStart, adjustedEnd)}
                disabled={!isValid}
                className={clsx(
                  'flex-1 py-2.5 rounded-lg font-semibold text-white bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 transition-all flex items-center justify-center gap-2',
                  !isValid && 'opacity-50 cursor-not-allowed'
                )}
              >
                <CheckCircle className="w-4 h-4" />
                Confirm & Assign
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main component ──
export default function EngineerPanel({ job, onClose, onToast, onJobAssigned }: EngineerPanelProps) {
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

  // Assignment state
  const [pendingAssignment, setPendingAssignment] = useState<SlotAssignment | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

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
          'https://n8n.srv1177154.hstgr.cloud/webhook/find-engineer2',
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

  const handleSlotClick = (assignment: SlotAssignment) => {
    setPendingAssignment(assignment);
  };

  const handleConfirmAssign = async (adjustedStart?: string, adjustedEnd?: string) => {
    if (!pendingAssignment) return;
    setIsAssigning(true);

    const finalStart = adjustedStart || pendingAssignment.slot_start;
    const finalEnd = adjustedEnd || pendingAssignment.slot_end;

    try {
      const isExistingJob = job.job_exist === 'Yes' && job.sm8_job_uuid;
      const webhookUrl = isExistingJob
        ? 'https://n8n.srv1177154.hstgr.cloud/webhook/exsiting_job'
        : 'https://n8n.srv1177154.hstgr.cloud/webhook/assign-engineer';

      const payload: Record<string, any> = {
        staff_uuid: pendingAssignment.staff_uuid,
        staff_name: pendingAssignment.staff_name,
        slot_date: pendingAssignment.slot_date,
        slot_start: finalStart,
        slot_end: finalEnd,
        job_ref: job.job_ref,
        job_title: job.job_title,
        job_description: job.job_description,
        instruction_notes: job.instruction_notes,
        fault_detail: job.fault_detail || null,
        property_address: job.property_address,
        postcode: job.postcode,
        trade: job.trade,
        priority: job.priority,
        tenant_name: job.tenant_name,
        tenant_phone: job.tenant_phone,
        tenant_email: job.tenant_email,
        company_name: job.company || null,
        landlord: job.landlord || null,
        action: 'assign_engineer',
      };

      if (isExistingJob) {
        payload.sm8_job_uuid = job.sm8_job_uuid;
      }

      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.error) {
        onToast(`Assignment failed: ${data.message}`);
      } else {
        const slotDate = new Date(pendingAssignment.slot_date + 'T00:00:00');
        const formattedDate = slotDate.toLocaleDateString('en-GB', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        });
        onToast(
          `✓ Assigned to ${data.assigned_to} — ${formattedDate} ${data.scheduled.start}–${data.scheduled.end}`
        );
        onJobAssigned?.(job.job_ref, pendingAssignment.staff_name);
        onClose();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Network error';
      onToast(`Failed to assign engineer: ${message}`);
    } finally {
      setIsAssigning(false);
      setPendingAssignment(null);
    }
  };

  const getScrollIndex = (staffUuid: string) =>
    availabilityScrollIndex[staffUuid] || 0;

  const setScrollIndex = (staffUuid: string, idx: number) => {
    setAvailabilityScrollIndex((prev) => ({ ...prev, [staffUuid]: idx }));
  };

  const allResults = [
    ...(response?.matched_engineers || []),
    ...(response?.other_engineers || []),
  ];

  return (
    <div className="fixed inset-0 z-50 bg-[var(--color-bg-primary)] overflow-y-auto">
      {/* Header banner */}
      <div className="sticky top-0 z-[60] bg-gradient-to-r from-purple-600 to-blue-600 border-b border-purple-500/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="p-2 rounded-lg bg-white/15 text-white hover:bg-white/25 transition-colors mr-1 flex items-center gap-1.5"
                title="Back to job"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="text-sm font-medium">Back</span>
              </button>
              <span className="w-2 h-2 rounded-full bg-white" />
              <h2 className="text-lg font-bold text-white">
                {job.job_exist === 'Yes'
                  ? 'Assign Engineer to Existing SM8 Job'
                  : 'Find Best Engineer in ServiceM8'}
              </h2>
            </div>
            <p className="text-sm text-purple-200/80 mt-0.5">
              {job.job_ref} · {job.trade} · {job.postcode}
              {response &&
                ` · ${response.total_matched} matched, ${response.total_others} others`}
            </p>
            <p className="text-xs text-purple-300/60">
              {job.job_exist === 'Yes'
                ? 'This job already exists in ServiceM8 — selecting an engineer will schedule them to the existing job'
                : 'Ranked by trade · location · ServiceM8 availability · certifications'}
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
                    onSlotClick={handleSlotClick}
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
                    onSlotClick={handleSlotClick}
                  />
                ))}
              </div>
            )}

            {allResults.length === 0 && (
              <div className="card text-center py-8">
                <p className="text-sm text-[var(--color-text-muted)]">
                  No engineers available for this trade and date range.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      {pendingAssignment && (
        <AssignConfirmDialog
          assignment={pendingAssignment}
          job={job}
          isAssigning={isAssigning}
          onConfirm={handleConfirmAssign}
          onCancel={() => setPendingAssignment(null)}
        />
      )}
    </div>
  );
}
