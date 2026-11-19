import type { ButtonHTMLAttributes, ReactNode } from 'react';

export function ProgressBar({ value, tone = 'accent', className = '' }: { value: number; tone?: 'accent' | 'ok' | 'warn'; className?: string }) {
  const v = Math.max(0, Math.min(100, value));
  const color = tone === 'ok' ? 'bg-ok' : tone === 'warn' ? 'bg-warn' : 'bg-[var(--accent)]';
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-ink-800 ${className}`} role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${v}%` }} />
    </div>
  );
}

type Variant = 'primary' | 'ghost' | 'danger' | 'outline';
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-[var(--accent)] text-ink-950 hover:brightness-110 font-semibold',
  outline: 'border border-ink-600 text-slate-200 hover:border-[var(--accent)] hover:text-[var(--accent)]',
  ghost: 'text-ink-300 hover:bg-ink-800 hover:text-slate-100',
  danger: 'border border-bad/60 text-bad hover:bg-bad/10',
};

export function Button({ variant = 'primary', className = '', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      {...rest}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${VARIANTS[variant]} ${className}`}
    />
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-ink-700 bg-ink-900/70 p-5 ${className}`}>{children}</div>;
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'ok' | 'warn' | 'bad' | 'accent' }) {
  const t = {
    neutral: 'border-ink-600 text-ink-300',
    ok: 'border-ok/50 text-ok',
    warn: 'border-warn/50 text-warn',
    bad: 'border-bad/50 text-bad',
    accent: 'border-[var(--accent)]/60 text-[var(--accent)]',
  }[tone];
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[11px] ${t}`}>{children}</span>;
}

export function SectionTitle({ kicker, title, children }: { kicker?: string; title: string; children?: ReactNode }) {
  return (
    <div className="mb-4">
      {kicker && <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--accent)]">{kicker}</p>}
      <h2 className="text-xl font-bold text-slate-50 sm:text-2xl">{title}</h2>
      {children && <p className="mt-1 max-w-3xl text-sm text-ink-300">{children}</p>}
    </div>
  );
}

export function EmptyState({ icon, title, children }: { icon: string; title: string; children?: ReactNode }) {
  return (
    <div className="grid place-items-center gap-2 rounded-2xl border border-dashed border-ink-700 p-10 text-center">
      <span className="text-3xl" aria-hidden>{icon}</span>
      <p className="font-semibold text-slate-100">{title}</p>
      {children && <div className="max-w-md text-sm text-ink-400">{children}</div>}
    </div>
  );
}
