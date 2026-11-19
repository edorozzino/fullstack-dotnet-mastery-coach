import { useApp } from '../AppContext';
import { TRACKS } from '../../data/curriculum';
import { emptyPhaseProgress, phaseContent, phaseStatus, requirements } from '../../domain/gate';
import { trainingPool } from '../../domain/training';
import { isDue } from '../../domain/srs';
import { formatHash } from '../../lib/router';
import type { Phase, PhaseStatus, Track } from '../../domain/types';
import { GateChecklist } from '../components/GateChecklist';
import { Badge, Card, ProgressBar } from '../components/ui';

const STATUS: Record<PhaseStatus, { label: string; tone: 'neutral' | 'ok' | 'accent' }> = {
  locked: { label: '🔒 Bloccata', tone: 'neutral' },
  available: { label: '● Disponibile', tone: 'accent' },
  passed: { label: '✓ Superata', tone: 'ok' },
};

function PhaseCard({ track, phase }: { track: Track; phase: Phase }) {
  const { state } = useApp();
  const status = phaseStatus(track, phase.id, state.phases);
  const progress = state.phases[phase.id] ?? emptyPhaseProgress();
  const reqs = requirements(phase, progress, state.srs);
  const done = reqs.filter((r) => r.done).length;
  const prev = track.phases[phase.order - 1];
  const content = phaseContent(phase, progress.branchId);
  const counts = phase.branches?.length && !progress.branchId
    ? `${phase.branches.length} binari a scelta`
    : `${content.modules.length} moduli · ${content.labs.length} lab · ${content.questions.length} domande`;

  return (
    <li
      data-phase={phase.id}
      data-status={status}
      className={`relative rounded-2xl border p-4 transition ${
        status === 'locked' ? 'border-ink-800 bg-ink-900/40 opacity-70' : 'border-ink-700 bg-ink-900/80 hover:border-[var(--accent)]/60'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-xs text-[var(--accent)]">Fase {phase.id}</p>
          <h3 className="text-base font-bold text-slate-50">{phase.title}</h3>
          <p className="mt-0.5 text-sm text-ink-400">{phase.subtitle}</p>
          <p className="mt-1 font-mono text-[11px] text-ink-500">{counts}</p>
        </div>
        <Badge tone={STATUS[status].tone}>{STATUS[status].label}</Badge>
      </div>

      {status === 'locked' ? (
        <p className="mt-3 text-sm text-ink-400">Supera il Test di Verifica della Fase {prev?.id} per sbloccarla.</p>
      ) : (
        <>
          <div className="mt-3">
            <GateChecklist requirements={reqs} compact />
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="font-mono text-xs text-ink-400">{done}/4 requisiti</span>
            <a
              href={formatHash({ name: 'phase', phaseId: phase.id, tab: 'study' })}
              className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-semibold text-ink-950 hover:brightness-110"
            >
              {status === 'passed' ? 'Ripassa' : 'Apri fase'} →
            </a>
          </div>
        </>
      )}
    </li>
  );
}

function TrackColumn({ track }: { track: Track }) {
  const { state } = useApp();
  const passed = track.phases.filter((p) => state.phases[p.id]?.passed).length;
  return (
    <section data-track-section={track.id} className="grid content-start gap-4">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--accent)]">Traccia {track.id}</p>
        <h2 className="text-xl font-bold text-slate-50">{track.title.replace(/^Traccia [AB] — /, '')}</h2>
        <p className="text-sm text-ink-400">{track.description}</p>
        <div className="mt-3 flex items-center gap-3">
          <ProgressBar value={(passed / track.phases.length) * 100} tone="ok" />
          <span className="shrink-0 font-mono text-xs text-ink-300">
            {passed}/{track.phases.length} fasi
          </span>
        </div>
      </div>
      <ol className="grid gap-3">
        {track.phases.map((p) => (
          <PhaseCard key={p.id} track={track} phase={p} />
        ))}
      </ol>
    </section>
  );
}

export function Dashboard() {
  const { state, today } = useApp();
  const scope = state.activeTrack;
  const tracks = scope === 'MIX' ? TRACKS : TRACKS.filter((t) => t.id === scope);
  const pool = trainingPool(TRACKS, state, scope);
  const now = today();
  const due = pool.filter((q) => state.srs[q.id] && state.srs[q.id].attempts > 0 && isDue(state.srs[q.id], now)).length;
  const fresh = pool.filter((q) => !state.srs[q.id]).length;

  return (
    <div className="grid gap-8">
      <Card className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-[var(--accent)]/10 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--accent)]">Il Coach dice</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-50 sm:text-3xl">
              {state.streak.current > 0 ? `Giorno ${state.streak.current} di fila. Non mollare adesso.` : 'Oggi si comincia. Niente scorciatoie.'}
            </h1>
            <p className="mt-1 text-sm text-ink-300">
              Studio → IDE Code Labs → Quiz (≥70%) → Gate Exam (≥80%, max 1 errore per modulo). Nessuna fase si sblocca senza.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-mono text-3xl font-bold text-slate-50">{due}</p>
              <p className="text-xs text-ink-400">ripassi dovuti oggi</p>
              <p className="font-mono text-[11px] text-ink-500">{fresh} domande nuove disponibili</p>
            </div>
            <a
              href={formatHash({ name: 'training' })}
              className="rounded-xl bg-[var(--accent)] px-5 py-3 font-semibold text-ink-950 shadow-lg shadow-black/30 hover:brightness-110"
            >
              {scope === 'MIX' ? 'Allenamento Misto' : 'Allenamento giornaliero'} →
            </a>
          </div>
        </div>
      </Card>

      <div className={`grid gap-8 ${tracks.length > 1 ? 'lg:grid-cols-2' : ''}`}>
        {tracks.map((t) => (
          <div key={t.id} data-track={t.id} className="track-scope">
            <TrackColumn track={t} />
          </div>
        ))}
      </div>
    </div>
  );
}
