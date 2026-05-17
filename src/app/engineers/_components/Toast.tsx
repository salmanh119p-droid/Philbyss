'use client';

import { useEffect } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';
import { clsx } from 'clsx';

export type ToastKind = 'success' | 'error';

export interface ToastMessage {
  id: number;
  kind: ToastKind;
  text: string;
}

interface Props {
  toast: ToastMessage | null;
  onDismiss: () => void;
}

export default function Toast({ toast, onDismiss }: Props) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onDismiss, 5000);
    return () => clearTimeout(t);
  }, [toast, onDismiss]);

  if (!toast) return null;

  const Icon = toast.kind === 'success' ? CheckCircle2 : AlertCircle;
  return (
    <div className="fixed bottom-6 right-6 z-[60] animate-fade-in">
      <div
        className={clsx(
          'flex items-start gap-3 px-4 py-3 rounded-lg border shadow-xl max-w-sm',
          toast.kind === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : 'bg-red-500/10 border-red-500/30 text-red-300'
        )}
      >
        <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div className="text-sm flex-1">{toast.text}</div>
        <button
          onClick={onDismiss}
          className="opacity-70 hover:opacity-100 transition-opacity"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
