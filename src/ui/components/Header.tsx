import { useApp } from '../AppContext';
import { levelFor } from '../../domain/progress';
import { formatHash, type Route } from '../../lib/router';
import type { TrackId } from '../../domain/types';
import { ProgressBar } from './ui';

const SCOPES: { id: TrackId | 'MIX'; label: string; sub: string }[] = [
  { id: 'A', label: '.NET & Cloud', sub: 'Traccia A' },
  { id: 'B', label: 'Frontend', sub: 'Traccia B' },
  { id: 'MIX', label: 'Misto Full-Stack', sub: 'A + B' },
];

const NAV: { route: Route; label: string; icon: string }[] = [
  { route: { name: 'dashboard' }, label: 'Dashboard', icon: '◧' },
  { route: { name: 'training' }, label: 'Allenamento', icon: '↻' },
  { route: { name: 'compare' }, label: 'React vs Angular vs Vue', icon: '⇄' },
  { route: { name: 'ai' }, label: 'AI Coach', icon: '✦' },
  { route: { name: 'settings' }, label: 'Impostazioni', icon: '⚙' },
];

export function Header({ route }: { route: Route }) {
  const { state, dispatch } = useApp();
  const level = levelFor(state.xp);

  return (
    <header className="sticky top-0 z-20 border-b border-ink-800 bg-ink-950/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
        <a href={formatHash({ name: 'dashboard' })} className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--accent)] font-mono text-sm font-black text-ink-950">{'</>'}</span>
          <span className="leading-tight">
            <span className="block text-sm font-bold text-slate-50">FullStack &amp; .NET</span>
            <span className="block font-mono text-[11px] uppercase tracking-widest text-ink-400">Mastery Coach</span>
          </span>
        </a>

        <div role="tablist" aria-label="Traccia attiva" className="flex rounded-xl border border-ink-700 bg-ink-900 p-1">
          {SCOPES.map((s) => {
            const active = state.activeTrack === s.id;
            return (
              <button
                key={s.id}
                role="tab"
                aria-selected={active}
                onClick={() => dispatch({ type: 'SET_TRACK', track: s.id })}
                className={`rounded-lg px-3 py-1.5 text-left transition ${active ? 'bg-ink-700 text-slate-50' : 'text-ink-400 hover:text-slate-200'}`}
              >
                <span className="block text-[13px] font-semibold">{s.label}</span>
                <span className="block font-mono text-[10px] uppercase tracking-wider opacity-70">{s.sub}</span>
              </button>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-4">
          <div className="text-center" title={`Record: ${state.streak.best} giorni`}>
            <p className="font-mono text-lg font-bold text-warn">🔥 {state.streak.current}</p>
            <p className="text-[10px] uppercase tracking-wider text-ink-400">streak</p>
          </div>
          <div className="min-w-44">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[13px] font-semibold text-slate-100">{level.title}</p>
              <p className="font-mono text-xs text-[var(--accent)]">{state.xp} XP</p>
            </div>
            <ProgressBar value={level.progress * 100} className="mt-1" />
            <p className="mt-0.5 font-mono text-[10px] text-ink-400">
              {level.nextXp ? `prossimo livello a ${level.nextXp} XP` : 'livello massimo raggiunto'}
            </p>
          </div>
        </div>
      </div>

      <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-2" aria-label="Sezioni">
        {NAV.map((n) => {
          const active = n.route.name === route.name || (route.name === 'phase' && n.route.name === 'dashboard');
          return (
            <a
              key={n.label}
              href={formatHash(n.route)}
              aria-current={active ? 'page' : undefined}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition ${
                active ? 'bg-ink-800 text-[var(--accent)]' : 'text-ink-300 hover:bg-ink-900 hover:text-slate-100'
              }`}
            >
              <span aria-hidden className="mr-1.5 font-mono">{n.icon}</span>
              {n.label}
            </a>
          );
        })}
      </nav>
    </header>
  );
}
