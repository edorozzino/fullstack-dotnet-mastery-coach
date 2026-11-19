import type { AiProvider, AiSettings, ChoiceOption, CodeLab, CodeLang, Phase, Question } from '../domain/types';

export const DEFAULT_MODELS: Record<AiProvider, string> = {
  anthropic: 'claude-sonnet-5-5',
  openai: 'gpt-4o-mini',
};
const DEFAULT_BASE: Record<AiProvider, string> = {
  anthropic: 'https://api.anthropic.com',
  openai: 'https://api.openai.com/v1',
};
const LANGS: CodeLang[] = ['csharp', 'typescript', 'javascript', 'tsx', 'html', 'sql', 'yaml', 'dockerfile', 'bash', 'json', 'text'];

export function isAiConfigured(s: AiSettings): boolean {
  return s.apiKey.trim().length > 0;
}

export interface AiRequest {
  url: string;
  headers: Record<string, string>;
  body: string;
}

export function buildRequest(s: AiSettings, system: string, user: string, maxTokens = 4000): AiRequest {
  const base = (s.baseUrl.trim() || DEFAULT_BASE[s.provider]).replace(/\/+$/, '');
  const model = s.model.trim() || DEFAULT_MODELS[s.provider];
  if (s.provider === 'anthropic') {
    return {
      url: `${base}/v1/messages`,
      headers: {
        'content-type': 'application/json',
        'x-api-key': s.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({ model, max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] }),
    };
  }
  return {
    url: `${base}/chat/completions`,
    headers: { 'content-type': 'application/json', Authorization: `Bearer ${s.apiKey}` },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    }),
  };
}

export function extractText(provider: AiProvider, json: unknown): string {
  const j = json as {
    content?: { type: string; text?: string }[];
    choices?: { message?: { content?: string } }[];
  };
  if (provider === 'anthropic') return (j.content ?? []).filter((c) => c.type === 'text').map((c) => c.text ?? '').join('\n');
  return j.choices?.[0]?.message?.content ?? '';
}

/** Estrae il primo JSON plausibile (anche dentro ```json ... ```). */
function extractJson(text: string): unknown {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidates = [fence?.[1], text];
  for (const c of candidates) {
    if (!c) continue;
    const start = c.search(/[[{]/);
    if (start < 0) continue;
    const end = Math.max(c.lastIndexOf('}'), c.lastIndexOf(']'));
    try {
      return JSON.parse(c.slice(start, end + 1));
    } catch {
      /* prova il prossimo */
    }
  }
  return null;
}

const str = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

function validOptions(v: unknown): v is ChoiceOption[] {
  return Array.isArray(v) && v.length === 4 && v.every((o) => o && str(o.text) && str(o.why));
}
function lang(v: unknown): CodeLang {
  return LANGS.includes(v as CodeLang) ? (v as CodeLang) : 'text';
}

export function parseQuestions(text: string, phase: Phase): Question[] {
  const data = extractJson(text) as { questions?: unknown[] } | unknown[] | null;
  const list = Array.isArray(data) ? data : Array.isArray(data?.questions) ? data!.questions! : [];
  const moduleIds = new Set(phase.modules.map((m) => m.id));
  const out: Question[] = [];
  for (const raw of list) {
    const r = raw as Record<string, unknown>;
    if (!r || !str(r.prompt) || !validOptions(r.options)) continue;
    if (typeof r.correctIndex !== 'number' || r.correctIndex < 0 || r.correctIndex > 3) continue;
    if (!str(r.moduleId) || !moduleIds.has(r.moduleId)) continue;
    const mod = phase.modules.find((m) => m.id === r.moduleId)!;
    out.push({
      id: `gen-${uid()}`,
      phaseId: phase.id,
      moduleId: r.moduleId,
      pool: 'training',
      prompt: r.prompt,
      code: str(r.code) ? r.code : undefined,
      codeLang: str(r.code) ? lang(r.codeLang) : undefined,
      options: r.options,
      correctIndex: r.correctIndex,
      interview: r.interview === true,
      branchId: mod.branchId,
      generated: true,
    });
  }
  return out;
}

export function parseLab(text: string, phase: Phase): CodeLab | null {
  const r = extractJson(text) as Record<string, unknown> | null;
  if (!r) return null;
  const strings = ['moduleId', 'title', 'objective', 'scenario', 'starterCode', 'resultQuestion', 'solutionCode', 'explanation'];
  if (!strings.every((k) => str(r[k]))) return null;
  if (!phase.modules.some((m) => m.id === r.moduleId)) return null;
  if (!Array.isArray(r.hints) || r.hints.length !== 2 || !r.hints.every(str)) return null;
  if (!validOptions(r.options) || typeof r.correctIndex !== 'number' || r.correctIndex < 0 || r.correctIndex > 3) return null;
  const arr = (v: unknown) => (Array.isArray(v) ? v.filter(str) : []);
  return {
    id: `gen-lab-${uid()}`,
    phaseId: phase.id,
    moduleId: r.moduleId as string,
    title: r.title as string,
    objective: r.objective as string,
    scenario: r.scenario as string,
    runInstructions: arr(r.runInstructions),
    steps: arr(r.steps),
    starterCode: r.starterCode as string,
    codeLang: lang(r.codeLang),
    hints: [r.hints[0], r.hints[1]] as [string, string],
    resultQuestion: r.resultQuestion as string,
    options: r.options,
    correctIndex: r.correctIndex,
    solutionCode: r.solutionCode as string,
    explanation: r.explanation as string,
  };
}

// ─── Chiamate ────────────────────────────────────────────────────────────────

const defaultFetch: FetchLike = (url, init) => fetch(url, init);

export type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string },
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

const SYSTEM = `Sei "Coach", un Senior Full-Stack Architect (.NET/C#, Azure, React, Angular, Vue, TypeScript) e instructional designer.
Sei rigido ma motivante. Rispondi SOLO con JSON valido, in italiano, senza testo extra. Il codice deve essere corretto e realistico.`;

async function call(s: AiSettings, user: string, fetchFn: FetchLike): Promise<string> {
  const req = buildRequest(s, SYSTEM, user);
  const res = await fetchFn(req.url, { method: 'POST', headers: req.headers, body: req.body });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (json as { error?: { message?: string } }).error?.message ?? 'errore sconosciuto';
    throw new Error(`AI Coach: richiesta fallita (${res.status}) — ${msg}`);
  }
  return extractText(s.provider, json);
}

