import { Fragment } from 'react';

/** Testo con `codice inline` tra backtick. Nessun HTML interpretato. */
export function InlineText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/(`[^`]+`)/g);
  return (
    <span className={className}>
      {parts.map((p, i) =>
        p.startsWith('`') && p.endsWith('`') && p.length > 1 ? (
          <code key={i} className="rounded bg-ink-800 px-1 py-px font-mono text-[0.9em] text-[var(--accent)]">
            {p.slice(1, -1)}
          </code>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </span>
  );
}
