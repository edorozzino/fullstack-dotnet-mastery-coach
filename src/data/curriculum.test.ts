import { describe, it, expect } from 'vitest';
import { TRACKS, getPhase, allQuestions, allLabs } from './curriculum';
import { COMPARISON_TABLE, FRAMEWORKS } from './comparisonTable';
import { buildExam, phaseContent, EXAM_SIZE } from '../domain/gate';
import { createRng } from '../domain/random';
import type { ChoiceOption, Phase } from '../domain/types';

const trackA = TRACKS.find((t) => t.id === 'A')!;
const trackB = TRACKS.find((t) => t.id === 'B')!;

/** Varianti di contenuto: fasi normali → [undefined]; fase A5 → un binario alla volta. */
const variants = (p: Phase) => (p.branches?.length ? p.branches.map((b) => b.id) : [undefined]);

describe('struttura delle tracce', () => {
  it('Traccia A ha le 6 fasi A0–A5, Traccia B le 5 fasi B0–B4, in ordine', () => {
    expect(trackA.phases.map((p) => p.id)).toEqual(['A0', 'A1', 'A2', 'A3', 'A4', 'A5']);
    expect(trackB.phases.map((p) => p.id)).toEqual(['B0', 'B1', 'B2', 'B3', 'B4']);
    TRACKS.forEach((t) => t.phases.forEach((p, i) => { expect(p.order).toBe(i); expect(p.trackId).toBe(t.id); }));
  });

  it('A0 copre i 6 moduli di C# moderno richiesti', () => {
    expect(getPhase('A0')!.modules).toHaveLength(6);
  });

  it('le fasi Frontend hanno i moduli richiesti (B0–B3: 3, B4: 2) con codici B0.1…', () => {
    expect(trackB.phases.map((p) => p.modules.length)).toEqual([3, 3, 3, 3, 2]);
    expect(getPhase('B0')!.modules.map((m) => m.code)).toEqual(['B0.1', 'B0.2', 'B0.3']);
  });

  it('A5 offre i 3 binari di specializzazione', () => {
    const a5 = getPhase('A5')!;
    expect(a5.branches!.map((b) => b.title).join(' | ')).toMatch(/Cloud.*Full-Stack.*AI/);
    a5.modules.forEach((m) => expect(a5.branches!.some((b) => b.id === m.branchId)).toBe(true));
  });

  it('tutti gli id (fasi, moduli, schede, domande, lab) sono univoci', () => {
    const ids: string[] = [];
    TRACKS.forEach((t) => t.phases.forEach((p) => {
      ids.push(p.id, ...p.modules.map((m) => m.id), ...p.cards.map((c) => c.id), ...p.questions.map((q) => q.id), ...p.labs.map((l) => l.id));
    }));
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('volumi minimi richiesti', () => {
  it('almeno 120 domande e 30 Code Labs in totale', () => {
    expect(allQuestions().length).toBeGreaterThanOrEqual(120);
    expect(allLabs().length).toBeGreaterThanOrEqual(30);
  });

  for (const track of TRACKS) {
    for (const phase of track.phases) {
      for (const branch of variants(phase)) {
        const label = `${phase.id}${branch ? ` [${branch}]` : ''}`;
        it(`${label}: ≥12 domande (training+esame), ≥3 lab, ogni modulo con scheda e domanda d'esame`, () => {
          const c = phaseContent(phase, branch);
          const training = c.questions.filter((q) => q.pool === 'training');
          const exam = c.questions.filter((q) => q.pool === 'exam');
          expect(c.questions.length).toBeGreaterThanOrEqual(12);
          expect(training.length).toBeGreaterThanOrEqual(5);
          expect(exam.length).toBeGreaterThanOrEqual(5);
          expect(c.labs.length).toBeGreaterThanOrEqual(3);
          for (const m of c.modules) {
            expect(c.cards.some((x) => x.moduleId === m.id)).toBe(true);
            expect(exam.some((q) => q.moduleId === m.id)).toBe(true);
            expect(training.some((q) => q.moduleId === m.id)).toBe(true);
          }
        });

        it(`${label}: il Gate Exam si costruisce con ${EXAM_SIZE} domande distinte`, () => {
          const exam = buildExam(phase, branch, createRng(11));
          expect(exam).toHaveLength(EXAM_SIZE);
          expect(new Set(exam.map((q) => q.id)).size).toBe(EXAM_SIZE);
        });
      }
    }
  }
});

const validOptions = (opts: ChoiceOption[]) => {
  expect(opts).toHaveLength(4);
  opts.forEach((o) => { expect(o.text.trim().length).toBeGreaterThan(0); expect(o.why.trim().length).toBeGreaterThan(8); });
  expect(new Set(opts.map((o) => o.text.trim())).size).toBe(4);
};

describe('qualità delle domande', () => {
  it('ogni domanda ha 4 opzioni distinte con spiegazione del Coach e indice corretto valido', () => {
    for (const q of allQuestions()) {
      validOptions(q.options);
      expect(q.correctIndex >= 0 && q.correctIndex <= 3).toBe(true);
      const phase = getPhase(q.phaseId)!;
      const mod = phase.modules.find((m) => m.id === q.moduleId);
      expect(mod).toBeDefined();
      expect(q.branchId).toBe(mod!.branchId);
    }
  });

  it('almeno il 30% sono domande classiche da colloquio', () => {
    const qs = allQuestions();
    expect(qs.filter((q) => q.interview).length / qs.length).toBeGreaterThanOrEqual(0.3);
  });

  it('almeno il 25% delle domande include codice da analizzare', () => {
    const qs = allQuestions();
    expect(qs.filter((q) => q.code).length / qs.length).toBeGreaterThanOrEqual(0.25);
  });

  it('la posizione della risposta corretta è bilanciata (nessun indice sotto il 12%)', () => {
    for (const t of TRACKS) {
      const qs = t.phases.flatMap((p) => p.questions);
      for (let i = 0; i < 4; i++) expect(qs.filter((q) => q.correctIndex === i).length / qs.length).toBeGreaterThanOrEqual(0.12);
    }
  });
});

describe('qualità di schede e lab', () => {
  it('ogni scheda ha i 4 blocchi richiesti e un micro-check valido', () => {
    TRACKS.forEach((t) => t.phases.forEach((p) => p.cards.forEach((c) => {
      [c.summary, c.code, c.trap, c.goldenRule].forEach((s) => expect(s.trim().length).toBeGreaterThan(10));
      expect(c.check.options).toHaveLength(4);
      expect(c.check.correctIndex >= 0 && c.check.correctIndex <= 3).toBe(true);
      expect(p.modules.some((m) => m.id === c.moduleId)).toBe(true);
    })));
  });

  it('ogni Code Lab ha istruzioni, starter, 2 hint, 4 esiti e soluzione commentata', () => {
    for (const l of allLabs()) {
      expect(l.runInstructions.length).toBeGreaterThan(0);
      expect(l.steps.length).toBeGreaterThan(0);
      expect(l.starterCode.trim().length).toBeGreaterThan(20);
      expect(l.hints).toHaveLength(2);
      validOptions(l.options);
      expect(l.solutionCode).toMatch(/\/\/|#|<!--|\/\*/);
      expect(l.explanation.length).toBeGreaterThan(40);
      expect(getPhase(l.phaseId)!.modules.some((m) => m.id === l.moduleId)).toBe(true);
    }
  });

  it('i lab .NET usano C#/Dockerfile/YAML e quelli Frontend JS/TS/TSX/HTML', () => {
    trackA.phases.flatMap((p) => p.labs).forEach((l) => expect(['csharp', 'dockerfile', 'yaml', 'json', 'bash', 'sql']).toContain(l.codeLang));
    trackB.phases.flatMap((p) => p.labs).forEach((l) => expect(['javascript', 'typescript', 'tsx', 'html']).toContain(l.codeLang));
  });
});

describe('tabella comparativa React vs Angular vs Vue (B4)', () => {
  it('copre i 3 framework su almeno 10 aspetti, senza celle vuote', () => {
    expect(FRAMEWORKS.map((f) => f.id)).toEqual(['react', 'angular', 'vue']);
    expect(COMPARISON_TABLE.length).toBeGreaterThanOrEqual(10);
    COMPARISON_TABLE.forEach((row) => FRAMEWORKS.forEach((f) => expect(row[f.id].trim().length).toBeGreaterThan(5)));
  });
});
