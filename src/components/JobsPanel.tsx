'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search,
  ClipboardList,
  ArrowLeft,
  Plus,
  Package,
  Wrench,
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
  X,
  CheckCircle,
} from 'lucide-react';
import { clsx } from 'clsx';
import { supabase } from '@/lib/supabase';
import {
  Job,
  Material,
  Engineer,
  EngineerAvailabilityResponse,
  EngineerDayAvailability,
} from '@/types';
import EngineerPanel from './EngineerPanel';

// ── Trade config ──
const TRADE_CONFIG: Record<string, { icon: string; color: string }> = {
  Plumbing: { icon: '🔧', color: 'bg-blue-500/20 text-blue-400' },
  Electrical: { icon: '⚡', color: 'bg-yellow-500/20 text-yellow-400' },
  'Heating & Gas': { icon: '🔥', color: 'bg-orange-500/20 text-orange-400' },
  Drainage: { icon: '🌊', color: 'bg-teal-500/20 text-teal-400' },
  Roofing: { icon: '🏠', color: 'bg-slate-500/20 text-slate-400' },
  Locksmith: { icon: '🔑', color: 'bg-purple-500/20 text-purple-400' },
  Carpentry: { icon: '🪚', color: 'bg-amber-500/20 text-amber-400' },
  Decorating: { icon: '🎨', color: 'bg-pink-500/20 text-pink-400' },
  General: { icon: '🔨', color: 'bg-gray-500/20 text-gray-400' },
  Other: { icon: '🔨', color: 'bg-gray-500/20 text-gray-400' },
};

const PRIORITY_CONFIG: Record<string, { dot: string; color: string }> = {
  HIGH: { dot: '🔴', color: 'text-red-400' },
  MEDIUM: { dot: '🟡', color: 'text-amber-400' },
  LOW: { dot: '🟢', color: 'text-emerald-400' },
};

const STATUS_CONFIG: Record<string, string> = {
  UNASSIGNED: 'bg-red-500/20 text-red-400 border border-red-500/30',
  ASSIGNED: 'bg-blue-500/20 text-blue-400',
  IN_PROGRESS: 'bg-amber-500/20 text-amber-400',
  COMPLETED: 'bg-emerald-500/20 text-emerald-400',
  CANCELLED: 'bg-gray-500/20 text-gray-400',
};

const SOURCE_CONFIG: Record<string, string> = {
  FIXFLO: 'bg-blue-500/20 text-blue-400',
  OUTLOOK: 'bg-amber-500/20 text-amber-400',
};

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-purple-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-pink-500', 'bg-cyan-500', 'bg-red-500', 'bg-indigo-500',
];

function formatLeaveRange(start: string, end: string): string {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  return s.getTime() === e.getTime() ? fmt(s) : `${fmt(s)} – ${fmt(e)}`;
}

interface SlotAssignment {
  staff_uuid: string;
  staff_name: string;
  slot_date: string;
  slot_start: string;
  slot_end: string;
}

function SpecificEngineerAvailabilityGrid({
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

function formatTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

// ── Skeleton loaders ──
function SidebarSkeleton() {
  return (
    <>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="card p-4 space-y-3"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <div className="flex justify-between">
            <div className="h-4 w-24 rounded bg-[var(--color-bg-secondary)] animate-pulse" />
            <div className="h-4 w-12 rounded bg-[var(--color-bg-secondary)] animate-pulse" />
          </div>
          <div className="h-4 w-full rounded bg-[var(--color-bg-secondary)] animate-pulse" />
          <div className="flex gap-2">
            <div className="h-5 w-20 rounded-full bg-[var(--color-bg-secondary)] animate-pulse" />
            <div className="h-5 w-16 rounded-full bg-[var(--color-bg-secondary)] animate-pulse" />
          </div>
          <div className="h-3 w-3/4 rounded bg-[var(--color-bg-secondary)] animate-pulse" />
        </div>
      ))}
    </>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between">
        <div className="flex gap-2">
          <div className="h-6 w-24 rounded bg-[var(--color-bg-secondary)] animate-pulse" />
          <div className="h-6 w-16 rounded-full bg-[var(--color-bg-secondary)] animate-pulse" />
          <div className="h-6 w-20 rounded-full bg-[var(--color-bg-secondary)] animate-pulse" />
        </div>
        <div className="h-6 w-28 rounded-full bg-[var(--color-bg-secondary)] animate-pulse" />
      </div>
      <div className="h-8 w-2/3 rounded bg-[var(--color-bg-secondary)] animate-pulse" />
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="h-4 w-full rounded bg-[var(--color-bg-secondary)] animate-pulse" />
          <div className="h-4 w-3/4 rounded bg-[var(--color-bg-secondary)] animate-pulse" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-full rounded bg-[var(--color-bg-secondary)] animate-pulse" />
          <div className="h-4 w-2/3 rounded bg-[var(--color-bg-secondary)] animate-pulse" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-4 w-full rounded bg-[var(--color-bg-secondary)] animate-pulse" />
        <div className="h-4 w-full rounded bg-[var(--color-bg-secondary)] animate-pulse" />
        <div className="h-4 w-1/2 rounded bg-[var(--color-bg-secondary)] animate-pulse" />
      </div>
    </div>
  );
}

