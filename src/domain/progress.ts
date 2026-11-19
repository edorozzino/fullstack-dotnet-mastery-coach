import type { UserState } from './types';
import { diffDays } from './dates';

export const XP = {
  quizCorrect: 10,
  quizWrong: 2,
  cardStudied: 15,
  labCompleted: 40,
  gatePassed: 150,
  recoveryDone: 25,
} as const;

export const LEVELS = [
  { title: 'Junior Dev', minXp: 0 },
  { title: 'Junior+ Developer', minXp: 400 },
  { title: 'Mid Developer', minXp: 1200 },
  { title: 'Mid Full-Stack', minXp: 2600 },
  { title: 'Senior Full-Stack', minXp: 4500 },
  { title: 'Senior .NET & Frontend Architect', minXp: 7000 },
] as const;

export interface LevelInfo {
  index: number;
  title: string;
  minXp: number;
  nextXp: number | null;
  progress: number; // 0..1 verso il prossimo livello
}

export function levelFor(xp: number): LevelInfo {
  let index = 0;
  LEVELS.forEach((l, i) => {
    if (xp >= l.minXp) index = i;
  });
  const cur = LEVELS[index];
  const next = LEVELS[index + 1];
  return {
    index,
    title: cur.title,
    minXp: cur.minXp,
    nextXp: next ? next.minXp : null,
    progress: next ? (xp - cur.minXp) / (next.minXp - cur.minXp) : 1,
  };
}

export function registerActivity(streak: UserState['streak'], today: string): UserState['streak'] {
  if (streak.lastActiveDate === today) return streak;
  const consecutive = streak.lastActiveDate !== null && diffDays(today, streak.lastActiveDate) === 1;
  const current = consecutive ? streak.current + 1 : 1;
  return { current, best: Math.max(streak.best, current), lastActiveDate: today };
}
