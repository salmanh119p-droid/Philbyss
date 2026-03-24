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
  Pencil,
  Check,
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
  MANUAL: 'bg-purple-500/20 text-purple-400',
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
  const [stats, setStats] = useState({ total: 0, unassigned: 0, assigned: 0, materials: 0, existing: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [newMaterialName, setNewMaterialName] = useState('');
  const [addingMaterial, setAddingMaterial] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false); // mobile detail view
  const [showEngineerPanel, setShowEngineerPanel] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [jobsWithMaterials, setJobsWithMaterials] = useState<Set<string>>(new Set());
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Job>>({});
  const [statusUpdateValue, setStatusUpdateValue] = useState('Work Order');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [showAddJobForm, setShowAddJobForm] = useState(false);
  const [isAddingJob, setIsAddingJob] = useState(false);
  const [companies, setCompanies] = useState<{ id: number; Name: string; company_ids: string; address: string }[]>([]);
  const [companySearch, setCompanySearch] = useState('');
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [accessArrangement, setAccessArrangement] = useState('');
  const [isSendingAccess, setIsSendingAccess] = useState(false);
  const [newJob, setNewJob] = useState({
    job_title: '',
    trade: 'General',
    priority: 'MEDIUM',
    property_address: '',
    postcode: '',
    landlord: '',
    landlord_email: '',
    company: '',
    company_id: '',
    tenant_name: '',
    tenant_phone: '',
    tenant_email: '',
    job_description: '',
    instruction_notes: '',
    fault_detail: '',
    source: 'MANUAL',
    job_exist: 'No',
    sm8_job_uuid: '',
    po_number: '',
    job_status: 'Work Order',
  });

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
  const [dialogAdjustedStart, setDialogAdjustedStart] = useState('');
  const [dialogAdjustedEnd, setDialogAdjustedEnd] = useState('');

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
    const [totalRes, unassignedRes, assignedRes, materialsRes, existingRes] = await Promise.all([
      supabase.from('jobs').select('*', { count: 'exact', head: true }),
      supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'UNASSIGNED'),
      supabase.from('jobs').select('*', { count: 'exact', head: true }).in('status', ['ASSIGNED', 'IN_PROGRESS']),
      supabase.from('materials').select('*', { count: 'exact', head: true }),
      supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('job_exist', 'Yes'),
    ]);

    setStats({
      total: totalRes.count ?? 0,
      unassigned: unassignedRes.count ?? 0,
      assigned: assignedRes.count ?? 0,
      materials: materialsRes.count ?? 0,
      existing: existingRes.count ?? 0,
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

  // ── Fetch job IDs that have materials ──
  const fetchJobsWithMaterials = useCallback(async () => {
    const { data, error } = await supabase
      .from('materials')
      .select('job_id');
    if (!error && data) {
      setJobsWithMaterials(new Set(data.map((m: { job_id: string }) => m.job_id)));
    }
  }, []);

  // ── Initial load ──
  useEffect(() => {
    async function init() {
      setIsLoading(true);
      await Promise.all([fetchJobs(), fetchStats(), fetchJobsWithMaterials()]);
      setIsLoading(false);
    }
    init();
  }, [fetchJobs, fetchStats, fetchJobsWithMaterials]);

  // ── Fetch companies for dropdown ──
  useEffect(() => {
    const fetchCompanies = async () => {
      const { data } = await supabase.from('Companys').select('id, Name, company_ids, address').order('Name');
      if (data) setCompanies(data);
    };
    fetchCompanies();
  }, []);

  // ── Fetch materials when selected job changes ──
  useEffect(() => {
    if (selectedJob) {
      fetchMaterials(selectedJob.id);
      setAccessArrangement('');
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
          fetchJobsWithMaterials();
          if (selectedJobRef.current) {
            fetchMaterials(selectedJobRef.current);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchJobs, fetchStats, fetchMaterials, fetchJobsWithMaterials, searchQuery]);

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
              start_time: '08:00',
              end_time: '18:00',
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
    // Initialize adjusted times: start stays, end defaults to start + 1.5h capped at slot end
    setDialogAdjustedStart(start);
    const [h, m] = start.split(':').map(Number);
    const startMins = h * 60 + m;
    const defaultEndMins = startMins + 90;
    const [eh, em] = end.split(':').map(Number);
    const slotEndMins = eh * 60 + em;
    const endMins = Math.min(defaultEndMins, slotEndMins);
    setDialogAdjustedEnd(
      `${Math.floor(endMins / 60).toString().padStart(2, '0')}:${(endMins % 60).toString().padStart(2, '0')}`
    );
  };

  const handleConfirmAssign = async (adjustedStart?: string, adjustedEnd?: string) => {
    if (!pendingAssignment || !selectedJob) return;
    setIsAssigning(true);

    const finalStart = adjustedStart || pendingAssignment.slot_start;
    const finalEnd = adjustedEnd || pendingAssignment.slot_end;

    try {
      const isExistingJob = selectedJob.job_exist === 'Yes' && selectedJob.sm8_job_uuid;
      const webhookUrl = isExistingJob
        ? 'https://n8n.srv1177154.hstgr.cloud/webhook/exsiting_job'
        : 'https://n8n.srv1177154.hstgr.cloud/webhook/assign-engineer';

      const payload: Record<string, any> = {
        staff_uuid: pendingAssignment.staff_uuid,
        staff_name: pendingAssignment.staff_name,
        slot_date: pendingAssignment.slot_date,
        slot_start: finalStart,
        slot_end: finalEnd,
        job_ref: selectedJob.job_ref,
        job_title: selectedJob.job_title,
        job_description: selectedJob.job_description,
        instruction_notes: selectedJob.instruction_notes,
        fault_detail: selectedJob.fault_detail || null,
        property_address: selectedJob.property_address,
        postcode: selectedJob.postcode,
        trade: selectedJob.trade,
        priority: selectedJob.priority,
        tenant_name: selectedJob.tenant_name,
        tenant_phone: selectedJob.tenant_phone,
        tenant_email: selectedJob.tenant_email,
        company_name: selectedJob.company || null,
        landlord: selectedJob.landlord || null,
        action: 'assign_engineer',
      };

      if (isExistingJob) {
        payload.sm8_job_uuid = selectedJob.sm8_job_uuid;
      }

      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

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
        updateJobLocally(selectedJob.job_ref, 'ASSIGNED', pendingAssignment.staff_name, pendingAssignment.slot_date);
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

  const handleJobAssignedFromPanel = (jobRef: string, engineerName: string, scheduledDate?: string) => {
    updateJobLocally(jobRef, 'ASSIGNED', engineerName, scheduledDate);
  };

  const handleStatusOnlyUpdate = async () => {
    if (!selectedJob) return;
    setIsUpdatingStatus(true);

    try {
      const res = await fetch(
        'https://n8n.srv1177154.hstgr.cloud/webhook/exsiting_job',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sm8_job_uuid: selectedJob.sm8_job_uuid || null,
            job_ref: selectedJob.job_ref,
            job_title: selectedJob.job_title,
            property_address: selectedJob.property_address,
            postcode: selectedJob.postcode,
            trade: selectedJob.trade,
            priority: selectedJob.priority,
            tenant_name: selectedJob.tenant_name,
            tenant_phone: selectedJob.tenant_phone,
            tenant_email: selectedJob.tenant_email,
            new_status: statusUpdateValue,
            action: 'status_only',
          }),
        }
      );

      const data = await res.json();

      if (data.error) {
        showToast(`Status update failed: ${data.message || 'Unknown error'}`);
      } else {
        showToast(`✓ Job ${selectedJob.job_ref} status updated to "${statusUpdateValue}"`);
        setJobs((prev) =>
          prev.map((j) =>
            j.job_ref === selectedJob.job_ref
              ? { ...j, status: 'ASSIGNED' }
              : j
          )
        );
        if (selectedJob) {
          setSelectedJob((prev) =>
            prev ? { ...prev, status: 'ASSIGNED' } : prev
          );
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Network error';
      showToast(`Failed to update status: ${message}`);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleAddJob = async () => {
    if (!newJob.job_title.trim() || !newJob.postcode.trim()) {
      showToast('Job title and postcode are required');
      return;
    }

    setIsAddingJob(true);

    const jobRef = `MAN${Date.now().toString().slice(-8)}`;

    const jobPayload = {
      job_ref: jobRef,
      source: 'MANUAL',
      job_title: newJob.job_title.trim(),
      trade: newJob.trade,
      priority: newJob.priority,
      status: 'UNASSIGNED',
      property_address: newJob.property_address.trim(),
      postcode: newJob.postcode.trim().toUpperCase(),
      landlord: newJob.landlord.trim() || null,
      landlord_email: newJob.landlord_email.trim() || null,
      company: newJob.company.trim() || null,
      company_id: newJob.company_id || null,
      tenant_name: newJob.tenant_name.trim() || null,
      tenant_phone: newJob.tenant_phone.trim() || null,
      tenant_email: newJob.tenant_email.trim() || null,
      job_description: newJob.job_description.trim() || '',
      instruction_notes: newJob.instruction_notes.trim() || null,
      fault_detail: newJob.fault_detail.trim() || null,
      job_exist: newJob.job_exist,
      sm8_job_uuid: newJob.job_exist === 'Yes' && newJob.sm8_job_uuid.trim()
        ? newJob.sm8_job_uuid.trim()
        : null,
      po_number: newJob.po_number.trim() || null,
      job_status: newJob.job_status,
      date_raised: new Date().toISOString(),
    };

    // 1. Send webhook to n8n FIRST — primary action
    try {
      await fetch('https://n8n.srv1177154.hstgr.cloud/webhook/exsiting_job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...jobPayload,
          action: 'new_manual_job',
        }),
      });
      showToast(`✓ Job ${jobRef} sent to n8n`);
    } catch (webhookErr) {
      console.error('Webhook failed:', webhookErr);
      showToast(`Failed to send job to n8n`);
    }

    // 2. Also save to Supabase for local tracking
    const { data, error } = await supabase.from('jobs').insert(jobPayload).select();
    if (error) {
      console.error('Supabase insert error:', error);
    }
    if (!error && data && data.length > 0) {
      setSelectedJob(data[0]);
      setShowDetail(true);
    }

    // 3. Reset form and refresh
    setShowAddJobForm(false);
    setNewJob({
      job_title: '',
      trade: 'General',
      priority: 'MEDIUM',
      property_address: '',
      postcode: '',
      landlord: '',
      landlord_email: '',
      company: '',
      company_id: '',
      tenant_name: '',
      tenant_phone: '',
      tenant_email: '',
      job_description: '',
      instruction_notes: '',
      fault_detail: '',
      source: 'MANUAL',
      job_exist: 'No',
      sm8_job_uuid: '',
      po_number: '',
      job_status: 'Work Order',
    });
    setCompanySearch('');
    fetchJobs(searchQuery);
    fetchStats();
    setIsAddingJob(false);
  };

  const handleSendAccessInfo = async () => {
    if (!selectedJob || !accessArrangement.trim()) return;
    setIsSendingAccess(true);
    try {
      await fetch('https://n8n.srv1177154.hstgr.cloud/webhook/exsiting_job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_ref: selectedJob.job_ref,
          sm8_job_uuid: selectedJob.sm8_job_uuid || null,
          access_arrangement: accessArrangement.trim(),
          action: 'access_info',
        }),
      });
      showToast(`✓ Access info sent for ${selectedJob.job_ref}`);
      setAccessArrangement('');
    } catch {
      showToast('Failed to send access info');
    } finally {
      setIsSendingAccess(false);
    }
  };

  const calculateDuration = (start: string, end: string): string => {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const diffMins = (eh * 60 + em) - (sh * 60 + sm);
    if (diffMins <= 0) return '0h';
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const updateJobLocally = (jobRef: string, newStatus: string, engineerName: string, scheduledDate?: string) => {
    setJobs((prev) =>
      prev.map((j) =>
        j.job_ref === jobRef
          ? { ...j, status: newStatus, assigned_engineer: engineerName, scheduled_date: scheduledDate || j.scheduled_date }
          : j
      )
    );
    if (selectedJob && selectedJob.job_ref === jobRef) {
      setSelectedJob((prev) =>
        prev ? { ...prev, status: newStatus, assigned_engineer: engineerName, scheduled_date: scheduledDate || prev.scheduled_date } : prev
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

  // ── Editing helpers ──
  const startEditing = () => {
    if (!selectedJob) return;
    setEditForm({
      job_title: selectedJob.job_title,
      property_address: selectedJob.property_address,
      postcode: selectedJob.postcode,
      landlord: selectedJob.landlord,
      company: selectedJob.company,
      tenant_name: selectedJob.tenant_name,
      tenant_phone: selectedJob.tenant_phone,
      tenant_email: selectedJob.tenant_email,
      job_description: selectedJob.job_description,
      instruction_notes: selectedJob.instruction_notes,
      fault_detail: selectedJob.fault_detail,
      trade: selectedJob.trade,
      priority: selectedJob.priority,
      status: selectedJob.status,
      assigned_engineer: selectedJob.assigned_engineer,
      works_due_by: selectedJob.works_due_by,
    });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditForm({});
  };

  const saveEditing = async () => {
    if (!selectedJob) return;

    const { error } = await supabase
      .from('jobs')
      .update(editForm)
      .eq('id', selectedJob.id);

    if (error) {
      showToast('Failed to update job');
      console.error('Update error:', error);
      return;
    }

    const updatedJob = { ...selectedJob, ...editForm } as Job;
    setSelectedJob(updatedJob);
    setJobs((prev) =>
      prev.map((j) => (j.id === selectedJob.id ? updatedJob : j))
    );

    setIsEditing(false);
    setEditForm({});
    showToast('Job updated successfully');
  };

  // ── Select job ──
  const handleSelectJob = (job: Job) => {
    setSelectedJob(job);
    setIsEditing(false);
    setEditForm({});
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
    <>
      {/* Toast notification */}
      {toast && (
        <div className="fixed top-20 right-4 z-50 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg px-4 py-3 shadow-lg animate-slide-up">
          <p className="text-sm text-[var(--color-text-primary)]">{toast}</p>
        </div>
      )}

      {/* Add Job Form Modal */}
      {showAddJobForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-6 max-w-2xl w-full mx-4 shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
                Add Job Manually
              </h3>
              <button
                onClick={() => setShowAddJobForm(false)}
                className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Job Title */}
              <div>
                <label className="text-xs text-[var(--color-text-muted)] mb-1 block">
                  Job Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={newJob.job_title}
                  onChange={(e) => setNewJob({ ...newJob, job_title: e.target.value })}
                  placeholder="e.g. Blocked Basin & Bath Stopper"
                  className="input text-sm"
                />
              </div>

              {/* Trade + Priority + Job Exists row */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Trade</label>
                  <select
                    value={newJob.trade}
                    onChange={(e) => setNewJob({ ...newJob, trade: e.target.value })}
                    className="input text-sm"
                  >
                    {['General', 'Plumbing', 'Electrical', 'Heating & Gas', 'Drainage', 'Roofing', 'Locksmith', 'Carpentry', 'Decorating'].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Priority</label>
                  <select
                    value={newJob.priority}
                    onChange={(e) => setNewJob({ ...newJob, priority: e.target.value })}
                    className="input text-sm"
                  >
                    {['HIGH', 'MEDIUM', 'LOW'].map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Job Exists in SM8?</label>
                  <select
                    value={newJob.job_exist}
                    onChange={(e) => setNewJob({ ...newJob, job_exist: e.target.value })}
                    className="input text-sm"
                  >
                    <option value="No">No — New Job</option>
                    <option value="Yes">Yes — Existing SM8 Job</option>
                  </select>
                </div>
              </div>

              {/* SM8 UUID — only show if job_exist = Yes */}
              {newJob.job_exist === 'Yes' && (
                <div>
                  <label className="text-xs text-[var(--color-text-muted)] mb-1 block">
                    ServiceM8 Job UUID <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={newJob.sm8_job_uuid}
                    onChange={(e) => setNewJob({ ...newJob, sm8_job_uuid: e.target.value })}
                    placeholder="e.g. a1b2c3d4-e5f6-7890-abcd-ef1234567890"
                    className="input text-sm font-mono"
                  />
                  <p className="text-[10px] text-[var(--color-text-muted)] mt-1">
                    Paste the UUID from ServiceM8 for the existing job
                  </p>
                </div>
              )}

              {/* Property Address + Postcode */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Property Address</label>
                  <input
                    type="text"
                    value={newJob.property_address}
                    onChange={(e) => setNewJob({ ...newJob, property_address: e.target.value })}
                    placeholder="Full address"
                    className="input text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-[var(--color-text-muted)] mb-1 block">
                    Postcode <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={newJob.postcode}
                    onChange={(e) => setNewJob({ ...newJob, postcode: e.target.value })}
                    placeholder="E1 6AN"
                    className="input text-sm uppercase"
                  />
                </div>
              </div>

              {/* PO Number + Job Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[var(--color-text-muted)] mb-1 block">PO Number</label>
                  <input
                    type="text"
                    value={newJob.po_number}
                    onChange={(e) => setNewJob({ ...newJob, po_number: e.target.value })}
                    placeholder="e.g. PO-12345"
                    className="input text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Job Status</label>
                  <select
                    value={newJob.job_status}
                    onChange={(e) => setNewJob({ ...newJob, job_status: e.target.value })}
                    className="input text-sm"
                  >
                    <option value="Work Order">Work Order</option>
                    <option value="Quote">Quote</option>
                  </select>
                </div>
              </div>

              {/* Landlord + Landlord Email + Company */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Landlord</label>
                  <input
                    type="text"
                    value={newJob.landlord}
                    onChange={(e) => setNewJob({ ...newJob, landlord: e.target.value })}
                    placeholder="Landlord name"
                    className="input text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Landlord Email</label>
                  <input
                    type="email"
                    value={newJob.landlord_email}
                    onChange={(e) => setNewJob({ ...newJob, landlord_email: e.target.value })}
                    placeholder="landlord@email.com"
                    className="input text-sm"
                  />
                </div>
                <div className="relative">
                  <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Company / Agency</label>
                  <input
                    type="text"
                    value={companySearch}
                    onChange={(e) => {
                      setCompanySearch(e.target.value);
                      setShowCompanyDropdown(true);
                      if (!e.target.value.trim()) {
                        setNewJob({ ...newJob, company: '', company_id: '' });
                      }
                    }}
                    onFocus={() => setShowCompanyDropdown(true)}
                    placeholder="Search company..."
                    className="input text-sm"
                  />
                  {showCompanyDropdown && companySearch.trim() && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg max-h-40 overflow-y-auto shadow-lg">
                      {companies
                        .filter((c) => c.Name?.toLowerCase().includes(companySearch.toLowerCase()))
                        .map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setNewJob({ ...newJob, company: c.Name, company_id: c.company_ids });
                              setCompanySearch(c.Name);
                              setShowCompanyDropdown(false);
                            }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]"
                          >
                            <span className="font-medium">{c.Name}</span>
                            {c.address && (
                              <span className="text-[10px] text-[var(--color-text-muted)] ml-2">{c.address}</span>
                            )}
                          </button>
                        ))}
                      {companies.filter((c) => c.Name?.toLowerCase().includes(companySearch.toLowerCase())).length === 0 && (
                        <p className="px-3 py-2 text-xs text-[var(--color-text-muted)]">No companies found</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Tenant details */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Tenant Name</label>
                  <input
                    type="text"
                    value={newJob.tenant_name}
                    onChange={(e) => setNewJob({ ...newJob, tenant_name: e.target.value })}
                    placeholder="Name"
                    className="input text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Tenant Phone</label>
                  <input
                    type="text"
                    value={newJob.tenant_phone}
                    onChange={(e) => setNewJob({ ...newJob, tenant_phone: e.target.value })}
                    placeholder="07XXX..."
                    className="input text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Tenant Email</label>
                  <input
                    type="text"
                    value={newJob.tenant_email}
                    onChange={(e) => setNewJob({ ...newJob, tenant_email: e.target.value })}
                    placeholder="email@example.com"
                    className="input text-sm"
                  />
                </div>
              </div>

              {/* Job Description */}
              <div>
                <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Job Description</label>
                <textarea
                  value={newJob.job_description}
                  onChange={(e) => setNewJob({ ...newJob, job_description: e.target.value })}
                  placeholder="Describe the issue..."
                  className="input text-sm min-h-[80px]"
                />
              </div>

              {/* Instruction Notes */}
              <div>
                <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Instruction Notes</label>
                <textarea
                  value={newJob.instruction_notes}
                  onChange={(e) => setNewJob({ ...newJob, instruction_notes: e.target.value })}
                  placeholder="Special instructions for the engineer..."
                  className="input text-sm min-h-[60px]"
                />
              </div>

              {/* Fault Detail */}
              <div>
                <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Fault Detail</label>
                <textarea
                  value={newJob.fault_detail}
                  onChange={(e) => setNewJob({ ...newJob, fault_detail: e.target.value })}
                  placeholder="Detail from tenant about the fault..."
                  className="input text-sm min-h-[60px]"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowAddJobForm(false)}
                  className="btn btn-secondary flex-1 py-2.5"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddJob}
                  disabled={isAddingJob || !newJob.job_title.trim() || !newJob.postcode.trim()}
                  className={clsx(
                    'flex-1 py-2.5 rounded-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 transition-all flex items-center justify-center gap-2',
                    (isAddingJob || !newJob.job_title.trim() || !newJob.postcode.trim()) && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {isAddingJob ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  {isAddingJob ? 'Creating...' : 'Create Job'}
                </button>
              </div>
            </div>
          </div>
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

                <div className="space-y-2 mb-4">
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
                    <span className="text-[var(--color-text-muted)] w-16 flex-shrink-0">Date:</span>
                    <span className="text-[var(--color-text-secondary)]">
                      {new Date(pendingAssignment.slot_date + 'T00:00:00').toLocaleDateString('en-GB', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      })}
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
                        value={dialogAdjustedStart}
                        min={pendingAssignment.slot_start}
                        max={pendingAssignment.slot_end}
                        onChange={(e) => setDialogAdjustedStart(e.target.value)}
                        className="input text-sm w-full"
                      />
                    </div>
                    <span className="text-[var(--color-text-muted)] mt-5">to</span>
                    <div className="flex-1">
                      <label className="text-xs text-[var(--color-text-muted)] mb-1 block">End</label>
                      <input
                        type="time"
                        value={dialogAdjustedEnd}
                        min={dialogAdjustedStart}
                        max={pendingAssignment.slot_end}
                        onChange={(e) => setDialogAdjustedEnd(e.target.value)}
                        className="input text-sm w-full"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-[var(--color-text-muted)] mt-2">
                    Free slot: {pendingAssignment.slot_start} – {pendingAssignment.slot_end} · Selected duration: {calculateDuration(dialogAdjustedStart, dialogAdjustedEnd)}
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setPendingAssignment(null)}
                    className="btn btn-secondary flex-1 py-2.5"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleConfirmAssign(dialogAdjustedStart, dialogAdjustedEnd)}
                    disabled={dialogAdjustedStart >= dialogAdjustedEnd || dialogAdjustedStart < pendingAssignment.slot_start || dialogAdjustedEnd > pendingAssignment.slot_end}
                    className={clsx(
                      'flex-1 py-2.5 rounded-lg font-semibold text-white bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 transition-all flex items-center justify-center gap-2',
                      (dialogAdjustedStart >= dialogAdjustedEnd || dialogAdjustedStart < pendingAssignment.slot_start || dialogAdjustedEnd > pendingAssignment.slot_end) && 'opacity-50 cursor-not-allowed'
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
      )}

      <div className="animate-fade-in">
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
            <div className="grid grid-cols-5 gap-2 mb-4">
              {[
                { label: 'TOTAL', value: stats.total, color: 'text-[var(--color-text-primary)]', filter: null as string | null },
                { label: 'UNASSIGNED', value: stats.unassigned, color: 'text-red-400', filter: 'UNASSIGNED' },
                { label: 'ASSIGNED', value: stats.assigned, color: 'text-blue-400', filter: 'ASSIGNED' },
                { label: 'MATERIALS', value: stats.materials, color: 'text-amber-400', filter: 'MATERIALS' },
                { label: 'EXISTING', value: stats.existing, color: 'text-cyan-400', filter: 'EXISTING' },
              ].map((card) => (
                <button
                  key={card.label}
                  onClick={() => setStatusFilter(statusFilter === card.filter ? null : card.filter)}
                  className={clsx(
                    'bg-[var(--color-bg-secondary)] rounded-lg p-2 text-center border transition-all',
                    statusFilter === card.filter
                      ? 'border-blue-500/50 bg-blue-500/10'
                      : 'border-[var(--color-border)] hover:border-[var(--color-border-light)]'
                  )}
                >
                  <p className={clsx('text-lg font-bold', card.color)}>{isLoading ? '—' : card.value}</p>
                  <p className="text-[10px] text-[var(--color-text-muted)] font-medium uppercase tracking-wide">
                    {card.label}
                  </p>
                </button>
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
            <button
              onClick={() => setShowAddJobForm(true)}
              className="w-full mt-3 btn btn-secondary text-sm py-2.5 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Job Manually
            </button>
          </div>

          {/* Job List */}
          <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
            {statusFilter && (
              <div className="flex items-center justify-between px-1 mb-2">
                <span className="text-xs text-blue-400 font-medium">
                  Filtered: {statusFilter}
                </span>
                <button
                  onClick={() => setStatusFilter(null)}
                  className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                >
                  Clear
                </button>
              </div>
            )}
            {isLoading ? (
              <SidebarSkeleton />
            ) : jobs.filter((job) => {
              if (statusFilter === 'UNASSIGNED') return job.status === 'UNASSIGNED';
              if (statusFilter === 'ASSIGNED') return job.status === 'ASSIGNED' || job.status === 'IN_PROGRESS';
              if (statusFilter === 'MATERIALS') return jobsWithMaterials.has(job.id);
              if (statusFilter === 'EXISTING') return job.job_exist === 'Yes';
              return true;
            }).length === 0 ? (
              <div className="text-center py-8">
                <Search className="w-8 h-8 text-[var(--color-text-muted)] mx-auto mb-2" />
                <p className="text-sm text-[var(--color-text-secondary)]">No jobs match your search</p>
              </div>
            ) : (
              jobs.filter((job) => {
                if (statusFilter === 'UNASSIGNED') return job.status === 'UNASSIGNED';
                if (statusFilter === 'ASSIGNED') return job.status === 'ASSIGNED' || job.status === 'IN_PROGRESS';
                if (statusFilter === 'MATERIALS') return jobsWithMaterials.has(job.id);
                if (statusFilter === 'EXISTING') return job.job_exist === 'Yes';
                return true;
              }).map((job) => {
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
                      {job.job_exist === 'Yes' && (
                        <span className="badge text-[10px] px-1.5 py-0 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                          EXISTING JOB
                        </span>
                      )}
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
                    {job.company && (
                      <span className="text-xs text-blue-400 mt-0.5 block truncate">
                        {job.company}
                      </span>
                    )}
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
                  {selectedJob.scheduled_date && (
                    <span className="badge text-xs px-2 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center gap-1">
                      📅 {new Date(selectedJob.scheduled_date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
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
                  {selectedJob.job_exist === 'Yes' && (
                    <span className="badge text-xs px-2 py-1 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                      EXISTING JOB
                    </span>
                  )}
                  {selectedJob.sm8_job_uuid && (
                    <span className="text-[10px] font-mono text-[var(--color-text-muted)]" title="ServiceM8 Job UUID">
                      SM8: {selectedJob.sm8_job_uuid.slice(0, 8)}...
                    </span>
                  )}
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={cancelEditing}
                        className="btn btn-secondary text-sm px-3 py-1.5"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveEditing}
                        className="btn btn-primary text-sm px-3 py-1.5 flex items-center gap-1"
                      >
                        <Check className="w-4 h-4" />
                        Save
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={startEditing}
                      className="p-2 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-colors"
                      title="Edit job details"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Edit mode dropdowns for trade/priority/status */}
              {isEditing && (
                <div className="flex items-center gap-3">
                  <select
                    value={editForm.trade || ''}
                    onChange={(e) => setEditForm({ ...editForm, trade: e.target.value })}
                    className="input text-sm"
                  >
                    {['General', 'Plumbing', 'Electrical', 'Heating & Gas', 'Drainage', 'Roofing', 'Locksmith', 'Carpentry', 'Decorating'].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <select
                    value={editForm.priority || ''}
                    onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                    className="input text-sm"
                  >
                    {['HIGH', 'MEDIUM', 'LOW'].map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  <select
                    value={editForm.status || ''}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="input text-sm"
                  >
                    {['UNASSIGNED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Job Title */}
              {isEditing ? (
                <input
                  type="text"
                  value={editForm.job_title || ''}
                  onChange={(e) => setEditForm({ ...editForm, job_title: e.target.value })}
                  className="input text-xl font-bold w-full"
                />
              ) : (
                <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
                  {selectedJob.job_title}
                </h2>
              )}

              {/* Property & Tenant */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="md:col-span-3 bg-[var(--color-bg-secondary)] rounded-lg p-4 border border-[var(--color-border)]">
                  <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-2">
                    Property
                  </p>
                  {isEditing ? (
                    <div className="space-y-2">
                      <input type="text" value={editForm.property_address || ''} onChange={(e) => setEditForm({ ...editForm, property_address: e.target.value })} className="input text-sm w-full" placeholder="Property address" />
                      <input type="text" value={editForm.postcode || ''} onChange={(e) => setEditForm({ ...editForm, postcode: e.target.value })} className="input text-sm w-full" placeholder="Postcode" />
                      <input type="text" value={editForm.landlord || ''} onChange={(e) => setEditForm({ ...editForm, landlord: e.target.value })} className="input text-sm w-full" placeholder="Landlord" />
                      <input type="text" value={editForm.company || ''} onChange={(e) => setEditForm({ ...editForm, company: e.target.value })} className="input text-sm w-full" placeholder="Company" />
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                        {selectedJob.property_address}
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)] mt-1">{selectedJob.postcode}</p>
                      <p className="text-xs text-[var(--color-text-muted)] mt-1">
                        Landlord: {selectedJob.landlord || '—'}
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)] mt-1">
                        Company: {selectedJob.company || '—'}
                      </p>
                    </>
                  )}
                </div>

                <div className="md:col-span-2 bg-[var(--color-bg-secondary)] rounded-lg p-4 border border-[var(--color-border)]">
                  <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-2">
                    Tenant
                  </p>
                  {isEditing ? (
                    <div className="space-y-2">
                      <input type="text" value={editForm.tenant_name || ''} onChange={(e) => setEditForm({ ...editForm, tenant_name: e.target.value })} className="input text-sm w-full" placeholder="Tenant name" />
                      <input type="text" value={editForm.tenant_phone || ''} onChange={(e) => setEditForm({ ...editForm, tenant_phone: e.target.value })} className="input text-sm w-full" placeholder="Tenant phone" />
                      <input type="text" value={editForm.tenant_email || ''} onChange={(e) => setEditForm({ ...editForm, tenant_email: e.target.value })} className="input text-sm w-full" placeholder="Tenant email" />
                    </div>
                  ) : (
                    <>
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
                    </>
                  )}
                </div>
              </div>

              {/* Job Description */}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-2">
                  Job Description
                </p>
                <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4 border border-[var(--color-border)]">
                  {isEditing ? (
                    <textarea
                      value={editForm.job_description || ''}
                      onChange={(e) => setEditForm({ ...editForm, job_description: e.target.value })}
                      className="input text-sm w-full min-h-[120px]"
                      placeholder="Job description"
                    />
                  ) : (
                    <p className="text-sm text-[var(--color-text-secondary)] whitespace-pre-wrap leading-relaxed">
                      {selectedJob.job_description || 'No description provided'}
                    </p>
                  )}
                </div>
              </div>

              {/* Instruction Notes — only show if has content OR in edit mode */}
              {(selectedJob.instruction_notes || isEditing) && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-2">
                    Instruction Notes
                  </p>
                  <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4 border border-[var(--color-border)]">
                    {isEditing ? (
                      <textarea
                        value={editForm.instruction_notes || ''}
                        onChange={(e) => setEditForm({ ...editForm, instruction_notes: e.target.value })}
                        className="input text-sm w-full min-h-[80px]"
                        placeholder="Instruction notes"
                      />
                    ) : (
                      <p className="text-sm text-[var(--color-text-secondary)] whitespace-pre-wrap leading-relaxed">
                        {selectedJob.instruction_notes}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Fault Detail — only show if has content OR in edit mode */}
              {(selectedJob.fault_detail || isEditing) && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-2">
                    Fault Detail
                  </p>
                  <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4 border border-[var(--color-border)]">
                    {isEditing ? (
                      <textarea
                        value={editForm.fault_detail || ''}
                        onChange={(e) => setEditForm({ ...editForm, fault_detail: e.target.value })}
                        className="input text-sm w-full min-h-[80px]"
                        placeholder="Fault detail from tenant"
                      />
                    ) : (
                      <p className="text-sm text-[var(--color-text-secondary)] whitespace-pre-wrap leading-relaxed">
                        {selectedJob.fault_detail}
                      </p>
                    )}
                  </div>
                </div>
              )}

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

              {/* Access Arrangement */}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-2">
                  🔑 Access Arrangement
                </p>
                <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4 border border-[var(--color-border)]">
                  <textarea
                    value={accessArrangement}
                    onChange={(e) => setAccessArrangement(e.target.value)}
                    placeholder="e.g. Key in lockbox code 1234, ring buzzer for Flat 8..."
                    className="input text-sm w-full min-h-[80px] mb-3"
                  />
                  <button
                    onClick={handleSendAccessInfo}
                    disabled={isSendingAccess || !accessArrangement.trim()}
                    className={clsx(
                      'btn btn-secondary text-sm px-4 py-2 flex items-center gap-1.5',
                      (!accessArrangement.trim() || isSendingAccess) && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    {isSendingAccess ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Send Access Info to SM8
                  </button>
                </div>
              </div>

              {/* Action Buttons — different options for new vs existing jobs */}
              {selectedJob.job_exist === 'Yes' ? (
                <div className="space-y-3">
                  {/* Status-only update */}
                  <div className="bg-[var(--color-bg-secondary)] rounded-xl p-4 border border-[var(--color-border)]">
                    <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-3">
                      Update Job Status Only
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)] mb-3">
                      Change the status in ServiceM8 without assigning an engineer
                    </p>
                    <div className="flex items-center gap-2">
                      <select
                        value={statusUpdateValue}
                        onChange={(e) => setStatusUpdateValue(e.target.value)}
                        className="input text-sm flex-1"
                      >
                        <option value="Work Order">Work Order</option>
                        <option value="Quote">Quote</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                        <option value="Unsuccessful">Unsuccessful</option>
                      </select>
                      <button
                        onClick={handleStatusOnlyUpdate}
                        disabled={isUpdatingStatus}
                        className="btn btn-secondary text-sm px-4 py-2.5 flex items-center gap-1.5"
                      >
                        {isUpdatingStatus ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        Update Status
                      </button>
                    </div>
                  </div>

                  {/* Assign engineer to existing job */}
                  <button
                    onClick={() => setShowEngineerPanel(true)}
                    className="w-full py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 transition-all duration-200 shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2"
                  >
                    <span className="w-2 h-2 rounded-full bg-white" />
                    Assign Engineer to Existing SM8 Job
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowEngineerPanel(true)}
                  className="w-full py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 transition-all duration-200 shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2"
                >
                  <span className="w-2 h-2 rounded-full bg-white" />
                  Find Best Engineer in ServiceM8
                </button>
              )}

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
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">
                        Engineer Availability
                      </p>
                      <button
                        onClick={handleClearSpecificEngineer}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] border border-[var(--color-border)] transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                        Back
                      </button>
                    </div>
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
    </>
  );
}
