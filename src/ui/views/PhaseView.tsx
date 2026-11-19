import { useMemo, useState } from 'react';
import type { Phase, PhaseProgress, Track } from '../../domain/types';
import { emptyPhaseProgress, masteryPercent, phaseContent, phaseStatus, requirements, MASTERY_PERCENT } from '../../domain/gate';
import { shuffle } from '../../domain/random';
import { getPhase, getTrack, moduleTitle, findQuestion } from '../../data/curriculum';
import { formatHash, type PhaseTab } from '../../lib/router';
import { useApp } from '../AppContext';
import { ConceptCardView } from '../components/ConceptCardView';
import { FlashReview } from '../components/FlashReview';
import { GateChecklist } from '../components/GateChecklist';
import { LabView } from '../components/LabView';
import { QuizRunner } from '../components/QuizRunner';
import { Badge, Button, Card, EmptyState, ProgressBar } from '../components/ui';
import { ComparisonTable } from './CompareView';
import { ExamTab } from './ExamTab';

const TABS: { id: PhaseTab; label: string; short: string }[] = [
  { id: 'study', label: '📘 Studio & Ripasso', short: '📘 Studio' },
  { id: 'labs', label: '⌨️ IDE Code Labs', short: '⌨️ Lab' },
  { id: 'quiz', label: '🎯 Quiz', short: '🎯 Quiz' },
  { id: 'exam', label: '🛡️ Gate Exam', short: '🛡️ Esame' },
];

