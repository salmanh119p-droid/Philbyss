'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, HardHat, Plus, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Engineer, EngineerArea } from '@/types/engineers';
import EngineersTable from './EngineersTable';
import EngineerFilters from './EngineerFilters';
import AddEngineerModal from './AddEngineerModal';
import DeactivateConfirmModal from './DeactivateConfirmModal';
import Toast, { type ToastMessage } from './Toast';

interface Props {
  initialEngineers: Engineer[];
  loadError: string | null;
}

export default function EngineersClient({ initialEngineers, loadError }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [area, setArea] = useState<EngineerArea | 'any'>('any');
  const [trades, setTrades] = useState<string[]>([]);
  const [tab, setTab] = useState<'active' | 'all'>('active');
  const [addOpen, setAddOpen] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<Engineer | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = (kind: ToastMessage['kind'], text: string) =>
    setToast({ id: Date.now(), kind, text });

  useEffect(() => {
    const channel = supabase
      .channel('engineers-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'engineers' },
        () => router.refresh()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  const toggleTrade = (trade: string) =>
    setTrades((prev) =>
      prev.includes(trade) ? prev.filter((t) => t !== trade) : [...prev, trade]
    );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return initialEngineers.filter((e) => {
      if (tab === 'active' && !e.is_active) return false;
      if (area !== 'any' && e.area !== area) return false;
      if (trades.length > 0) {
        const eTrades = e.trades ?? [];
        if (!trades.every((t) => eTrades.includes(t))) return false;
      }
      if (q) {
        const haystack = [
          e.first_name,
          e.last_name,
          e.display_name ?? '',
          e.email,
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [initialEngineers, search, area, trades, tab]);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 bg-[var(--color-bg-primary)]/80 backdrop-blur-xl border-b border-[var(--color-border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="p-2 rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-colors"
                aria-label="Back to dashboard"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <HardHat className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold">Engineers</h1>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Manage staff across ServiceM8, Samsara and the dashboard
                </p>
              </div>
            </div>
            <button
              onClick={() => setAddOpen(true)}
              className="btn btn-primary"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Engineer
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        {loadError && (
          <div className="card border-red-500/30 bg-red-500/10 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <div className="font-medium text-red-300">
                Couldn’t load engineers
              </div>
              <div className="text-red-400/80">{loadError}</div>
            </div>
          </div>
        )}

        <EngineerFilters
          search={search}
          onSearch={setSearch}
          area={area}
          onArea={setArea}
          trades={trades}
          onTradesToggle={toggleTrade}
          tab={tab}
          onTab={setTab}
        />

        <div className="text-xs text-[var(--color-text-muted)]">
          Showing {filtered.length} of {initialEngineers.length} engineers
        </div>

        <EngineersTable
          engineers={filtered}
          onDeactivate={(e) => setDeactivateTarget(e)}
        />
      </main>

      <AddEngineerModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={(msg) => {
          showToast('success', msg);
          router.refresh();
        }}
      />

      <DeactivateConfirmModal
        engineer={deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        onSuccess={(msg) => {
          showToast('success', msg);
          router.refresh();
        }}
      />

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
