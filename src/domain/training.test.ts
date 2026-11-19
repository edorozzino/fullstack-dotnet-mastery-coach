import { describe, it, expect } from 'vitest';
import { trainingPool, buildTrainingSession, interleave } from './training';
import { createInitialState } from './storage';
import { emptyPhaseProgress } from './gate';
import { createRng } from './random';
import { makePhase } from './fixtures.testutil';
import type { Track } from './types';

const today = '2026-11-19';
const trackA: Track = { id: 'A', title: 'A', shortTitle: 'A', description: '', phases: [makePhase('A0', 'A', 0), makePhase('A1', 'A', 1)] };
const trackB: Track = { id: 'B', title: 'B', shortTitle: 'B', description: '', phases: [makePhase('B0', 'B', 0), makePhase('B1', 'B', 1)] };

describe('pool di allenamento', () => {
  it('include solo le domande di allenamento delle fasi sbloccate (la banca esame resta protetta)', () => {
    const pool = trainingPool([trackA], createInitialState(today), 'A');
    expect(pool.length).toBe(6);
    expect(pool.every((q) => q.phaseId === 'A0' && q.pool === 'training')).toBe(true);
  });

  it('dopo il gate, tutte le domande della fase superata entrano nel ripasso', () => {
    const s = createInitialState(today);
    s.phases.A0 = { ...emptyPhaseProgress(), passed: true };
    const pool = trainingPool([trackA], s, 'A');
    expect(pool.filter((q) => q.phaseId === 'A0')).toHaveLength(13);
    expect(pool.filter((q) => q.phaseId === 'A1')).toHaveLength(6);
  });

  it('in modalità MIX pesca da entrambe le tracce', () => {
    const pool = trainingPool([trackA, trackB], createInitialState(today), 'MIX');
    expect(new Set(pool.map((q) => q.phaseId))).toEqual(new Set(['A0', 'B0']));
  });

  it('include le domande generate dall\'AI della traccia richiesta', () => {
    const s = createInitialState(today);
    s.generatedQuestions = [{ ...trackB.phases[0].questions[0], id: 'gen-b', generated: true }];
    expect(trainingPool([trackA, trackB], s, 'B').some((q) => q.id === 'gen-b')).toBe(true);
    expect(trainingPool([trackA, trackB], s, 'A').some((q) => q.id === 'gen-b')).toBe(false);
  });
});

describe('sessione giornaliera', () => {
  it('interleave alterna le liste', () => {
    expect(interleave([[1, 3, 5], [2, 4]])).toEqual([1, 2, 3, 4, 5]);
  });
  it('la sessione MIX alterna domande .NET e Frontend', () => {
    const s = createInitialState(today);
    const session = buildTrainingSession([trackA, trackB], s, 'MIX', today, { size: 6, rng: createRng(9) });
    expect(session).toHaveLength(6);
    const tracks = session.map((q) => q.phaseId[0]);
    expect(tracks.filter((t) => t === 'A')).toHaveLength(3);
    expect(tracks[0]).not.toBe(tracks[1]);
  });
});