// ── Main component ──
export default function JobsPanel() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({ total: 0, unassigned: 0, assigned: 0, materials: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [newMaterialName, setNewMaterialName] = useState('');
  const [addingMaterial, setAddingMaterial] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false); // mobile detail view
  const [showEngineerPanel, setShowEngineerPanel] = useState(false);

  // Search Specific Engineer state
  const [allEngineers, setAllEngineers] = useState<Engineer[]>([]);
  const [engineerQuery, setEngineerQuery] = useState('');
  const [showEngineerDropdown, setShowEngineerDropdown] = useState(false);
  const [specificEngineer, setSpecificEngineer] = useState<Engineer | null>(null);
  const [specificAvailability, setSpecificAvailability] = useState<EngineerAvailabilityResponse | null>(null);
  const [specificLoading, setSpecificLoading] = useState(false);
  const [specificError, setSpecificError] = useState<string | null>(null);
  const [specificScrollIndex, setSpecificScrollIndex] = useState(0);
  const engineerSearchRef = useRef<HTMLDivElement>(null);

  // Assignment state
  const [pendingAssignment, setPendingAssignment] = useState<SlotAssignment | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const selectedJobRef = useRef<string | null>(null);

  // Keep selectedJobRef in sync
  useEffect(() => {
    selectedJobRef.current = selectedJob?.id ?? null;
  }, [selectedJob]);

  // ── Fetch jobs ──
  const fetchJobs = useCallback(async (query = '') => {
    let q = supabase.from('jobs').select('*').order('created_at', { ascending: false });

    if (query.trim()) {
      q = q.or(
        `job_title.ilike.%${query}%,property_address.ilike.%${query}%,postcode.ilike.%${query}%,tenant_name.ilike.%${query}%,trade.ilike.%${query}%,job_ref.ilike.%${query}%`
      );
    }

    const { data, error } = await q;
    if (error) {
      console.error('Error fetching jobs:', error);
      return;
    }

    setJobs(data || []);

    // Auto-select first job if none selected or selected job no longer in list
    if (data && data.length > 0) {
      const currentSelected = selectedJobRef.current;
      if (!currentSelected || !data.find((j: Job) => j.id === currentSelected)) {
        setSelectedJob(data[0]);
      }
    } else {
      setSelectedJob(null);
    }
  }, []);

  // ── Fetch stats ──
  const fetchStats = useCallback(async () => {
    const [totalRes, unassignedRes, assignedRes, materialsRes] = await Promise.all([
      supabase.from('jobs').select('*', { count: 'exact', head: true }),
      supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'UNASSIGNED'),
      supabase.from('jobs').select('*', { count: 'exact', head: true }).in('status', ['ASSIGNED', 'IN_PROGRESS']),
      supabase.from('materials').select('*', { count: 'exact', head: true }),
    ]);

    setStats({
      total: totalRes.count ?? 0,
      unassigned: unassignedRes.count ?? 0,
      assigned: assignedRes.count ?? 0,
      materials: materialsRes.count ?? 0,
    });
  }, []);

  // ── Fetch materials for selected job ──
  const fetchMaterials = useCallback(async (jobId: string) => {
    const { data, error } = await supabase
      .from('materials')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching materials:', error);
      return;
    }
    setMaterials(data || []);
  }, []);

  // ── Initial load ──
  useEffect(() => {
    async function init() {
      setIsLoading(true);
      await Promise.all([fetchJobs(), fetchStats()]);
      setIsLoading(false);
    }
    init();
  }, [fetchJobs, fetchStats]);

  // ── Fetch materials when selected job changes ──
  useEffect(() => {
    if (selectedJob) {
      fetchMaterials(selectedJob.id);
    } else {
      setMaterials([]);
    }
  }, [selectedJob, fetchMaterials]);

  // ── Real-time subscriptions ──
  useEffect(() => {
    const channel = supabase
      .channel('jobs-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'jobs' },
        (payload) => {
          fetchJobs(searchQuery);
          fetchStats();
          if (payload.eventType === 'INSERT') {
            const newJob = payload.new as Job;
            showToast(`New job received: ${newJob.job_ref}`);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'materials' },
        () => {
          fetchStats();
          if (selectedJobRef.current) {
            fetchMaterials(selectedJobRef.current);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchJobs, fetchStats, fetchMaterials, searchQuery]);

  // ── Load engineers for search ──
  useEffect(() => {
    async function loadEngineers() {
      const { data, error } = await supabase
        .from('engineers')
        .select('*')
        .eq('is_active', true)
        .order('display_name');
      if (!error && data) {
        setAllEngineers(data);
      }
    }
    loadEngineers();
  }, []);

  // ── Close engineer dropdown on outside click ──
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (engineerSearchRef.current && !engineerSearchRef.current.contains(e.target as Node)) {
        setShowEngineerDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Clear specific engineer when job changes ──
  useEffect(() => {
    setSpecificEngineer(null);
    setSpecificAvailability(null);
    setSpecificError(null);
    setEngineerQuery('');
  }, [selectedJob?.id]);

  // ── Fetch specific engineer availability ──
  const fetchSpecificAvailability = useCallback(
    async (engineer: Engineer, job: Job) => {
      setSpecificLoading(true);
      setSpecificError(null);
      setSpecificScrollIndex(0);

      try {
        const res = await fetch(
          'https://n8n.srv1177154.hstgr.cloud/webhook/engineer-availability',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              staff_uuid: engineer.sm8_uuid,
              days: 7,
              job_ref: job.job_ref,
              trade: job.trade,
              postcode: job.postcode,
            }),
          }
        );

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data: EngineerAvailabilityResponse = await res.json();
        if (data.error) throw new Error('Availability service returned an error');

        setSpecificAvailability(data);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load availability';
        setSpecificError(message);
      } finally {
        setSpecificLoading(false);
      }
    },
    []
  );

  const handleSelectSpecificEngineer = (engineer: Engineer) => {
    setSpecificEngineer(engineer);
    setEngineerQuery(engineer.display_name);
    setShowEngineerDropdown(false);
    if (selectedJob) {
      fetchSpecificAvailability(engineer, selectedJob);
    }
  };

  const handleClearSpecificEngineer = () => {
    setSpecificEngineer(null);
    setSpecificAvailability(null);
    setSpecificError(null);
    setEngineerQuery('');
  };

  // ── Assign engineer to job ──
  const handleSlotClickFromSpecific = (date: string, start: string, end: string) => {
    if (!specificEngineer || !specificAvailability) return;
    setPendingAssignment({
      staff_uuid: specificEngineer.sm8_uuid,
      staff_name: specificAvailability.engineer.name,
      slot_date: date,
      slot_start: start,
      slot_end: end,
    });
  };

  const handleConfirmAssign = async () => {
    if (!pendingAssignment || !selectedJob) return;
    setIsAssigning(true);

    try {
      const res = await fetch(
        'https://n8n.srv1177154.hstgr.cloud/webhook/assign-engineer',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            staff_uuid: pendingAssignment.staff_uuid,
            staff_name: pendingAssignment.staff_name,
            slot_date: pendingAssignment.slot_date,
            slot_start: pendingAssignment.slot_start,
            slot_end: pendingAssignment.slot_end,
            job_ref: selectedJob.job_ref,
            job_title: selectedJob.job_title,
            job_description: selectedJob.job_description,
            instruction_notes: selectedJob.instruction_notes,
            property_address: selectedJob.property_address,
            postcode: selectedJob.postcode,
            trade: selectedJob.trade,
            priority: selectedJob.priority,
            tenant_name: selectedJob.tenant_name,
            tenant_phone: selectedJob.tenant_phone,
            tenant_email: selectedJob.tenant_email,
          }),
        }
      );

      const data = await res.json();

      if (data.error) {
        showToast(`Assignment failed: ${data.message}`);
      } else {
        const slotDate = new Date(pendingAssignment.slot_date + 'T00:00:00');
        const formattedDate = slotDate.toLocaleDateString('en-GB', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        });
        showToast(
          `✓ Assigned to ${data.assigned_to} — ${formattedDate} ${data.scheduled.start}–${data.scheduled.end}`
        );
        updateJobLocally(selectedJob.job_ref, 'ASSIGNED', pendingAssignment.staff_name);
        handleClearSpecificEngineer();
        setShowEngineerPanel(false);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Network error';
      showToast(`Failed to assign engineer: ${message}`);
    } finally {
      setIsAssigning(false);
      setPendingAssignment(null);
    }
  };

  const handleJobAssignedFromPanel = (jobRef: string, engineerName: string) => {
    updateJobLocally(jobRef, 'ASSIGNED', engineerName);
  };

  const updateJobLocally = (jobRef: string, newStatus: string, engineerName: string) => {
    setJobs((prev) =>
      prev.map((j) =>
        j.job_ref === jobRef
          ? { ...j, status: newStatus, assigned_engineer: engineerName }
          : j
      )
    );
    if (selectedJob && selectedJob.job_ref === jobRef) {
      setSelectedJob((prev) =>
        prev ? { ...prev, status: newStatus, assigned_engineer: engineerName } : prev
      );
    }
  };

  const filteredEngineers = allEngineers.filter(
    (e) =>
      e.display_name.toLowerCase().includes(engineerQuery.toLowerCase()) ||
      e.full_name.toLowerCase().includes(engineerQuery.toLowerCase()) ||
      e.trades.some((t) => t.toLowerCase().includes(engineerQuery.toLowerCase()))
  );

  // ── Toast helper ──
  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 4000);
  };

  // ── Debounced search ──
  const handleSearch = (value: string) => {
    setSearchQuery(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      fetchJobs(value);
    }, 300);
  };

  // ── Add material ──
  const handleAddMaterial = async () => {
    if (!newMaterialName.trim() || !selectedJob) return;

    setAddingMaterial(true);
    const { error } = await supabase
      .from('materials')
      .insert({ job_id: selectedJob.id, material_name: newMaterialName.trim(), quantity: 1 });

    if (error) {
      console.error('Error adding material:', error);
      showToast('Failed to add material');
    } else {
      setNewMaterialName('');
      fetchMaterials(selectedJob.id);
      fetchStats();
    }
    setAddingMaterial(false);
  };

  // ── Select job ──
  const handleSelectJob = (job: Job) => {
    setSelectedJob(job);
    setShowDetail(true); // for mobile
  };

  const trade = (t: string) => TRADE_CONFIG[t] || TRADE_CONFIG.Other;
  const priority = (p: string) => PRIORITY_CONFIG[p] || PRIORITY_CONFIG.MEDIUM;
  const status = (s: string) => STATUS_CONFIG[s] || STATUS_CONFIG.UNASSIGNED;
  const source = (s: string) => SOURCE_CONFIG[s] || SOURCE_CONFIG.FIXFLO;

  // ── Empty state ──
  if (!isLoading && jobs.length === 0 && !searchQuery) {
    return (
      <div className="animate-fade-in flex flex-col items-center justify-center py-32 text-center">
        <ClipboardList className="w-16 h-16 text-[var(--color-text-muted)] mb-4" />
        <h2 className="text-xl font-semibold mb-2">No jobs yet</h2>
        <p className="text-[var(--color-text-secondary)] max-w-md">
          Jobs will appear here automatically when they arrive from Fixflo or Outlook
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Toast notification */}
      {toast && (
        <div className="fixed top-20 right-4 z-50 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg px-4 py-3 shadow-lg animate-slide-up">
          <p className="text-sm text-[var(--color-text-primary)]">{toast}</p>
        </div>
      )}

      {/* Engineer Finder Overlay */}
      {showEngineerPanel && selectedJob && (
        <EngineerPanel
          job={selectedJob}
          onClose={() => setShowEngineerPanel(false)}
          onToast={showToast}
          onJobAssigned={handleJobAssignedFromPanel}
        />
      )}

      {/* Assignment Confirmation Dialog */}
      {pendingAssignment && selectedJob && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl animate-fade-in">
            {isAssigning ? (
              <div className="flex flex-col items-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-purple-400 mb-4" />
                <p className="text-sm font-medium text-[var(--color-text-primary)]">
                  Creating job in ServiceM8 and scheduling to {pendingAssignment.staff_name}...
                </p>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-4">
                  Assign this job to {pendingAssignment.staff_name}?
                </h3>

                <div className="space-y-2 mb-6">
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-[var(--color-text-muted)] w-16 flex-shrink-0">Job:</span>
                    <span className="text-[var(--color-text-primary)] font-medium">
                      {selectedJob.job_title} ({selectedJob.job_ref})
                    </span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-[var(--color-text-muted)] w-16 flex-shrink-0">Address:</span>
                    <span className="text-[var(--color-text-secondary)]">
                      {selectedJob.property_address}
                    </span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-[var(--color-text-muted)] w-16 flex-shrink-0">Time:</span>
                    <span className="text-[var(--color-text-secondary)]">
                      {new Date(pendingAssignment.slot_date + 'T00:00:00').toLocaleDateString('en-GB', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      })}, {pendingAssignment.slot_start} – {pendingAssignment.slot_end}
                    </span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setPendingAssignment(null)}
                    className="btn btn-secondary flex-1 py-2.5"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmAssign}
                    className="flex-1 py-2.5 rounded-lg font-semibold text-white bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Confirm & Assign
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-0 lg:gap-0" style={{ height: 'calc(100vh - 200px)' }}>
        {/* ───── LEFT SIDEBAR ───── */}
        <div
          className={clsx(
            'w-full lg:w-[380px] lg:flex-shrink-0 border-r-0 lg:border-r border-[var(--color-border)] flex flex-col',
            showDetail && 'hidden lg:flex'
          )}
        >
          {/* Mini Header */}
          <div className="p-4 pb-3">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-white">P</span>
              </div>
              <div>
                <h2 className="text-sm font-semibold">Philbys Group</h2>
                <p className="text-xs text-[var(--color-text-muted)]">Ops Dashboard — Dispatch & Materials</p>
              </div>
            </div>

            {/* Status indicators */}
            <div className="flex items-center gap-4 mt-2 mb-4">
              {['Fixflo', 'Outlook', 'ServiceM8', 'n8n'].map((name) => (
                <div key={name} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-xs text-[var(--color-text-muted)]">{name}</span>
                </div>
              ))}
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[
                { label: 'TOTAL', value: stats.total, color: 'text-[var(--color-text-primary)]' },
                { label: 'UNASSIGNED', value: stats.unassigned, color: 'text-red-400' },
                { label: 'ASSIGNED', value: stats.assigned, color: 'text-blue-400' },
                { label: 'MATERIALS', value: stats.materials, color: 'text-amber-400' },
              ].map((card) => (
                <div
                  key={card.label}
                  className="bg-[var(--color-bg-secondary)] rounded-lg p-2 text-center border border-[var(--color-border)]"
                >
                  <p className={clsx('text-lg font-bold', card.color)}>{isLoading ? '—' : card.value}</p>
                  <p className="text-[10px] text-[var(--color-text-muted)] font-medium uppercase tracking-wide">
                    {card.label}
                  </p>
                </div>
              ))}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search jobs, postcodes, tenants, trades..."
                className="input pl-9 text-sm"
              />
            </div>
          </div>

          {/* Job List */}
          <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
            {isLoading ? (
              <SidebarSkeleton />
            ) : jobs.length === 0 ? (
              <div className="text-center py-8">
                <Search className="w-8 h-8 text-[var(--color-text-muted)] mx-auto mb-2" />
                <p className="text-sm text-[var(--color-text-secondary)]">No jobs match your search</p>
              </div>
            ) : (
              jobs.map((job) => {
                const isSelected = selectedJob?.id === job.id;
                const t = trade(job.trade);
                const p = priority(job.priority);

                return (
                  <button
                    key={job.id}
                    onClick={() => handleSelectJob(job)}
                    className={clsx(
                      'w-full text-left rounded-lg p-3 transition-all duration-150 border',
                      isSelected
                        ? 'bg-[var(--color-bg-hover)] border-l-[3px] border-l-blue-500 border-t-[var(--color-border-light)] border-r-[var(--color-border-light)] border-b-[var(--color-border-light)]'
                        : 'bg-[var(--color-bg-card)] border-[var(--color-border)] hover:bg-[var(--color-bg-hover)] hover:border-[var(--color-border-light)]'
                    )}
                  >
                    {/* Top row: ref, source, priority, time */}
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-[var(--color-text-muted)]">{job.job_ref}</span>
                        <span className={clsx('badge text-[10px] px-1.5 py-0', source(job.source))}>
                          {job.source}
                        </span>
                        <span className={clsx('text-xs flex items-center gap-1', p.color)}>
                          <span className="text-[10px]">{p.dot}</span> {job.priority}
                        </span>
                      </div>
                      <span className="text-xs text-[var(--color-text-muted)]">
                        {formatTime(job.date_raised)}
                      </span>
                    </div>

                    {/* Title */}
                    <p className="text-sm font-semibold text-[var(--color-text-primary)] mb-1.5 truncate">
                      {job.job_title}
                    </p>

                    {/* Trade + postcode + status */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={clsx('badge text-[10px] px-1.5 py-0', t.color)}>
                        {t.icon} {job.trade}
                      </span>
                      <span className="text-xs text-[var(--color-text-muted)]">📍 {job.postcode}</span>
                      {job.assigned_engineer && job.status === 'ASSIGNED' && (
                        <span className="badge text-[10px] px-1.5 py-0 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 ml-auto flex items-center gap-1">
                          👷 {job.assigned_engineer} · ASSIGNED ✓
                        </span>
                      )}
                      {!job.assigned_engineer && job.status === 'UNASSIGNED' && (
                        <span className="badge text-[10px] px-1.5 py-0 bg-red-500/10 text-red-400 border border-red-500/20 ml-auto">
                          UNASSIGNED
                        </span>
                      )}
                    </div>

                    {/* Address */}
                    <p className="text-xs text-[var(--color-text-muted)] mt-1 truncate">
                      {job.property_address}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ───── RIGHT PANEL ───── */}
        <div
          className={clsx(
            'flex-1 overflow-y-auto',
            !showDetail && 'hidden lg:block'
          )}
        >
          {isLoading ? (
            <DetailSkeleton />
          ) : !selectedJob ? (
            <div className="flex flex-col items-center justify-center h-full py-32 text-center">
              <ClipboardList className="w-12 h-12 text-[var(--color-text-muted)] mb-3" />
              <p className="text-[var(--color-text-secondary)]">Select a job to view details</p>
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {/* Mobile back button */}
              <button
                onClick={() => setShowDetail(false)}
                className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors lg:hidden mb-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Jobs
              </button>

              {/* Detail Header */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-mono text-[var(--color-text-muted)] font-semibold">
                    {selectedJob.job_ref}
                  </span>
                  <span className={clsx('badge text-xs', source(selectedJob.source))}>
                    {selectedJob.source}
                  </span>
                  <span className={clsx('badge text-xs', trade(selectedJob.trade).color)}>
                    {trade(selectedJob.trade).icon} {selectedJob.trade}
                  </span>
                  <span className={clsx('text-xs flex items-center gap-1', priority(selectedJob.priority).color)}>
                    {priority(selectedJob.priority).dot} {selectedJob.priority}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {selectedJob.assigned_engineer && (
                    <span className="badge text-xs px-2 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      👷 {selectedJob.assigned_engineer}
                    </span>
                  )}
                  <span
                    className={clsx(
                      'badge text-xs px-3 py-1',
                      status(selectedJob.status)
                    )}
                  >
                    {selectedJob.status.replace('_', ' ')}
                    {selectedJob.status === 'ASSIGNED' && ' ✓'}
                  </span>
                </div>
              </div>

              {/* Job Title */}
              <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
                {selectedJob.job_title}
              </h2>

              {/* Property & Tenant */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="md:col-span-3 bg-[var(--color-bg-secondary)] rounded-lg p-4 border border-[var(--color-border)]">
                  <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-2">
                    Property
                  </p>
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                    {selectedJob.property_address}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">{selectedJob.postcode}</p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">
                    Landlord: {selectedJob.landlord || '—'}
                  </p>
                </div>

                <div className="md:col-span-2 bg-[var(--color-bg-secondary)] rounded-lg p-4 border border-[var(--color-border)]">
                  <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-2">
                    Tenant
                  </p>
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                    {selectedJob.tenant_name || '—'}
                  </p>
                  {selectedJob.tenant_phone ? (
                    <a
                      href={`tel:${selectedJob.tenant_phone}`}
                      className="text-xs text-emerald-400 hover:underline mt-1 block"
                    >
                      {selectedJob.tenant_phone}
                    </a>
                  ) : (
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">—</p>
                  )}
                  {selectedJob.tenant_email && (
                    <p className="text-xs text-[var(--color-text-muted)] mt-1 truncate">
                      {selectedJob.tenant_email}
                    </p>
                  )}
                </div>
              </div>

              {/* Job Description */}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-2">
                  Job Description
                </p>
                <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4 border border-[var(--color-border)]">
                  <p className="text-sm text-[var(--color-text-secondary)] whitespace-pre-wrap leading-relaxed">
                    {selectedJob.job_description || 'No description provided'}
                  </p>
                </div>
              </div>

              {/* Materials */}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-2">
                  <Wrench className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" />
                  Materials Required
                </p>

                <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4 border border-[var(--color-border)]">
                  {materials.length === 0 ? (
                    <p className="text-sm text-[var(--color-text-muted)] italic">
                      No materials yet — add below to link to this job in ServiceM8
                    </p>
                  ) : (
                    <ul className="space-y-2 mb-4">
                      {materials.map((m) => (
                        <li
                          key={m.id}
                          className="flex items-center gap-2 text-sm text-[var(--color-text-primary)]"
                        >
                          <Package className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                          <span>{m.material_name}</span>
                          {m.quantity > 1 && (
                            <span className="badge bg-[var(--color-bg-card)] text-[var(--color-text-muted)] text-[10px]">
                              ×{m.quantity}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Add material input */}
                  <div className="flex gap-2 mt-3">
                    <input
                      type="text"
                      value={newMaterialName}
                      onChange={(e) => setNewMaterialName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddMaterial()}
                      placeholder="Material name..."
                      className="input text-sm flex-1"
                    />
                    <button
                      onClick={handleAddMaterial}
                      disabled={!newMaterialName.trim() || addingMaterial}
                      className={clsx(
                        'btn btn-primary px-3 text-sm gap-1',
                        (!newMaterialName.trim() || addingMaterial) && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <Plus className="w-4 h-4" />
                      Add
                    </button>
                  </div>
                </div>
              </div>

              {/* Find Best Engineer Button */}
              <button
                onClick={() => setShowEngineerPanel(true)}
                className="w-full py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 transition-all duration-200 shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2"
              >
                <span className="w-2 h-2 rounded-full bg-white" />
                Find Best Engineer in ServiceM8
              </button>

              {/* Search Specific Engineer */}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-2">
                  <Search className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" />
                  Search Specific Engineer
                </p>

                <div ref={engineerSearchRef} className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
                    <input
                      type="text"
                      value={engineerQuery}
                      onChange={(e) => {
                        setEngineerQuery(e.target.value);
                        setShowEngineerDropdown(true);
                        if (specificEngineer) {
                          setSpecificEngineer(null);
                          setSpecificAvailability(null);
                          setSpecificError(null);
                        }
                      }}
                      onFocus={() => {
                        if (!specificEngineer) setShowEngineerDropdown(true);
                      }}
                      placeholder="Type engineer name or trade..."
                      className="input pl-9 pr-9 text-sm"
                    />
                    {(engineerQuery || specificEngineer) && (
                      <button
                        onClick={handleClearSpecificEngineer}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Dropdown */}
                  {showEngineerDropdown && engineerQuery && !specificEngineer && (
                    <div className="absolute z-20 w-full mt-1 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {filteredEngineers.length === 0 ? (
                        <p className="text-sm text-[var(--color-text-muted)] p-3 text-center">
                          No engineers found
                        </p>
                      ) : (
                        filteredEngineers.map((eng) => {
                          const avatarColor = AVATAR_COLORS[eng.display_name.charCodeAt(0) % AVATAR_COLORS.length];
                          return (
                            <button
                              key={eng.id}
                              onClick={() => handleSelectSpecificEngineer(eng)}
                              className="flex items-center gap-3 w-full p-3 text-left hover:bg-[var(--color-bg-hover)] transition-colors border-b border-[var(--color-border)] last:border-b-0"
                            >
                              <div className={clsx('w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0', avatarColor)}>
                                {eng.display_name.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                                  {eng.display_name}
                                </p>
                                <div className="flex flex-wrap items-center gap-1 mt-0.5">
                                  {eng.trades.map((t) => (
                                    <span key={t} className="text-[10px] text-[var(--color-text-muted)]">{t}</span>
                                  ))}
                                </div>
                              </div>
                              <span className="text-xs text-[var(--color-text-muted)] flex-shrink-0">
                                {eng.area_display}
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                {/* Loading state */}
                {specificLoading && (
                  <div className="flex flex-col items-center justify-center py-8 mt-3">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-400 mb-2" />
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      Loading availability from ServiceM8...
                    </p>
                  </div>
                )}

                {/* Error state */}
                {specificError && !specificLoading && (
                  <div className="mt-3 bg-red-500/5 border border-red-500/20 rounded-lg p-4 text-center">
                    <AlertCircle className="w-6 h-6 text-red-400 mx-auto mb-2" />
                    <p className="text-sm text-red-400 mb-2">{specificError}</p>
                    <button
                      onClick={() => specificEngineer && selectedJob && fetchSpecificAvailability(specificEngineer, selectedJob)}
                      className="btn btn-primary text-sm px-4"
                    >
                      Try Again
                    </button>
                  </div>
                )}

                {/* Engineer Availability Card */}
                {!specificLoading && !specificError && specificEngineer && specificAvailability && (
                  <div className="mt-3 card card-hover animate-fade-in">
                    <div className="flex items-start gap-3 mb-4">
                      <div
                        className={clsx(
                          'w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 relative',
                          AVATAR_COLORS[specificEngineer.display_name.charCodeAt(0) % AVATAR_COLORS.length]
                        )}
                      >
                        {specificEngineer.display_name.charAt(0).toUpperCase()}
                        {specificAvailability.engineer.on_leave_today && (
                          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-red-500 border-2 border-[var(--color-bg-card)]" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-[var(--color-text-primary)]">
                            {specificAvailability.engineer.name}
                          </h3>
                          {specificAvailability.engineer.on_leave_today && (
                            <span className="inline-flex items-center px-1.5 py-0 rounded-full text-[10px] font-medium bg-red-500/20 text-red-400 border border-red-500/30">
                              ON LEAVE
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)] mt-0.5">
                          <MapPin className="w-3 h-3" />
                          <span>{specificAvailability.engineer.area}</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-[var(--color-text-muted)]">
                          {specificEngineer.mobile && (
                            <a href={`tel:${specificEngineer.mobile}`} className="flex items-center gap-1 hover:text-emerald-400 transition-colors">
                              <Phone className="w-3 h-3" /> {specificEngineer.mobile}
                            </a>
                          )}
                          {specificEngineer.email && (
                            <a href={`mailto:${specificEngineer.email}`} className="flex items-center gap-1 hover:text-blue-400 transition-colors truncate">
                              <Mail className="w-3 h-3" /> {specificEngineer.email}
                            </a>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {specificAvailability.engineer.trades.map((t) => (
                            <span key={t} className="inline-flex items-center px-1.5 py-0 rounded-full text-[10px] font-medium bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)]">
                              {t}
                            </span>
                          ))}
                          {specificAvailability.engineer.certifications.map((c) => (
                            <span key={c} className="inline-flex items-center px-1.5 py-0 rounded-full text-[10px] font-medium bg-emerald-500/20 text-emerald-400">
                              <Shield className="w-2.5 h-2.5 mr-0.5" /> {c}
                            </span>
                          ))}
                        </div>

                        {/* Leave periods */}
                        {specificAvailability.engineer.leave_periods.length > 0 && (
                          <div className="mt-1.5">
                            {specificAvailability.engineer.leave_periods.map((lp, i) => (
                              <p key={i} className="text-[10px] text-amber-400 flex items-center gap-1">
                                <Calendar className="w-2.5 h-2.5" />
                                {lp.leave_type}: {formatLeaveRange(lp.leave_start, lp.leave_end)}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Week summary */}
                    <div className="flex items-center gap-4 mb-3 text-xs text-[var(--color-text-secondary)]">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Week: {specificAvailability.week_summary.total_free_hours}h free
                      </span>
                      <span>Today: {specificAvailability.week_summary.today_free_hours}h free</span>
                    </div>

                    {/* Availability grid */}
                    <SpecificEngineerAvailabilityGrid
                      availability={specificAvailability.availability}
                      leaveDates={specificAvailability.engineer.leave_dates || []}
                      scrollIndex={specificScrollIndex}
                      onScrollChange={setSpecificScrollIndex}
                      onSlotClick={handleSlotClickFromSpecific}
                    />

                    <p className="text-xs text-purple-400 mt-2 text-center opacity-70">
                      Click a free slot to assign this engineer
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
