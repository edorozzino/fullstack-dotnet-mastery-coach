import { useState } from 'react';
import type { ConceptCard } from '../../domain/types';
import { CodeBlock } from './CodeBlock';
import { InlineText } from './InlineText';
import { OptionList } from './OptionList';
import { Badge, Button } from './ui';

interface Props {
  card: ConceptCard;
  moduleLabel: string;
  studied: boolean;
  inRecovery: boolean;
  onCheck: (correct: boolean) => void;
}

export function ConceptCardView({ card, moduleLabel, studied, inRecovery, onCheck }: Props) {
  const [chosen, setChosen] = useState<number | null>(null);
  const answered = chosen !== null;
  const correct = chosen === card.check.correctIndex;

  function choose(i: number) {
    setChosen(i);
    onCheck(i === card.check.correctIndex);
  }

  return (
    <article
      id={card.id}
      className={`grid gap-4 rounded-2xl border p-5 ${inRecovery ? 'border-warn/60 bg-warn/5' : studied ? 'border-ok/30 bg-ink-900/70' : 'border-ink-700 bg-ink-900/70'}`}
    >
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-mono text-xs text-[var(--accent)]">{moduleLabel}</p>
          <h3 className="text-lg font-bold text-slate-50">{card.title}</h3>
        </div>
        <div className="flex gap-2">
          {inRecovery && <Badge tone="warn">Recupero</Badge>}
          {studied ? <Badge tone="ok">✓ Ripassata</Badge> : <Badge>Da ripassare</Badge>}
        </div>
      </header>

      <section>
        <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-ink-400">Cos'è in 3 righe</h4>
        <p className="leading-relaxed text-slate-200"><InlineText text={card.summary} /></p>
      </section>

      <section>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-400">Esempio di codice commentato</h4>
        <CodeBlock code={card.code} lang={card.codeLang} />
      </section>

      <div className="grid gap-3 md:grid-cols-2">
        <section className="rounded-xl border border-bad/30 bg-bad/5 p-3">
          <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-bad">⚠ Trappola classica da colloquio / produzione</h4>
          <p className="text-sm text-slate-200"><InlineText text={card.trap} /></p>
        </section>
        <section className="rounded-xl border border-ok/30 bg-ok/5 p-3">
          <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-ok">★ Regola d'oro</h4>
          <p className="text-sm text-slate-200"><InlineText text={card.goldenRule} /></p>
        </section>
      </div>

      <section className="rounded-xl border border-ink-700 bg-ink-950/60 p-4">
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">Micro-check di comprensione</h4>
        <p className="mb-3 font-medium text-slate-100"><InlineText text={card.check.question} /></p>
        <OptionList options={card.check.options} correctIndex={card.check.correctIndex} chosen={chosen} onChoose={choose} />
        {answered && (
          <div className={`mt-3 rounded-lg p-3 text-sm ${correct ? 'bg-ok/10 text-ok' : 'bg-bad/10 text-bad'}`}>
            <p className="font-semibold">{correct ? 'Esatto. Scheda segnata come ripassata.' : 'No. Rileggi la scheda e riprova: il Coach non regala niente.'}</p>
            <p className="mt-1 text-slate-300"><InlineText text={card.check.explanation} /></p>
            {!correct && (
              <Button variant="outline" className="mt-2" onClick={() => setChosen(null)}>
                Riprova il micro-check
              </Button>
            )}
          </div>
        )}
      </section>
    </article>
  );
}
