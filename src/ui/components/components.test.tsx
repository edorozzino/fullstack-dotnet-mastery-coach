import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactElement } from 'react';
import { CodeBlock } from './CodeBlock';
import { InlineText } from './InlineText';
import { OptionList } from './OptionList';
import { GateChecklist } from './GateChecklist';
import { ExamReport } from './ExamReport';
import { requirements, emptyPhaseProgress, gradeExam, buildExam, createRecoveryPlan } from '../../domain/gate';
import { createRng } from '../../domain/random';
import { makePhase } from '../../domain/fixtures.testutil';

const html = (el: ReactElement) => renderToStaticMarkup(el);

describe('CodeBlock', () => {
  it('mostra il codice evidenziato e il pulsante "Copia codice"', () => {
    const out = html(<CodeBlock code={'var x = 1;'} lang="csharp" />);
    expect(out).toContain('Copia codice');
    expect(out).toContain('hljs-keyword');
    expect(out).toContain('csharp');
  });
});

describe('InlineText', () => {
  it('trasforma i `backtick` in <code>', () => {
    const out = html(<InlineText text={'Usa `Task.WhenAll` qui'} />);
    expect(out).toContain('<code');
    expect(out).toContain('Task.WhenAll');
    expect(out).not.toContain('`');
  });
});

describe('OptionList', () => {
  const options = [
    { text: 'A', why: 'perché A è giusta' },
    { text: 'B', why: 'perché B è sbagliata' },
    { text: 'C', why: 'perché C è sbagliata' },
    { text: 'D', why: 'perché D è sbagliata' },
  ];
  it('prima della risposta non rivela le spiegazioni', () => {
    const out = html(<OptionList options={options} correctIndex={0} chosen={null} onChoose={() => {}} />);
    expect(out).not.toContain('perché A');
  });
  it('dopo la risposta mostra il feedback del Coach su tutte e 4 le opzioni', () => {
    const out = html(<OptionList options={options} correctIndex={0} chosen={2} onChoose={() => {}} />);
    for (const o of options) expect(out).toContain(o.why);
    expect(out).toContain('data-state="correct"');
    expect(out).toContain('data-state="wrong"');
  });
  it('in modalità esame non mostra alcun feedback', () => {
    const out = html(<OptionList options={options} correctIndex={0} chosen={2} onChoose={() => {}} hideFeedback />);
    expect(out).not.toContain('perché');
    expect(out).toContain('data-state="selected"');
  });
});

describe('GateChecklist', () => {
  it('mostra i 4 requisiti e lo stato di ciascuno', () => {
    const phase = makePhase('P0', 'A', 0);
    const reqs = requirements(phase, emptyPhaseProgress(), {});
    const out = html(<GateChecklist requirements={reqs} />);
    expect(out).toContain('Schede ripassate');
    expect(out).toContain('IDE Code Labs completati');
    expect(out).toContain('Padronanza Quiz');
    expect(out).toContain('Test di Verifica');
    expect((out.match(/data-done="false"/g) ?? []).length).toBe(4);
  });
});

describe('ExamReport', () => {
  const phase = makePhase('P0', 'A', 0);
  const exam = buildExam(phase, undefined, createRng(4));

  it('pagella promossa: punteggio e moduli', () => {
    const r = gradeExam('P0', exam, exam.map((q) => q.correctIndex), '2026-11-19');
    const out = html(<ExamReport result={r} moduleName={(id) => `Modulo ${id}`} recovery={null} />);
    expect(out).toContain('10/10');
    expect(out).toContain('Superato');
    expect(out).toContain('Modulo P0-m1');
  });

  it('bocciatura: mostra il Piano di Recupero Obbligatorio con i moduli da ripassare', () => {
    const chosen = exam.map((q) => (q.moduleId === 'P0-m2' ? (q.correctIndex + 1) % 4 : q.correctIndex));
    const r = gradeExam('P0', exam, chosen, '2026-11-19');
    const plan = createRecoveryPlan(phase, r, undefined);
    const out = html(<ExamReport result={r} moduleName={(id) => `Modulo ${id}`} recovery={plan} />);
    expect(out).toContain('Non superato');
    expect(out).toContain('Piano di Recupero Obbligatorio');
    expect(out).toContain('Modulo P0-m2');
  });
});
