'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  RefreshCw,
  Search,
  ChevronDown,
  ChevronUp,
  Phone,
  Mail,
  Edit3,
  Check,
  X,
  ArrowUpDown,
  Clock,
  User,
  FileText,
  Wrench,
} from 'lucide-react';

// ── Types ──

interface TenantJob {
  rowNumber: number;
  manager: string;
  trade: string;
  engineer: string;
  wo: string;
  po: string;
  category: string;
  jobStatus: string;
  desc: string;
  date: string;
  scheduledTime: string;
  tenant: string;
  phone: string;
  email: string;
  status: string;
  lastContact: string;
  notes: string;
}

// ── Theme ──

const TH = {
  bg: '#080F1A',
  card: '#0D1B2A',
  border: '#1B2D45',
  text: '#E8ECF1',
  textSec: '#8899AA',
  textMuted: '#556677',
  gold: '#D4A853',
  goldDim: 'rgba(212,168,83,0.15)',
  input: '#0D1B2A',
};

const SC: Record<string, { bg: string; text: string; dot: string }> = {
  Confirmed:    { bg: 'rgba(52,211,153,0.12)',  text: '#34D399', dot: '#34D399' },
  Pending:      { bg: 'rgba(251,191,36,0.12)',  text: '#FBBF24', dot: '#FBBF24' },
  'No Answer':  { bg: 'rgba(239,68,68,0.12)',   text: '#EF4444', dot: '#EF4444' },
  Reschedule:   { bg: 'rgba(96,165,250,0.12)',  text: '#60A5FA', dot: '#60A5FA' },
};

const STS = ['All', 'Pending', 'Confirmed', 'No Answer', 'Reschedule'];

// ── Helpers ──

function parseDate(d: string): Date | null {
  if (!d) return null;
  const [day, month, year] = d.split('/');
  if (!day || !month || !year) return null;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

function truncate(s: string, n: number): string {
  if (!s) return '';
  return s.length > n ? s.slice(0, n) + '...' : s;
}

function nowTimestamp(): string {
  const now = new Date();
  const d = String(now.getDate()).padStart(2, '0');
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const y = now.getFullYear();
  const h = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  return `${d}/${m}/${y} ${h}:${min}`;
}

// ── Sub-components ──

function Badge({ status }: { status: string }) {
  const c = SC[status] || SC.Pending;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 600,
        background: c.bg,
        color: c.text,
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot }} />
      {status}
    </span>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div
      style={{
        background: TH.card,
        border: `1px solid ${TH.border}`,
        borderRadius: 12,
        padding: '16px 20px',
        flex: '1 1 0',
        minWidth: 140,
      }}
    >
      <div style={{ fontSize: 11, color: TH.textSec, marginBottom: 4, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color, lineHeight: 1.1 }}>{value}</div>
    </div>
  );
}

// ── Editable Field ──

