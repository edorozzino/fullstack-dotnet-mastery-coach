import type { SrsItem } from './types';
import { addDays, diffDays } from './dates';
import { shuffle, type Rng } from './random';

const MIN_EASE = 1.3;

export function newSrsItem(today: string): SrsItem {
  return { ease: 2.5, interval: 0, reps: 0, due: today, lastCorrect: false, attempts: 0, correct: 0 };
}

/** SM-2 semplificato a due esiti (giusto / sbagliato). */
export function reviewSrs(item: SrsItem, correct: boolean, today: string): SrsItem {
  const attempts = item.attempts + 1;
  if (!correct) {
    return {
      ...item,
      ease: Math.max(MIN_EASE, +(item.ease - 0.2).toFixed(2)),
      reps: 0,
      interval: 1,
      due: addDays(today, 1),
      lastCorrect: false,
      attempts,
    };
  }
  const reps = item.reps + 1;
  const interval = reps === 1 ? 1 : reps === 2 ? 6 : Math.round(item.interval * item.ease);
  return {
    ...item,
    ease: +(item.ease + 0.1).toFixed(2),
    reps,
    interval,
    due: addDays(today, interval),
    lastCorrect: true,
    attempts,
    correct: item.correct + 1,
  };
}

export function isDue(item: SrsItem, today: string): boolean {
  return diffDays(item.due, today) <= 0;
}

export interface SessionOptions {
  size: number;
  maxNew: number;
  rng?: Rng;
}

/**
 * Costruisce la sessione giornaliera: prima le carte dovute (le più in ritardo prima),
 * poi carte nuove (mai viste) fino a maxNew, rispettando la dimensione totale.
 */
export function pickDailySession(
  pool: string[],
  srs: Record<string, SrsItem>,
  today: string,
  opts: SessionOptions,
): string[] {
  const due = pool
    .filter((id) => srs[id] && srs[id].attempts > 0 && isDue(srs[id], today))
    .sort((a, b) => diffDays(srs[a].due, srs[b].due));
  const fresh = shuffle(pool.filter((id) => !srs[id] || srs[id].attempts === 0), opts.rng);
  const session = due.slice(0, opts.size);
  const room = Math.min(opts.maxNew, opts.size - session.length);
  return [...session, ...fresh.slice(0, Math.max(0, room))];
}
