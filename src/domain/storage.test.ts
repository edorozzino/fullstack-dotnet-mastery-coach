import { describe, it, expect } from 'vitest';
import { createInitialState, exportState, importState, loadState, saveState, STORAGE_KEY, STATE_VERSION } from './storage';

class MemoryStorage {
  map = new Map<string, string>();
  getItem(k: string) { return this.map.get(k) ?? null; }
  setItem(k: string, v: string) { this.map.set(k, v); }
  removeItem(k: string) { this.map.delete(k); }
}

describe('stato iniziale', () => {
  it('parte con 0 XP, streak vuota e traccia A attiva', () => {
    const s = createInitialState('2026-11-19');
    expect(s.version).toBe(STATE_VERSION);
    expect(s.xp).toBe(0);
    expect(s.streak).toEqual({ current: 0, best: 0, lastActiveDate: null });
    expect(s.activeTrack).toBe('A');
    expect(s.ai.provider).toBe('anthropic');
    expect(s.ai.apiKey).toBe('');
  });
});

describe('localStorage', () => {
  it('salva e ricarica lo stato completo', () => {
    const mem = new MemoryStorage();
    const s = { ...createInitialState('2026-11-19'), xp: 420 };
    saveState(mem, s);
    expect(mem.getItem(STORAGE_KEY)).toBeTruthy();
    expect(loadState(mem, '2026-11-19').xp).toBe(420);
  });
  it('se lo storage è vuoto o corrotto torna allo stato iniziale', () => {
    const mem = new MemoryStorage();
    expect(loadState(mem, '2026-11-19').xp).toBe(0);
    mem.setItem(STORAGE_KEY, '{not json');
    expect(loadState(mem, '2026-11-19').xp).toBe(0);
  });
  it('completa campi mancanti di versioni precedenti (migrazione)', () => {
    const mem = new MemoryStorage();
    mem.setItem(STORAGE_KEY, JSON.stringify({ version: 0, xp: 50, phases: {}, srs: {} }));
    const s = loadState(mem, '2026-11-19');
    expect(s.xp).toBe(50);
    expect(s.version).toBe(STATE_VERSION);
    expect(s.generatedQuestions).toEqual([]);
    expect(s.streak.current).toBe(0);
  });
});

describe('export / import JSON', () => {
  it('l\'export non include la API key (sicurezza) e il round-trip conserva i progressi', () => {
    const s = createInitialState('2026-11-19');
    s.xp = 999;
    s.ai.apiKey = 'sk-secret';
    s.phases.A0 = { studiedCards: ['c1'], completedLabs: [], labHintsUsed: {}, examHistory: [], passed: true, recovery: null };
    const json = exportState(s);
    expect(json).not.toContain('sk-secret');
    const res = importState(json, '2026-11-19');
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.state.xp).toBe(999);
      expect(res.state.phases.A0.passed).toBe(true);
    }
  });
  it('rifiuta JSON non valido o con forma sbagliata', () => {
    expect(importState('ciao', '2026-11-19').ok).toBe(false);
    expect(importState(JSON.stringify({ foo: 1 }), '2026-11-19').ok).toBe(false);
    expect(importState(JSON.stringify({ app: 'mastery-coach', state: { xp: 'tanti' } }), '2026-11-19').ok).toBe(false);
  });
});
