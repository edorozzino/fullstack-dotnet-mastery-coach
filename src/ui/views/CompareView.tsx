import { useState } from 'react';
import { COMPARISON_TABLE, FRAMEWORKS, type ComparisonCategory, type FrameworkId } from '../../data/comparisonTable';
import { SectionTitle } from '../components/ui';

const CATEGORIES: (ComparisonCategory | 'Tutte')[] = ['Tutte', 'Reattività', 'Architettura', 'Ecosistema', 'Team & Carriera'];
const COLORS: Record<FrameworkId, string> = { react: 'text-sky-300', angular: 'text-rose-300', vue: 'text-emerald-300' };

export function ComparisonTable() {
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('Tutte');
  const [focus, setFocus] = useState<FrameworkId | null>(null);
  const [query, setQuery] = useState('');
  const [tips, setTips] = useState(true);

  const q = query.trim().toLowerCase();
  const rows = COMPARISON_TABLE.filter(
    (r) =>
      (category === 'Tutte' || r.category === category) &&
      (!q || [r.aspect, r.react, r.angular, r.vue, r.interviewTip].some((t) => t.toLowerCase().includes(q))),
  );

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`rounded-full border px-3 py-1 text-xs ${c === category ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-ink-600 text-ink-300 hover:text-slate-100'}`}
          >
            {c}
          </button>
        ))}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cerca (es. form, DI, SSR)…"
          className="w-full rounded-lg border border-ink-600 bg-ink-950 px-3 py-2.5 text-base sm:ml-auto sm:w-56 sm:py-1.5 sm:text-sm text-slate-100 placeholder:text-ink-500 focus:border-[var(--accent)] focus:outline-none"
        />
        <label className="flex items-center gap-2 text-xs text-ink-300">
          <input type="checkbox" checked={tips} onChange={(e) => setTips(e.target.checked)} className="accent-[var(--accent)]" />
          Consigli da colloquio
        </label>
      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-ink-700 md:block">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-ink-850">
            <tr>
              <th className="w-44 px-3 py-2 text-left text-xs uppercase tracking-wider text-ink-400">Aspetto</th>
              {FRAMEWORKS.map((f) => (
                <th key={f.id} className="px-3 py-2 text-left">
                  <button
                    onClick={() => setFocus(focus === f.id ? null : f.id)}
                    className={`text-left ${focus && focus !== f.id ? 'opacity-40' : ''}`}
                    title="Clicca per evidenziare la colonna"
                  >
                    <span className={`block font-bold ${COLORS[f.id]}`}>{f.name}</span>
                    <span className="block text-[11px] font-normal text-ink-400">{f.tagline}</span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.aspect} className="border-t border-ink-800 align-top">
                <td className="px-3 py-2.5">
                  <span className="block font-semibold text-slate-100">{r.aspect}</span>
                  <span className="font-mono text-[10px] uppercase text-ink-500">{r.category}</span>
                </td>
                {FRAMEWORKS.map((f) => (
                  <td key={f.id} className={`px-3 py-2.5 text-slate-300 transition ${focus === f.id ? 'bg-ink-800/70 text-slate-100' : focus ? 'opacity-40' : ''}`}>
                    {r[f.id]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2 md:hidden" aria-label="Filtra framework">
        {FRAMEWORKS.map((f) => (
          <button key={f.id} onClick={() => setFocus(focus === f.id ? null : f.id)}
            className={`min-h-11 flex-1 rounded-lg border text-sm ${focus === f.id ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-ink-600 text-ink-300'}`}>
            Solo {f.name}
          </button>
        ))}
      </div>

      {/* Smartphone: una scheda per aspetto, i tre framework uno sotto l'altro */}
      <div data-compare-cards className="grid gap-3 md:hidden">
        {rows.map((r) => (
          <article key={r.aspect} data-compare-card={r.aspect} className="rounded-xl border border-ink-700 bg-ink-900 p-3">
            <p className="font-semibold text-slate-50">{r.aspect}</p>
            <p className="font-mono text-[10px] uppercase text-ink-500">{r.category}</p>
            <dl className="mt-2 grid gap-2 text-sm">
              {FRAMEWORKS.filter((f) => !focus || focus === f.id).map((f) => (
                <div key={f.id}>
                  <dt className={`text-xs font-bold ${COLORS[f.id]}`}>{f.name}</dt>
                  <dd className="text-slate-300">{r[f.id]}</dd>
                </div>
              ))}
            </dl>
            {tips && <p className="mt-2 border-t border-ink-700 pt-2 text-xs text-warn">💡 {r.interviewTip}</p>}
          </article>
        ))}
      </div>
      {tips && rows.length > 0 && (
        <ul className="hidden gap-1.5 rounded-xl border border-warn/30 bg-warn/5 p-3 text-sm md:grid">
          {rows.map((r) => (
            <li key={r.aspect} className="text-slate-300">
              <span className="font-semibold text-warn">{r.aspect}: </span>
              {r.interviewTip}
            </li>
          ))}
        </ul>
      )}
      {rows.length === 0 && <p className="text-sm text-ink-400">Nessun aspetto corrisponde alla ricerca.</p>}
    </div>
  );
}

export function CompareView() {
  return (
    <div data-track="B" className="track-scope">
      <SectionTitle kicker="Traccia B · Fase B4" title="React vs Angular vs Vue — Tabella Comparativa Interattiva">
        Sempre consultabile per il ripasso pre-colloquio. Filtra per categoria, cerca un concetto o clicca un framework per evidenziarne la colonna.
      </SectionTitle>
      <ComparisonTable />
    </div>
  );
}
