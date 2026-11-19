import type { UserState } from './types';

export const STORAGE_KEY = 'fullstack-dotnet-mastery-coach/v1';
export const STATE_VERSION = 1;
const APP_ID = 'mastery-coach';

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function createInitialState(today: string): UserState {
  return {
    version: STATE_VERSION,
    createdAt: today,
    xp: 0,
    streak: { current: 0, best: 0, lastActiveDate: null },
    activeTrack: 'A',
    phases: {},
    srs: {},
    generatedQuestions: [],
    ai: { provider: 'anthropic', apiKey: '', model: '', baseUrl: '' },
  };
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function validate(raw: unknown): string | null {
  if (!isObj(raw)) return 'Lo stato non è un oggetto.';
  if (raw.xp !== undefined && typeof raw.xp !== 'number') return 'Campo "xp" non valido.';
  if (raw.phases !== undefined && !isObj(raw.phases)) return 'Campo "phases" non valido.';
  if (raw.srs !== undefined && !isObj(raw.srs)) return 'Campo "srs" non valido.';
  if (raw.generatedQuestions !== undefined && !Array.isArray(raw.generatedQuestions)) return 'Campo "generatedQuestions" non valido.';
  return null;
}

/** Unisce uno stato parziale/vecchio con i default (migrazione in avanti). */
function normalize(raw: Record<string, unknown>, today: string): UserState {
  const base = createInitialState(today);
  const r = raw as Partial<UserState>;
  return {
    ...base,
    ...r,
    version: STATE_VERSION,
    streak: { ...base.streak, ...(isObj(r.streak) ? r.streak : {}) },
    ai: { ...base.ai, ...(isObj(r.ai) ? r.ai : {}) },
    phases: isObj(r.phases) ? (r.phases as UserState['phases']) : {},
    srs: isObj(r.srs) ? (r.srs as UserState['srs']) : {},
    generatedQuestions: Array.isArray(r.generatedQuestions) ? r.generatedQuestions : [],
    activeTrack: r.activeTrack === 'B' || r.activeTrack === 'MIX' ? r.activeTrack : 'A',
  };
}

export function loadState(storage: KeyValueStorage, today: string): UserState {
  try {
    const txt = storage.getItem(STORAGE_KEY);
    if (!txt) return createInitialState(today);
    const raw = JSON.parse(txt);
    if (validate(raw)) return createInitialState(today);
    return normalize(raw, today);
  } catch {
    return createInitialState(today);
  }
}

export function saveState(storage: KeyValueStorage, state: UserState): void {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota piena o storage non disponibile: ignoriamo */
  }
}

export function exportState(state: UserState): string {
  const safe: UserState = { ...state, ai: { ...state.ai, apiKey: '' } };
  return JSON.stringify({ app: APP_ID, exportedAt: new Date().toISOString(), state: safe }, null, 2);
}

export type ImportResult = { ok: true; state: UserState } | { ok: false; error: string };

export function importState(json: string, today: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, error: 'Il file non contiene JSON valido.' };
  }
  if (!isObj(parsed) || parsed.app !== APP_ID || !isObj(parsed.state)) {
    return { ok: false, error: 'Non è un backup del Mastery Coach.' };
  }
  const err = validate(parsed.state);
  if (err) return { ok: false, error: err };
  return { ok: true, state: normalize(parsed.state, today) };
}
