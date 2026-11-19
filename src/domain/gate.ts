import type {
  CodeLab, ConceptCard, ExamResult, Module, ModuleScore, Phase, PhaseProgress, PhaseStatus,
  Question, RecoveryPlan, Requirement, SrsItem, Track,
} from './types';
import { shuffle, type Rng } from './random';

export const EXAM_SIZE = 10;
export const PASS_PERCENT = 80;
export const MASTERY_PERCENT = 70;
export const MAX_ERRORS_PER_MODULE = 1;

export function emptyPhaseProgress(): PhaseProgress {
  return { studiedCards: [], completedLabs: [], labHintsUsed: {}, examHistory: [], passed: false, recovery: null };
}

export interface PhaseContent {
  modules: Module[];
  cards: ConceptCard[];
  questions: Question[];
  labs: CodeLab[];
}

/** Contenuti della fase filtrati per binario (le voci senza branchId sono comuni). */
export function phaseContent(phase: Phase, branchId?: string): PhaseContent {
  const inBranch = (b?: string) => !b || (branchId !== undefined && b === branchId);
  const modules = phase.modules.filter((m) => inBranch(m.branchId));
  const ids = new Set(modules.map((m) => m.id));
  return {
    modules,
    cards: phase.cards.filter((c) => ids.has(c.moduleId)),
    questions: phase.questions.filter((q) => ids.has(q.moduleId) && inBranch(q.branchId) && !q.generated),
    labs: phase.labs.filter((l) => ids.has(l.moduleId) && inBranch(l.branchId)),
  };
}

export function phaseStatus(track: Track, phaseId: string, phases: Record<string, PhaseProgress>): PhaseStatus {
  const idx = track.phases.findIndex((p) => p.id === phaseId);
  if (idx < 0) return 'locked';
  if (phases[phaseId]?.passed) return 'passed';
  if (idx === 0) return 'available';
  return phases[track.phases[idx - 1].id]?.passed ? 'available' : 'locked';
}

export function masteryPercent(phase: Phase, srs: Record<string, SrsItem>, branchId?: string): number {
  const training = phaseContent(phase, branchId).questions.filter((q) => q.pool === 'training');
  if (training.length === 0) return 0;
  const ok = training.filter((q) => srs[q.id]?.lastCorrect).length;
  return Math.round((ok / training.length) * 100);
}

export function requirements(phase: Phase, progress: PhaseProgress, srs: Record<string, SrsItem>): Requirement[] {
  const c = phaseContent(phase, progress.branchId);
  const studied = c.cards.filter((x) => progress.studiedCards.includes(x.id)).length;
  const labs = c.labs.filter((x) => progress.completedLabs.includes(x.id)).length;
  const mastery = masteryPercent(phase, srs, progress.branchId);
  const best = progress.examHistory.reduce((m, r) => Math.max(m, r.percent), 0);
  const needsBranch = !!phase.branches?.length && !progress.branchId;
  return [
    {
      key: 'cards', label: 'Schede ripassate', current: studied, target: c.cards.length,
      done: !needsBranch && studied === c.cards.length && c.cards.length > 0,
      detail: `${studied}/${c.cards.length} schede con micro-check superato`,
    },
    {
      key: 'labs', label: 'IDE Code Labs completati', current: labs, target: c.labs.length,
      done: !needsBranch && labs === c.labs.length && c.labs.length > 0,
      detail: `${labs}/${c.labs.length} lab risolti`,
    },
    {
      key: 'mastery', label: `Padronanza Quiz (≥${MASTERY_PERCENT}%)`, current: mastery, target: MASTERY_PERCENT,
      done: !needsBranch && mastery >= MASTERY_PERCENT,
      detail: `${mastery}% delle domande di allenamento padroneggiate`,
    },
    {
      key: 'exam', label: `Test di Verifica (≥${PASS_PERCENT}%)`, current: best, target: PASS_PERCENT,
      done: progress.passed,
      detail: progress.examHistory.length ? `Miglior risultato: ${best}%` : 'Non ancora sostenuto',
    },
  ];
}

