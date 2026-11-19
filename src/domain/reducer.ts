import type { AiSettings, Phase, PhaseProgress, Question, TrackId, UserState } from './types';
import { createRecoveryPlan, emptyPhaseProgress, gradeExam, isRecoveryComplete } from './gate';
import { newSrsItem, reviewSrs } from './srs';
import { registerActivity, XP } from './progress';
import { createInitialState } from './storage';

export type Action =
  | { type: 'SET_TRACK'; track: TrackId | 'MIX' }
  | { type: 'STUDY_CARD'; phaseId: string; cardId: string; correct: boolean; today: string }
  | { type: 'LAB_HINT'; phaseId: string; labId: string }
  | { type: 'LAB_ANSWER'; phaseId: string; labId: string; correct: boolean; today: string }
  | { type: 'QUIZ_ANSWER'; questionId: string; correct: boolean; today: string; phaseId?: string }
  | { type: 'SUBMIT_EXAM'; phase: Phase; questions: Question[]; chosen: number[]; today: string }
  | { type: 'SELECT_BRANCH'; phaseId: string; branchId: string }
  | { type: 'RESET_BRANCH'; phaseId: string }
  | { type: 'SET_AI'; ai: Partial<AiSettings> }
  | { type: 'ADD_GENERATED'; questions: Question[] }
  | { type: 'IMPORT_STATE'; state: UserState }
  | { type: 'RESET'; today: string };

export const MAX_HINTS = 2;

function getPhase(s: UserState, id: string): PhaseProgress {
  return s.phases[id] ?? emptyPhaseProgress();
}
function withPhase(s: UserState, id: string, patch: Partial<PhaseProgress>): UserState {
  return { ...s, phases: { ...s.phases, [id]: { ...getPhase(s, id), ...patch } } };
}
function active(s: UserState, today: string, xp = 0): UserState {
  return { ...s, xp: s.xp + xp, streak: registerActivity(s.streak, today) };
}

/** Rimuove un elemento dal piano di recupero; chiude il piano quando è vuoto. */
function settleRecovery(s: UserState, phaseId: string, kind: 'pendingCards' | 'pendingQuestions', id: string): UserState {
  const p = s.phases[phaseId];
  if (!p?.recovery || !p.recovery[kind].includes(id)) return s;
  const recovery = { ...p.recovery, [kind]: p.recovery[kind].filter((x) => x !== id) };
  if (isRecoveryComplete(recovery)) {
    return { ...withPhase(s, phaseId, { recovery: null }), xp: s.xp + XP.recoveryDone };
  }
  return withPhase(s, phaseId, { recovery });
}

function findRecoveryPhase(s: UserState, questionId: string): string | undefined {
  return Object.keys(s.phases).find((id) => s.phases[id].recovery?.pendingQuestions.includes(questionId));
}

export function appReducer(state: UserState, action: Action): UserState {
  switch (action.type) {
    case 'SET_TRACK':
      return { ...state, activeTrack: action.track };

    case 'STUDY_CARD': {
      if (!action.correct) return active(state, action.today);
      const p = getPhase(state, action.phaseId);
      const already = p.studiedCards.includes(action.cardId);
      let s = already ? state : withPhase(state, action.phaseId, { studiedCards: [...p.studiedCards, action.cardId] });
      s = active(s, action.today, already ? 0 : XP.cardStudied);
      return settleRecovery(s, action.phaseId, 'pendingCards', action.cardId);
    }

    case 'LAB_HINT': {
      const p = getPhase(state, action.phaseId);
      const used = Math.min(MAX_HINTS, (p.labHintsUsed[action.labId] ?? 0) + 1);
      return withPhase(state, action.phaseId, { labHintsUsed: { ...p.labHintsUsed, [action.labId]: used } });
    }

    case 'LAB_ANSWER': {
      const p = getPhase(state, action.phaseId);
      if (!action.correct || p.completedLabs.includes(action.labId)) return active(withPhase(state, action.phaseId, {}), action.today);
      const hints = p.labHintsUsed[action.labId] ?? 0;
      const gained = Math.max(10, XP.labCompleted - hints * 10);
      return active(withPhase(state, action.phaseId, { completedLabs: [...p.completedLabs, action.labId] }), action.today, gained);
    }

    case 'QUIZ_ANSWER': {
      const prev = state.srs[action.questionId] ?? newSrsItem(action.today);
      let s: UserState = { ...state, srs: { ...state.srs, [action.questionId]: reviewSrs(prev, action.correct, action.today) } };
      s = active(s, action.today, action.correct ? XP.quizCorrect : XP.quizWrong);
      if (action.correct) {
        const phaseId = action.phaseId ?? findRecoveryPhase(s, action.questionId);
        if (phaseId) s = settleRecovery(s, phaseId, 'pendingQuestions', action.questionId);
      }
      return s;
    }

    case 'SUBMIT_EXAM': {
      const { phase } = action;
      const p = getPhase(state, phase.id);
      const result = gradeExam(phase.id, action.questions, action.chosen, action.today);
      const examHistory = [...p.examHistory, result];
      if (result.passed) {
        const firstPass = !p.passed;
        return active(withPhase(state, phase.id, { examHistory, passed: true, recovery: null }), action.today, firstPass ? XP.gatePassed : 0);
      }
      const recovery = createRecoveryPlan(phase, result, p.branchId);
      return active(withPhase(state, phase.id, { examHistory, recovery }), action.today);
    }

    case 'SELECT_BRANCH': {
      const p = getPhase(state, action.phaseId);
      if (p.branchId) return state;
      return withPhase(state, action.phaseId, { branchId: action.branchId });
    }

    case 'RESET_BRANCH':
      return withPhase(state, action.phaseId, { branchId: undefined, recovery: null });

    case 'SET_AI':
      return { ...state, ai: { ...state.ai, ...action.ai } };

    case 'ADD_GENERATED': {
      const seen = new Set(state.generatedQuestions.map((q) => q.id));
      const fresh = action.questions.filter((q) => !seen.has(q.id) && (seen.add(q.id), true));
      return { ...state, generatedQuestions: [...state.generatedQuestions, ...fresh.map((q) => ({ ...q, generated: true }))] };
    }

    case 'IMPORT_STATE':
      return { ...action.state, ai: { ...action.state.ai, apiKey: state.ai.apiKey } };

    case 'RESET':
      return { ...createInitialState(action.today), ai: state.ai };
  }
}
