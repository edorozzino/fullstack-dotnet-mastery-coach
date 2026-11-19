import { describe, it, expect } from 'vitest';
import {
  buildExam, canTakeExam, createRecoveryPlan, emptyPhaseProgress, gradeExam, masteryPercent,
  phaseContent, phaseStatus, requirements, isRecoveryComplete, EXAM_SIZE, PASS_PERCENT, MASTERY_PERCENT,
} from './gate';
import { createRng } from './random';
import { newSrsItem, reviewSrs } from './srs';
import { makeTrack, makePhase, makeBranchPhase } from './fixtures.testutil';
import type { PhaseProgress, SrsItem } from './types';

const today = '2026-11-19';
const answered = (correct: boolean): SrsItem => reviewSrs(newSrsItem(today), correct, today);

function readyProgress(phase = makePhase('P0', 'A', 0)): PhaseProgress {
  return {
    ...emptyPhaseProgress(),
    studiedCards: phase.cards.map((c) => c.id),
    completedLabs: phase.labs.map((l) => l.id),
  };
}
function srsAllTrainingCorrect(phase = makePhase('P0', 'A', 0)) {
  const srs: Record<string, SrsItem> = {};
  phase.questions.filter((x) => x.pool === 'training').forEach((x) => (srs[x.id] = answered(true)));
  return srs;
}

describe('costanti del Gate System', () => {
  it('rispetta le soglie richieste', () => {
    expect(EXAM_SIZE).toBe(10);
    expect(PASS_PERCENT).toBe(80);
    expect(MASTERY_PERCENT).toBe(70);
  });
});

describe('sblocco fasi', () => {
  it('la prima fase è disponibile, le successive bloccate', () => {
    const track = makeTrack();
    expect(phaseStatus(track, 'P0', {})).toBe('available');
    expect(phaseStatus(track, 'P1', {})).toBe('locked');
  });
  it('la fase N+1 si sblocca solo superando il gate della fase N', () => {
    const track = makeTrack();
    const phases = { P0: { ...emptyPhaseProgress(), passed: true } };
    expect(phaseStatus(track, 'P0', phases)).toBe('passed');
    expect(phaseStatus(track, 'P1', phases)).toBe('available');
    expect(phaseStatus(track, 'P2', phases)).toBe('locked');
  });
});

describe('padronanza quiz', () => {
  it('conta solo le domande di allenamento con ultima risposta corretta', () => {
    const phase = makePhase('P0', 'A', 0);
    const training = phase.questions.filter((x) => x.pool === 'training');
    const srs: Record<string, SrsItem> = {};
    training.slice(0, 3).forEach((x) => (srs[x.id] = answered(true)));
    training.slice(3, 4).forEach((x) => (srs[x.id] = answered(false)));
    expect(masteryPercent(phase, srs)).toBe(50); // 3 su 6
  });
});

describe('requisiti e accesso al Gate Exam', () => {
  it('mostra i 4 requisiti nell\'ordine richiesto', () => {
    const phase = makePhase('P0', 'A', 0);
    const reqs = requirements(phase, emptyPhaseProgress(), {});
    expect(reqs.map((r) => r.key)).toEqual(['cards', 'labs', 'mastery', 'exam']);
    expect(reqs.every((r) => !r.done)).toBe(true);
  });

  it('nega l\'esame se mancano schede, lab o padronanza', () => {
    const phase = makePhase('P0', 'A', 0);
    const res = canTakeExam(phase, emptyPhaseProgress(), {});
    expect(res.ok).toBe(false);
    expect(res.reasons.length).toBe(3);
  });

  it('nega l\'esame con padronanza al 67% (sotto 70%)', () => {
    const phase = makePhase('P0', 'A', 0);
    const srs = srsAllTrainingCorrect(phase);
    const training = phase.questions.filter((x) => x.pool === 'training');
    srs[training[0].id] = answered(false);
    srs[training[1].id] = answered(false);
    expect(canTakeExam(phase, readyProgress(phase), srs).ok).toBe(false);
  });

  it('consente l\'esame quando tutti i prerequisiti sono soddisfatti', () => {
    const phase = makePhase('P0', 'A', 0);
    const res = canTakeExam(phase, readyProgress(phase), srsAllTrainingCorrect(phase));
    expect(res).toEqual({ ok: true, reasons: [] });
  });

  it('blocca l\'esame finché la Sessione di Recupero non è completata', () => {
    const phase = makePhase('P0', 'A', 0);
    const progress = { ...readyProgress(phase), recovery: { phaseId: 'P0', modules: ['P0-m1'], pendingCards: ['P0-m1-card'], pendingQuestions: [] } };
    const res = canTakeExam(phase, progress, srsAllTrainingCorrect(phase));
    expect(res.ok).toBe(false);
    expect(res.reasons.join(' ')).toMatch(/Recupero/);
  });
});

