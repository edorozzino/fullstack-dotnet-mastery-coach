import type { Requirement } from '../../domain/types';
import { ProgressBar } from './ui';

const ICON: Record<Requirement['key'], string> = { cards: '📘', labs: '⌨️', mastery: '🎯', exam: '🛡️' };

export function GateChecklist({ requirements, compact }: { requirements: Requirement[]; compact?: boolean }) {
  return (
    <ul className={`grid gap-2 ${compact ? '' : 'sm:grid-cols-2'}`}>
      {requirements.map((r) => {
        const pct = r.key === 'mastery' || r.key === 'exam' ? Math.min(100, (r.current / 100) * 100) : r.target ? (r.current / r.target) * 100 : 0;
        return (
          <li
            key={r.key}
            data-done={String(r.done)}
            className={`rounded-xl border px-3 py-2.5 ${r.done ? 'border-ok/40 bg-ok/5' : 'border-ink-700 bg-ink-900'}`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-sm font-medium text-slate-100">
                <span aria-hidden>{ICON[r.key]}</span>
                {r.label}
              </span>
              <span className={`font-mono text-xs ${r.done ? 'text-ok' : 'text-ink-400'}`}>{r.done ? '✓ fatto' : 'da completare'}</span>
            </div>
            {!compact && <p className="mt-1 text-xs text-ink-400">{r.detail}</p>}
            <ProgressBar value={pct} tone={r.done ? 'ok' : 'accent'} className="mt-2" />
          </li>
        );
      })}
    </ul>
  );
}
