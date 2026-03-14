'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Upload,
  Car,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  Loader2,
  AlertCircle,
  ExternalLink,
  Image as ImageIcon,
} from 'lucide-react';
import { clsx } from 'clsx';
import { supabase } from '@/lib/supabase';
import { Engineer } from '@/types';

// ── Constants ──
const ADMIN_FEE = 15;

const parseFineAmount = (amount: string): number => {
  const cleaned = amount.replace(/[£,\s]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

const SUPABASE_URL = 'https://cvrdxkwrteuhlxzdryab.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2cmR4a3dydGV1aGx4emRyeWFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMzQ3NDMsImV4cCI6MjA4NzYxMDc0M30.gIyzC-2wk2jce6vKzVVykP9O4oMxlXUXV-zkB5PQIzg';

interface VanFine {
  id?: string;
  vehicle_reg: string;
  fine_amount: string;
  issue_date: string;
  reference_number: string;
  assigned_engineer: string;
  image_url: string;
  image_path?: string;
  status: string;
  created_at?: string;
}

interface Vehicle {
  id: string;
  vehicle_reg: string;
  engineer_name: string;
  engineer_id: string | null;
  is_active: boolean;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
}

type SectionTab = 'upload' | 'vehicles';

// ── Main component ──
export default function VanFinesPage() {
  const [activeSection, setActiveSection] = useState<SectionTab>('upload');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Upload Fine state
  const [fines, setFines] = useState<VanFine[]>([]);
  const [finesLoading, setFinesLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manage Vehicles state
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [allEngineers, setAllEngineers] = useState<Engineer[]>([]);
  const [newVehicleReg, setNewVehicleReg] = useState('');
  const [newVehicleEngineer, setNewVehicleEngineer] = useState('');
  const [addingVehicle, setAddingVehicle] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editReg, setEditReg] = useState('');
  const [editEngineer, setEditEngineer] = useState('');

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  // ── Load fines ──
  const fetchFines = useCallback(async () => {
    setFinesLoading(true);
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/van_fines?select=*&order=created_at.desc`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
        }
      );
      const data = await res.json();
      if (Array.isArray(data)) setFines(data);
    } catch {
      console.error('Failed to load fines');
    } finally {
      setFinesLoading(false);
    }
  }, []);

  // ── Load vehicles ──
  const fetchVehicles = useCallback(async () => {
    setVehiclesLoading(true);
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/vehicle_registry?select=*&order=engineer_name`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
        }
      );
      const data = await res.json();
      if (Array.isArray(data)) setVehicles(data);
    } catch {
      console.error('Failed to load vehicles');
    } finally {
      setVehiclesLoading(false);
    }
  }, []);

  // ── Load engineers ──
  useEffect(() => {
    async function loadEngineers() {
      const { data, error } = await supabase
        .from('engineers')
        .select('*')
        .eq('is_active', true)
        .order('display_name');
      if (!error && data) setAllEngineers(data);
    }
    loadEngineers();
  }, []);

  // ── Initial load ──
  useEffect(() => {
    fetchFines();
    fetchVehicles();
  }, [fetchFines, fetchVehicles]);

  // ── Upload fine ──
  const uploadFine = async (file: File) => {
    setIsProcessing(true);
    try {
      // 1. Upload to Supabase Storage
      const fileName = `${Date.now()}_${file.name}`;
      const storagePath = `fines/${fileName}`;

      const storageRes = await fetch(
        `${SUPABASE_URL}/storage/v1/object/van-fines/${storagePath}`,
        {
          method: 'POST',
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': file.type,
          },
          body: file,
        }
      );

      if (!storageRes.ok) {
        throw new Error(`Storage upload failed: ${storageRes.status}`);
      }

      const imageUrl = `${SUPABASE_URL}/storage/v1/object/public/van-fines/${storagePath}`;

      // 2. Send to n8n as multipart/form-data (binary)
      const formData = new FormData();
      formData.append('Document', file);

      const ocrRes = await fetch(
        `https://n8n.srv1177154.hstgr.cloud/webhook/van-fine-ocr?image_url=${encodeURIComponent(imageUrl)}&image_path=${encodeURIComponent(storagePath)}`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const result = await ocrRes.json();

      if (result.error) {
        showToast(result.message || 'OCR processing failed', 'error');
      } else {
        setFines((prev) => [result, ...prev]);
        const total = parseFineAmount(result.fine_amount) + ADMIN_FEE;
        showToast(
          `Fine processed: ${result.vehicle_reg} — ${result.assigned_engineer} — ${result.fine_amount} + £15 admin = £${total.toFixed(2)}`,
          'success'
        );
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      showToast(message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFine(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFine(file);
  };

  // ── Add vehicle ──
  const addVehicle = async () => {
    if (!newVehicleReg.trim() || !newVehicleEngineer.trim()) return;
    setAddingVehicle(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/vehicle_registry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          Prefer: 'return=representation',
        },
        body: JSON.stringify({
          vehicle_reg: newVehicleReg.toUpperCase().replace(/\s/g, ''),
          engineer_name: newVehicleEngineer,
          is_active: true,
        }),
      });
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setVehicles((prev) => [...prev, data[0]]);
        setNewVehicleReg('');
        setNewVehicleEngineer('');
        showToast(`Vehicle ${data[0].vehicle_reg} added`, 'success');
      }
    } catch {
      showToast('Failed to add vehicle', 'error');
    } finally {
      setAddingVehicle(false);
    }
  };

  // ── Update vehicle ──
  const updateVehicle = async (id: string) => {
    if (!editReg.trim() || !editEngineer.trim()) return;
    try {
      await fetch(
        `${SUPABASE_URL}/rest/v1/vehicle_registry?id=eq.${id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            vehicle_reg: editReg.toUpperCase().replace(/\s/g, ''),
            engineer_name: editEngineer,
            updated_at: new Date().toISOString(),
          }),
        }
      );
      setEditingId(null);
      fetchVehicles();
      showToast('Vehicle updated', 'success');
    } catch {
      showToast('Failed to update vehicle', 'error');
    }
  };

  // ── Delete vehicle ──
  const deleteVehicle = async (id: string, reg: string) => {
    try {
      await fetch(
        `${SUPABASE_URL}/rest/v1/vehicle_registry?id=eq.${id}`,
        {
          method: 'DELETE',
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
        }
      );
      setVehicles((prev) => prev.filter((v) => v.id !== id));
      showToast(`Vehicle ${reg} deleted`, 'success');
    } catch {
      showToast('Failed to delete vehicle', 'error');
    }
  };

  const startEdit = (vehicle: Vehicle) => {
    setEditingId(vehicle.id);
    setEditReg(vehicle.vehicle_reg);
    setEditEngineer(vehicle.engineer_name);
  };

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

      {/* Section Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setActiveSection('upload')}
          className={clsx(
            'px-4 py-2 rounded-lg text-sm font-medium transition-all',
            activeSection === 'upload'
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
              : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:border-[var(--color-border-light)]'
          )}
        >
          <Upload className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
          Upload Fine
        </button>
        <button
          onClick={() => setActiveSection('vehicles')}
          className={clsx(
            'px-4 py-2 rounded-lg text-sm font-medium transition-all',
            activeSection === 'vehicles'
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
              : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:border-[var(--color-border-light)]'
          )}
        >
          <Car className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
          Manage Vehicles ({vehicles.length})
        </button>
      </div>

      {/* ═══════ SECTION 1: UPLOAD FINE ═══════ */}
      {activeSection === 'upload' && (
        <div className="space-y-6">
          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onClick={() => !isProcessing && fileInputRef.current?.click()}
            className={clsx(
              'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all',
              isProcessing
                ? 'border-purple-500/30 bg-purple-500/5 cursor-wait'
                : isDragOver
                ? 'border-blue-500/50 bg-blue-500/10'
                : 'border-[var(--color-border)] hover:border-[var(--color-border-light)] hover:bg-[var(--color-bg-hover)]'
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,application/pdf"
              onChange={handleFileSelect}
              className="hidden"
            />

            {isProcessing ? (
              <div className="py-4">
                <Loader2 className="w-10 h-10 animate-spin text-purple-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-[var(--color-text-primary)]">
                  Processing fine ticket...
                </p>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  Uploading → Running OCR → Extracting data
                </p>
              </div>
            ) : (
              <>
                <Upload className="w-10 h-10 text-[var(--color-text-muted)] mx-auto mb-3" />
                <p className="text-sm font-medium text-[var(--color-text-primary)]">
                  Drop fine ticket here or click to upload
                </p>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  JPG, PNG, or PDF
                </p>
              </>
            )}
          </div>

          {/* Fines Table */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-3">
              Processed Fines ({fines.length})
            </p>

            {finesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
              </div>
            ) : fines.length === 0 ? (
              <div className="card text-center py-8">
                <Car className="w-8 h-8 text-[var(--color-text-muted)] mx-auto mb-2" />
                <p className="text-sm text-[var(--color-text-muted)]">
                  No fines uploaded yet
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-border)]">
                      <th className="text-left py-3 px-3 text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">
                        Date
                      </th>
                      <th className="text-left py-3 px-3 text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">
                        Reg
                      </th>
                      <th className="text-left py-3 px-3 text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">
                        Engineer
                      </th>
                      <th className="text-left py-3 px-3 text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">
                        Fine
                      </th>
                      <th className="text-left py-3 px-3 text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">
                        Admin Fee
                      </th>
                      <th className="text-left py-3 px-3 text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">
                        Total Due
                      </th>
                      <th className="text-left py-3 px-3 text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">
                        Reference
                      </th>
                      <th className="text-left py-3 px-3 text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">
                        Status
                      </th>
                      <th className="text-left py-3 px-3 text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">
                        Image
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {fines.map((fine, i) => (
                      <tr
                        key={fine.id || i}
                        className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg-hover)] transition-colors"
                      >
                        <td className="py-3 px-3 text-[var(--color-text-secondary)]">
                          {fine.issue_date || '—'}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-mono font-semibold text-[var(--color-text-primary)]">
                            {fine.vehicle_reg}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={clsx(
                              'font-medium',
                              fine.assigned_engineer === 'UNKNOWN'
                                ? 'text-amber-400'
                                : 'text-[var(--color-text-primary)]'
                            )}
                          >
                            {fine.assigned_engineer}
                            {fine.assigned_engineer === 'UNKNOWN' && (
                              <span className="ml-1 text-[10px] text-amber-400/60">
                                (not matched)
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-semibold text-red-400">
                          {fine.fine_amount}
                        </td>
                        <td className="py-3 px-3 text-amber-400">
                          £{ADMIN_FEE.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 font-bold text-[var(--color-text-primary)]">
                          £{(parseFineAmount(fine.fine_amount) + ADMIN_FEE).toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-[var(--color-text-muted)] font-mono text-xs">
                          {fine.reference_number || '—'}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={clsx(
                              'badge text-[10px] px-2 py-0.5',
                              fine.status === 'PROCESSED'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-amber-500/20 text-amber-400'
                            )}
                          >
                            {fine.status || 'PENDING'}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          {fine.image_url ? (
                            <a
                              href={fine.image_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span className="text-xs">View</span>
                            </a>
                          ) : (
                            <span className="text-[var(--color-text-muted)]">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════ SECTION 2: MANAGE VEHICLES ═══════ */}
      {activeSection === 'vehicles' && (
        <div className="space-y-6">
          {/* Add Vehicle */}
          <div className="card">
            <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-3">
              Add Vehicle
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className="text-xs text-[var(--color-text-muted)] mb-1 block">
                  Vehicle Reg
                </label>
                <input
                  type="text"
                  value={newVehicleReg}
                  onChange={(e) => setNewVehicleReg(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addVehicle()}
                  placeholder="e.g. LV25HLD"
                  className="input text-sm uppercase"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-[var(--color-text-muted)] mb-1 block">
                  Engineer
                </label>
                <select
                  value={newVehicleEngineer}
                  onChange={(e) => setNewVehicleEngineer(e.target.value)}
                  className="input text-sm"
                >
                  <option value="">Select engineer...</option>
                  {allEngineers.map((eng) => (
                    <option key={eng.id} value={eng.display_name}>
                      {eng.display_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={addVehicle}
                  disabled={!newVehicleReg.trim() || !newVehicleEngineer || addingVehicle}
                  className={clsx(
                    'btn btn-primary px-4 py-2 text-sm flex items-center gap-1.5',
                    (!newVehicleReg.trim() || !newVehicleEngineer || addingVehicle) &&
                      'opacity-50 cursor-not-allowed'
                  )}
                >
                  {addingVehicle ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Add Vehicle
                </button>
              </div>
            </div>
          </div>

          {/* Vehicle Registry */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-3">
              Vehicle Registry ({vehicles.length})
            </p>

            {vehiclesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
              </div>
            ) : vehicles.length === 0 ? (
              <div className="card text-center py-8">
                <Car className="w-8 h-8 text-[var(--color-text-muted)] mx-auto mb-2" />
                <p className="text-sm text-[var(--color-text-muted)]">
                  No vehicles registered
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {vehicles.map((vehicle) => (
                  <div
                    key={vehicle.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)] hover:border-[var(--color-border-light)] transition-all"
                  >
                    {editingId === vehicle.id ? (
                      /* Edit mode */
                      <>
                        <input
                          type="text"
                          value={editReg}
                          onChange={(e) => setEditReg(e.target.value)}
                          className="input text-sm uppercase w-32 font-mono"
                        />
                        <select
                          value={editEngineer}
                          onChange={(e) => setEditEngineer(e.target.value)}
                          className="input text-sm flex-1"
                        >
                          <option value="">Select engineer...</option>
                          {allEngineers.map((eng) => (
                            <option key={eng.id} value={eng.display_name}>
                              {eng.display_name}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => updateVehicle(vehicle.id)}
                          className="p-2 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                          title="Save"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-2 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)] transition-colors"
                          title="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      /* Display mode */
                      <>
                        <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                          <Car className="w-4 h-4 text-blue-400" />
                        </div>
                        <span className="font-mono font-bold text-sm text-[var(--color-text-primary)] w-24 flex-shrink-0">
                          {vehicle.vehicle_reg}
                        </span>
                        <span className="text-sm text-[var(--color-text-secondary)] flex-1">
                          {vehicle.engineer_name}
                        </span>
                        {!vehicle.is_active && (
                          <span className="badge text-[10px] px-1.5 py-0 bg-gray-500/20 text-gray-400">
                            INACTIVE
                          </span>
                        )}
                        <button
                          onClick={() => startEdit(vehicle)}
                          className="p-2 rounded-lg text-[var(--color-text-muted)] hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteVehicle(vehicle.id, vehicle.vehicle_reg)}
                          className="p-2 rounded-lg text-[var(--color-text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
