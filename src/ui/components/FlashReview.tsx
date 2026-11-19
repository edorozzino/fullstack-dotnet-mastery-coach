import { useState } from 'react';
import type { ConceptCard } from '../../domain/types';
import { InlineText } from './InlineText';
import { Button, Card, EmptyState, ProgressBar } from './ui';

/** Ripasso Flash: active recall con autovalutazione. */
export function FlashReview({ cards, moduleLabel }: { cards: ConceptCard[]; moduleLabel: (id: string) => string }) {
  const [i, setI] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [known, setKnown] = useState(0);
  const [again, setAgain] = useState<ConceptCard[]>([]);
  const [queue, setQueue] = useState(cards);

  if (queue.length === 0) return <EmptyState icon="🗂️" title="Nessuna scheda da ripassare" />;
  const done = i >= queue.length;

  function rate(ok: boolean) {
    if (ok) setKnown((k) => k + 1);
    else setAgain((a) => [...a, queue[i]]);
    setRevealed(false);
    setI((x) => x + 1);
  }

  if (done) {
    return (
      <Card className="grid gap-3 text-center">
        <p className="text-lg font-bold text-slate-50">Ripasso Flash completato</p>
        <p className="text-sm text-ink-300">
          Sapevi {known} schede su {queue.length}. {again.length > 0 ? `${again.length} da ripetere.` : 'Ottimo lavoro.'}
        </p>
        <div className="flex justify-center gap-2">
          {again.length > 0 && (
            <Button onClick={() => { setQueue(again); setAgain([]); setKnown(0); setI(0); }}>Ripeti le {again.length} sbagliate</Button>
          )}
          <Button variant="outline" onClick={() => { setQueue(cards); setAgain([]); setKnown(0); setI(0); }}>Ricomincia</Button>
        </div>
      </Card>
    );
  }

  const card = queue[i];
  return (
    <Card className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-xs text-ink-400">Scheda {i + 1}/{queue.length} · {moduleLabel(card.moduleId)}</p>
        <ProgressBar value={(i / queue.length) * 100} className="max-w-40" />
      </div>
      <p className="text-xl font-bold text-slate-50">{card.title}</p>
      {!revealed ? (
        <>
          <p className="text-sm text-ink-400">Prima di girare la scheda, spiega a voce alta: cos'è, la trappola classica e la regola d'oro.</p>
          <Button onClick={() => setRevealed(true)}>Gira la scheda</Button>
        </>
      ) : (
        <>
          <div className="grid gap-2 text-sm">
            <p className="text-slate-200"><InlineText text={card.summary} /></p>
            <p className="text-bad"><span className="font-semibold">Trappola: </span><InlineText text={card.trap} /></p>
            <p className="text-ok"><span className="font-semibold">Regola d'oro: </span><InlineText text={card.goldenRule} /></p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => rate(false)}>✗ Da ripassare</Button>
            <Button onClick={() => rate(true)}>✓ Lo sapevo</Button>
          </div>
        </>
      )}
    </Card>
  );
}
