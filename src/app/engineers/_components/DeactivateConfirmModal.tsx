'use client';

import { useEffect, useState } from 'react';
import { X, Loader2, AlertTriangle, AlertCircle } from 'lucide-react';
import type { Engineer } from '@/types/engineers';

interface Props {
  engineer: Engineer | null;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export default function DeactivateConfirmModal({
  engineer,
  onClose,
  onSuccess,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (engineer) {
      setError(null);
      setSubmitting(false);
    }
  }, [engineer]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && engineer && !submitting) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [engineer, submitting, onClose]);

  if (!engineer) return null;

  const fullName =
    engineer.display_name?.trim() ||
    `${engineer.first_name} ${engineer.last_name}`.trim();

  const onConfirm = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/engineers/${encodeURIComponent(engineer.id)}/deactivate`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' } }
      );
      const result = await res.json();
      if (!res.ok || result.success === false) {
        setError(result.error || 'Failed to deactivate engineer');
        return;
      }
      onSuccess(`${fullName} deactivated`);
      onClose();
    } catch (err) {
      setError('Network error — try again');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="card w-full max-w-md p-0 overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-semibold">Deactivate {fullName}?</h2>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 rounded-md hover:bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)]"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <p className="text-sm text-[var(--color-text-secondary)]">This will:</p>
          <ul className="text-sm text-[var(--color-text-secondary)] list-disc pl-5 space-y-1">
            <li>Set their ServiceM8 status to inactive</li>
            <li>
              Deactivate their Samsara driver login
              {engineer.samsara_driver_id ? '' : ' (none linked — will be skipped)'}
            </li>
            <li>Mark them inactive in the dashboard</li>
          </ul>
          <p className="text-xs text-[var(--color-text-muted)]">
            Their history (jobs, fines, leave) will be preserved. This action can be reversed by an admin.
          </p>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 p-5 border-t border-[var(--color-border)]">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            className="btn bg-red-500 text-white hover:bg-red-600"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Deactivating…
              </>
            ) : (
              'Deactivate'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
