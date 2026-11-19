import type { ExamResult, RecoveryPlan } from '../../domain/types';
import { PASS_PERCENT, MAX_ERRORS_PER_MODULE } from '../../domain/gate';

interface Props {
  result: ExamResult;
  moduleName: (id: string) => string;
  recovery: RecoveryPlan | null;
}

export function ExamReport({ result, moduleName, recovery }: Props) {
  return (
    <section className="grid gap-4">
      <div
        className={`flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-5 ${
          result.passed ? 'border-ok/50 bg-ok/10' : 'border-bad/50 bg-bad/10'
        }`}
      >
        <div>
          <p className="text-xs uppercase tracking-widest text-ink-400">Pagella del Test di Verifica</p>
          <p className={`text-2xl font-bold ${result.passed ? 'text-ok' : 'text-bad'}`}>
            {result.passed ? '✓ Superato' : '✗ Non superato'}
          </p>
          <p className="text-sm text-ink-300">
            Soglia: {PASS_PERCENT}% e massimo {MAX_ERRORS_PER_MODULE} errore per modulo
          </p>
        </div>
        <div className="text-right font-mono">
          <p className="text-4xl font-bold text-slate-100">
            {result.score}/{result.total}
          </p>
          <p className="text-sm text-ink-400">{result.percent}%</p>
        </div>
      </div>

      {result.reasons.length > 0 && (
        <ul className="list-inside list-disc text-sm text-bad">
          {result.reasons.map((r) => (
            <li key={r}>{r.replace(/modulo (\S+)/, (_, id: string) => `modulo ${moduleName(id)}`)}</li>
          ))}
        </ul>
      )}

      <table className="w-full overflow-hidden rounded-xl border border-ink-700 text-sm">
        <thead className="bg-ink-850 text-left text-xs uppercase tracking-wider text-ink-400">
          <tr>
            <th className="px-3 py-2">Modulo</th>
            <th className="px-3 py-2 text-center">Corrette</th>
            <th className="px-3 py-2 text-center">Errori</th>
            <th className="px-3 py-2 text-right">Esito</th>
          </tr>
        </thead>
        <tbody>
          {result.moduleScores.map((m) => {
            const ok = m.errors <= MAX_ERRORS_PER_MODULE && !result.failedModules.includes(m.moduleId);
            return (
              <tr key={m.moduleId} className="border-t border-ink-800">
                <td className="px-3 py-2 text-slate-200">{moduleName(m.moduleId)}</td>
                <td className="px-3 py-2 text-center font-mono">
                  {m.correct}/{m.total}
                </td>
                <td className={`px-3 py-2 text-center font-mono ${m.errors > MAX_ERRORS_PER_MODULE ? 'text-bad' : 'text-ink-300'}`}>{m.errors}</td>
                <td className={`px-3 py-2 text-right ${ok ? 'text-ok' : 'text-bad'}`}>{ok ? 'OK' : 'Da recuperare'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {recovery && (
        <div className="rounded-2xl border border-warn/50 bg-warn/10 p-5">
          <p className="text-lg font-bold text-warn">⚠ Piano di Recupero Obbligatorio</p>
          <p className="mt-1 text-sm text-ink-300">
            Prima di ripetere l'esame devi ripassare le schede e rispondere correttamente alle domande di recupero di questi moduli:
          </p>
          <ul className="mt-3 grid gap-1 text-sm">
            {recovery.modules.map((m) => (
              <li key={m} className="flex items-center gap-2 text-slate-100">
                <span className="h-1.5 w-1.5 rounded-full bg-warn" /> {moduleName(m)}
              </li>
            ))}
          </ul>
          <p className="mt-3 font-mono text-xs text-ink-400">
            {recovery.pendingCards.length} schede · {recovery.pendingQuestions.length} domande da smaltire
          </p>
        </div>
      )}
    </section>
  );
}
