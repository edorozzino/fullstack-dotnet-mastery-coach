/**
 * Verifica eseguibile dei Code Labs JS/TS: esegue davvero il codice con Node
 * e controlla che l'output coincida con l'opzione marcata come corretta.
 * Così le risposte del Coach non possono "mentire".
 */
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import ts from 'typescript';
import { allLabs } from './curriculum';

const normalize = (s: string) => s.trim().split('\n').map((l) => l.trimEnd()).join('\n');

function run(code: string, lang: string): string {
  const js = lang === 'typescript'
    ? ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText
    : code;
  const res = spawnSync(process.execPath, ['--input-type=module', '-e', js], { encoding: 'utf8', timeout: 8000 });
  if (res.status !== 0) throw new Error(`exit ${res.status}: ${res.stderr}`);
  return normalize(res.stdout);
}

const verifiable = allLabs().filter((l) => l.verify?.runtime === 'node');

describe('Code Labs eseguibili con Node', () => {
  it('ce ne sono almeno 5', () => {
    expect(verifiable.length).toBeGreaterThanOrEqual(5);
  });

  for (const lab of verifiable) {
    it(`${lab.id} — ${lab.title}`, () => {
      const code = lab.verify!.source === 'starter' ? lab.starterCode : lab.solutionCode;
      const out = run(code, lab.codeLang);
      expect(out).toBe(normalize(lab.options[lab.correctIndex].text));
      lab.options.forEach((o, i) => { if (i !== lab.correctIndex) expect(normalize(o.text)).not.toBe(out); });
    });
  }
});
