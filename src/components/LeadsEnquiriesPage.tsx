'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  RefreshCw,
  Search,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  MessageSquare,
  FileText,
  Mic,
  Inbox,
} from 'lucide-react';

type SourceKey = 'chatbot' | 'form' | 'voice';

interface LeadRow {
  rowNumber: number;
  values: Record<string, string>;
}

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

const SOURCES: { key: SourceKey; label: string; icon: typeof MessageSquare }[] = [
  { key: 'chatbot', label: 'Website Chatbot', icon: MessageSquare },
  { key: 'form', label: 'Form', icon: FileText },
  { key: 'voice', label: 'Voice Agent', icon: Mic },
];

function EditableCell({
  value,
  field,
  rowNumber,
  onSave,
}: {
  value: string;
  field: string;
  rowNumber: number;
  onSave: (rowNumber: number, field: string, value: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (draft === value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    await onSave(rowNumber, field, draft);
    setSaving(false);
    setEditing(false);
  };

  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  if (editing) {
    return (
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save();
            if (e.key === 'Escape') cancel();
          }}
          autoFocus
          disabled={saving}
          style={{
            background: TH.input,
            border: `1px solid ${TH.gold}`,
            color: TH.text,
            borderRadius: 6,
            padding: '4px 8px',
            fontSize: 12,
            width: '100%',
            minWidth: 80,
            fontFamily: 'inherit',
            outline: 'none',
          }}
        />
        <button
          onClick={save}
          disabled={saving}
          style={{
            background: 'rgba(52,211,153,0.15)',
            border: 'none',
            borderRadius: 4,
            padding: 4,
            cursor: 'pointer',
            color: '#34D399',
            display: 'flex',
          }}
        >
          <Check size={12} />
        </button>
        <button
          onClick={cancel}
          style={{
            background: 'rgba(239,68,68,0.15)',
            border: 'none',
            borderRadius: 4,
            padding: 4,
            cursor: 'pointer',
            color: '#EF4444',
            display: 'flex',
          }}
        >
          <X size={12} />
        </button>
      </div>
    );
  }

  return (
    <div
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        cursor: 'pointer',
        minHeight: 24,
      }}
    >
      <span style={{ color: TH.text, fontSize: 12, wordBreak: 'break-word', flex: 1 }}>
        {value || <span style={{ color: TH.textMuted, fontStyle: 'italic' }}>Empty</span>}
      </span>
      <Edit3 size={11} style={{ color: TH.textMuted, flexShrink: 0, opacity: 0.6 }} />
    </div>
  );
}

