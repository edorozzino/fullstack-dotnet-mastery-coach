/**
 * DSL di authoring del curriculum.
 * Convenzione: nelle opzioni si scrive SEMPRE prima la risposta corretta;
 * il builder la ruota in posizioni diverse in modo deterministico e bilanciato.
 */
import type {
  Branch, ChoiceOption, CodeLab, CodeLang, ConceptCard, LabVerification, Module, Phase, Question, QuestionPool, TrackId,
} from '../domain/types';

export type Opt = [text: string, why: string];

function rotate<T>(items: T[], correctAt: number): { items: T[]; correctIndex: number } {
  // items[0] è la corretta: la spostiamo in posizione correctAt mantenendo l'ordine delle altre.
  const [correct, ...rest] = items;
  const out = [...rest];
  out.splice(correctAt, 0, correct);
  return { items: out, correctIndex: correctAt };
}

interface QInput {
  prompt: string;
  options: [Opt, Opt, Opt, Opt];
  code?: string;
  lang?: CodeLang;
  interview?: boolean;
}

interface CardInput {
  title: string;
  summary: string;
  code: string;
  lang: CodeLang;
  trap: string;
  rule: string;
  check: { q: string; options: [string, string, string, string]; explanation: string };
}

interface LabInput {
  title: string;
  objective: string;
  scenario: string;
  run: string[];
  steps: string[];
  starter: string;
  lang: CodeLang;
  hints: [string, string];
  question: string;
  options: [Opt, Opt, Opt, Opt];
  solution: string;
  explanation: string;
  verify?: LabVerification;
}

export function phaseBuilder(id: string, trackId: TrackId, order: number) {
  const modules: Module[] = [];
  const cards: ConceptCard[] = [];
  const questions: Question[] = [];
  const labs: CodeLab[] = [];
  let counter = order * 3 + (trackId === 'B' ? 1 : 0);
  const nextPos = () => (counter++ * 3 + 1) % 4;
  const mod = (code: string) => {
    const m = modules.find((x) => x.code === code);
    if (!m) throw new Error(`Modulo ${code} non definito in ${id}`);
    return m;
  };
  const toOptions = (opts: Opt[]): ChoiceOption[] => opts.map(([text, why]) => ({ text, why }));

  return {
    module(code: string, title: string, topics: string[], branchId?: string) {
      modules.push({ id: code, phaseId: id, code, title, topics, branchId });
      return this;
    },
    card(code: string, c: CardInput) {
      const m = mod(code);
      const r = rotate(c.check.options, nextPos());
      cards.push({
        id: `${code}-card${cards.filter((x) => x.moduleId === code).length + 1}`,
        moduleId: m.id, title: c.title, summary: c.summary, code: c.code, codeLang: c.lang, trap: c.trap, goldenRule: c.rule,
        check: { question: c.check.q, options: r.items, correctIndex: r.correctIndex, explanation: c.check.explanation },
      });
      return this;
    },
    q(code: string, pool: QuestionPool, input: QInput) {
      const m = mod(code);
      const r = rotate(toOptions(input.options), nextPos());
      questions.push({
        id: `${id}-q${String(questions.length + 1).padStart(2, '0')}`,
        phaseId: id, moduleId: m.id, pool, prompt: input.prompt, code: input.code, codeLang: input.code ? input.lang ?? 'text' : undefined,
        options: r.items, correctIndex: r.correctIndex, interview: input.interview, branchId: m.branchId,
      });
      return this;
    },
    lab(code: string, l: LabInput) {
      const m = mod(code);
      const r = rotate(toOptions(l.options), nextPos());
      labs.push({
        id: `${id}-lab${labs.length + 1}`, phaseId: id, moduleId: m.id, branchId: m.branchId,
        title: l.title, objective: l.objective, scenario: l.scenario, runInstructions: l.run, steps: l.steps,
        starterCode: l.starter, codeLang: l.lang, hints: l.hints, resultQuestion: l.question,
        options: r.items, correctIndex: r.correctIndex, solutionCode: l.solution, explanation: l.explanation, verify: l.verify,
      });
      return this;
    },
    build(meta: { title: string; subtitle: string; branches?: Branch[] }): Phase {
      return { id, trackId, order, title: meta.title, subtitle: meta.subtitle, branches: meta.branches, modules, cards, questions, labs };
    },
  };
}

/** Istruzioni di esecuzione riutilizzabili */
export const RUN = {
  console: [
    'dotnet new console -n CoachLab && cd CoachLab',
    'Sostituisci il contenuto di Program.cs con il codice starter',
    'dotnet run',
  ],
  webapi: [
    'dotnet new web -n CoachApi && cd CoachApi',
    'Sostituisci Program.cs con il codice starter (aggiungi i pacchetti indicati con dotnet add package)',
    'dotnet run e prova gli endpoint con curl o il file .http di Rider/VS',
  ],
  node: ['Salva il codice come lab.mjs', 'node lab.mjs'],
  nodeTs: ['Salva il codice come lab.ts', 'npx tsx lab.ts  (oppure node --experimental-strip-types lab.ts con Node ≥ 22)'],
  react: ['npm create vite@latest lab -- --template react-ts && cd lab && npm i', 'Incolla il componente in src/App.tsx', 'npm run dev e apri la console del browser'],
  angular: ['npx @angular/cli@latest new lab --standalone --defaults && cd lab', 'Incolla il codice nel componente/servizio indicato', 'ng serve e osserva il comportamento nel browser'],
  vue: ['npm create vue@latest lab (abilita TypeScript e Pinia) && cd lab && npm i', 'Incolla il codice nei file indicati', 'npm run dev e apri la console del browser'],
};
