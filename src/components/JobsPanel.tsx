'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search,
  ClipboardList,
  ArrowLeft,
  Plus,
  Package,
  Wrench,
} from 'lucide-react';
import { clsx } from 'clsx';
import { supabase } from '@/lib/supabase';
import { Job, Material } from '@/types';

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

      <div className="flex flex-col lg:flex-row gap-0 lg:gap-0" style={{ minHeight: 'calc(100vh - 200px)' }}>
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

                    {/* Trade + postcode */}
                    <div className="flex items-center gap-2">
                      <span className={clsx('badge text-[10px] px-1.5 py-0', t.color)}>
                        {t.icon} {job.trade}
                      </span>
                      <span className="text-xs text-[var(--color-text-muted)]">📍 {job.postcode}</span>
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
                <span
                  className={clsx(
                    'badge text-xs px-3 py-1',
                    status(selectedJob.status)
                  )}
                >
                  {selectedJob.status.replace('_', ' ')}
                </span>
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
                onClick={() => showToast('🚧 Engineer matching coming soon — this will connect to ServiceM8 via n8n')}
                className="w-full py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 transition-all duration-200 shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2"
              >
                <span className="w-2 h-2 rounded-full bg-white" />
                Find Best Engineer in ServiceM8
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
