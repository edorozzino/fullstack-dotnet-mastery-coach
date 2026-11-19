import { useState } from 'react';
import type { Phase, PhaseProgress, Question } from '../../domain/types';
import { buildExam, canTakeExam, EXAM_SIZE, PASS_PERCENT, requirements } from '../../domain/gate';
import { createRng, randomSeed } from '../../domain/random';
import { moduleTitle } from '../../data/curriculum';
import { useApp } from '../AppContext';
import { ExamReport } from '../components/ExamReport';
import { GateChecklist } from '../components/GateChecklist';
import { OptionList } from '../components/OptionList';
import { QuestionBody } from '../components/QuizRunner';
import { Badge, Button, Card } from '../components/ui';

export function ExamTab({ phase, progress }: { phase: Phase; progress: PhaseProgress }) {
  const { state, dispatch, today } = useApp();
  const [exam, setExam] = useState<Question[] | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [current, setCurrent] = useState(0);
  const [showReport, setShowReport] = useState(false);

  const eligibility = canTakeExam(phase, progress, state.srs);
  const last = progress.examHistory[progress.examHistory.length - 1];

  function start() {
    const qs = buildExam(phase, progress.branchId, createRng(randomSeed()));
    setExam(qs);
    setAnswers(qs.map(() => null));
    setCurrent(0);
    setShowReport(false);
  }

  function submit() {
    if (!exam) return;
    dispatch({ type: 'SUBMIT_EXAM', phase, questions: exam, chosen: answers.map((a) => a ?? -1), today: today() });
    setExam(null);
    setShowReport(true);
  }

  // ── Esame in corso ─────────────────────────────────────────────────────────
  if (exam) {
    const q = exam[current];
    const answered = answers.filter((a) => a !== null).length;
    return (
      <div className="grid gap-4">
        <Card className="flex flex-wrap items-center justify-between gap-3 border-warn/40">
          <div>
            <p className="font-semibold text-warn">🛡️ Test di Verifica in corso — nessun aiuto</p>
            <p className="text-xs text-ink-400">Puoi cambiare risposta fino alla consegna. Il feedback arriva solo nella pagella.</p>
          </div>
          <div className="flex flex-wrap gap-1.5" aria-label="Navigazione domande">
            {exam.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`h-8 w-8 rounded-md font-mono text-xs ${
                  i === current ? 'bg-[var(--accent)] text-ink-950' : answers[i] !== null ? 'bg-ink-700 text-slate-100' : 'border border-ink-600 text-ink-400'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </Card>
        <Card className="grid gap-4">
          <p className="font-mono text-xs text-ink-400">Domanda {current + 1}/{exam.length}</p>
          <QuestionBody q={q} />
          <OptionList
            options={q.options}
            correctIndex={q.correctIndex}
            chosen={answers[current]}
            hideFeedback
            onChoose={(i) => setAnswers((a) => a.map((x, k) => (k === current ? i : x)))}
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button variant="ghost" disabled={current === 0} onClick={() => setCurrent((c) => c - 1)}>← Precedente</Button>
            <span className="font-mono text-xs text-ink-400">{answered}/{exam.length} risposte</span>
            {current < exam.length - 1 ? (
              <Button variant="outline" onClick={() => setCurrent((c) => c + 1)}>Successiva →</Button>
            ) : (
              <Button disabled={answered < exam.length} onClick={submit}>Consegna l'esame</Button>
            )}
          </div>
        </Card>
      </div>
    );
  }

  // ── Panoramica ────────────────────────────────────────────────────────────
  return (
    <div className="grid gap-5">
      <Card className="grid gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-50">Gate Exam — Fase {phase.id}</h3>
            <p className="text-sm text-ink-300">
              {EXAM_SIZE} domande senza aiuti · soglia {PASS_PERCENT}% ({Math.ceil((EXAM_SIZE * PASS_PERCENT) / 100)}/{EXAM_SIZE}) · massimo 1 errore per singolo modulo.
            </p>
          </div>
          {progress.passed && <Badge tone="ok">✓ Fase superata</Badge>}
        </div>
        <GateChecklist requirements={requirements(phase, progress, state.srs)} />
        {!eligibility.ok && (
          <div className="rounded-xl border border-bad/40 bg-bad/5 p-3">
            <p className="text-sm font-semibold text-bad">Requisiti mancanti</p>
            <ul className="mt-1 list-inside list-disc text-sm text-slate-300">
              {eligibility.reasons.map((r) => <li key={r}>{r}</li>)}
            </ul>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button disabled={!eligibility.ok} onClick={start}>
            {progress.examHistory.length ? 'Ripeti il Test di Verifica' : 'Inizia il Test di Verifica'}
          </Button>
          {last && !showReport && (
            <Button variant="outline" onClick={() => setShowReport(true)}>Vedi ultima pagella</Button>
          )}
        </div>
      </Card>

      {showReport && last && (
        <ExamReport result={last} moduleName={moduleTitle} recovery={progress.recovery} />
      )}

      {progress.examHistory.length > 0 && (
        <Card>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-400">Storico tentativi</h4>
          <ul className="grid gap-1 font-mono text-sm">
            {progress.examHistory.map((r, i) => (
              <li key={i} className="flex justify-between gap-2">
                <span className="text-ink-400">#{i + 1} · {r.date}</span>
                <span className={r.passed ? 'text-ok' : 'text-bad'}>{r.score}/{r.total} {r.passed ? '✓' : '✗'}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
