'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import type {
  EngineerProvisioningLog,
  ProvisioningStatus,
} from '@/types/engineers';

interface Props {
  logs: EngineerProvisioningLog[];
}

function statusStyle(s: ProvisioningStatus | null | undefined) {
  switch (s) {
    case 'success':
      return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    case 'failed':
      return 'bg-red-500/15 text-red-300 border-red-500/30';
    case 'skipped':
      return 'bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)] border-[var(--color-border)]';
    case 'pending':
      return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
    default:
      return 'bg-[var(--color-bg-hover)] text-[var(--color-text-muted)] border-[var(--color-border)]';
  }
}

function StatusPill({
  label,
  status,
}: {
  label: string;
  status: ProvisioningStatus | null | undefined;
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border',
        statusStyle(status)
      )}
    >
      <span className="font-semibold">{label}</span>
      <span>·</span>
      <span>{status ?? 'n/a'}</span>
    </span>
  );
}

export default function ProvisioningLogTable({ logs }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (logs.length === 0) {
    return (
      <div className="card text-center py-10">
        <p className="text-sm text-[var(--color-text-secondary)]">
          No provisioning events yet.
        </p>
      </div>
    );
  }

  return (
    <div className="card p-0 overflow-hidden">
      <div className="divide-y divide-[var(--color-border)]">
        {logs.map((log) => {
          const isOpen = expanded === log.id;
          return (
            <div key={log.id}>
              <button
                type="button"
                onClick={() => setExpanded(isOpen ? null : log.id)}
                className="w-full flex items-start gap-3 p-4 text-left hover:bg-[var(--color-bg-hover)]/40 transition-colors"
              >
                <div className="mt-1">
                  {isOpen ? (
                    <ChevronDown className="w-4 h-4 text-[var(--color-text-muted)]" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium capitalize">
                      {log.action}
                    </span>
                    <span className="text-xs text-[var(--color-text-muted)]">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <StatusPill label="SM8" status={log.sm8_status} />
                    <StatusPill label="Samsara" status={log.samsara_status} />
                    <StatusPill label="Supabase" status={log.supabase_status} />
                  </div>
                  {log.error_message && !isOpen && (
                    <div className="mt-2 text-xs text-red-400 truncate">
                      {log.error_message}
                    </div>
                  )}
                </div>
              </button>
              {isOpen && (
                <div className="px-4 pb-4 pl-11 space-y-3">
                  {log.error_message && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-xs whitespace-pre-wrap">
                      {log.error_message}
                    </div>
                  )}
                  <div>
                    <div className="text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">
                      Payload
                    </div>
                    <pre className="text-xs bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg p-3 overflow-x-auto font-mono text-[var(--color-text-secondary)]">
{JSON.stringify(log.payload ?? {}, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
