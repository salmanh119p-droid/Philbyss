'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Loader2,
  Plus,
  Trash2,
  UserPlus,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { clsx } from 'clsx';
import { supabase } from '@/lib/supabase';
import { Engineer, EngineerLeave } from '@/types';

const TRADE_OPTIONS = [
  'General',
  'Decorating',
  'Locksmith',
  'Plumbing',
  'Heating & Gas',
  'Electrical',
  'Carpentry',
  'Drainage',
  'Roofing',
];

const AREA_OPTIONS = [
  'All Areas',
  'East London',
  'North & West London',
  'South West London',
  'South East London',
];

const CERT_OPTIONS = ['Gas Safe', 'NICEIC'];

function formatLeaveRange(start: string, end: string): string {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  return s.getTime() === e.getTime() ? fmt(s) : `${fmt(s)} – ${fmt(e)}`;
}

export default function ManageLeavePage() {
  const [allEngineers, setAllEngineers] = useState<Engineer[]>([]);
  const [leaveRecords, setLeaveRecords] = useState<EngineerLeave[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEngineerId, setSelectedEngineerId] = useState('');
  const [leaveStart, setLeaveStart] = useState('');
  const [leaveEnd, setLeaveEnd] = useState('');
  const [leaveType, setLeaveType] = useState('ANNUAL LEAVE');
  const [isAdding, setIsAdding] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Add Engineer form state
  const [showAddEngineer, setShowAddEngineer] = useState(false);
  const [newEngName, setNewEngName] = useState('');
  const [newEngTrades, setNewEngTrades] = useState<string[]>([]);
  const [newEngArea, setNewEngArea] = useState('All Areas');
  const [newEngCerts, setNewEngCerts] = useState<string[]>([]);
  const [isAddingEngineer, setIsAddingEngineer] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadEngineers = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    loadEngineers();
  }, [loadEngineers]);

  const fetchLeave = useCallback(async () => {
    setIsLoading(true);
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('engineer_leave')
      .select('*, engineers(display_name, sm8_uuid)')
      .gte('leave_end', today)
      .order('leave_start', { ascending: true });

    if (error) {
      console.error('Error fetching leave:', error);
    } else {
      setLeaveRecords(data || []);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchLeave();
  }, [fetchLeave]);

  const handleAddLeave = async () => {
    if (!selectedEngineerId || !leaveStart || !leaveEnd) return;
    setIsAdding(true);
    const { error } = await supabase.from('engineer_leave').insert({
      engineer_id: selectedEngineerId,
      leave_type: leaveType,
      leave_start: leaveStart,
      leave_end: leaveEnd,
      all_day: true,
    });
    if (error) {
      console.error('Error adding leave:', error);
      showToast('Failed to add leave', 'error');
    } else {
      showToast('Leave added successfully');
      setLeaveStart('');
      setLeaveEnd('');
      setSelectedEngineerId('');
      fetchLeave();
    }
    setIsAdding(false);
  };

  const handleDeleteLeave = async (leaveId: string) => {
    const { error } = await supabase
      .from('engineer_leave')
      .delete()
      .eq('id', leaveId);
    if (error) {
      console.error('Error deleting leave:', error);
      showToast('Failed to delete leave', 'error');
    } else {
      showToast('Leave deleted');
      fetchLeave();
    }
  };

  const toggleTrade = (trade: string) => {
    setNewEngTrades((prev) =>
      prev.includes(trade) ? prev.filter((t) => t !== trade) : [...prev, trade]
    );
  };

  const toggleCert = (cert: string) => {
    setNewEngCerts((prev) =>
      prev.includes(cert) ? prev.filter((c) => c !== cert) : [...prev, cert]
    );
  };

  const handleAddEngineer = async () => {
    if (!newEngName.trim() || newEngTrades.length === 0) return;
    setIsAddingEngineer(true);
    const { error } = await supabase.from('engineers').insert({
      display_name: newEngName.trim(),
      full_name: newEngName.trim(),
      trades: newEngTrades,
      skills: [],
      area: newEngArea.toLowerCase().replace(/\s+/g, '_'),
      area_display: newEngArea,
      certifications: newEngCerts,
      is_active: true,
    });
    if (error) {
      console.error('Error adding engineer:', error);
      showToast('Failed to add engineer', 'error');
    } else {
      showToast(`${newEngName.trim()} added as engineer`);
      setNewEngName('');
      setNewEngTrades([]);
      setNewEngArea('All Areas');
      setNewEngCerts([]);
      setShowAddEngineer(false);
      loadEngineers();
    }
    setIsAddingEngineer(false);
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Toast notification */}
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

      {/* Add leave form */}
      <div className="card">
        <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-3">
          Add Leave
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <select
            value={selectedEngineerId}
            onChange={(e) => setSelectedEngineerId(e.target.value)}
            className="input text-sm"
          >
            <option value="">Select engineer...</option>
            {allEngineers.map((eng) => (
              <option key={eng.id} value={eng.id}>
                {eng.display_name}
              </option>
            ))}
          </select>
          <select
            value={leaveType}
            onChange={(e) => setLeaveType(e.target.value)}
            className="input text-sm"
          >
            <option value="ANNUAL LEAVE">Annual Leave</option>
            <option value="SICK">Sick</option>
            <option value="TRAINING">Training</option>
            <option value="OTHER">Other</option>
          </select>
          <input
            type="date"
            value={leaveStart}
            onChange={(e) => setLeaveStart(e.target.value)}
            className="input text-sm"
            placeholder="Start date"
          />
          <input
            type="date"
            value={leaveEnd}
            onChange={(e) => setLeaveEnd(e.target.value)}
            className="input text-sm"
            placeholder="End date"
          />
          <button
            onClick={handleAddLeave}
            disabled={!selectedEngineerId || !leaveStart || !leaveEnd || isAdding}
            className={clsx(
              'btn btn-primary text-sm gap-1',
              (!selectedEngineerId || !leaveStart || !leaveEnd || isAdding) && 'opacity-50 cursor-not-allowed'
            )}
          >
            <Plus className="w-4 h-4" />
            {isAdding ? 'Adding...' : 'Add Leave'}
          </button>
        </div>
      </div>

      {/* Add Engineer Section */}
      <div className="card">
        <button
          onClick={() => setShowAddEngineer(!showAddEngineer)}
          className="flex items-center justify-between w-full"
        >
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-blue-400" />
            <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">
              Add Engineer
            </span>
          </div>
          {showAddEngineer ? (
            <ChevronUp className="w-4 h-4 text-[var(--color-text-muted)]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[var(--color-text-muted)]" />
          )}
        </button>

        {showAddEngineer && (
          <div className="mt-4 space-y-4">
            {/* Name */}
            <div>
              <label className="text-xs text-[var(--color-text-muted)] mb-1 block">
                Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={newEngName}
                onChange={(e) => setNewEngName(e.target.value)}
                placeholder="e.g. John Smith"
                className="input text-sm w-full sm:w-1/2"
              />
            </div>

            {/* Trades */}
            <div>
              <label className="text-xs text-[var(--color-text-muted)] mb-2 block">
                Trades <span className="text-red-400">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {TRADE_OPTIONS.map((trade) => (
                  <button
                    key={trade}
                    type="button"
                    onClick={() => toggleTrade(trade)}
                    className={clsx(
                      'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                      newEngTrades.includes(trade)
                        ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                        : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:border-[var(--color-border-light)]'
                    )}
                  >
                    {trade}
                  </button>
                ))}
              </div>
            </div>

            {/* Area */}
            <div>
              <label className="text-xs text-[var(--color-text-muted)] mb-1 block">
                Area
              </label>
              <select
                value={newEngArea}
                onChange={(e) => setNewEngArea(e.target.value)}
                className="input text-sm w-full sm:w-1/2"
              >
                {AREA_OPTIONS.map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>
            </div>

            {/* Certifications */}
            <div>
              <label className="text-xs text-[var(--color-text-muted)] mb-2 block">
                Certifications (optional)
              </label>
              <div className="flex flex-wrap gap-2">
                {CERT_OPTIONS.map((cert) => (
                  <button
                    key={cert}
                    type="button"
                    onClick={() => toggleCert(cert)}
                    className={clsx(
                      'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                      newEngCerts.includes(cert)
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:border-[var(--color-border-light)]'
                    )}
                  >
                    {cert}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={handleAddEngineer}
              disabled={!newEngName.trim() || newEngTrades.length === 0 || isAddingEngineer}
              className={clsx(
                'btn btn-primary text-sm gap-1.5',
                (!newEngName.trim() || newEngTrades.length === 0 || isAddingEngineer) && 'opacity-50 cursor-not-allowed'
              )}
            >
              {isAddingEngineer ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              {isAddingEngineer ? 'Adding...' : 'Add Engineer'}
            </button>
          </div>
        )}
      </div>

      {/* Leave list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
        </div>
      ) : leaveRecords.length === 0 ? (
        <div className="card text-center py-8">
          <Calendar className="w-8 h-8 text-[var(--color-text-muted)] mx-auto mb-2" />
          <p className="text-sm text-[var(--color-text-muted)]">No upcoming leave records</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">
            Upcoming Leave ({leaveRecords.length})
          </p>
          {leaveRecords.map((lr) => (
            <div
              key={lr.id}
              className="flex items-center justify-between gap-3 p-3 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)]"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-4 h-4 text-red-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                    {lr.engineers?.display_name || 'Unknown'}
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    {lr.leave_type} · {formatLeaveRange(lr.leave_start, lr.leave_end)}
                  </p>
                  {lr.notes && (
                    <p className="text-[10px] text-[var(--color-text-muted)] italic mt-0.5">
                      {lr.notes}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleDeleteLeave(lr.id)}
                className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