export function canTakeExam(phase: Phase, progress: PhaseProgress, srs: Record<string, SrsItem>): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (phase.branches?.length && !progress.branchId) reasons.push('Scegli prima il binario di specializzazione.');
  const reqs = requirements(phase, progress, srs);
  for (const r of reqs) {
    if (r.key !== 'exam' && !r.done && !(phase.branches?.length && !progress.branchId)) {
      reasons.push(`${r.label}: ${r.detail}.`);
    }
  }
  if (progress.recovery) reasons.push('Completa prima la Sessione di Recupero Obbligatoria.');
  return { ok: reasons.length === 0, reasons };
}

function roundRobin(groups: Question[][], take: number): Question[] {
  const out: Question[] = [];
  const queues = groups.map((g) => [...g]);
  while (out.length < take && queues.some((qq) => qq.length)) {
    for (const qq of queues) {
      if (out.length >= take) break;
      const next = qq.shift();
      if (next) out.push(next);
    }
  }
  return out;
}

/** 10 domande: prima tutta la banca esame (bilanciata per modulo), poi completamento dall'allenamento. */
export function buildExam(phase: Phase, branchId: string | undefined, rng: Rng): Question[] {
  const c = phaseContent(phase, branchId);
  const byModule = (pool: 'exam' | 'training') =>
    shuffle(c.modules, rng).map((m) => shuffle(c.questions.filter((q) => q.moduleId === m.id && q.pool === pool), rng));
  const picked = roundRobin(byModule('exam'), EXAM_SIZE);
  const fill = roundRobin(byModule('training'), EXAM_SIZE - picked.length);
  return shuffle([...picked, ...fill], rng);
}

export function gradeExam(phaseId: string, questions: Question[], chosen: number[], date: string): ExamResult {
  const answers = questions.map((q, i) => ({
    questionId: q.id, moduleId: q.moduleId, chosenIndex: chosen[i], correct: chosen[i] === q.correctIndex,
  }));
  const score = answers.filter((a) => a.correct).length;
  const total = questions.length;
  const percent = total ? Math.round((score / total) * 100) : 0;
  const moduleIds = [...new Set(questions.map((q) => q.moduleId))];
  const moduleScores: ModuleScore[] = moduleIds.map((moduleId) => {
    const mine = answers.filter((a) => a.moduleId === moduleId);
    const correct = mine.filter((a) => a.correct).length;
    return { moduleId, total: mine.length, correct, errors: mine.length - correct };
  });
  const reasons: string[] = [];
  const scoreOk = percent >= PASS_PERCENT;
  if (!scoreOk) reasons.push(`Punteggio ${score}/${total} (${percent}%) sotto la soglia del ${PASS_PERCENT}%.`);
  const overLimit = moduleScores.filter((m) => m.errors > MAX_ERRORS_PER_MODULE);
  overLimit.forEach((m) => reasons.push(`Il modulo ${m.moduleId} ha ${m.errors} errori (massimo ${MAX_ERRORS_PER_MODULE}).`));
  const passed = scoreOk && overLimit.length === 0;
  const failedModules = passed
    ? []
    : (scoreOk ? overLimit : moduleScores.filter((m) => m.errors > 0)).map((m) => m.moduleId);
  return { phaseId, date, score, total, percent, passed, moduleScores, failedModules, reasons, answers };
}

export function createRecoveryPlan(phase: Phase, result: ExamResult, branchId: string | undefined): RecoveryPlan {
  const c = phaseContent(phase, branchId);
  const mods = new Set(result.failedModules);
  const missed = result.answers.filter((a) => !a.correct && mods.has(a.moduleId)).map((a) => a.questionId);
  const training = c.questions.filter((q) => mods.has(q.moduleId) && q.pool === 'training').map((q) => q.id);
  return {
    phaseId: phase.id,
    modules: result.failedModules,
    pendingCards: c.cards.filter((x) => mods.has(x.moduleId)).map((x) => x.id),
    pendingQuestions: [...new Set([...missed, ...training])],
  };
}

export function isRecoveryComplete(plan: RecoveryPlan): boolean {
  return plan.pendingCards.length === 0 && plan.pendingQuestions.length === 0;
}