export default function LeadsEnquiriesPage() {
  const [source, setSource] = useState<SourceKey>('chatbot');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [deletingRow, setDeletingRow] = useState<number | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const fetchLeads = useCallback(
    async (showRefresh = false) => {
      if (source === 'voice') {
        setHeaders([]);
        setRows([]);
        setLoading(false);
        return;
      }
      if (showRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/leads?source=${source}`);
        const data = await res.json();
        if (data.success) {
          setHeaders(data.headers || []);
          setRows(data.rows || []);
        } else {
          setError(data.error || 'Failed to load leads');
        }
      } catch (err) {
        setError('Network error loading leads');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [source]
  );

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const updateField = useCallback(
    async (rowNumber: number, field: string, value: string) => {
      // Optimistic
      setRows((prev) =>
        prev.map((r) =>
          r.rowNumber === rowNumber ? { ...r, values: { ...r.values, [field]: value } } : r
        )
      );
      try {
        const res = await fetch('/api/leads', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source, rowNumber, updates: { [field]: value } }),
        });
        const data = await res.json();
        if (!data.success) {
          showToast(data.error || 'Update failed', 'error');
          fetchLeads();
        }
      } catch (err) {
        showToast('Update failed', 'error');
        fetchLeads();
      }
    },
    [source, fetchLeads, showToast]
  );

  const deleteRow = useCallback(
    async (rowNumber: number) => {
      if (!confirm('Delete this lead? This will remove the row from the Google Sheet.')) return;
      setDeletingRow(rowNumber);
      const previous = rows;
      setRows((prev) => prev.filter((r) => r.rowNumber !== rowNumber));
      try {
        const res = await fetch('/api/leads', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source, rowNumber }),
        });
        const data = await res.json();
        if (!data.success) {
          showToast(data.error || 'Delete failed', 'error');
          setRows(previous);
        } else {
          showToast('Lead deleted');
          // Re-fetch so subsequent rowNumbers stay accurate after deletion
          fetchLeads();
        }
      } catch (err) {
        showToast('Delete failed', 'error');
        setRows(previous);
      } finally {
        setDeletingRow(null);
      }
    },
    [source, rows, fetchLeads, showToast]
  );

  const openAdd = () => {
    const empty: Record<string, string> = {};
    headers.forEach((h) => (empty[h] = ''));
    setAddForm(empty);
    setShowAdd(true);
  };

  const submitAdd = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, values: addForm }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Lead added');
        setShowAdd(false);
        fetchLeads();
      } else {
        showToast(data.error || 'Failed to add lead', 'error');
      }
    } catch (err) {
      showToast('Failed to add lead', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) =>
      Object.values(r.values).some((v) => v.toLowerCase().includes(q))
    );
  }, [rows, search]);

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", color: TH.text }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 4, height: 36, background: TH.gold, borderRadius: 2 }} />
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: TH.text }}>
              Leads / Enquiries
            </h1>
            <p style={{ fontSize: 12, color: TH.textSec, margin: 0 }}>
              {source === 'voice'
                ? 'Voice agent integration coming soon'
                : `${rows.length} ${rows.length === 1 ? 'lead' : 'leads'} from ${
                    SOURCES.find((s) => s.key === source)?.label
                  }`}
            </p>
          </div>
        </div>
        {source !== 'voice' && (
          <button
            onClick={() => fetchLeads(true)}
            disabled={refreshing || loading}
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
            <RefreshCw
              size={16}
              style={refreshing ? { animation: 'spin 1s linear infinite' } : {}}
            />
          </button>
        )}
      </div>

      {/* Source pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {SOURCES.map(({ key, label, icon: Icon }) => {
          const active = source === key;
          return (
            <button
              key={key}
              onClick={() => setSource(key)}
              style={{
                padding: '8px 16px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 600,
                border: active ? `1px solid ${TH.gold}` : `1px solid ${TH.border}`,
                cursor: 'pointer',
                background: active ? TH.goldDim : TH.card,
                color: active ? TH.gold : TH.textSec,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                transition: 'all 0.15s',
              }}
            >
              <Icon size={14} />
              {label}
            </button>
          );
        })}
      </div>

      {/* Voice Agent placeholder */}
      {source === 'voice' && (
        <div
          style={{
            background: TH.card,
            border: `1px dashed ${TH.border}`,
            borderRadius: 12,
            padding: '60px 24px',
            textAlign: 'center',
            color: TH.textMuted,
          }}
        >
          <Mic size={36} style={{ margin: '0 auto 12px', color: TH.textMuted, display: 'block' }} />
          <h3 style={{ fontSize: 16, fontWeight: 600, color: TH.textSec, marginBottom: 6 }}>
            Voice Agent integration coming soon
          </h3>
          <p style={{ fontSize: 13, color: TH.textMuted, margin: 0 }}>
            Once the voice agent is wired up, leads from voice calls will appear here.
          </p>
        </div>
      )}

      {/* Toolbar (only for active source) */}
      {source !== 'voice' && (
        <>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
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
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search leads..."
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
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <button
              onClick={openAdd}
              disabled={loading || headers.length === 0}
              style={{
                background: TH.gold,
                border: 'none',
                borderRadius: 10,
                padding: '10px 18px',
                cursor: headers.length === 0 ? 'not-allowed' : 'pointer',
                color: TH.bg,
                fontSize: 13,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                opacity: headers.length === 0 ? 0.5 : 1,
                whiteSpace: 'nowrap',
              }}
            >
              <Plus size={16} />
              Add lead
            </button>
          </div>

          {/* Loading */}
          {loading && (
            <div style={{ padding: '40px 0', textAlign: 'center', color: TH.textMuted }}>
              Loading leads...
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div
              style={{
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 10,
                padding: 16,
                color: '#EF4444',
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && headers.length === 0 && (
            <div
              style={{
                background: TH.card,
                border: `1px dashed ${TH.border}`,
                borderRadius: 12,
                padding: '40px 24px',
                textAlign: 'center',
                color: TH.textMuted,
              }}
            >
              <Inbox size={32} style={{ margin: '0 auto 12px', display: 'block' }} />
              <p style={{ fontSize: 13, margin: 0 }}>
                No headers found. Add column headers in row 1 of the Google Sheet.
              </p>
            </div>
          )}

          {/* Table */}
          {!loading && !error && headers.length > 0 && (
            <div
              style={{
                background: TH.card,
                border: `1px solid ${TH.border}`,
                borderRadius: 12,
                overflow: 'auto',
              }}
            >
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: 12,
                  minWidth: headers.length * 140,
                }}
              >
                <thead>
                  <tr style={{ background: 'rgba(212,168,83,0.05)' }}>
                    {headers.map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: '12px 14px',
                          textAlign: 'left',
                          color: TH.textMuted,
                          fontWeight: 700,
                          fontSize: 10,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          borderBottom: `1px solid ${TH.border}`,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {h || '—'}
                      </th>
                    ))}
                    <th
                      style={{
                        padding: '12px 14px',
                        borderBottom: `1px solid ${TH.border}`,
                        width: 50,
                      }}
                    />
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td
                        colSpan={headers.length + 1}
                        style={{
                          padding: '40px 24px',
                          textAlign: 'center',
                          color: TH.textMuted,
                          fontSize: 13,
                        }}
                      >
                        {search ? 'No leads match your search' : 'No leads yet'}
                      </td>
                    </tr>
                  )}
                  {filtered.map((row) => (
                    <tr
                      key={row.rowNumber}
                      style={{
                        borderBottom: `1px solid ${TH.border}`,
                        opacity: deletingRow === row.rowNumber ? 0.4 : 1,
                      }}
                    >
                      {headers.map((h) => (
                        <td
                          key={h}
                          style={{
                            padding: '10px 14px',
                            verticalAlign: 'top',
                            minWidth: 120,
                            maxWidth: 280,
                          }}
                        >
                          <EditableCell
                            value={row.values[h] || ''}
                            field={h}
                            rowNumber={row.rowNumber}
                            onSave={updateField}
                          />
                        </td>
                      ))}
                      <td style={{ padding: '10px 14px', verticalAlign: 'top' }}>
                        <button
                          onClick={() => deleteRow(row.rowNumber)}
                          disabled={deletingRow === row.rowNumber}
                          style={{
                            background: 'rgba(239,68,68,0.1)',
                            border: 'none',
                            borderRadius: 6,
                            padding: 6,
                            cursor: 'pointer',
                            color: '#EF4444',
                            display: 'flex',
                          }}
                          title="Delete lead"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Add Modal */}
      {showAdd && (
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
          onClick={() => {
            if (!submitting) setShowAdd(false);
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: TH.card,
              border: `1px solid ${TH.border}`,
              borderRadius: 16,
              padding: 28,
              maxWidth: 520,
              width: '100%',
              margin: '0 16px',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 20,
              }}
            >
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: TH.text }}>
                Add new lead
              </h3>
              <button
                onClick={() => setShowAdd(false)}
                disabled={submitting}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: TH.textMuted,
                  padding: 4,
                  display: 'flex',
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gap: 14 }}>
              {headers.map((h) => (
                <div key={h}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 11,
                      fontWeight: 600,
                      color: TH.textSec,
                      marginBottom: 6,
                    }}
                  >
                    {h || '—'}
                  </label>
                  <input
                    value={addForm[h] || ''}
                    onChange={(e) => setAddForm({ ...addForm, [h]: e.target.value })}
                    disabled={submitting}
                    style={{
                      width: '100%',
                      background: TH.input,
                      border: `1px solid ${TH.border}`,
                      borderRadius: 8,
                      padding: '10px 12px',
                      color: TH.text,
                      fontSize: 13,
                      fontFamily: 'inherit',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
              <button
                onClick={() => setShowAdd(false)}
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
                onClick={submitAdd}
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
                    Saving...
                  </>
                ) : (
                  <>
                    <Plus size={14} />
                    Add lead
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
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
            background:
              toast.type === 'success' ? 'rgba(52,211,153,0.9)' : 'rgba(239,68,68,0.9)',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          }}
        >
          {toast.message}
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}
