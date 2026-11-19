import { describe, it, expect } from 'vitest';
import { addDays, diffDays, toDay } from './dates';
import { newSrsItem, reviewSrs, isDue, pickDailySession } from './srs';
import { createRng, shuffle } from './random';

describe('dates', () => {
  it('formatta una data come YYYY-MM-DD in ora locale', () => {
    expect(toDay(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
  });
  it('somma giorni attraversando mesi e anni', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
  });
  it('calcola la differenza in giorni', () => {
    expect(diffDays('2026-03-01', '2026-02-27')).toBe(2);
  });
});

describe('random', () => {
  it('è deterministico con lo stesso seed', () => {
    const a = shuffle([1, 2, 3, 4, 5, 6], createRng(42));
    const b = shuffle([1, 2, 3, 4, 5, 6], createRng(42));
    expect(a).toEqual(b);
    expect([...a].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });
  it('non muta l\'array originale', () => {
    const src = [1, 2, 3];
    shuffle(src, createRng(1));
    expect(src).toEqual([1, 2, 3]);
  });
});

describe('SRS (SM-2 semplificato)', () => {
  const today = '2026-11-19';

  it('un nuovo item è dovuto oggi', () => {
    const item = newSrsItem(today);
    expect(isDue(item, today)).toBe(true);
    expect(item.reps).toBe(0);
  });

  it('risposte corrette consecutive allungano l\'intervallo 1 → 6 → ~15 giorni', () => {
    let item = newSrsItem(today);
    item = reviewSrs(item, true, today);
    expect(item.interval).toBe(1);
    expect(item.due).toBe('2026-11-20');
    item = reviewSrs(item, true, '2026-11-20');
    expect(item.interval).toBe(6);
    item = reviewSrs(item, true, '2026-11-26');
    expect(item.interval).toBeGreaterThanOrEqual(14);
    expect(item.reps).toBe(3);
    expect(item.correct).toBe(3);
  });

  it('un errore azzera le ripetizioni, riduce l\'ease e ripropone domani', () => {
    let item = reviewSrs(reviewSrs(newSrsItem(today), true, today), true, '2026-11-20');
    const before = item.ease;
    item = reviewSrs(item, false, '2026-11-26');
    expect(item.reps).toBe(0);
    expect(item.interval).toBe(1);
    expect(item.due).toBe('2026-11-27');
    expect(item.ease).toBeLessThan(before);
    expect(item.lastCorrect).toBe(false);
  });

  it('l\'ease non scende mai sotto 1.3', () => {
    let item = newSrsItem(today);
    for (let i = 0; i < 20; i++) item = reviewSrs(item, false, today);
    expect(item.ease).toBeGreaterThanOrEqual(1.3);
    expect(item.attempts).toBe(20);
  });

  it('la sessione giornaliera mette prima i dovuti (più in ritardo prima), poi i nuovi fino al limite', () => {
    const srs = {
      q1: { ...newSrsItem('2026-11-10'), reps: 1, attempts: 1 },
      q2: { ...newSrsItem('2026-11-18'), reps: 1, attempts: 1 },
      q3: { ...newSrsItem('2026-12-01'), reps: 2, attempts: 2 }, // non dovuto
    };
    const pool = ['q1', 'q2', 'q3', 'n1', 'n2', 'n3'];
    const session = pickDailySession(pool, srs, today, { size: 4, maxNew: 2, rng: createRng(7) });
    expect(session.slice(0, 2)).toEqual(['q1', 'q2']);
    expect(session).toHaveLength(4);
    expect(session).not.toContain('q3');
    expect(session.filter((id) => id.startsWith('n'))).toHaveLength(2);
  });
});
