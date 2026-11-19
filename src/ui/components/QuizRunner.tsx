import { useState } from 'react';
import type { Question } from '../../domain/types';
import { moduleTitle } from '../../data/curriculum';
import { CodeBlock } from './CodeBlock';
import { InlineText } from './InlineText';
import { OptionList } from './OptionList';
import { Badge, Button, Card, EmptyState, ProgressBar } from './ui';

interface Props {
  questions: Question[];
  onAnswer: (q: Question, correct: boolean) => void;
  onRestart?: () => void;
  emptyTitle?: string;
  emptyText?: string;
}

export function QuestionBody({ q }: { q: Question }) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="accent">{q.phaseId}</Badge>
        <span className="font-mono text-xs text-ink-400">{moduleTitle(q.moduleId)}</span>
        {q.interview && <Badge tone="warn">★ Classica da colloquio</Badge>}
        {q.generated && <Badge>✦ AI</Badge>}
      </div>
      <p data-question-prompt className="text-[17px] font-semibold leading-snug text-slate-50 sm:text-lg"><InlineText text={q.prompt} /></p>
      {q.code && <CodeBlock code={q.code} lang={q.codeLang ?? 'text'} />}
    </>
  );
}

export function QuizRunner({ questions, onAnswer, onRestart, emptyTitle, emptyText }: Props) {
  const [i, setI] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [score, setScore] = useState(0);

  if (questions.length === 0) {
    return <EmptyState icon="✅" title={emptyTitle ?? 'Nessuna domanda in coda'}>{emptyText}</EmptyState>;
  }

  if (i >= questions.length) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <Card className="grid gap-3 text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-400">Sessione completata</p>
        <p className="font-mono text-5xl font-bold text-slate-50">{score}/{questions.length}</p>
        <p className={pct >= 70 ? 'text-ok' : 'text-warn'}>
          {pct >= 70 ? `${pct}% — così si fa. Domani il Coach alza l'asticella.` : `${pct}% — non basta. Rivedi le spiegazioni e ripeti.`}
        </p>
        {onRestart && (
          <div>
            <Button onClick={() => { setI(0); setChosen(null); setScore(0); onRestart(); }}>Nuova sessione</Button>
          </div>
        )}
      </Card>
    );
  }

  const q = questions[i];

  function choose(idx: number) {
    if (chosen !== null) return;
    setChosen(idx);
    const ok = idx === q.correctIndex;
    if (ok) setScore((s) => s + 1);
    onAnswer(q, ok);
  }

  return (
    <Card className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <span className="whitespace-nowrap font-mono text-xs text-ink-400">Domanda {i + 1}/{questions.length}</span>
        <ProgressBar value={(i / questions.length) * 100} className="max-w-48 flex-1" />
        <span className="font-mono text-xs text-ok">{score} ✓</span>
      </div>
      <QuestionBody q={q} />
      <OptionList options={q.options} correctIndex={q.correctIndex} chosen={chosen} onChoose={choose} />
      {chosen !== null && (
        <div className="flex items-center justify-between gap-3">
          <p className={chosen === q.correctIndex ? 'font-semibold text-ok' : 'font-semibold text-bad'}>
            {chosen === q.correctIndex ? 'Corretto. Il Coach approva.' : 'Sbagliato. Leggi il perché di ogni opzione.'}
          </p>
          <Button onClick={() => { setI((x) => x + 1); setChosen(null); }}>
            {i + 1 < questions.length ? 'Prossima →' : 'Vedi risultato'}
          </Button>
        </div>
      )}
    </Card>
  );
}
