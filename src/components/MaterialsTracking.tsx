'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Package,
  Truck,
  CheckCircle,
  Clock,
  Plus,
  Search,
  Eye,
  Camera,
  X,
  Loader2,
  Upload,
  Pencil,
  Trash2,
} from 'lucide-react';
import { clsx } from 'clsx';
import { supabase } from '@/lib/supabase';
import StatCard from '@/components/StatCard';
import { MaterialTrackingRecord, Engineer } from '@/types';

const N8N_BASE = 'https://n8n.srv1177154.hstgr.cloud/webhook';

// ── Helpers ──────────────────────────────────────────────────────

async function callWebhook(endpoint: string, payload: object) {
  const response = await fetch(`${N8N_BASE}/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const result = await response.json();
  if (!result.success) {
    throw new Error(result.message || 'Operation failed');
  }
  return result;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the data:image/...;base64, prefix
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Status Badge ─────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ordered: 'bg-amber-500/20 text-amber-400',
    arrived: 'bg-blue-500/20 text-blue-400',
    collected: 'bg-emerald-500/20 text-emerald-400',
  };
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
        styles[status] || 'bg-gray-500/20 text-gray-400'
      )}
    >
      {status}
    </span>
  );
}

// ── Main Component ───────────────────────────────────────────────

export default function MaterialsTracking() {
  // Data
  const [materials, setMaterials] = useState<MaterialTrackingRecord[]>([]);
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Order modal
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderForm, setOrderForm] = useState({
    work_order_number: '',
    material_description: '',
    supplier_order_ref: '',
    ordered_by: '',
  });

  // Arrived modal
  const [showArrivedModal, setShowArrivedModal] = useState(false);
  const [arrivedItem, setArrivedItem] = useState<MaterialTrackingRecord | null>(null);

  // Collected modal
  const [showCollectedModal, setShowCollectedModal] = useState(false);
  const [collectedItem, setCollectedItem] = useState<MaterialTrackingRecord | null>(null);
  const [collectedForm, setCollectedForm] = useState({
    collected_by_engineer: '',
    handed_over_by: '',
  });
  const [proofFile, setProofFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Details modal
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsItem, setDetailsItem] = useState<MaterialTrackingRecord | null>(null);

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editItem, setEditItem] = useState<MaterialTrackingRecord | null>(null);
  const [editForm, setEditForm] = useState({
    work_order_number: '',
    material_description: '',
    supplier_order_ref: '',
    ordered_by: '',
  });

  // Delete confirmation modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteItem, setDeleteItem] = useState<MaterialTrackingRecord | null>(null);

  // Submitting state
  const [submitting, setSubmitting] = useState(false);

  // ── Toast helper ────────────────────────────────────────────────

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Data fetching ──────────────────────────────────────────────

  const fetchMaterials = useCallback(async () => {
    const { data, error } = await supabase
      .from('materials_tracking')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching materials:', error);
      showToast('Failed to load materials', 'error');
    } else {
      setMaterials(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  useEffect(() => {
    async function loadEngineers() {
      const { data, error } = await supabase
        .from('engineers')
        .select('*')
        .eq('is_active', true)
        .order('display_name');
      if (!error && data) {
        setEngineers(data);
      }
    }
    loadEngineers();
  }, []);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('materials-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'materials_tracking' }, () => {
        fetchMaterials();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchMaterials]);

  // ── Filtered + computed data ───────────────────────────────────

  const filteredMaterials = useMemo(() => {
    let result = materials;
    if (statusFilter) {
      result = result.filter((m) => m.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (m) =>
          m.work_order_number.toLowerCase().includes(q) ||
          m.supplier_order_ref.toLowerCase().includes(q)
      );
    }
    return result;
  }, [materials, statusFilter, searchQuery]);

  const totalCount = materials.length;
  const orderedCount = materials.filter((m) => m.status === 'ordered').length;
  const arrivedCount = materials.filter((m) => m.status === 'arrived').length;
  const collectedCount = materials.filter((m) => m.status === 'collected').length;

  // ── Action handlers ────────────────────────────────────────────

  const handleOrderSubmit = async () => {
    if (!orderForm.work_order_number.trim() || !orderForm.material_description.trim() || !orderForm.supplier_order_ref.trim()) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await callWebhook('materials-ordered', {
        work_order_number: orderForm.work_order_number.trim(),
        material_description: orderForm.material_description.trim(),
        supplier_order_ref: orderForm.supplier_order_ref.trim(),
        ordered_by: orderForm.ordered_by.trim() || 'Office Staff',
      });
      showToast('Materials order recorded successfully');
      setShowOrderModal(false);
      setOrderForm({ work_order_number: '', material_description: '', supplier_order_ref: '', ordered_by: '' });
      fetchMaterials();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to record order';
      if (message.toLowerCase().includes('duplicate') || message.toLowerCase().includes('unique') || message.toLowerCase().includes('already exists')) {
        showToast('This supplier reference already exists for this work order', 'error');
      } else {
        showToast(message, 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkArrived = async () => {
    if (!arrivedItem) return;
    setSubmitting(true);
    try {
      await callWebhook('materials-arrived', {
        material_id: arrivedItem.id,
        work_order_number: arrivedItem.work_order_number,
        arrived_marked_by: 'Office Staff',
      });
      showToast('Materials marked as arrived');
      setShowArrivedModal(false);
      setArrivedItem(null);
      fetchMaterials();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to update', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkCollected = async () => {
    if (!collectedItem) return;
    if (!collectedForm.collected_by_engineer || !collectedForm.handed_over_by.trim()) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        material_id: collectedItem.id,
        work_order_number: collectedItem.work_order_number,
        collected_by_engineer: collectedForm.collected_by_engineer,
        handed_over_by: collectedForm.handed_over_by.trim(),
      };

      if (proofFile) {
        if (proofFile.size > 5 * 1024 * 1024) {
          showToast('Photo must be under 5MB', 'error');
          setSubmitting(false);
          return;
        }
        payload.proof_image_base64 = await fileToBase64(proofFile);
        payload.proof_image_filename = proofFile.name;
      }

      await callWebhook('materials-collected', payload);
      showToast('Materials marked as collected');
      setShowCollectedModal(false);
      setCollectedItem(null);
      setCollectedForm({ collected_by_engineer: '', handed_over_by: '' });
      setProofFile(null);
      fetchMaterials();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to update', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const openArrivedModal = (item: MaterialTrackingRecord) => {
    setArrivedItem(item);
    setShowArrivedModal(true);
  };

  const openCollectedModal = (item: MaterialTrackingRecord) => {
    setCollectedItem(item);
    setCollectedForm({ collected_by_engineer: '', handed_over_by: '' });
    setProofFile(null);
    setShowCollectedModal(true);
  };

  const openDetailsModal = (item: MaterialTrackingRecord) => {
    setDetailsItem(item);
    setShowDetailsModal(true);
  };

  const openEditModal = (item: MaterialTrackingRecord) => {
    setEditItem(item);
    setEditForm({
      work_order_number: item.work_order_number,
      material_description: item.material_description,
      supplier_order_ref: item.supplier_order_ref,
      ordered_by: item.ordered_by || '',
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (item: MaterialTrackingRecord) => {
    setDeleteItem(item);
    setShowDeleteModal(true);
  };

  const handleEditSubmit = async () => {
    if (!editItem) return;
    if (!editForm.work_order_number.trim() || !editForm.material_description.trim() || !editForm.supplier_order_ref.trim()) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('materials_tracking')
        .update({
          work_order_number: editForm.work_order_number.trim(),
          material_description: editForm.material_description.trim(),
          supplier_order_ref: editForm.supplier_order_ref.trim(),
          ordered_by: editForm.ordered_by.trim() || 'Office Staff',
        })
        .eq('id', editItem.id);

      if (error) throw error;

      showToast('Material record updated successfully');
      setShowEditModal(false);
      setEditItem(null);
      fetchMaterials();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update record';
      showToast(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('materials_tracking')
        .delete()
        .eq('id', deleteItem.id);

      if (error) throw error;

      showToast('Material record deleted');
      setShowDeleteModal(false);
      setDeleteItem(null);
      fetchMaterials();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete record';
      showToast(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={clsx(
            'fixed top-20 right-4 z-50 rounded-lg px-4 py-3 shadow-lg animate-slide-up border',
            toast.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          )}
        >
          <p className="text-sm font-medium">{toast.message}</p>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Orders"
          value={totalCount}
          icon={Package}
          color="purple"
          delay={0}
          onClick={() => setStatusFilter(null)}
        />
        <StatCard
          title="Ordered"
          value={orderedCount}
          icon={Clock}
          color="amber"
          delay={1}
          onClick={() => setStatusFilter(statusFilter === 'ordered' ? null : 'ordered')}
        />
        <StatCard
          title="Arrived"
          value={arrivedCount}
          icon={Truck}
          color="blue"
          delay={2}
          onClick={() => setStatusFilter(statusFilter === 'arrived' ? null : 'arrived')}
        />
        <StatCard
          title="Collected"
          value={collectedCount}
          icon={CheckCircle}
          color="green"
          delay={3}
          onClick={() => setStatusFilter(statusFilter === 'collected' ? null : 'collected')}
        />
      </div>

      {/* Search + Action Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
          <input
            type="text"
            placeholder="Search by Work Order # or Supplier Ref..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10 text-sm"
          />
        </div>
        <button
          onClick={() => setShowOrderModal(true)}
          className="btn btn-primary whitespace-nowrap"
        >
          <Plus className="w-4 h-4 mr-2" />
          Order Materials
        </button>
      </div>

      {/* Active filter indicator */}
      {statusFilter && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--color-text-secondary)]">
            Filtering by:
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
            {statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
            <button onClick={() => setStatusFilter(null)} className="ml-1 hover:text-blue-300">
              <X className="w-3 h-3" />
            </button>
          </span>
        </div>
      )}

      {/* Materials Table — Desktop */}
      <div className="card hidden sm:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--color-border)]">
              <th className="table-header text-left py-3 px-4">WO #</th>
              <th className="table-header text-left py-3 px-4">Material</th>
              <th className="table-header text-left py-3 px-4">Supplier Ref</th>
              <th className="table-header text-left py-3 px-4">Status</th>
              <th className="table-header text-left py-3 px-4">Ordered</th>
              <th className="table-header text-left py-3 px-4">Arrived</th>
              <th className="table-header text-left py-3 px-4">Collected</th>
              <th className="table-header text-right py-3 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredMaterials.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-[var(--color-text-muted)]">
                  {materials.length === 0 ? 'No materials orders yet' : 'No results match your filters'}
                </td>
              </tr>
            ) : (
              filteredMaterials.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg-hover)] transition-colors"
                >
                  <td className="table-cell py-3 px-4 font-medium">{item.work_order_number}</td>
                  <td className="table-cell py-3 px-4 max-w-[200px]">
                    <span className="block truncate" title={item.material_description}>
                      {item.material_description}
                    </span>
                  </td>
                  <td className="table-cell py-3 px-4">{item.supplier_order_ref}</td>
                  <td className="table-cell py-3 px-4">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="table-cell py-3 px-4 text-sm">
                    <div>{formatDate(item.ordered_at)}</div>
                    {item.ordered_by && (
                      <div className="text-[var(--color-text-muted)] text-xs">{item.ordered_by}</div>
                    )}
                  </td>
                  <td className="table-cell py-3 px-4 text-sm">
                    {item.arrived_at ? (
                      <>
                        <div>{formatDate(item.arrived_at)}</div>
                        {item.arrived_marked_by && (
                          <div className="text-[var(--color-text-muted)] text-xs">{item.arrived_marked_by}</div>
                        )}
                      </>
                    ) : (
                      <span className="text-[var(--color-text-muted)]">—</span>
                    )}
                  </td>
                  <td className="table-cell py-3 px-4 text-sm">
                    {item.collected_at ? (
                      <>
                        <div>{formatDate(item.collected_at)}</div>
                        {item.collected_by_engineer && (
                          <div className="text-[var(--color-text-muted)] text-xs">{item.collected_by_engineer}</div>
                        )}
                      </>
                    ) : (
                      <span className="text-[var(--color-text-muted)]">—</span>
                    )}
                  </td>
                  <td className="table-cell py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {item.status === 'ordered' && (
                        <button
                          onClick={() => openArrivedModal(item)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
                        >
                          Mark Arrived
                        </button>
                      )}
                      {item.status === 'arrived' && (
                        <button
                          onClick={() => openCollectedModal(item)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                        >
                          Mark Collected
                        </button>
                      )}
                      {item.status === 'collected' && (
                        <button
                          onClick={() => openDetailsModal(item)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:bg-[var(--color-bg-hover)] transition-colors"
                        >
                          <Eye className="w-3 h-3 inline mr-1" />
                          View Details
                        </button>
                      )}
                      <button
                        onClick={() => openEditModal(item)}
                        className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => openDeleteModal(item)}
                        className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Materials Cards — Mobile */}
      <div className="sm:hidden space-y-3">
        {filteredMaterials.length === 0 ? (
          <div className="card text-center py-12 text-[var(--color-text-muted)]">
            {materials.length === 0 ? 'No materials orders yet' : 'No results match your filters'}
          </div>
        ) : (
          filteredMaterials.map((item) => (
            <div key={item.id} className="card space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-sm">WO# {item.work_order_number}</p>
                  <p className="text-sm text-[var(--color-text-secondary)] mt-1">{item.material_description}</p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">Ref: {item.supplier_order_ref}</p>
                </div>
                <StatusBadge status={item.status} />
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)]">
                <span className="text-xs text-[var(--color-text-muted)]">
                  Ordered {formatDate(item.ordered_at)}
                </span>
                <div className="flex items-center gap-1.5">
                  {item.status === 'ordered' && (
                    <button
                      onClick={() => openArrivedModal(item)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20"
                    >
                      Mark Arrived
                    </button>
                  )}
                  {item.status === 'arrived' && (
                    <button
                      onClick={() => openCollectedModal(item)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    >
                      Mark Collected
                    </button>
                  )}
                  {item.status === 'collected' && (
                    <button
                      onClick={() => openDetailsModal(item)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] border border-[var(--color-border)]"
                    >
                      View Details
                    </button>
                  )}
                  <button
                    onClick={() => openEditModal(item)}
                    className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                    title="Edit"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => openDeleteModal(item)}
                    className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── ORDER MATERIALS MODAL ────────────────────────────────── */}
      {showOrderModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Order Materials</h3>
              <button
                onClick={() => setShowOrderModal(false)}
                className="p-1 rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Work Order Number <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={orderForm.work_order_number}
                  onChange={(e) => setOrderForm({ ...orderForm, work_order_number: e.target.value })}
                  placeholder="e.g. 12345"
                  className="input text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Material Description <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={orderForm.material_description}
                  onChange={(e) => setOrderForm({ ...orderForm, material_description: e.target.value })}
                  placeholder="e.g. 2x Bathroom Taps Chrome"
                  rows={3}
                  className="input text-sm resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Supplier Order Reference <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={orderForm.supplier_order_ref}
                  onChange={(e) => setOrderForm({ ...orderForm, supplier_order_ref: e.target.value })}
                  placeholder="e.g. SUP-2024-789"
                  className="input text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Ordered By
                </label>
                <input
                  type="text"
                  value={orderForm.ordered_by}
                  onChange={(e) => setOrderForm({ ...orderForm, ordered_by: e.target.value })}
                  placeholder="Office Staff"
                  className="input text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowOrderModal(false)}
                className="btn btn-secondary"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={handleOrderSubmit}
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Ordering...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Order Materials
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT MATERIAL MODAL ───────────────────────────────── */}
      {showEditModal && editItem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Edit Material</h3>
              <button
                onClick={() => { setShowEditModal(false); setEditItem(null); }}
                className="p-1 rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Work Order Number <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={editForm.work_order_number}
                  onChange={(e) => setEditForm({ ...editForm, work_order_number: e.target.value })}
                  className="input text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Material Description <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={editForm.material_description}
                  onChange={(e) => setEditForm({ ...editForm, material_description: e.target.value })}
                  rows={3}
                  className="input text-sm resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Supplier Order Reference <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={editForm.supplier_order_ref}
                  onChange={(e) => setEditForm({ ...editForm, supplier_order_ref: e.target.value })}
                  className="input text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Ordered By
                </label>
                <input
                  type="text"
                  value={editForm.ordered_by}
                  onChange={(e) => setEditForm({ ...editForm, ordered_by: e.target.value })}
                  placeholder="Office Staff"
                  className="input text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setShowEditModal(false); setEditItem(null); }}
                className="btn btn-secondary"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={handleEditSubmit}
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Pencil className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRMATION MODAL ────────────────────────────── */}
      {showDeleteModal && deleteItem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-red-400">Delete Material</h3>
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteItem(null); }}
                className="p-1 rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-[var(--color-text-secondary)] mb-4">
              Are you sure you want to delete this material record? This action cannot be undone.
            </p>

            <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4 space-y-2 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-text-muted)]">Work Order</span>
                <span className="font-medium">{deleteItem.work_order_number}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-text-muted)]">Material</span>
                <span className="font-medium text-right max-w-[60%]">{deleteItem.material_description}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-text-muted)]">Supplier Ref</span>
                <span className="font-medium">{deleteItem.supplier_order_ref}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-text-muted)]">Status</span>
                <StatusBadge status={deleteItem.status} />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteItem(null); }}
                className="btn btn-secondary"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-lg font-medium text-sm bg-red-500 text-white hover:bg-red-600 transition-colors inline-flex items-center"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MARK ARRIVED DIALOG ──────────────────────────────────── */}
      {showArrivedModal && arrivedItem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Mark as Arrived</h3>
              <button
                onClick={() => { setShowArrivedModal(false); setArrivedItem(null); }}
                className="p-1 rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-[var(--color-text-secondary)] mb-4">
              Mark materials as arrived in office?
            </p>

            <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4 space-y-2 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-text-muted)]">Work Order</span>
                <span className="font-medium">{arrivedItem.work_order_number}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-text-muted)]">Material</span>
                <span className="font-medium text-right max-w-[60%]">{arrivedItem.material_description}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-text-muted)]">Supplier Ref</span>
                <span className="font-medium">{arrivedItem.supplier_order_ref}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowArrivedModal(false); setArrivedItem(null); }}
                className="btn btn-secondary"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={handleMarkArrived}
                className="px-4 py-2 rounded-lg font-medium text-sm bg-blue-500 text-white hover:bg-blue-600 transition-colors inline-flex items-center"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Truck className="w-4 h-4 mr-2" />
                    Confirm Arrived
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MARK COLLECTED MODAL ─────────────────────────────────── */}
      {showCollectedModal && collectedItem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Mark as Collected</h3>
              <button
                onClick={() => { setShowCollectedModal(false); setCollectedItem(null); }}
                className="p-1 rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4 space-y-2 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-text-muted)]">Work Order</span>
                <span className="font-medium">{collectedItem.work_order_number}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-text-muted)]">Material</span>
                <span className="font-medium text-right max-w-[60%]">{collectedItem.material_description}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Collected By Engineer <span className="text-red-400">*</span>
                </label>
                <select
                  value={collectedForm.collected_by_engineer}
                  onChange={(e) => setCollectedForm({ ...collectedForm, collected_by_engineer: e.target.value })}
                  className="input text-sm"
                >
                  <option value="">Select Engineer</option>
                  {engineers.map((eng) => (
                    <option key={eng.id} value={eng.display_name}>
                      {eng.display_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Handed Over By <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={collectedForm.handed_over_by}
                  onChange={(e) => setCollectedForm({ ...collectedForm, handed_over_by: e.target.value })}
                  placeholder="Who handed over the materials"
                  className="input text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Proof Photo <span className="text-[var(--color-text-muted)]">(optional)</span>
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/heic"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    if (file && file.size > 5 * 1024 * 1024) {
                      showToast('Photo must be under 5MB', 'error');
                      return;
                    }
                    setProofFile(file);
                  }}
                  className="hidden"
                />
                {proofFile ? (
                  <div className="flex items-center gap-3 p-3 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]">
                    <Camera className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    <span className="text-sm truncate flex-1">{proofFile.name}</span>
                    <button
                      onClick={() => setProofFile(null)}
                      className="text-[var(--color-text-muted)] hover:text-red-400"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full p-4 border-2 border-dashed border-[var(--color-border)] rounded-lg hover:border-blue-500/30 transition-colors flex items-center justify-center gap-2 text-sm text-[var(--color-text-muted)]"
                  >
                    <Upload className="w-4 h-4" />
                    Upload Photo (JPG, PNG, HEIC — max 5MB)
                  </button>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setShowCollectedModal(false); setCollectedItem(null); }}
                className="btn btn-secondary"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={handleMarkCollected}
                className="px-4 py-2 rounded-lg font-medium text-sm bg-emerald-500 text-white hover:bg-emerald-600 transition-colors inline-flex items-center"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Confirm Collected
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── VIEW DETAILS MODAL ───────────────────────────────────── */}
      {showDetailsModal && detailsItem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Material Details</h3>
              <button
                onClick={() => { setShowDetailsModal(false); setDetailsItem(null); }}
                className="p-1 rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Info section */}
            <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4 space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-text-muted)]">Work Order #</span>
                <span className="font-medium">{detailsItem.work_order_number}</span>
              </div>
              <div className="text-sm">
                <span className="text-[var(--color-text-muted)] block mb-1">Material</span>
                <span className="font-medium">{detailsItem.material_description}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-text-muted)]">Supplier Ref</span>
                <span className="font-medium">{detailsItem.supplier_order_ref}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-text-muted)]">Status</span>
                <StatusBadge status={detailsItem.status} />
              </div>
            </div>

            {/* Timeline */}
            <h4 className="text-sm font-semibold mb-4">Timeline</h4>
            <div className="space-y-4 mb-6">
              {/* Ordered */}
              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-amber-400" />
                  </div>
                  {(detailsItem.arrived_at || detailsItem.collected_at) && (
                    <div className="w-0.5 flex-1 bg-[var(--color-border)] mt-1" />
                  )}
                </div>
                <div className="pb-4">
                  <p className="text-sm font-medium">Ordered</p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {formatDate(detailsItem.ordered_at)}
                    {detailsItem.ordered_by && ` by ${detailsItem.ordered_by}`}
                  </p>
                </div>
              </div>

              {/* Arrived */}
              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={clsx(
                    'w-8 h-8 rounded-full flex items-center justify-center',
                    detailsItem.arrived_at ? 'bg-blue-500/20' : 'bg-[var(--color-bg-secondary)]'
                  )}>
                    <Truck className={clsx('w-4 h-4', detailsItem.arrived_at ? 'text-blue-400' : 'text-[var(--color-text-muted)]')} />
                  </div>
                  {detailsItem.collected_at && (
                    <div className="w-0.5 flex-1 bg-[var(--color-border)] mt-1" />
                  )}
                </div>
                <div className="pb-4">
                  <p className="text-sm font-medium">Arrived</p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {detailsItem.arrived_at
                      ? `${formatDate(detailsItem.arrived_at)}${detailsItem.arrived_marked_by ? ` by ${detailsItem.arrived_marked_by}` : ''}`
                      : 'Pending'}
                  </p>
                </div>
              </div>

              {/* Collected */}
              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={clsx(
                    'w-8 h-8 rounded-full flex items-center justify-center',
                    detailsItem.collected_at ? 'bg-emerald-500/20' : 'bg-[var(--color-bg-secondary)]'
                  )}>
                    <CheckCircle className={clsx('w-4 h-4', detailsItem.collected_at ? 'text-emerald-400' : 'text-[var(--color-text-muted)]')} />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium">Collected</p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {detailsItem.collected_at
                      ? `${formatDate(detailsItem.collected_at)}${detailsItem.collected_by_engineer ? ` by ${detailsItem.collected_by_engineer}` : ''}`
                      : 'Pending'}
                  </p>
                  {detailsItem.handed_over_by && (
                    <p className="text-xs text-[var(--color-text-muted)]">
                      Handed over by {detailsItem.handed_over_by}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Proof photo */}
            {detailsItem.proof_image_url && (
              <div>
                <h4 className="text-sm font-semibold mb-3">Proof Photo</h4>
                <a
                  href={detailsItem.proof_image_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <img
                    src={detailsItem.proof_image_url}
                    alt="Proof of collection"
                    className="rounded-lg border border-[var(--color-border)] max-h-48 object-cover hover:opacity-80 transition-opacity"
                  />
                </a>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">Click to open full size</p>
              </div>
            )}

            <div className="flex justify-end mt-6">
              <button
                onClick={() => { setShowDetailsModal(false); setDetailsItem(null); }}
                className="btn btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
