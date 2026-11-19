import { useState } from 'react';
import type { CodeLab } from '../../domain/types';
import { MAX_HINTS } from '../../domain/reducer';
import { CodeBlock } from './CodeBlock';
import { InlineText } from './InlineText';
import { OptionList } from './OptionList';
import { Badge, Button, Card } from './ui';

interface Props {
  lab: CodeLab;
  completed: boolean;
  hintsUsed: number;
  onHint: () => void;
  onAnswer: (correct: boolean) => void;
}

export function LabView({ lab, completed, hintsUsed, onHint, onAnswer }: Props) {
  const [chosen, setChosen] = useState<number | null>(null);
  const [attempts, setAttempts] = useState(0);
  const solved = completed || chosen === lab.correctIndex;
  const wrong = chosen !== null && chosen !== lab.correctIndex;

  function choose(i: number) {
    setChosen(i);
    if (i !== lab.correctIndex) setAttempts((a) => a + 1);
    onAnswer(i === lab.correctIndex);
  }

  return (
    <div className="grid gap-5">
      <Card className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="accent">IDE Code Lab</Badge>
          {lab.verify && <Badge tone="ok">✓ Output verificato eseguendo Node</Badge>}
          {completed && <Badge tone="ok">✓ Completato</Badge>}
        </div>
        <h3 className="text-xl font-bold text-slate-50">{lab.title}</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-400">🎯 Obiettivo</h4>
            <p className="text-sm text-slate-200"><InlineText text={lab.objective} /></p>
          </section>
          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-400">📍 Scenario</h4>
            <p className="text-sm text-slate-200"><InlineText text={lab.scenario} /></p>
          </section>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Card className="grid content-start gap-4">
          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">1 · Come eseguirlo in locale</h4>
            <ol className="grid gap-1.5">
              {lab.runInstructions.map((r, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  <span className="font-mono text-ink-500">{i + 1}.</span>
                  <code className="break-all font-mono text-[12.5px] text-slate-200">{r}</code>
                </li>
              ))}
            </ol>
          </section>
          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">2 · Passi</h4>
            <ol className="grid list-decimal gap-1.5 pl-5 text-sm text-slate-200">
              {lab.steps.map((s, i) => <li key={i}><InlineText text={s} /></li>)}
            </ol>
          </section>
          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">3 · Hint progressivi ({hintsUsed}/{MAX_HINTS})</h4>
            <div className="grid gap-2">
              {lab.hints.slice(0, hintsUsed).map((h, i) => (
                <p key={i} className="rounded-lg border border-warn/30 bg-warn/5 p-2.5 text-sm text-slate-200">
                  <span className="font-mono text-warn">Hint {i + 1}: </span><InlineText text={h} />
                </p>
              ))}
              {hintsUsed < MAX_HINTS && !solved && (
                <Button variant="outline" onClick={onHint}>Sblocca hint {hintsUsed + 1} (−10 XP sul lab)</Button>
              )}
            </div>
          </section>
        </Card>

        <div className="grid content-start gap-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">Codice starter — incollalo nel tuo editor</h4>
          <CodeBlock code={lab.starterCode} lang={lab.codeLang} maxHeight={520} />
        </div>
      </div>

      <Card className="grid gap-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">4 · Verifica del risultato</h4>
        <p className="font-semibold text-slate-50"><InlineText text={lab.resultQuestion} /></p>
        {solved ? (
          <OptionList options={lab.options} correctIndex={lab.correctIndex} chosen={chosen ?? lab.correctIndex} onChoose={() => {}} />
        ) : (
          <OptionList options={lab.options} correctIndex={lab.correctIndex} chosen={null} onChoose={choose} />
        )}
        {wrong && !solved && (
          <div className="rounded-lg border border-bad/40 bg-bad/10 p-3 text-sm">
            <p className="font-semibold text-bad">Non è il risultato atteso (tentativo {attempts}).</p>
            <p className="mt-1 text-slate-300"><InlineText text={lab.options[chosen!].why} /></p>
            <p className="mt-1 text-ink-400">Riesegui il codice nel tuo editor, controlla l'output e scegli di nuovo.</p>
          </div>
        )}
      </Card>

      {solved && (
        <Card className="grid gap-3 border-ok/40">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-ok">5 · Soluzione ufficiale del Coach</h4>
          <CodeBlock code={lab.solutionCode} lang={lab.codeLang} title="Soluzione commentata" maxHeight={640} />
          <p className="text-sm leading-relaxed text-slate-200"><InlineText text={lab.explanation} /></p>
        </Card>
      )}
    </div>
  );
}
