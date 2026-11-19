import { useApp } from '../AppContext';
import { levelFor } from '../../domain/progress';
import { formatHash, type Route } from '../../lib/router';
import type { TrackId } from '../../domain/types';
import { ProgressBar } from './ui';

const SCOPES: { id: TrackId | 'MIX'; label: string; short: string; sub: string }[] = [
  { id: 'A', label: '.NET & Cloud', short: '.NET & Cloud', sub: 'Traccia A' },
  { id: 'B', label: 'Frontend', short: 'Frontend', sub: 'Traccia B' },
  { id: 'MIX', label: 'Misto Full-Stack', short: 'Misto A+B', sub: 'A + B' },
];

const NAV: { route: Route; label: string; short: string; icon: string }[] = [
  { route: { name: 'dashboard' }, label: 'Dashboard', short: 'Home', icon: '◧' },
  { route: { name: 'training' }, label: 'Allenamento', short: 'Allena', icon: '↻' },
  { route: { name: 'compare' }, label: 'React vs Angular vs Vue', short: 'Confronto', icon: '⇄' },
  { route: { name: 'ai' }, label: 'AI Coach', short: 'AI', icon: '✦' },
  { route: { name: 'settings' }, label: 'Impostazioni', short: 'Impost.', icon: '⚙' },
];

const isActive = (n: Route, route: Route) => n.name === route.name || (route.name === 'phase' && n.name === 'dashboard');

export function Header({ route }: { route: Route }) {
  const { state, dispatch } = useApp();
  const level = levelFor(state.xp);

  return (
    <>
    <header className="z-20 border-b border-ink-800 bg-ink-950/85 backdrop-blur sm:sticky sm:top-0">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 max-sm:gap-y-2 max-sm:py-2.5">
        <a href={formatHash({ name: 'dashboard' })} className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center sm:h-9 sm:w-9 rounded-lg bg-[var(--accent)] font-mono text-sm font-black text-ink-950">{'</>'}</span>
          <span className="leading-tight">
            <span className="block text-sm font-bold text-slate-50">FullStack &amp; .NET</span>
            <span className="hidden font-mono text-[11px] uppercase tracking-widest text-ink-400 sm:block">Mastery Coach</span>
          </span>
        </a>

        <div role="tablist" aria-label="Traccia attiva" className="order-last flex w-full rounded-xl border border-ink-700 bg-ink-900 p-1 sm:order-none sm:w-auto">
          {SCOPES.map((s) => {
            const active = state.activeTrack === s.id;
            return (
              <button
                key={s.id}
                role="tab"
                aria-selected={active}
                onClick={() => dispatch({ type: 'SET_TRACK', track: s.id })}
                className={`flex-1 rounded-lg px-3 py-1.5 text-left transition max-sm:min-h-11 max-sm:px-2 max-sm:text-center sm:flex-none ${active ? 'bg-ink-700 text-slate-50' : 'text-ink-400 hover:text-slate-200'}`}
              >
                <span className="block text-[13px] font-semibold"><span className="sm:hidden">{s.short}</span><span className="hidden sm:inline">{s.label}</span></span>
                <span className="hidden font-mono text-[10px] uppercase tracking-wider opacity-70 sm:block">{s.sub}</span>
              </button>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-3 sm:gap-4">
          <div className="text-center" title={`Record: ${state.streak.best} giorni`}>
            <p className="font-mono text-lg font-bold text-warn">🔥 {state.streak.current}</p>
            <p className="hidden text-[10px] uppercase tracking-wider text-ink-400 sm:block">streak</p>
          </div>
          <div className="w-28 sm:w-auto sm:min-w-44">
            <div className="flex items-baseline justify-between gap-3">
              <p className="truncate text-[13px] font-semibold text-slate-100">{level.title}</p>
              <p className="font-mono text-xs text-[var(--accent)]">{state.xp} XP</p>
            </div>
            <ProgressBar value={level.progress * 100} className="mt-1" />
            <p className="mt-0.5 hidden font-mono text-[10px] text-ink-400 sm:block">
              {level.nextXp ? `prossimo livello a ${level.nextXp} XP` : 'livello massimo raggiunto'}
            </p>
          </div>
        </div>
      </div>

      <nav className="mx-auto hidden max-w-7xl gap-1 overflow-x-auto px-4 pb-2 sm:flex" aria-label="Sezioni">
        {NAV.map((n) => {
          const active = isActive(n.route, route);
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

    {/* Tab bar in basso per smartphone */}
    <nav
      data-mobile-nav
      aria-label="Sezioni"
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-ink-700 bg-ink-950/95 backdrop-blur sm:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {NAV.map((n) => {
        const active = isActive(n.route, route);
        return (
          <a
            key={n.short}
            href={formatHash(n.route)}
            aria-current={active ? 'page' : undefined}
            className={`grid min-h-14 place-items-center content-center gap-0.5 text-[11px] ${active ? 'text-[var(--accent)]' : 'text-ink-400'}`}
          >
            <span aria-hidden className="font-mono text-lg leading-none">{n.icon}</span>
            {n.short}
          </a>
        );
      })}
    </nav>
    </>
  );
}