describe('costruzione del Gate Exam', () => {
  it('estrae 10 domande uniche, privilegiando la banca esame e coprendo tutti i moduli', () => {
    const phase = makePhase('P0', 'A', 0);
    const exam = buildExam(phase, undefined, createRng(3));
    expect(exam).toHaveLength(10);
    expect(new Set(exam.map((x) => x.id)).size).toBe(10);
    expect(exam.filter((x) => x.pool === 'exam')).toHaveLength(7); // tutta la banca esame
    for (const m of phase.modules) expect(exam.some((x) => x.moduleId === m.id)).toBe(true);
  });

  it('nelle fasi a binari usa solo le domande del binario scelto', () => {
    const phase = makeBranchPhase('P2', 'A', 2);
    const exam = buildExam(phase, 'y', createRng(1));
    expect(exam).toHaveLength(10);
    expect(exam.every((x) => x.branchId === 'y')).toBe(true);
  });

  it('phaseContent filtra moduli, schede, lab e domande per binario', () => {
    const phase = makeBranchPhase('P2', 'A', 2);
    const c = phaseContent(phase, 'x');
    expect(c.modules.every((m) => m.branchId === 'x')).toBe(true);
    expect(c.labs).toHaveLength(3);
    expect(c.questions).toHaveLength(16);
  });

  it('una fase a binari richiede di scegliere il binario prima dell\'esame', () => {
    const phase = makeBranchPhase('P2', 'A', 2);
    expect(canTakeExam(phase, emptyPhaseProgress(), {}).reasons.join(' ')).toMatch(/binario/i);
  });
});

describe('correzione del Gate Exam', () => {
  const phase = makePhase('P0', 'A', 0);
  const exam = buildExam(phase, undefined, createRng(5));
  const answersWithWrong = (wrongIdx: number[]) =>
    exam.map((x, i) => (wrongIdx.includes(i) ? (x.correctIndex + 1) % 4 : x.correctIndex));

  it('promuove con 10/10', () => {
    const r = gradeExam('P0', exam, answersWithWrong([]), today);
    expect(r.passed).toBe(true);
    expect(r.percent).toBe(100);
    expect(r.failedModules).toEqual([]);
  });

  it('promuove con 8/10 se gli errori sono su moduli diversi', () => {
    const i1 = exam.findIndex((x) => x.moduleId === 'P0-m1');
    const i2 = exam.findIndex((x) => x.moduleId === 'P0-m2');
    const r = gradeExam('P0', exam, answersWithWrong([i1, i2]), today);
    expect(r.score).toBe(8);
    expect(r.passed).toBe(true);
  });

  it('boccia con 8/10 se due errori cadono nello stesso modulo (max 1 errore per modulo)', () => {
    const idx = exam.map((x, i) => (x.moduleId === 'P0-m1' ? i : -1)).filter((i) => i >= 0).slice(0, 2);
    const r = gradeExam('P0', exam, answersWithWrong(idx), today);
    expect(r.score).toBe(8);
    expect(r.passed).toBe(false);
    expect(r.failedModules).toEqual(['P0-m1']);
    expect(r.reasons.join(' ')).toMatch(/modulo/i);
  });

  it('boccia sotto l\'80% e produce la pagella per modulo', () => {
    const idx = [0, 1, 2].map((m) => exam.findIndex((x) => x.moduleId === `P0-m${m + 1}`));
    const r = gradeExam('P0', exam, answersWithWrong(idx), today);
    expect(r.score).toBe(7);
    expect(r.passed).toBe(false);
    expect(r.moduleScores).toHaveLength(3);
    expect(r.moduleScores.reduce((s, m) => s + m.total, 0)).toBe(10);
    expect(r.failedModules.sort()).toEqual(['P0-m1', 'P0-m2', 'P0-m3']);
  });
});

describe('Sessione di Recupero Obbligatoria', () => {
  it('include schede e domande dei soli moduli sbagliati, ed è completa quando tutto è smaltito', () => {
    const phase = makePhase('P0', 'A', 0);
    const exam = buildExam(phase, undefined, createRng(5));
    const wrong = exam.map((x, i) => (x.moduleId === 'P0-m2' ? i : -1)).filter((i) => i >= 0).slice(0, 2);
    const result = gradeExam('P0', exam, exam.map((x, i) => (wrong.includes(i) ? (x.correctIndex + 3) % 4 : x.correctIndex)), today);
    const plan = createRecoveryPlan(phase, result, undefined);
    expect(plan.modules).toEqual(['P0-m2']);
    expect(plan.pendingCards).toEqual(['P0-m2-card']);
    expect(plan.pendingQuestions.length).toBeGreaterThan(0);
    expect(plan.pendingQuestions.every((id) => id.startsWith('P0-m2'))).toBe(true);
    expect(isRecoveryComplete(plan)).toBe(false);
    expect(isRecoveryComplete({ ...plan, pendingCards: [], pendingQuestions: [] })).toBe(true);
  });
});