function moduleList(phase: Phase): string {
  return phase.modules.map((m) => `- ${m.id} (${m.code} ${m.title}): ${m.topics.join(', ')}`).join('\n');
}

const QUESTION_SCHEMA = `{"questions":[{"moduleId":"<id modulo>","prompt":"...","code":"(opzionale)","codeLang":"csharp|typescript|javascript|tsx|html|sql|yaml|dockerfile|bash|json","options":[{"text":"...","why":"perché giusta/sbagliata"}, x4],"correctIndex":0-3,"interview":true|false}]}`;

export async function generateQuestions(
  s: AiSettings,
  phase: Phase,
  opts: { count: number; focus?: string; moduleId?: string },
  fetchFn: FetchLike = defaultFetch,
): Promise<Question[]> {
  const prompt = `Genera ${opts.count} domande a scelta multipla (4 opzioni, 1 corretta) per la fase "${phase.id} — ${phase.title}".
Moduli disponibili:
${moduleList(phase)}
${opts.moduleId ? `Concentrati sul modulo ${opts.moduleId}.` : 'Distribuisci le domande sui moduli.'}
${opts.focus ? `Focus: ${opts.focus}.` : ''}
Includi domande classiche da colloquio e analisi di codice. Ogni opzione deve avere "why" che spiega perché è giusta o sbagliata.
Formato esatto: ${QUESTION_SCHEMA}`;
  return parseQuestions(await call(s, prompt, fetchFn), phase);
}

export async function generateLab(
  s: AiSettings,
  phase: Phase,
  moduleId: string | undefined,
  fetchFn: FetchLike = defaultFetch,
): Promise<CodeLab | null> {
  const prompt = `Crea un "IDE Code Lab" per la fase "${phase.id} — ${phase.title}".
Moduli:
${moduleList(phase)}
${moduleId ? `Usa il modulo ${moduleId}.` : ''}
Lo studente apre il suo editor, esegue codice autocontenuto e sceglie l'output/comportamento esatto tra 4 opzioni.
Formato JSON: {"moduleId":"...","title":"...","objective":"...","scenario":"...","runInstructions":["..."],"steps":["..."],"starterCode":"...","codeLang":"...","hints":["hint1","hint2"],"resultQuestion":"...","options":[{"text":"...","why":"..."} x4],"correctIndex":0-3,"solutionCode":"codice commentato riga per riga","explanation":"..."}`;
  return parseLab(await call(s, prompt, fetchFn), phase);
}

export async function generateInterview(
  s: AiSettings,
  phase: Phase,
  role: string,
  fetchFn: FetchLike = defaultFetch,
): Promise<Question[]> {
  return generateQuestions(
    s,
    phase,
    { count: 6, focus: `simulazione di colloquio tecnico per il ruolo "${role}": domande progressive, da quelle base a quelle da senior, con trabocchetti tipici` },
    fetchFn,
  );
}
