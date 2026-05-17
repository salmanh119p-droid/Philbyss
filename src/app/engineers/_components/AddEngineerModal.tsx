'use client';

import { useEffect, useState } from 'react';
import { X, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  ENGINEER_AREAS,
  TRADE_OPTIONS,
  CERTIFICATION_OPTIONS,
  type EngineerArea,
} from '@/types/engineers';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

interface FormState {
  first_name: string;
  last_name: string;
  display_name: string;
  email: string;
  phone: string;
  start_date: string;
  area: EngineerArea;
  trades: string[];
  skills: string;
  certifications: string[];
  notes: string;
  create_samsara_driver: boolean;
  send_welcome_email: boolean;
}

const today = () => new Date().toISOString().slice(0, 10);

const emptyForm: FormState = {
  first_name: '',
  last_name: '',
  display_name: '',
  email: '',
  phone: '',
  start_date: today(),
  area: 'east',
  trades: [],
  skills: '',
  certifications: [],
  notes: '',
  create_samsara_driver: true,
  send_welcome_email: true,
};

const UK_PHONE_RE = /^(?:\+44\s?7\d{3}|07\d{3})\s?\d{3}\s?\d{3}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AddEngineerModal({ open, onClose, onSuccess }: Props) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(emptyForm);
      setErrors({});
      setServerError(null);
    }
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open && !submitting) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, submitting, onClose]);

  if (!open) return null;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const toggle = (key: 'trades' | 'certifications', value: string) =>
    setForm((f) => ({
      ...f,
      [key]: f[key].includes(value)
        ? f[key].filter((v) => v !== value)
        : [...f[key], value],
    }));

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!form.first_name.trim()) next.first_name = 'Required';
    if (!form.last_name.trim()) next.last_name = 'Required';
    if (!form.email.trim()) next.email = 'Required';
    else if (!EMAIL_RE.test(form.email.trim())) next.email = 'Invalid email';
    if (!form.phone.trim()) next.phone = 'Required';
    else if (!UK_PHONE_RE.test(form.phone.replace(/\s/g, '')))
      next.phone = 'Use 07xxx or +44…';
    if (!form.area) next.area = 'Required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        display_name: form.display_name.trim() || form.first_name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        start_date: form.start_date || today(),
        area: form.area,
        trades: form.trades,
        skills: form.skills
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        certifications: form.certifications,
        notes: form.notes.trim(),
        create_samsara_driver: form.create_samsara_driver,
        send_welcome_email: form.send_welcome_email,
      };

      const res = await fetch('/api/engineers/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await res.json();

      if (!res.ok || result.success === false) {
        setServerError(result.error || 'Failed to add engineer');
        return;
      }

      const sm8 = result.sm8_status ?? 'created';
      const sams = result.samsara_status ?? (form.create_samsara_driver ? 'created' : 'skipped');
      onSuccess(`${payload.first_name} added — SM8: ${sm8}, Samsara: ${sams}`);
      onClose();
    } catch (err) {
      setServerError('Network error — try again');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="card w-full max-w-2xl my-8 p-0 overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)]">
          <div>
            <h2 className="text-lg font-semibold">Add Engineer</h2>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              Creating ServiceM8 staff record and Samsara driver. This may take a few seconds.
            </p>
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

        <form onSubmit={onSubmit} className="p-5 space-y-4">
          {serverError && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </div>
          )}

          <fieldset disabled={submitting} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="First name" error={errors.first_name} required>
                <input
                  className="input"
                  value={form.first_name}
                  onChange={(e) => set('first_name', e.target.value)}
                />
              </Field>
              <Field label="Last name" error={errors.last_name} required>
                <input
                  className="input"
                  value={form.last_name}
                  onChange={(e) => set('last_name', e.target.value)}
                />
              </Field>
              <Field label="Display name" hint="Defaults to first name if blank">
                <input
                  className="input"
                  value={form.display_name}
                  onChange={(e) => set('display_name', e.target.value)}
                />
              </Field>
              <Field label="Start date">
                <input
                  type="date"
                  className="input"
                  value={form.start_date}
                  onChange={(e) => set('start_date', e.target.value)}
                />
              </Field>
              <Field label="Email" error={errors.email} required>
                <input
                  type="email"
                  className="input"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                />
              </Field>
              <Field label="Phone" error={errors.phone} hint="07xxx or +44…" required>
                <input
                  type="tel"
                  className="input"
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  placeholder="07123 456 789"
                />
              </Field>
              <Field label="Area" error={errors.area} required>
                <select
                  className="input"
                  value={form.area}
                  onChange={(e) => set('area', e.target.value as EngineerArea)}
                >
                  {ENGINEER_AREAS.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Skills" hint="Comma-separated tags">
                <input
                  className="input"
                  value={form.skills}
                  onChange={(e) => set('skills', e.target.value)}
                  placeholder="boiler installs, fault diagnosis"
                />
              </Field>
            </div>

            <Field label="Trades">
              <ChipGroup
                options={TRADE_OPTIONS}
                selected={form.trades}
                onToggle={(v) => toggle('trades', v)}
              />
            </Field>

            <Field label="Certifications">
              <ChipGroup
                options={CERTIFICATION_OPTIONS}
                selected={form.certifications}
                onToggle={(v) => toggle('certifications', v)}
              />
            </Field>

            <Field label="Notes">
              <textarea
                className="input min-h-[80px]"
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
              />
            </Field>

            <div className="space-y-2 pt-2 border-t border-[var(--color-border)]">
              <Checkbox
                label="Create Samsara driver"
                hint="Uncheck for office staff/apprentices who don't drive"
                checked={form.create_samsara_driver}
                onChange={(v) => set('create_samsara_driver', v)}
              />
              <Checkbox
                label="Send welcome email"
                checked={form.send_welcome_email}
                onChange={(v) => set('send_welcome_email', v)}
              />
            </div>
          </fieldset>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-[var(--color-border)]">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn btn-primary">
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Provisioning…
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Add Engineer
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  hint,
  error,
  required,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  error?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-red-400 mt-1">{error}</p>
      ) : hint ? (
        <p className="text-xs text-[var(--color-text-muted)] mt-1">{hint}</p>
      ) : null}
    </div>
  );
}

function ChipGroup({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            className={
              'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ' +
              (active
                ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:border-[var(--color-border-light)]')
            }
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function Checkbox({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
      />
      <div>
        <div className="text-sm text-[var(--color-text-primary)]">{label}</div>
        {hint && <div className="text-xs text-[var(--color-text-muted)]">{hint}</div>}
      </div>
    </label>
  );
}
