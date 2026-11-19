import { useState } from 'react';
import type { CodeLang } from '../../domain/types';
import { highlight, LANG_LABEL } from '../../lib/highlight';
import { copyText } from '../../lib/clipboard';

interface Props {
  code: string;
  lang: CodeLang;
  title?: string;
  maxHeight?: number;
}

export function CodeBlock({ code, lang, title, maxHeight }: Props) {
  const [copied, setCopied] = useState<'idle' | 'ok' | 'fail'>('idle');

  async function onCopy() {
    const ok = await copyText(code);
    setCopied(ok ? 'ok' : 'fail');
    setTimeout(() => setCopied('idle'), 1800);
  }

  return (
    <figure className="group min-w-0 max-w-full overflow-hidden rounded-xl border border-ink-700 bg-ink-950 shadow-inner" data-lang={lang}>
      <figcaption className="flex items-center justify-between gap-2 border-b border-ink-700 bg-ink-900/80 px-3 py-1.5">
        <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-ink-400">
          <span className="flex gap-1" aria-hidden>
            <i className="h-2 w-2 rounded-full bg-bad/70" />
            <i className="h-2 w-2 rounded-full bg-warn/70" />
            <i className="h-2 w-2 rounded-full bg-ok/70" />
          </span>
          {title ?? LANG_LABEL[lang]} <span className="sr-only">({lang})</span>
        </span>
        <button
          type="button"
          onClick={onCopy}
          className="rounded-md border border-ink-600 px-2 py-0.5 font-mono text-[11px] text-ink-300 transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
          aria-live="polite"
        >
          {copied === 'ok' ? '✓ Copiato' : copied === 'fail' ? 'Copia non riuscita' : 'Copia codice'}
        </button>
      </figcaption>
      <pre className="overflow-auto p-3 text-[12.5px] sm:p-4 sm:text-[13px] leading-relaxed" style={maxHeight ? { maxHeight } : undefined}>
        <code className="hljs font-mono" dangerouslySetInnerHTML={{ __html: highlight(code, lang) }} />
      </pre>
    </figure>
  );
}
