import { describe, it, expect } from 'vitest';
import { levelFor, LEVELS, registerActivity, XP } from './progress';

describe('XP e livelli combinati', () => {
  it('parte da Junior Dev', () => {
    expect(levelFor(0).title).toBe('Junior Dev');
    expect(levelFor(0).index).toBe(0);
  });
  it('arriva fino a Senior .NET & Frontend Architect', () => {
    expect(LEVELS[LEVELS.length - 1].title).toBe('Senior .NET & Frontend Architect');
    expect(levelFor(1_000_000).title).toBe('Senior .NET & Frontend Architect');
    expect(levelFor(1_000_000).progress).toBe(1);
  });
  it('include Mid Full-Stack e calcola il progresso verso il livello successivo', () => {
    const mid = LEVELS.find((l) => l.title === 'Mid Full-Stack')!;
    const lvl = levelFor(mid.minXp);
    expect(lvl.title).toBe('Mid Full-Stack');
    expect(lvl.progress).toBe(0);
    expect(lvl.nextXp).toBeGreaterThan(mid.minXp);
  });
  it('premia di più i gate rispetto alle singole risposte', () => {
    expect(XP.gatePassed).toBeGreaterThan(XP.labCompleted);
    expect(XP.labCompleted).toBeGreaterThan(XP.quizCorrect);
  });
});

describe('Streak giornaliera unica', () => {
  const base = { current: 0, best: 0, lastActiveDate: null as string | null };

  it('la prima attività avvia la streak a 1', () => {
    expect(registerActivity(base, '2026-11-19')).toEqual({ current: 1, best: 1, lastActiveDate: '2026-11-19' });
  });
  it('più attività nello stesso giorno non incrementano', () => {
    const s = registerActivity(registerActivity(base, '2026-11-19'), '2026-11-19');
    expect(s.current).toBe(1);
  });
  it('il giorno consecutivo incrementa e aggiorna il best', () => {
    let s = registerActivity(base, '2026-11-19');
    s = registerActivity(s, '2026-11-20');
    s = registerActivity(s, '2026-11-21');
    expect(s.current).toBe(3);
    expect(s.best).toBe(3);
  });
  it('saltare un giorno azzera la streak ma conserva il best', () => {
    let s = registerActivity(base, '2026-11-19');
    s = registerActivity(s, '2026-11-20');
    s = registerActivity(s, '2026-11-23');
    expect(s.current).toBe(1);
    expect(s.best).toBe(2);
  });
});
