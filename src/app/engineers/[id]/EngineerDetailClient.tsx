'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  MapPin,
  UserX,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { clsx } from 'clsx';
import { supabase } from '@/lib/supabase';
import {
  ENGINEER_AREAS,
  type Engineer,
  type EngineerProvisioningLog,
} from '@/types/engineers';
import DeactivateConfirmModal from '../_components/DeactivateConfirmModal';
import ProvisioningLogTable from '../_components/ProvisioningLogTable';
import Toast, { type ToastMessage } from '../_components/Toast';

interface Props {
  engineer: Engineer;
  logs: EngineerProvisioningLog[];
}

function areaLabel(value: string | null) {
  if (!value) return '—';
  return ENGINEER_AREAS.find((a) => a.value === value)?.label ?? value;
}

export default function EngineerDetailClient({ engineer, logs }: Props) {
  const router = useRouter();
  const [confirmTarget, setConfirmTarget] = useState<Engineer | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  useEffect(() => {
    const channel = supabase
      .channel(`engineer-${engineer.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'engineers',
          filter: `id=eq.${engineer.id}`,
        },
        () => router.refresh()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'engineer_provisioning_log',
          filter: `engineer_id=eq.${engineer.id}`,
        },
        () => router.refresh()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [engineer.id, router]);

  const fullName =
    engineer.display_name?.trim() ||
    `${engineer.first_name} ${engineer.last_name}`.trim();
  const initials =
    `${engineer.first_name?.charAt(0) ?? ''}${engineer.last_name?.charAt(0) ?? ''}`.toUpperCase() ||
    '??';

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 bg-[var(--color-bg-primary)]/80 backdrop-blur-xl border-b border-[var(--color-border)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link
              href="/engineers"
              className="flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">All Engineers</span>
            </Link>
            {engineer.is_active && (
              <button
                onClick={() => setConfirmTarget(engineer)}
                className="btn bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20"
              >
                <UserX className="w-4 h-4 mr-2" />
                Deactivate
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <section className="card">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-xl font-bold text-white flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold">{fullName}</h1>
                <span
                  className={clsx(
                    'badge',
                    engineer.is_active ? 'badge-success' : 'badge-danger'
                  )}
                >
                  {engineer.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-[var(--color-text-secondary)]">
                <a
                  href={`mailto:${engineer.email}`}
                  className="flex items-center gap-1.5 hover:text-[var(--color-text-primary)]"
                >
                  <Mail className="w-4 h-4" />
                  {engineer.email}
                </a>
                <a
                  href={`tel:${engineer.phone}`}
                  className="flex items-center gap-1.5 hover:text-[var(--color-text-primary)]"
                >
                  <Phone className="w-4 h-4" />
                  {engineer.phone}
                </a>
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  {areaLabel(engineer.area)}
                </span>
                {engineer.start_date && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    Started {new Date(engineer.start_date).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-[var(--color-border)]">
            <ProvisionCard
              label="ServiceM8"
              linked={Boolean(engineer.sm8_staff_uuid)}
              detail={engineer.sm8_staff_uuid}
            />
            <ProvisionCard
              label="Samsara"
              linked={Boolean(engineer.samsara_driver_id)}
              detail={engineer.samsara_driver_id}
            />
            <ProvisionCard
              label="Supabase"
              linked
              detail={engineer.id}
            />
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoBlock
            title="Trades"
            items={engineer.trades}
            chipClass="bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)]"
          />
          <InfoBlock
            title="Certifications"
            items={engineer.certifications}
            chipClass="bg-purple-500/15 text-purple-300"
          />
          <InfoBlock
            title="Skills"
            items={engineer.skills}
            chipClass="bg-blue-500/15 text-blue-300"
          />
          <div className="card">
            <h3 className="text-sm font-semibold mb-2">Notes</h3>
            <p className="text-sm text-[var(--color-text-secondary)] whitespace-pre-wrap">
              {engineer.notes?.trim() || '—'}
            </p>
          </div>
        </section>

        <section>
          <h2 className="section-title">Provisioning Log</h2>
          <ProvisioningLogTable logs={logs} />
        </section>
      </main>

      <DeactivateConfirmModal
        engineer={confirmTarget}
        onClose={() => setConfirmTarget(null)}
        onSuccess={(msg) => {
          setToast({ id: Date.now(), kind: 'success', text: msg });
          router.refresh();
        }}
      />

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

function ProvisionCard({
  label,
  linked,
  detail,
}: {
  label: string;
  linked: boolean;
  detail: string | null | undefined;
}) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
          {label}
        </span>
        {linked ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        ) : (
          <XCircle className="w-4 h-4 text-[var(--color-text-muted)]" />
        )}
      </div>
      <div className="text-xs font-mono text-[var(--color-text-muted)] truncate">
        {detail ?? 'not linked'}
      </div>
    </div>
  );
}

function InfoBlock({
  title,
  items,
  chipClass,
}: {
  title: string;
  items: string[] | null | undefined;
  chipClass: string;
}) {
  return (
    <div className="card">
      <h3 className="text-sm font-semibold mb-2">{title}</h3>
      {items && items.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {items.map((it) => (
            <span key={it} className={`badge ${chipClass}`}>
              {it}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-[var(--color-text-muted)]">—</p>
      )}
    </div>
  );
}