// ─── Studio ──────────────────────────────────────────────────────────────────
function StudyTab({ phase, progress }: { phase: Phase; progress: PhaseProgress }) {
  const { dispatch, today } = useApp();
  const [mode, setMode] = useState<'cards' | 'flash'>('cards');
  const { cards } = phaseContent(phase, progress.branchId);
  const pending = new Set(progress.recovery?.pendingCards ?? []);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant={mode === 'cards' ? 'primary' : 'outline'} onClick={() => setMode('cards')}>Schede Concept</Button>
        <Button variant={mode === 'flash' ? 'primary' : 'outline'} onClick={() => setMode('flash')}>⚡ Ripasso Flash<span className="hidden sm:inline"> (Active Recall)</span></Button>
        <span className="w-full font-mono text-xs text-ink-400 sm:ml-auto sm:w-auto">
          {cards.filter((c) => progress.studiedCards.includes(c.id)).length}/{cards.length} schede ripassate
        </span>
      </div>
      {mode === 'flash' ? (
        <FlashReview cards={cards} moduleLabel={moduleTitle} />
      ) : (
        <div className="grid gap-5">
          {phase.id === 'B4' && (
            <Card>
              <p className="mb-3 font-semibold text-slate-50">Tabella Comparativa Interattiva — ripasso pre-colloquio</p>
              <ComparisonTable />
            </Card>
          )}
          {cards.map((c) => (
            <ConceptCardView
              key={c.id}
              card={c}
              moduleLabel={moduleTitle(c.moduleId)}
              studied={progress.studiedCards.includes(c.id)}
              inRecovery={pending.has(c.id)}
              onCheck={(correct) => dispatch({ type: 'STUDY_CARD', phaseId: phase.id, cardId: c.id, correct, today: today() })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Labs ────────────────────────────────────────────────────────────────────
function LabsTab({ phase, progress }: { phase: Phase; progress: PhaseProgress }) {
  const { dispatch, today } = useApp();
  const { labs } = phaseContent(phase, progress.branchId);
  const firstOpen = labs.find((l) => !progress.completedLabs.includes(l.id)) ?? labs[0];
  const [selected, setSelected] = useState(firstOpen?.id);
  const lab = labs.find((l) => l.id === selected) ?? firstOpen;
  if (!lab) return <EmptyState icon="⌨️" title="Nessun lab in questa fase" />;

  return (
    <div className="grid gap-4">
      <div className="grid gap-2 sm:grid-cols-3">
        {labs.map((l, i) => {
          const done = progress.completedLabs.includes(l.id);
          return (
            <button
              key={l.id}
              onClick={() => setSelected(l.id)}
              className={`rounded-xl border p-3 text-left transition ${
                l.id === lab.id ? 'border-[var(--accent)] bg-ink-850' : 'border-ink-700 bg-ink-900 hover:border-ink-500'
              }`}
            >
              <span className="flex items-center justify-between font-mono text-xs text-ink-400">
                Lab {i + 1} {done ? <span className="text-ok">✓</span> : <span>○</span>}
              </span>
              <span className="mt-1 block text-sm font-semibold text-slate-100">{l.title}</span>
              <span className="mt-0.5 block font-mono text-[11px] text-ink-500">{moduleTitle(l.moduleId)}</span>
            </button>
          );
        })}
      </div>
      <LabView
        key={lab.id}
        lab={lab}
        completed={progress.completedLabs.includes(lab.id)}
        hintsUsed={progress.labHintsUsed[lab.id] ?? 0}
        onHint={() => dispatch({ type: 'LAB_HINT', phaseId: phase.id, labId: lab.id })}
        onAnswer={(correct) => dispatch({ type: 'LAB_ANSWER', phaseId: phase.id, labId: lab.id, correct, today: today() })}
      />
    </div>
  );
}

// ─── Quiz & Recupero ─────────────────────────────────────────────────────────
function QuizTab({ phase, progress }: { phase: Phase; progress: PhaseProgress }) {
  const { state, dispatch, today } = useApp();
  const [round, setRound] = useState(0);
  const content = phaseContent(phase, progress.branchId);
  const training = content.questions.filter((q) => q.pool === 'training');
  const mastery = masteryPercent(phase, state.srs, progress.branchId);

  // Coda: prima le non padroneggiate, poi le altre (stabile per round)
  const queue = useMemo(() => {
    const notYet = training.filter((q) => !state.srs[q.id]?.lastCorrect);
    const ok = training.filter((q) => state.srs[q.id]?.lastCorrect);
    return [...shuffle(notYet), ...shuffle(ok)];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, phase.id, progress.branchId]);

  const recoveryQs = useMemo(
    () => (progress.recovery?.pendingQuestions ?? []).map((id) => findQuestion(id)).filter((q) => q !== undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [round, progress.recovery?.modules.join()],
  );

  return (
    <div className="grid gap-5">
      {progress.recovery && (
        <Card className="grid gap-3 border-warn/50">
          <div>
            <p className="font-bold text-warn">⚠ Sessione di Recupero Obbligatoria</p>
            <p className="text-sm text-ink-300">
              Moduli: {progress.recovery.modules.map(moduleTitle).join(', ')}. Rispondi correttamente a tutte le domande e ripassa le schede segnate in arancione.
            </p>
            <p className="font-mono text-xs text-ink-400">
              {progress.recovery.pendingQuestions.length} domande · {progress.recovery.pendingCards.length} schede ancora da smaltire
            </p>
          </div>
          <QuizRunner
            key={`rec-${round}`}
            questions={recoveryQs}
            onAnswer={(q, correct) => dispatch({ type: 'QUIZ_ANSWER', questionId: q.id, correct, today: today(), phaseId: phase.id })}
            onRestart={() => setRound((r) => r + 1)}
            emptyTitle="Domande di recupero smaltite"
            emptyText="Completa anche le schede in recupero nel tab Studio."
          />
        </Card>
      )}

      <Card className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-slate-50">Padronanza quiz della fase</p>
            <p className="text-xs text-ink-400">Domande di allenamento con ultima risposta corretta. Serve almeno il {MASTERY_PERCENT}%.</p>
          </div>
          <span className={`font-mono text-2xl font-bold ${mastery >= MASTERY_PERCENT ? 'text-ok' : 'text-warn'}`}>{mastery}%</span>
        </div>
        <ProgressBar value={mastery} tone={mastery >= MASTERY_PERCENT ? 'ok' : 'warn'} />
        <ul className="grid gap-1 sm:grid-cols-2">
          {content.modules.map((m) => {
            const qs = training.filter((q) => q.moduleId === m.id);
            const ok = qs.filter((q) => state.srs[q.id]?.lastCorrect).length;
            return (
              <li key={m.id} className="flex justify-between gap-2 text-sm">
                <span className="text-ink-300">{m.code} {m.title}</span>
                <span className="font-mono text-ink-400">{ok}/{qs.length}</span>
              </li>
            );
          })}
        </ul>
      </Card>

      <QuizRunner
        key={`quiz-${round}`}
        questions={queue}
        onAnswer={(q, correct) => dispatch({ type: 'QUIZ_ANSWER', questionId: q.id, correct, today: today(), phaseId: phase.id })}
        onRestart={() => setRound((r) => r + 1)}
      />
    </div>
  );
}

// ─── Binario ─────────────────────────────────────────────────────────────────
function BranchPicker({ phase }: { phase: Phase }) {
  const { dispatch } = useApp();
  return (
    <Card className="grid gap-4">
      <div>
        <p className="text-lg font-bold text-slate-50">Scegli il tuo binario di specializzazione</p>
        <p className="text-sm text-ink-400">La scelta è vincolante: schede, lab, quiz ed esame saranno quelli del binario scelto.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {phase.branches!.map((b) => (
          <button
            key={b.id}
            onClick={() => dispatch({ type: 'SELECT_BRANCH', phaseId: phase.id, branchId: b.id })}
            className="rounded-xl border border-ink-700 bg-ink-900 p-4 text-left transition hover:border-[var(--accent)]"
          >
            <span className="block font-semibold text-slate-50">{b.title}</span>
            <span className="mt-1 block text-sm text-ink-400">{b.description}</span>
            <span className="mt-3 block font-mono text-xs text-[var(--accent)]">Scegli →</span>
          </button>
        ))}
      </div>
    </Card>
  );
}

// ─── Vista fase ──────────────────────────────────────────────────────────────
export function PhaseView({ phaseId, tab }: { phaseId: string; tab: PhaseTab }) {
  const { state, dispatch } = useApp();
  const phase = getPhase(phaseId);
  if (!phase) return <EmptyState icon="🧭" title="Fase non trovata" />;
  const track: Track = getTrack(phase.trackId);
  const status = phaseStatus(track, phase.id, state.phases);
  const progress = state.phases[phase.id] ?? emptyPhaseProgress();
  const prev = track.phases[phase.order - 1];

  if (status === 'locked') {
    return (
      <div data-track={phase.trackId} className="track-scope">
        <EmptyState icon="🔒" title={`Fase bloccata: ${phase.id} — ${phase.title}`}>
          <p>
            Per sbloccarla devi superare il Test di Verifica della Fase {prev?.id} ({prev?.title}): schede ripassate, IDE Code Labs completati, padronanza
            quiz ≥70% ed esame ≥80% con al massimo 1 errore per modulo.
          </p>
          {prev && (
            <a className="mt-3 inline-block text-[var(--accent)] underline" href={formatHash({ name: 'phase', phaseId: prev.id, tab: 'exam' })}>
              Vai alla Fase {prev.id} →
            </a>
          )}
        </EmptyState>
      </div>
    );
  }

  const needsBranch = !!phase.branches?.length && !progress.branchId;
  const branch = phase.branches?.find((b) => b.id === progress.branchId);

  return (
    <div data-track={phase.trackId} className="track-scope grid gap-6">
      <header className="grid gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <a href={formatHash({ name: 'dashboard' })} className="font-mono text-xs text-ink-400 hover:text-[var(--accent)]">
              ← {track.shortTitle}
            </a>
            <p className="mt-1 font-mono text-xs uppercase tracking-[0.2em] text-[var(--accent)]">Fase {phase.id}</p>
            <h1 className="text-[26px] font-bold leading-tight text-slate-50 [text-wrap:balance] sm:text-3xl">{phase.title}</h1>
            <p className="text-sm text-ink-300">{phase.subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            {branch && <Badge tone="accent">Binario: {branch.title}</Badge>}
            {branch && !progress.passed && (
              <Button variant="ghost" onClick={() => dispatch({ type: 'RESET_BRANCH', phaseId: phase.id })}>Cambia binario</Button>
            )}
            {status === 'passed' && <Badge tone="ok">✓ Superata</Badge>}
          </div>
        </div>
        {!needsBranch && (() => {
          const reqs = requirements(phase, progress, state.srs);
          return (
            <>
              <div className="hidden sm:block"><GateChecklist requirements={reqs} /></div>
              {/* Smartphone: checklist richiudibile per non spingere giù i contenuti */}
              <details className="rounded-xl border border-ink-700 bg-ink-900 sm:hidden">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 text-sm">
                  <span className="font-semibold text-slate-100">Requisiti di sblocco</span>
                  <span className="flex items-center gap-1.5">
                    {reqs.map((r) => <i key={r.key} className={`h-2 w-5 rounded-full ${r.done ? 'bg-ok' : 'bg-ink-600'}`} />)}
                    <span className="ml-1 font-mono text-xs text-ink-400">{reqs.filter((r) => r.done).length}/4 ▾</span>
                  </span>
                </summary>
                <div className="p-2 pt-0"><GateChecklist requirements={reqs} compact /></div>
              </details>
            </>
          );
        })()}
      </header>

      {needsBranch ? (
        <BranchPicker phase={phase} />
      ) : (
        <>
          {progress.recovery && tab !== 'quiz' && (
            <a
              href={formatHash({ name: 'phase', phaseId: phase.id, tab: 'quiz' })}
              className="rounded-xl border border-warn/50 bg-warn/10 px-4 py-3 text-sm text-warn"
            >
              ⚠ Sessione di Recupero Obbligatoria attiva su {progress.recovery.modules.length} moduli — vai al tab Quiz per completarla.
            </a>
          )}
          <nav className="grid grid-cols-4 gap-1 rounded-xl border border-ink-700 bg-ink-900 p-1 sm:flex" aria-label="Sezioni della fase">
            {TABS.map((t) => (
              <a
                key={t.id}
                href={formatHash({ name: 'phase', phaseId: phase.id, tab: t.id })}
                aria-current={t.id === tab ? 'page' : undefined}
                className={`whitespace-nowrap rounded-lg px-1 py-2.5 text-center text-[13px] transition sm:px-4 sm:py-2 sm:text-sm ${t.id === tab ? 'bg-ink-700 text-slate-50' : 'text-ink-400 hover:text-slate-200'}`}
              >
                <span className="sm:hidden">{t.short}</span>
                <span className="hidden sm:inline">{t.label}</span>
              </a>
            ))}
          </nav>
          {tab === 'study' && <StudyTab phase={phase} progress={progress} />}
          {tab === 'labs' && <LabsTab phase={phase} progress={progress} />}
          {tab === 'quiz' && <QuizTab phase={phase} progress={progress} />}
          {tab === 'exam' && <ExamTab phase={phase} progress={progress} />}
        </>
      )}
    </div>
  );
}
