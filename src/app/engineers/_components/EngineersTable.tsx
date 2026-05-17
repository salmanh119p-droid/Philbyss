'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Check,
  X,
  MoreHorizontal,
  Eye,
  UserX,
  Phone,
  Mail,
} from 'lucide-react';
import { clsx } from 'clsx';
import { ENGINEER_AREAS, type Engineer } from '@/types/engineers';

interface Props {
  engineers: Engineer[];
  onDeactivate: (engineer: Engineer) => void;
}

function initials(e: Engineer) {
  const f = (e.first_name || '').trim();
  const l = (e.last_name || '').trim();
  return `${f.charAt(0)}${l.charAt(0)}`.toUpperCase() || '??';
}

function areaLabel(value: string | null) {
  if (!value) return '—';
  return ENGINEER_AREAS.find((a) => a.value === value)?.label ?? value;
}

export default function EngineersTable({ engineers, onDeactivate }: Props) {
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  if (engineers.length === 0) {
    return (
      <div className="card text-center py-16">
        <p className="text-[var(--color-text-secondary)]">
          No engineers match your filters.
        </p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)]">
            <tr>
              <th className="table-header table-cell">Name</th>
              <th className="table-header table-cell">Area</th>
              <th className="table-header table-cell">Trades</th>
              <th className="table-header table-cell">Certifications</th>
              <th className="table-header table-cell">Phone</th>
              <th className="table-header table-cell text-center">SM8</th>
              <th className="table-header table-cell text-center">Samsara</th>
              <th className="table-header table-cell">Status</th>
              <th className="table-header table-cell text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {engineers.map((e) => {
              const fullName =
                e.display_name?.trim() ||
                `${e.first_name} ${e.last_name}`.trim();
              return (
                <tr key={e.id} className="hover:bg-[var(--color-bg-hover)]/40">
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-xs font-semibold text-white">
                        {initials(e)}
                      </div>
                      <div>
                        <div className="font-medium text-[var(--color-text-primary)]">
                          {fullName}
                        </div>
                        <div className="text-xs text-[var(--color-text-muted)] flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {e.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell text-[var(--color-text-secondary)]">
                    {areaLabel(e.area)}
                  </td>
                  <td className="table-cell">
                    <div className="flex flex-wrap gap-1">
                      {(e.trades ?? []).slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className="badge bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)]"
                        >
                          {t}
                        </span>
                      ))}
                      {(e.trades?.length ?? 0) > 3 && (
                        <span className="text-xs text-[var(--color-text-muted)]">
                          +{(e.trades?.length ?? 0) - 3}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="table-cell">
                    <div className="flex flex-wrap gap-1">
                      {(e.certifications ?? []).slice(0, 3).map((c) => (
                        <span
                          key={c}
                          className="badge bg-purple-500/15 text-purple-300"
                        >
                          {c}
                        </span>
                      ))}
                      {(e.certifications?.length ?? 0) > 3 && (
                        <span className="text-xs text-[var(--color-text-muted)]">
                          +{(e.certifications?.length ?? 0) - 3}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="table-cell text-[var(--color-text-secondary)]">
                    <a
                      href={`tel:${e.phone}`}
                      className="flex items-center gap-1.5 hover:text-[var(--color-text-primary)]"
                    >
                      <Phone className="w-3 h-3" />
                      {e.phone}
                    </a>
                  </td>
                  <td className="table-cell text-center">
                    {e.sm8_staff_uuid ? (
                      <Check className="w-4 h-4 text-emerald-400 mx-auto" />
                    ) : (
                      <X className="w-4 h-4 text-[var(--color-text-muted)] mx-auto" />
                    )}
                  </td>
                  <td className="table-cell text-center">
                    {e.samsara_driver_id ? (
                      <Check className="w-4 h-4 text-emerald-400 mx-auto" />
                    ) : (
                      <X className="w-4 h-4 text-[var(--color-text-muted)] mx-auto" />
                    )}
                  </td>
                  <td className="table-cell">
                    <span
                      className={clsx(
                        'badge',
                        e.is_active ? 'badge-success' : 'badge-danger'
                      )}
                    >
                      {e.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="table-cell text-right relative">
                    <button
                      onClick={() =>
                        setMenuOpen(menuOpen === e.id ? null : e.id)
                      }
                      className="p-1.5 rounded-md hover:bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)]"
                      aria-label="Row actions"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                    {menuOpen === e.id && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setMenuOpen(null)}
                        />
                        <div className="absolute right-2 top-full mt-1 z-20 w-44 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-xl py-1">
                          <Link
                            href={`/engineers/${e.id}`}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]"
                            onClick={() => setMenuOpen(null)}
                          >
                            <Eye className="w-4 h-4" />
                            View details
                          </Link>
                          {e.is_active && (
                            <button
                              onClick={() => {
                                setMenuOpen(null);
                                onDeactivate(e);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-[var(--color-bg-hover)]"
                            >
                              <UserX className="w-4 h-4" />
                              Deactivate
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
