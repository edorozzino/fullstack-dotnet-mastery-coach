import { describe, it, expect } from 'vitest';
import { appReducer } from './reducer';
import { createInitialState } from './storage';
import { buildExam } from './gate';
import { createRng } from './random';
import { XP } from './progress';
import { makePhase, makeBranchPhase } from './fixtures.testutil';

const today = '2026-11-19';
const phase = makePhase('P0', 'A', 0);
const init = () => createInitialState(today);

describe('appReducer', () => {
  it('cambia la traccia attiva (A, B o MIX)', () => {
    expect(appReducer(init(), { type: 'SET_TRACK', track: 'MIX' }).activeTrack).toBe('MIX');
  });

  it('una scheda è "ripassata" solo se il micro-check è corretto; XP una sola volta', () => {
    let s = appReducer(init(), { type: 'STUDY_CARD', phaseId: 'P0', cardId: 'c1', correct: false, today });
    expect(s.phases.P0?.studiedCards ?? []).toEqual([]);
    s = appReducer(s, { type: 'STUDY_CARD', phaseId: 'P0', cardId: 'c1', correct: true, today });
    s = appReducer(s, { type: 'STUDY_CARD', phaseId: 'P0', cardId: 'c1', correct: true, today });
    expect(s.phases.P0.studiedCards).toEqual(['c1']);
    expect(s.xp).toBe(XP.cardStudied);
    expect(s.streak.current).toBe(1);
  });

  it('gli hint dei lab sono al massimo 2 e riducono l\'XP del lab', () => {
    let s = init();
    for (let i = 0; i < 4; i++) s = appReducer(s, { type: 'LAB_HINT', phaseId: 'P0', labId: 'L1' });
    expect(s.phases.P0.labHintsUsed.L1).toBe(2);
    s = appReducer(s, { type: 'LAB_ANSWER', phaseId: 'P0', labId: 'L1', correct: true, today });
    expect(s.phases.P0.completedLabs).toEqual(['L1']);
    expect(s.xp).toBeLessThan(XP.labCompleted);
    expect(s.xp).toBeGreaterThan(0);
  });

  it('una risposta sbagliata al lab non lo completa', () => {
    const s = appReducer(init(), { type: 'LAB_ANSWER', phaseId: 'P0', labId: 'L1', correct: false, today });
    expect(s.phases.P0.completedLabs).toEqual([]);
  });

  it('le risposte ai quiz aggiornano SRS e XP', () => {
    let s = appReducer(init(), { type: 'QUIZ_ANSWER', questionId: 'q1', correct: true, today });
    expect(s.srs.q1.lastCorrect).toBe(true);
    expect(s.xp).toBe(XP.quizCorrect);
    s = appReducer(s, { type: 'QUIZ_ANSWER', questionId: 'q1', correct: false, today });
    expect(s.srs.q1.lastCorrect).toBe(false);
  });

  it('esame superato: fase passata + XP gate', () => {
    const exam = buildExam(phase, undefined, createRng(2));
    const s = appReducer(init(), { type: 'SUBMIT_EXAM', phase, questions: exam, chosen: exam.map((q) => q.correctIndex), today });
    expect(s.phases.P0.passed).toBe(true);
    expect(s.phases.P0.examHistory).toHaveLength(1);
    expect(s.xp).toBe(XP.gatePassed);
    expect(s.phases.P0.recovery).toBeNull();
  });

  it('esame fallito: piano di recupero obbligatorio, poi chiuso smaltendo schede e domande', () => {
    const exam = buildExam(phase, undefined, createRng(2));
    const chosen = exam.map((q) => (q.moduleId === 'P0-m3' ? (q.correctIndex + 1) % 4 : q.correctIndex));
    let s = appReducer(init(), { type: 'SUBMIT_EXAM', phase, questions: exam, chosen, today });
    const plan = s.phases.P0.recovery!;
    expect(s.phases.P0.passed).toBe(false);
    expect(plan.modules).toEqual(['P0-m3']);
    for (const cardId of plan.pendingCards) s = appReducer(s, { type: 'STUDY_CARD', phaseId: 'P0', cardId, correct: true, today });
    // una risposta sbagliata non smaltisce la domanda
    s = appReducer(s, { type: 'QUIZ_ANSWER', questionId: plan.pendingQuestions[0], correct: false, today, phaseId: 'P0' });
    expect(s.phases.P0.recovery!.pendingQuestions).toContain(plan.pendingQuestions[0]);
    for (const questionId of plan.pendingQuestions) s = appReducer(s, { type: 'QUIZ_ANSWER', questionId, correct: true, today, phaseId: 'P0' });
    expect(s.phases.P0.recovery).toBeNull();
  });

  it('seleziona il binario di specializzazione solo una volta (scelta vincolante finché non si resetta)', () => {
    const bp = makeBranchPhase('P2', 'A', 2);
    let s = appReducer(init(), { type: 'SELECT_BRANCH', phaseId: bp.id, branchId: 'x' });
    s = appReducer(s, { type: 'SELECT_BRANCH', phaseId: bp.id, branchId: 'y' });
    expect(s.phases.P2.branchId).toBe('x');
    s = appReducer(s, { type: 'RESET_BRANCH', phaseId: bp.id });
    s = appReducer(s, { type: 'SELECT_BRANCH', phaseId: bp.id, branchId: 'y' });
    expect(s.phases.P2.branchId).toBe('y');
  });

  it('aggiorna le impostazioni AI e aggiunge domande generate senza duplicati', () => {
    let s = appReducer(init(), { type: 'SET_AI', ai: { apiKey: 'k', provider: 'openai' } });
    expect(s.ai.provider).toBe('openai');
    expect(s.ai.apiKey).toBe('k');
    const gq = { ...phase.questions[0], id: 'gen-1', generated: true };
    s = appReducer(s, { type: 'ADD_GENERATED', questions: [gq, gq] });
    expect(s.generatedQuestions).toHaveLength(1);
  });

  it('IMPORT_STATE sostituisce lo stato ma conserva la API key locale', () => {
    let s = appReducer(init(), { type: 'SET_AI', ai: { apiKey: 'mine' } });
    const imported = { ...init(), xp: 1234 };
    s = appReducer(s, { type: 'IMPORT_STATE', state: imported });
    expect(s.xp).toBe(1234);
    expect(s.ai.apiKey).toBe('mine');
  });

  it('RESET riporta allo stato iniziale', () => {
    const s = appReducer({ ...init(), xp: 50 }, { type: 'RESET', today });
    expect(s.xp).toBe(0);
  });
});
