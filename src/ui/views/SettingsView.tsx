import { useRef, useState, type ChangeEvent } from 'react';
import type { AiProvider } from '../../domain/types';
import { exportState, importState } from '../../domain/storage';
import { DEFAULT_MODELS } from '../../ai/aiCoach';
import { useApp } from '../AppContext';
import { Button, Card, SectionTitle } from '../components/ui';

const field = 'w-full rounded-lg border border-ink-600 bg-ink-950 px-3 py-2.5 text-base text-slate-100 sm:py-2 sm:text-sm placeholder:text-ink-500 focus:border-[var(--accent)] focus:outline-none';

export function SettingsView() {
  const { state, dispatch, today } = useApp();
  const [message, setMessage] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function download() {
    const blob = new Blob([exportState(state)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mastery-coach-backup-${today()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage({ tone: 'ok', text: 'Backup esportato (la API key non viene mai inclusa).' });
  }

  async function onImport(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const res = importState(await file.text(), today());
    if (res.ok) {
      dispatch({ type: 'IMPORT_STATE', state: res.state });
      setMessage({ tone: 'ok', text: `Progressi importati: ${res.state.xp} XP, ${Object.values(res.state.phases).filter((p) => p.passed).length} fasi superate.` });
    } else {
      setMessage({ tone: 'bad', text: res.error });
    }
    e.target.value = '';
  }

  function reset() {
    if (window.confirm('Cancellare TUTTI i progressi? L\'operazione non è reversibile (esporta prima un backup).')) {
      dispatch({ type: 'RESET', today: today() });
      setMessage({ tone: 'ok', text: 'Progressi azzerati.' });
    }
  }

  return (
    <div className="grid gap-6">
      <SectionTitle kicker="Impostazioni" title="Backup, AI Coach e dati locali">
        Tutto viene salvato automaticamente nel localStorage di questo browser.
      </SectionTitle>

      {message && (
        <p role="status" className={`rounded-lg border px-3 py-2 text-sm ${message.tone === 'ok' ? 'border-ok/40 text-ok' : 'border-bad/40 text-bad'}`}>
          {message.text}
        </p>
      )}

      <Card className="grid gap-3">
        <h3 className="font-semibold text-slate-50">💾 Backup del progresso</h3>
        <p className="text-sm text-ink-400">Esporta un file JSON da conservare o da importare su un altro dispositivo.</p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={download}>Esporta JSON</Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()}>Importa JSON…</Button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onImport} />
        </div>
      </Card>

      <Card className="grid gap-3">
        <h3 className="font-semibold text-slate-50">✦ AI Coach (opzionale)</h3>
        <p className="text-sm text-ink-400">
          Con una API key puoi generare nuovi quiz, IDE Code Labs e simulazioni di colloquio. Senza chiave l'app funziona al 100% con il curriculum locale.
          La chiave resta solo in questo browser e viene inviata direttamente al provider scelto.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm text-ink-300">
            Provider
            <select
              className={field}
              value={state.ai.provider}
              onChange={(e) => dispatch({ type: 'SET_AI', ai: { provider: e.target.value as AiProvider } })}
            >
              <option value="anthropic">Anthropic (Claude)</option>
              <option value="openai">OpenAI-compatibile</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm text-ink-300">
            API key
            <input
              type="password"
              autoComplete="off"
              className={field}
              value={state.ai.apiKey}
              placeholder={state.ai.provider === 'anthropic' ? 'sk-ant-…' : 'sk-…'}
              onChange={(e) => dispatch({ type: 'SET_AI', ai: { apiKey: e.target.value } })}
            />
          </label>
          <label className="grid gap-1 text-sm text-ink-300">
            Modello (vuoto = default)
            <input
              className={field}
              value={state.ai.model}
              placeholder={DEFAULT_MODELS[state.ai.provider]}
              onChange={(e) => dispatch({ type: 'SET_AI', ai: { model: e.target.value } })}
            />
          </label>
          <label className="grid gap-1 text-sm text-ink-300">
            Base URL (opzionale, per proxy o endpoint compatibili)
            <input
              className={field}
              value={state.ai.baseUrl}
              placeholder={state.ai.provider === 'anthropic' ? 'https://api.anthropic.com' : 'https://api.openai.com/v1'}
              onChange={(e) => dispatch({ type: 'SET_AI', ai: { baseUrl: e.target.value } })}
            />
          </label>
        </div>
        <p className="text-xs text-ink-500">
          Nota: una chiave nel browser è visibile a chi usa questo computer. Usa una chiave personale con limiti di spesa, oppure un proxy tuo come Base URL.
        </p>
      </Card>

      <Card className="grid gap-3 border-bad/30">
        <h3 className="font-semibold text-bad">Zona pericolosa</h3>
        <div>
          <Button variant="danger" onClick={reset}>Azzera tutti i progressi</Button>
        </div>
      </Card>
    </div>
  );
}
