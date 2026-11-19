import { useState } from 'react';
import type { CodeLab, Question } from '../../domain/types';
import { TRACKS, getPhase } from '../../data/curriculum';
import { phaseContent, phaseStatus } from '../../domain/gate';
import { generateInterview, generateLab, generateQuestions, isAiConfigured } from '../../ai/aiCoach';
import { formatHash } from '../../lib/router';
import { useApp } from '../AppContext';
import { LabView } from '../components/LabView';
import { QuizRunner } from '../components/QuizRunner';
import { Button, Card, EmptyState, SectionTitle } from '../components/ui';

type Output = { kind: 'quiz' | 'interview'; questions: Question[] } | { kind: 'lab'; lab: CodeLab } | null;

const field = 'w-full rounded-lg border border-ink-600 bg-ink-950 px-3 py-2 text-sm text-slate-100 focus:border-[var(--accent)] focus:outline-none';

export function AiCoachView() {
  const { state, dispatch, today } = useApp();
  const unlocked = TRACKS.flatMap((t) => t.phases.filter((p) => phaseStatus(t, p.id, state.phases) !== 'locked'));
  const [phaseId, setPhaseId] = useState(unlocked[0]?.id ?? 'A0');
  const [moduleId, setModuleId] = useState('');
  const [role, setRole] = useState('Full-Stack Developer .NET + React');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [output, setOutput] = useState<Output>(null);
  const [labDone, setLabDone] = useState(false);
  const [labHints, setLabHints] = useState(0);

  if (!isAiConfigured(state.ai)) {
    return (
      <EmptyState icon="✦" title="AI Coach non configurato">
        <p>Inserisci una API key Anthropic o OpenAI-compatibile nelle impostazioni per generare nuovi quiz, IDE Code Labs e simulazioni di colloquio.</p>
        <a href={formatHash({ name: 'settings' })} className="mt-3 inline-block text-[var(--accent)] underline">Apri Impostazioni →</a>
      </EmptyState>
    );
  }

  const phase = getPhase(phaseId)!;
  const modules = phaseContent(phase, state.phases[phase.id]?.branchId ?? phase.branches?.[0]?.id).modules;
  const scopedPhase = { ...phase, modules };

  async function run(kind: 'quiz' | 'lab' | 'interview') {
    setBusy(true);
    setError(null);
    setOutput(null);
    try {
      if (kind === 'lab') {
        const lab = await generateLab(state.ai, scopedPhase, moduleId || undefined);
        if (!lab) throw new Error('La risposta dell\'AI non era un Code Lab valido. Riprova.');
        setLabDone(false);
        setLabHints(0);
        setOutput({ kind: 'lab', lab });
      } else {
        const qs = kind === 'quiz'
          ? await generateQuestions(state.ai, scopedPhase, { count: 5, moduleId: moduleId || undefined, focus: 'domande da colloquio tecnico e analisi di codice' })
          : await generateInterview(state.ai, scopedPhase, role);
        if (qs.length === 0) throw new Error('Nessuna domanda valida nella risposta dell\'AI. Riprova.');
        dispatch({ type: 'ADD_GENERATED', questions: qs });
        setOutput({ kind, questions: qs });
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6">
      <SectionTitle kicker="AI Coach" title="Genera nuovo materiale di allenamento">
        Le domande generate entrano nel pool dell'allenamento giornaliero (non contano per i gate, che usano solo il curriculum verificato).
      </SectionTitle>

      <Card className="grid gap-3 sm:grid-cols-3">
        <label className="grid gap-1 text-sm text-ink-300">
          Fase (solo sbloccate)
          <select className={field} value={phaseId} onChange={(e) => { setPhaseId(e.target.value); setModuleId(''); }}>
            {unlocked.map((p) => <option key={p.id} value={p.id}>{p.id} — {p.title}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm text-ink-300">
          Modulo
          <select className={field} value={moduleId} onChange={(e) => setModuleId(e.target.value)}>
            <option value="">Tutti i moduli</option>
            {modules.map((m) => <option key={m.id} value={m.id}>{m.code} {m.title}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm text-ink-300">
          Ruolo per la simulazione
          <input className={field} value={role} onChange={(e) => setRole(e.target.value)} />
        </label>
        <div className="flex flex-wrap gap-2 sm:col-span-3">
          <Button disabled={busy} onClick={() => run('quiz')}>Genera 5 quiz</Button>
          <Button disabled={busy} variant="outline" onClick={() => run('lab')}>Genera un IDE Code Lab</Button>
          <Button disabled={busy} variant="outline" onClick={() => run('interview')}>Simulazione di colloquio</Button>
          {busy && <span className="self-center font-mono text-xs text-ink-400">Il Coach sta preparando il materiale…</span>}
        </div>
        {error && <p role="alert" className="text-sm text-bad sm:col-span-3">{error}</p>}
      </Card>

      {output?.kind === 'lab' && (
        <LabView
          lab={output.lab}
          completed={labDone}
          hintsUsed={labHints}
          onHint={() => setLabHints((h) => Math.min(2, h + 1))}
          onAnswer={(ok) => { if (ok) setLabDone(true); }}
        />
      )}
      {(output?.kind === 'quiz' || output?.kind === 'interview') && (
        <QuizRunner
          questions={output.questions}
          onAnswer={(q, correct) => dispatch({ type: 'QUIZ_ANSWER', questionId: q.id, correct, today: today(), phaseId: q.phaseId })}
        />
      )}
    </div>
  );
}
