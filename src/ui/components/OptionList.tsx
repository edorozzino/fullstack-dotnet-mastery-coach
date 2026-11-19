import type { ChoiceOption } from '../../domain/types';
import { InlineText } from './InlineText';

interface Props {
  options: (ChoiceOption | string)[];
  correctIndex: number;
  chosen: number | null;
  onChoose: (index: number) => void;
  /** Modalità esame: nessun feedback, si può cambiare risposta. */
  hideFeedback?: boolean;
}

const LETTERS = ['A', 'B', 'C', 'D'];

type OptState = 'idle' | 'selected' | 'correct' | 'wrong' | 'revealed';

const STYLES: Record<OptState, string> = {
  idle: 'border-ink-700 bg-ink-900 hover:border-[var(--accent)] hover:bg-ink-850',
  selected: 'border-[var(--accent)] bg-ink-850 ring-1 ring-[var(--accent)]',
  correct: 'border-ok bg-ok/10',
  wrong: 'border-bad bg-bad/10',
  revealed: 'border-ink-700 bg-ink-900/60 opacity-90',
};

export function OptionList({ options, correctIndex, chosen, onChoose, hideFeedback }: Props) {
  const answered = chosen !== null && !hideFeedback;

  return (
    <ol className="grid gap-2.5" role="list">
      {options.map((raw, i) => {
        const o = typeof raw === 'string' ? { text: raw, why: '' } : raw;
        let state: OptState = 'idle';
        if (hideFeedback) state = chosen === i ? 'selected' : 'idle';
        else if (answered) state = i === correctIndex ? 'correct' : i === chosen ? 'wrong' : 'revealed';
        const multiline = o.text.includes('\n');

        return (
          <li key={i}>
            <button
              type="button"
              data-state={state}
              disabled={answered}
              onClick={() => onChoose(i)}
              className={`w-full rounded-xl border px-4 py-3 text-left transition ${STYLES[state]} disabled:cursor-default`}
            >
              <span className="flex items-start gap-3">
                <span
                  className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md font-mono text-xs font-bold ${
                    state === 'correct' ? 'bg-ok text-ink-950' : state === 'wrong' ? 'bg-bad text-ink-950' : 'bg-ink-700 text-ink-200'
                  }`}
                >
                  {state === 'correct' ? '✓' : state === 'wrong' ? '✗' : LETTERS[i]}
                </span>
                <span className="min-w-0 flex-1">
                  {multiline ? (
                    <pre className="overflow-x-auto whitespace-pre font-mono text-[13px] leading-relaxed text-slate-100">{o.text}</pre>
                  ) : (
                    <InlineText text={o.text} className="text-[15px] text-slate-100" />
                  )}
                  {answered && o.why && (
                    <span className={`mt-2 block text-sm ${i === correctIndex ? 'text-ok' : i === chosen ? 'text-bad' : 'text-ink-400'}`}>
                      <span className="font-semibold">{i === correctIndex ? 'Coach: ' : 'Perché no: '}</span>
                      <InlineText text={o.why} />
                    </span>
                  )}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
