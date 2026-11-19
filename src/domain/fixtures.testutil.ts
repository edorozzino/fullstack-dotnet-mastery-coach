import type { CodeLab, ConceptCard, Phase, Question, Track } from './types';

const opts = (correct: number) =>
  [0, 1, 2, 3].map((i) => ({ text: `opt ${i}`, why: i === correct ? 'giusta' : 'sbagliata' }));

export function q(id: string, phaseId: string, moduleId: string, pool: 'training' | 'exam', branchId?: string): Question {
  return { id, phaseId, moduleId, pool, prompt: `Domanda ${id}`, options: opts(1), correctIndex: 1, branchId };
}

export function card(id: string, moduleId: string): ConceptCard {
  return {
    id, moduleId, title: id, summary: 's', code: 'x', codeLang: 'text', trap: 't', goldenRule: 'g',
    check: { question: '?', options: ['a', 'b', 'c', 'd'], correctIndex: 0, explanation: 'e' },
  };
}

export function lab(id: string, phaseId: string, moduleId: string, branchId?: string): CodeLab {
  return {
    id, phaseId, moduleId, branchId, title: id, objective: 'o', scenario: 's', runInstructions: ['r'], steps: ['s'],
    starterCode: '//', codeLang: 'text', hints: ['h1', 'h2'], resultQuestion: '?', options: opts(2), correctIndex: 2,
    solutionCode: '//', explanation: 'e',
  };
}

/** Fase con 3 moduli (m1, m2, m3), 6 training + 7 exam, 3 lab. */
export function makePhase(id: string, trackId: 'A' | 'B', order: number): Phase {
  const mods = ['m1', 'm2', 'm3'].map((m) => `${id}-${m}`);
  const questions: Question[] = [];
  mods.forEach((m, mi) => {
    questions.push(q(`${m}-t1`, id, m, 'training'), q(`${m}-t2`, id, m, 'training'));
    questions.push(q(`${m}-e1`, id, m, 'exam'), q(`${m}-e2`, id, m, 'exam'));
    if (mi === 0) questions.push(q(`${m}-e3`, id, m, 'exam'));
  });
  return {
    id, trackId, order, title: `Fase ${id}`, subtitle: '',
    modules: mods.map((m, i) => ({ id: m, phaseId: id, code: `${id}.${i + 1}`, title: m, topics: [] })),
    cards: mods.map((m) => card(`${m}-card`, m)),
    questions,
    labs: mods.map((m, i) => lab(`${id}-lab${i + 1}`, id, m)),
  };
}

/** Fase con binari: modulo comune assente, ogni binario ha 1 modulo, 1 card, 12 domande, 3 lab. */
export function makeBranchPhase(id: string, trackId: 'A' | 'B', order: number): Phase {
  const branches = ['x', 'y'];
  const p: Phase = {
    id, trackId, order, title: `Fase ${id}`, subtitle: '', modules: [], cards: [], questions: [], labs: [],
    branches: branches.map((b) => ({ id: b, title: `Binario ${b}`, description: '' })),
  };
  for (const b of branches) {
    for (const k of [1, 2]) {
      const m = `${id}-${b}${k}`;
      p.modules.push({ id: m, phaseId: id, code: m, title: m, topics: [], branchId: b });
      p.cards.push({ ...card(`${m}-card`, m) });
      for (let i = 0; i < 3; i++) p.questions.push(q(`${m}-t${i}`, id, m, 'training', b));
      for (let i = 0; i < 5; i++) p.questions.push(q(`${m}-e${i}`, id, m, 'exam', b));
    }
    for (let i = 0; i < 3; i++) p.labs.push(lab(`${id}-${b}-lab${i}`, id, `${id}-${b}1`, b));
  }
  return p;
}

export function makeTrack(): Track {
  return {
    id: 'A', title: 'Traccia test', shortTitle: 'T', description: '',
    phases: [makePhase('P0', 'A', 0), makePhase('P1', 'A', 1), makeBranchPhase('P2', 'A', 2)],
  };
}