function EditableField({
  value,
  field,
  rowNumber,
  multiline,
  onSave,
}: {
  value: string;
  field: string;
  rowNumber: number;
  multiline?: boolean;
  onSave: (rowNumber: number, field: string, value: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(value);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (editVal === value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    await onSave(rowNumber, field, editVal);
    setSaving(false);
    setEditing(false);
  };

  const cancel = () => {
    setEditVal(value);
    setEditing(false);
  };

  if (editing) {
    const inputStyle: React.CSSProperties = {
      background: TH.input,
      border: `1px solid ${TH.border}`,
      color: TH.text,
      borderRadius: 8,
      padding: '6px 10px',
      fontSize: 12,
      width: '100%',
      fontFamily: 'inherit',
      resize: multiline ? 'vertical' : 'none',
    };

    return (
      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
        {multiline ? (
          <textarea
            style={{ ...inputStyle, minHeight: 60 }}
            value={editVal}
            onChange={(e) => setEditVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') cancel();
            }}
            autoFocus
            disabled={saving}
          />
        ) : (
          <input
            style={inputStyle}
            value={editVal}
            onChange={(e) => setEditVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') save();
              if (e.key === 'Escape') cancel();
            }}
            autoFocus
            disabled={saving}
          />
        )}
        <button
          onClick={save}
          disabled={saving}
          style={{
            background: 'rgba(52,211,153,0.15)',
            border: 'none',
            borderRadius: 6,
            padding: 6,
            cursor: 'pointer',
            color: '#34D399',
            display: 'flex',
          }}
        >
          <Check size={14} />
        </button>
        <button
          onClick={cancel}
          style={{
            background: 'rgba(239,68,68,0.15)',
            border: 'none',
            borderRadius: 6,
            padding: 6,
            cursor: 'pointer',
            color: '#EF4444',
            display: 'flex',
          }}
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
      onClick={() => {
        setEditVal(value);
        setEditing(true);
      }}
    >
      <span style={{ color: TH.text, fontSize: 12, wordBreak: 'break-word' }}>
        {value || <span style={{ color: TH.textMuted, fontStyle: 'italic' }}>Empty</span>}
      </span>
      <Edit3 size={12} style={{ color: TH.textMuted, flexShrink: 0 }} />
    </div>
  );
}

// ── Main Component ──

export default function TenantsConfirmation() {
  // Data
  const [jobs, setJobs] = useState<TenantJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [managerFilter, setManagerFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortAsc, setSortAsc] = useState(true);

  // UI
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  // Confirmation modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmJob, setConfirmJob] = useState<TenantJob | null>(null);
  const [confirmForm, setConfirmForm] = useState({
    contacted_by: '',
    contact_method: 'Phone' as 'Phone' | 'Email' | 'Fixflo' | 'SMS',
    status: 'Confirmed' as string,
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // ── Data Fetching ──

  const fetchJobs = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const res = await fetch('/api/tenants-confirmation');
      const data = await res.json();
      if (data.success && data.jobs) {
        setJobs(data.jobs);
        setLastSync(new Date());
      }
    } catch (err) {
      console.error('Failed to fetch tenants data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(() => fetchJobs(), 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchJobs]);

  // ── Write-Back ──

  const updateJob = useCallback(
    async (rowNumber: number, updates: Record<string, string>) => {
      // Optimistic update
      setJobs((prev) =>
        prev.map((j) => (j.rowNumber === rowNumber ? { ...j, ...updates } : j))
      );

      try {
        const res = await fetch('/api/tenants-confirmation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rowNumber, updates }),
        });
        const result = await res.json();
        if (!result.success) {
          console.error('Update failed:', result.error);
          fetchJobs(); // revert
        }
      } catch (err) {
        console.error('Failed to update sheet:', err);
        fetchJobs(); // revert
      }
    },
    [fetchJobs]
  );

  const handleFieldSave = useCallback(
    async (rowNumber: number, field: string, value: string) => {
      await updateJob(rowNumber, { [field]: value });
    },
    [updateJob]
  );

  const openConfirmModal = useCallback((job: TenantJob) => {
    setConfirmJob(job);
    setConfirmForm({
      contacted_by: '',
      contact_method: 'Phone',
      status: 'Confirmed',
      notes: '',
    });
    setShowConfirmModal(true);
  }, []);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const handleConfirmSubmit = useCallback(async () => {
    if (!confirmJob) return;
    if (!confirmForm.contacted_by.trim()) {
      showToast('Please enter who contacted the client', 'error');
      return;
    }

    setSubmitting(true);
    const timestamp = nowTimestamp();

    // Update the sheet
    updateJob(confirmJob.rowNumber, {
      status: confirmForm.status,
      lastContact: timestamp,
      notes: confirmForm.notes ? confirmForm.notes : confirmJob.notes,
    });

    // POST to n8n webhook
    try {
      const res = await fetch('https://n8n.srv1177154.hstgr.cloud/webhook/tenant-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          work_order_number: confirmJob.wo,
          status: confirmForm.status,
          contacted_by: confirmForm.contacted_by.trim(),
          contact_method: confirmForm.contact_method,
          notes: confirmForm.notes || '',
          engineer: confirmJob.engineer || '',
          tenant_name: confirmJob.tenant || '',
          tenant_phone: confirmJob.phone || '',
          tenant_email: confirmJob.email || '',
          scheduled_date: confirmJob.date || '',
          scheduled_time: confirmJob.scheduledTime || '',
          job_description: confirmJob.desc || '',
        }),
      });
      const result = await res.json();
      if (result.success) {
        showToast(`Confirmation logged for WO #${confirmJob.wo}`);
      } else {
        showToast(result.message || 'Webhook returned an error', 'error');
      }
    } catch (err) {
      console.error('SM8 webhook failed:', err);
      showToast('Failed to send to ServiceM8 — sheet was updated', 'error');
    } finally {
      setSubmitting(false);
      setShowConfirmModal(false);
      setConfirmJob(null);
    }
  }, [confirmJob, confirmForm, updateJob, showToast]);

  // ── Computed Values ──

  const MGRS = useMemo(() => {
    const managers = [...new Set(jobs.map((j) => j.manager))]
      .filter((m) => m !== 'Unknown')
      .sort();
    return ['All', ...managers, 'Unknown'];
  }, [jobs]);

  const stats = useMemo(() => {
    const total = jobs.length;
    const confirmed = jobs.filter((j) => j.status === 'Confirmed').length;
    const pending = jobs.filter((j) => j.status === 'Pending').length;
    const noAnswer = jobs.filter((j) => j.status === 'No Answer').length;
    const reschedule = jobs.filter((j) => j.status === 'Reschedule').length;
    return { total, confirmed, pending, noAnswer, reschedule };
  }, [jobs]);

  const confirmRate = stats.total > 0 ? Math.round((stats.confirmed / stats.total) * 100) : 0;

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { All: jobs.length };
    for (const s of STS.slice(1)) {
      counts[s] = jobs.filter((j) => j.status === s).length;
    }
    return counts;
  }, [jobs]);

  const uniqueDates = useMemo(() => {
    const dateMap = new Map<string, number>();
    for (const j of jobs) {
      if (j.date) {
        dateMap.set(j.date, (dateMap.get(j.date) || 0) + 1);
      }
    }
    return [...dateMap.entries()]
      .sort((a, b) => {
        const da = parseDate(a[0]);
        const db = parseDate(b[0]);
        return (da?.getTime() || 0) - (db?.getTime() || 0);
      })
      .map(([date, count]) => ({ date, count }));
  }, [jobs]);

  const filtered = useMemo(() => {
    let result = jobs;

    if (managerFilter !== 'All') {
      result = result.filter((j) => j.manager === managerFilter);
    }
    if (statusFilter !== 'All') {
      result = result.filter((j) => j.status === statusFilter);
    }
    if (dateFilter) {
      result = result.filter((j) => j.date === dateFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (j) =>
          j.tenant.toLowerCase().includes(q) ||
          j.engineer.toLowerCase().includes(q) ||
          j.wo.toLowerCase().includes(q) ||
          j.desc.toLowerCase().includes(q) ||
          j.phone.toLowerCase().includes(q)
      );
    }

    result = [...result].sort((a, b) => {
      const da = parseDate(a.date);
      const db = parseDate(b.date);
      const diff = (da?.getTime() || 0) - (db?.getTime() || 0);
      return sortAsc ? diff : -diff;
    });

    return result;
  }, [jobs, managerFilter, statusFilter, dateFilter, searchQuery, sortAsc]);

  // ── Loading State ──

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              height: 32,
              width: 280,
              background: TH.border,
              borderRadius: 8,
              marginBottom: 12,
              animation: 'pulse 1.5s infinite',
            }}
          />
        </div>
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            style={{
              height: 52,
              background: TH.card,
              borderRadius: 8,
              marginBottom: 8,
              border: `1px solid ${TH.border}`,
              animation: 'pulse 1.5s infinite',
              animationDelay: `${i * 100}ms`,
            }}
          />
        ))}
        <style>{`@keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.5 } }`}</style>
      </div>
    );
  }

  // ── Render ──

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", color: TH.text }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 4, height: 36, background: TH.gold, borderRadius: 2 }} />
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: TH.text }}>
              Tenants Confirmation
            </h1>
            <p style={{ fontSize: 12, color: TH.textSec, margin: 0 }}>
              {stats.total} total jobs &middot; {confirmRate}% confirmed
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Progress bar */}
          <div style={{ width: 160, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                flex: 1,
                height: 6,
                background: TH.border,
                borderRadius: 3,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${confirmRate}%`,
                  height: '100%',
                  background: TH.gold,
                  borderRadius: 3,
                  transition: 'width 0.5s',
                }}
              />
            </div>
            <span style={{ fontSize: 11, color: TH.gold, fontWeight: 600 }}>{confirmRate}%</span>
          </div>

          {lastSync && (
            <span style={{ fontSize: 11, color: TH.textMuted }}>
              Synced {lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={() => fetchJobs(true)}
            disabled={refreshing}
            style={{
              background: TH.card,
              border: `1px solid ${TH.border}`,
              borderRadius: 8,
              padding: 8,
              cursor: 'pointer',
              color: TH.textSec,
              display: 'flex',
            }}
          >
            <RefreshCw size={16} style={refreshing ? { animation: 'spin 1s linear infinite' } : {}} />
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <Stat label="Total" value={stats.total} color={TH.text} />
        <Stat label="Confirmed" value={stats.confirmed} color="#34D399" />
        <Stat label="Pending" value={stats.pending} color="#FBBF24" />
        <Stat label="No Answer" value={stats.noAnswer} color="#EF4444" />
        <Stat label="Reschedule" value={stats.reschedule} color="#60A5FA" />
      </div>

      {/* Manager Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {MGRS.map((m) => (
          <button
            key={m}
            onClick={() => setManagerFilter(m)}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              background: managerFilter === m ? TH.goldDim : TH.card,
              color: managerFilter === m ? TH.gold : TH.textSec,
              transition: 'all 0.15s',
            }}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Status Filter Badges */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {STS.map((s) => {
          const active = statusFilter === s;
          const c = s === 'All' ? { bg: TH.goldDim, text: TH.gold } : SC[s] || SC.Pending;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: '5px 12px',
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: active ? c.bg : 'transparent',
                color: active ? c.text : TH.textMuted,
                transition: 'all 0.15s',
              }}
            >
              {s} ({statusCounts[s] || 0})
            </button>
          );
        })}
      </div>

      {/* Date Filter Bar */}
      {uniqueDates.length > 0 && (
        <div
          style={{
            display: 'flex',
            gap: 6,
            marginBottom: 16,
            overflowX: 'auto',
            paddingBottom: 4,
          }}
        >
          <button
            onClick={() => setDateFilter(null)}
            style={{
              padding: '5px 12px',
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              background: dateFilter === null ? TH.goldDim : TH.card,
              color: dateFilter === null ? TH.gold : TH.textSec,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            All Dates
          </button>
          {uniqueDates.map(({ date, count }) => (
            <button
              key={date}
              onClick={() => setDateFilter(dateFilter === date ? null : date)}
              style={{
                padding: '5px 12px',
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: dateFilter === date ? TH.goldDim : TH.card,
                color: dateFilter === date ? TH.gold : TH.textSec,
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                flexShrink: 0,
              }}
            >
              {date.slice(0, 5)}
              <span
                style={{
                  background: dateFilter === date ? TH.gold : TH.border,
                  color: dateFilter === date ? TH.bg : TH.textSec,
                  padding: '1px 6px',
                  borderRadius: 10,
                  fontSize: 10,
                  fontWeight: 700,
                }}
              >
                {count}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Search + Sort */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: TH.gold,
            }}
          />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tenant, engineer, WO, phone..."
            style={{
              width: '100%',
              background: TH.card,
              border: `1px solid ${TH.border}`,
              borderRadius: 10,
              padding: '10px 12px 10px 38px',
              color: TH.text,
              fontSize: 13,
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
        </div>
        <button
          onClick={() => setSortAsc((prev) => !prev)}
          style={{
            background: TH.card,
            border: `1px solid ${TH.border}`,
            borderRadius: 10,
            padding: '10px 14px',
            cursor: 'pointer',
            color: TH.textSec,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          <ArrowUpDown size={14} />
          {sortAsc ? 'Oldest First' : 'Newest First'}
        </button>
      </div>

      {/* Results count */}
      <div style={{ fontSize: 12, color: TH.textMuted, marginBottom: 12 }}>
        Showing {filtered.length} of {jobs.length} jobs
      </div>

      {/* Table */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {/* Header Row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '90px 50px 1fr 90px 1.5fr 1fr 120px 100px 36px',
            gap: 8,
            padding: '10px 16px',
            fontSize: 10,
            fontWeight: 700,
            color: TH.textMuted,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          <span>Date</span>
          <span>Time</span>
          <span>Engineer</span>
          <span>WO</span>
          <span>Description</span>
          <span>Tenant</span>
          <span>Phone</span>
          <span>Status</span>
          <span />
        </div>

        {/* Data Rows */}
        {filtered.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '48px 0',
              color: TH.textMuted,
              fontSize: 14,
            }}
          >
            No jobs match the current filters
          </div>
        )}

        {filtered.map((job) => {
          const isExpanded = expandedRow === job.rowNumber;
          return (
            <div key={job.rowNumber}>
              {/* Row */}
              <div
                onClick={() => setExpandedRow(isExpanded ? null : job.rowNumber)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '90px 50px 1fr 90px 1.5fr 1fr 120px 100px 36px',
                  gap: 8,
                  padding: '12px 16px',
                  background: isExpanded ? 'rgba(212,168,83,0.05)' : TH.card,
                  border: `1px solid ${isExpanded ? 'rgba(212,168,83,0.2)' : TH.border}`,
                  borderRadius: isExpanded ? '12px 12px 0 0' : 12,
                  cursor: 'pointer',
                  alignItems: 'center',
                  fontSize: 12,
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ color: TH.text, fontWeight: 600 }}>{job.date || '—'}</span>
                <span style={{ color: TH.textMuted }}>{job.scheduledTime || '—'}</span>
                <span style={{ color: TH.text }}>{job.engineer || '—'}</span>
                <span style={{ color: TH.gold, fontFamily: 'monospace', fontWeight: 600 }}>
                  {job.wo || '—'}
                </span>
                <span style={{ color: TH.textSec }}>{truncate(job.desc, 80)}</span>
                <span style={{ color: TH.text }}>{job.tenant || '—'}</span>
                <span style={{ color: TH.textSec, display: 'flex', alignItems: 'center', gap: 4 }}>
                  {job.phone ? (
                    <>
                      <Phone size={11} />
                      {truncate(job.phone, 14)}
                    </>
                  ) : (
                    '—'
                  )}
                </span>
                <Badge status={job.status} />
                <span style={{ color: TH.textMuted }}>
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </span>
              </div>

              {/* Expanded Panel */}
              {isExpanded && (
                <div
                  style={{
                    background: TH.card,
                    border: `1px solid rgba(212,168,83,0.2)`,
                    borderTop: 'none',
                    borderRadius: '0 0 12px 12px',
                    padding: 24,
                  }}
                >
                  {/* Log Confirmation Button */}
                  <div style={{ marginBottom: 24 }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openConfirmModal(job);
                      }}
                      style={{
                        padding: '10px 24px',
                        borderRadius: 10,
                        fontSize: 13,
                        fontWeight: 700,
                        border: `1px solid ${TH.gold}`,
                        cursor: 'pointer',
                        background: TH.goldDim,
                        color: TH.gold,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        transition: 'all 0.15s',
                      }}
                    >
                      <Check size={16} />
                      Log Tenant Confirmation
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                    {/* Job Details */}
                    <div>
                      <h3
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: TH.gold,
                          marginBottom: 12,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <Wrench size={14} /> Job Details
                      </h3>
                      <div style={{ display: 'grid', gap: 10 }}>
                        {[
                          { label: 'Manager', field: 'manager', value: job.manager },
                          { label: 'Trade', field: 'trade', value: job.trade },
                          { label: 'Engineer', field: 'engineer', value: job.engineer },
                          { label: 'Work Order', field: 'wo', value: job.wo },
                          { label: 'PO Number', field: 'po', value: job.po },
                          { label: 'Category', field: 'category', value: job.category },
                          { label: 'Job Status', field: 'jobStatus', value: job.jobStatus },
                          { label: 'Date', field: 'date', value: job.date },
                        ].map(({ label, field, value }) => (
                          <div
                            key={field}
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: 8,
                            }}
                          >
                            <span
                              style={{
                                fontSize: 11,
                                color: TH.textMuted,
                                minWidth: 80,
                                fontWeight: 600,
                                paddingTop: 2,
                              }}
                            >
                              {label}
                            </span>
                            <EditableField
                              value={value}
                              field={field}
                              rowNumber={job.rowNumber}
                              onSave={handleFieldSave}
                            />
                          </div>
                        ))}
                      </div>

                      {/* Description */}
                      <div style={{ marginTop: 14 }}>
                        <span
                          style={{
                            fontSize: 11,
                            color: TH.textMuted,
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            marginBottom: 6,
                          }}
                        >
                          <FileText size={12} /> Description
                        </span>
                        <EditableField
                          value={job.desc}
                          field="desc"
                          rowNumber={job.rowNumber}
                          multiline
                          onSave={handleFieldSave}
                        />
                      </div>
                    </div>

                    {/* Tenant Contact + Notes */}
                    <div>
                      <h3
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: TH.gold,
                          marginBottom: 12,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <User size={14} /> Tenant Contact
                      </h3>
                      <div style={{ display: 'grid', gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                          <span style={{ fontSize: 11, color: TH.textMuted, minWidth: 80, fontWeight: 600, paddingTop: 2 }}>
                            Name
                          </span>
                          <EditableField
                            value={job.tenant}
                            field="tenant"
                            rowNumber={job.rowNumber}
                            onSave={handleFieldSave}
                          />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                          <span style={{ fontSize: 11, color: TH.textMuted, minWidth: 80, fontWeight: 600, paddingTop: 2 }}>
                            <Phone size={11} style={{ display: 'inline', marginRight: 4 }} />
                            Phone
                          </span>
                          <EditableField
                            value={job.phone}
                            field="phone"
                            rowNumber={job.rowNumber}
                            onSave={handleFieldSave}
                          />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                          <span style={{ fontSize: 11, color: TH.textMuted, minWidth: 80, fontWeight: 600, paddingTop: 2 }}>
                            <Mail size={11} style={{ display: 'inline', marginRight: 4 }} />
                            Email
                          </span>
                          <EditableField
                            value={job.email}
                            field="email"
                            rowNumber={job.rowNumber}
                            onSave={handleFieldSave}
                          />
                        </div>
                      </div>

                      {/* Last Contact */}
                      {job.lastContact && (
                        <div
                          style={{
                            marginTop: 14,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            fontSize: 11,
                            color: TH.textMuted,
                          }}
                        >
                          <Clock size={12} /> Last contact: {job.lastContact}
                        </div>
                      )}

                      {/* Notes */}
                      <div style={{ marginTop: 20 }}>
                        <h3
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: TH.gold,
                            marginBottom: 8,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          <FileText size={14} /> Notes
                        </h3>
                        <EditableField
                          value={job.notes}
                          field="notes"
                          rowNumber={job.rowNumber}
                          multiline
                          onSave={handleFieldSave}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Sync Info */}
      <div
        style={{
          textAlign: 'center',
          padding: '20px 0 8px',
          fontSize: 11,
          color: TH.textMuted,
        }}
      >
        Auto-refreshes every 30 minutes
        {lastSync && (
          <>
            {' '}
            &middot; Last synced{' '}
            {lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </>
        )}
      </div>

      {/* Keyframes */}
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>

      {/* ── CONFIRMATION MODAL ── */}
      {showConfirmModal && confirmJob && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 60,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => { if (!submitting) { setShowConfirmModal(false); setConfirmJob(null); } }}
        >
          <div
            style={{
              background: TH.card,
              border: `1px solid ${TH.border}`,
              borderRadius: 16,
              padding: 28,
              maxWidth: 480,
              width: '100%',
              margin: '0 16px',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: TH.text, margin: 0 }}>
                Log Tenant Confirmation
              </h3>
              <button
                onClick={() => { setShowConfirmModal(false); setConfirmJob(null); }}
                disabled={submitting}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: TH.textMuted,
                  padding: 4,
                  borderRadius: 8,
                  display: 'flex',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Job Number (read-only) */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: TH.textSec, marginBottom: 6 }}>
                Job Number
              </label>
              <div
                style={{
                  background: TH.bg,
                  border: `1px solid ${TH.border}`,
                  borderRadius: 10,
                  padding: '10px 14px',
                  fontSize: 14,
                  color: TH.gold,
                  fontFamily: 'monospace',
                  fontWeight: 700,
                }}
              >
                {confirmJob.wo}
              </div>
            </div>

            {/* Contacted By */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: TH.textSec, marginBottom: 6 }}>
                Who contacted the client? <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="text"
                value={confirmForm.contacted_by}
                onChange={(e) => setConfirmForm({ ...confirmForm, contacted_by: e.target.value })}
                placeholder="e.g. Sarah, Nick, James"
                disabled={submitting}
                style={{
                  width: '100%',
                  background: TH.input,
                  border: `1px solid ${TH.border}`,
                  borderRadius: 10,
                  padding: '10px 14px',
                  color: TH.text,
                  fontSize: 13,
                  fontFamily: 'inherit',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Contact Method */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: TH.textSec, marginBottom: 8 }}>
                How was confirmation done? <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['Phone', 'Email', 'Fixflo', 'SMS'] as const).map((m) => {
                  const active = confirmForm.contact_method === m;
                  return (
                    <button
                      key={m}
                      onClick={() => setConfirmForm({ ...confirmForm, contact_method: m })}
                      disabled={submitting}
                      style={{
                        flex: 1,
                        padding: '10px 0',
                        borderRadius: 10,
                        fontSize: 12,
                        fontWeight: 700,
                        border: active ? `2px solid ${TH.gold}` : `1px solid ${TH.border}`,
                        cursor: 'pointer',
                        background: active ? TH.goldDim : 'transparent',
                        color: active ? TH.gold : TH.textSec,
                        transition: 'all 0.15s',
                      }}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Status */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: TH.textSec, marginBottom: 8 }}>
                Status <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                {STS.slice(1).map((s) => {
                  const c = SC[s];
                  const active = confirmForm.status === s;
                  return (
                    <button
                      key={s}
                      onClick={() => setConfirmForm({ ...confirmForm, status: s })}
                      disabled={submitting}
                      style={{
                        flex: 1,
                        padding: '10px 0',
                        borderRadius: 10,
                        fontSize: 12,
                        fontWeight: 700,
                        border: active ? `2px solid ${c.text}` : `1px solid ${TH.border}`,
                        cursor: 'pointer',
                        background: active ? c.bg : 'transparent',
                        color: active ? c.text : TH.textSec,
                        transition: 'all 0.15s',
                      }}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Notes */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: TH.textSec, marginBottom: 6 }}>
                Notes (optional)
              </label>
              <textarea
                value={confirmForm.notes}
                onChange={(e) => setConfirmForm({ ...confirmForm, notes: e.target.value })}
                placeholder="e.g. Tenant confirmed for morning slot"
                rows={3}
                disabled={submitting}
                style={{
                  width: '100%',
                  background: TH.input,
                  border: `1px solid ${TH.border}`,
                  borderRadius: 10,
                  padding: '10px 14px',
                  color: TH.text,
                  fontSize: 13,
                  fontFamily: 'inherit',
                  outline: 'none',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={() => { setShowConfirmModal(false); setConfirmJob(null); }}
                disabled={submitting}
                style={{
                  padding: '10px 20px',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 600,
                  border: `1px solid ${TH.border}`,
                  cursor: 'pointer',
                  background: 'transparent',
                  color: TH.textSec,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSubmit}
                disabled={submitting}
                style={{
                  padding: '10px 24px',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 700,
                  border: 'none',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  background: TH.gold,
                  color: TH.bg,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  opacity: submitting ? 0.7 : 1,
                }}
              >
                {submitting ? (
                  <>
                    <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                    Sending...
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    Confirm
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TOAST ── */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 70,
            padding: '12px 20px',
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 600,
            color: '#fff',
            background: toast.type === 'success' ? 'rgba(52,211,153,0.9)' : 'rgba(239,68,68,0.9)',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          {toast.message}
        </div>
      )}
      <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }`}</style>
    </div>
  );
}
