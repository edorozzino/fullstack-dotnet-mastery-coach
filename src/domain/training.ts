import type { Question, Track, TrackId, UserState } from './types';
import { phaseStatus } from './gate';
import { pickDailySession } from './srs';
import type { Rng } from './random';

/**
 * Domande disponibili per l'allenamento giornaliero:
 * - fasi sbloccate non ancora superate → solo pool "training" (la banca esame resta protetta)
 * - fasi superate → tutte le domande (ripasso a lungo termine)
 * - domande generate dall'AI delle fasi sbloccate
 */
export function trainingPool(tracks: Track[], state: UserState, scope: TrackId | 'MIX'): Question[] {
  const out: Question[] = [];
  for (const track of tracks) {
    if (scope !== 'MIX' && track.id !== scope) continue;
    for (const phase of track.phases) {
      const status = phaseStatus(track, phase.id, state.phases);
      if (status === 'locked') continue;
      const branchId = state.phases[phase.id]?.branchId;
      const inBranch = (b?: string) => !b || b === branchId;
      const base = phase.questions.filter((q) => inBranch(q.branchId) && (status === 'passed' || q.pool === 'training'));
      const gen = state.generatedQuestions.filter((q) => q.phaseId === phase.id);
      out.push(...base, ...gen);
    }
  }
  return out;
}

export function interleave<T>(lists: T[][]): T[] {
  const out: T[] = [];
  const max = Math.max(0, ...lists.map((l) => l.length));
  for (let i = 0; i < max; i++) for (const l of lists) if (i < l.length) out.push(l[i]);
  return out;
}

export interface TrainingOptions {
  size: number;
  maxNew?: number;
  rng?: Rng;
}

export function buildTrainingSession(
  tracks: Track[],
  state: UserState,
  scope: TrackId | 'MIX',
  today: string,
  opts: TrainingOptions,
): Question[] {
  const scopes: TrackId[] = scope === 'MIX' ? ['A', 'B'] : [scope];
  const per = Math.ceil(opts.size / scopes.length);
  const lists = scopes.map((t) => {
    const pool = trainingPool(tracks, state, t);
    const byId = new Map(pool.map((q) => [q.id, q]));
    const ids = pickDailySession([...byId.keys()], state.srs, today, { size: per, maxNew: opts.maxNew ?? per, rng: opts.rng });
    return ids.map((id) => byId.get(id)!);
  });
  return interleave(lists).slice(0, opts.size);
}
