import { describe, it, expect } from 'vitest';
import { buildRequest, extractText, parseQuestions, parseLab, generateQuestions, DEFAULT_MODELS, isAiConfigured } from './aiCoach';
import { makePhase } from '../domain/fixtures.testutil';
import type { AiSettings } from '../domain/types';

const anthropic: AiSettings = { provider: 'anthropic', apiKey: 'sk-ant', model: '', baseUrl: '' };
const openai: AiSettings = { provider: 'openai', apiKey: 'sk-oa', model: 'gpt-x', baseUrl: 'https://proxy.local/v1/' };
const phase = makePhase('P0', 'A', 0);

const validQ = {
  moduleId: 'P0-m1',
  prompt: 'Che cosa stampa?',
  code: 'console.log(1)',
  codeLang: 'javascript',
  options: [
    { text: '1', why: 'Corretto: stampa 1.' },
    { text: '2', why: 'No.' },
    { text: 'undefined', why: 'No.' },
    { text: 'Errore', why: 'No.' },
  ],
  correctIndex: 0,
};

describe('configurazione', () => {
  it('senza API key l\'AI Coach è disattivato', () => {
    expect(isAiConfigured({ ...anthropic, apiKey: '' })).toBe(false);
    expect(isAiConfigured(anthropic)).toBe(true);
  });
});

describe('buildRequest', () => {
  it('Anthropic: endpoint messages, header di versione e accesso diretto da browser, modello di default', () => {
    const r = buildRequest(anthropic, 'sys', 'user');
    expect(r.url).toBe('https://api.anthropic.com/v1/messages');
    expect(r.headers['x-api-key']).toBe('sk-ant');
    expect(r.headers['anthropic-version']).toBe('2023-06-01');
    expect(r.headers['anthropic-dangerous-direct-browser-access']).toBe('true');
    const body = JSON.parse(r.body);
    expect(body.model).toBe(DEFAULT_MODELS.anthropic);
    expect(body.system).toBe('sys');
    expect(body.messages).toEqual([{ role: 'user', content: 'user' }]);
  });
  it('OpenAI-compatibile: chat/completions con Bearer e baseUrl personalizzato', () => {
    const r = buildRequest(openai, 'sys', 'user');
    expect(r.url).toBe('https://proxy.local/v1/chat/completions');
    expect(r.headers.Authorization).toBe('Bearer sk-oa');
    const body = JSON.parse(r.body);
    expect(body.model).toBe('gpt-x');
    expect(body.messages[0]).toEqual({ role: 'system', content: 'sys' });
  });
});

describe('extractText', () => {
  it('legge il testo dalle risposte dei due provider', () => {
    expect(extractText('anthropic', { content: [{ type: 'text', text: 'ciao' }] })).toBe('ciao');
    expect(extractText('openai', { choices: [{ message: { content: 'hey' } }] })).toBe('hey');
  });
});

describe('parseQuestions', () => {
  it('accetta JSON dentro un blocco ```json e assegna id/fase', () => {
    const text = 'Ecco:\n```json\n' + JSON.stringify({ questions: [validQ] }) + '\n```';
    const qs = parseQuestions(text, phase);
    expect(qs).toHaveLength(1);
    expect(qs[0].phaseId).toBe('P0');
    expect(qs[0].generated).toBe(true);
    expect(qs[0].pool).toBe('training');
    expect(qs[0].id).toMatch(/^gen-/);
  });
  it('scarta domande malformate (opzioni ≠ 4, indice fuori range, modulo inesistente)', () => {
    const bad = [
      { ...validQ, options: validQ.options.slice(0, 3) },
      { ...validQ, correctIndex: 7 },
      { ...validQ, moduleId: 'boh' },
    ];
    expect(parseQuestions(JSON.stringify({ questions: [...bad, validQ] }), phase)).toHaveLength(1);
  });
  it('restituisce [] se il testo non contiene JSON', () => {
    expect(parseQuestions('mi dispiace', phase)).toEqual([]);
  });
});

describe('parseLab', () => {
  it('valida un Code Lab generato', () => {
    const lab = {
      moduleId: 'P0-m2', title: 'Lab', objective: 'o', scenario: 's', runInstructions: ['node lab.js'], steps: ['1'],
      starterCode: 'x', codeLang: 'javascript', hints: ['h1', 'h2'], resultQuestion: '?', options: validQ.options,
      correctIndex: 0, solutionCode: 'y', explanation: 'e',
    };
    const parsed = parseLab(JSON.stringify(lab), phase);
    expect(parsed?.phaseId).toBe('P0');
    expect(parsed?.id).toMatch(/^gen-lab-/);
    expect(parseLab(JSON.stringify({ ...lab, hints: ['solo uno'] }), phase)).toBeNull();
  });
});

describe('generateQuestions', () => {
  it('chiama fetch e restituisce le domande valide', async () => {
    let calledUrl = '';
    const fakeFetch = async (url: string) => {
      calledUrl = url;
      return { ok: true, status: 200, json: async () => ({ content: [{ type: 'text', text: JSON.stringify({ questions: [validQ] }) }] }) };
    };
    const qs = await generateQuestions(anthropic, phase, { count: 1, focus: 'colloquio' }, fakeFetch);
    expect(calledUrl).toContain('anthropic');
    expect(qs).toHaveLength(1);
  });
  it('propaga un errore leggibile se l\'API risponde con errore', async () => {
    const fakeFetch = async () => ({ ok: false, status: 401, json: async () => ({ error: { message: 'invalid x-api-key' } }) });
    await expect(generateQuestions(anthropic, phase, { count: 1 }, fakeFetch)).rejects.toThrow('401');
  });
});
