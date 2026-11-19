import { describe, it, expect } from 'vitest';
import { highlight } from './highlight';
import { parseHash, formatHash } from './router';
import { copyText } from './clipboard';

describe('highlight', () => {
  it('evidenzia C# con le classi highlight.js', () => {
    const html = highlight('public record Money(decimal Amount);', 'csharp');
    expect(html).toContain('hljs-keyword');
  });
  it('supporta TSX, SQL, YAML, Dockerfile e HTML', () => {
    expect(highlight('const a: number = 1;', 'tsx')).toContain('hljs-');
    expect(highlight('SELECT * FROM t;', 'sql')).toContain('hljs-keyword');
    expect(highlight('services:\n  api: {}', 'yaml')).toContain('hljs-');
    expect(highlight('FROM node:22', 'dockerfile')).toContain('hljs-');
    expect(highlight('<p class="x">a</p>', 'html')).toContain('hljs-tag');
  });
  it('esegue sempre l\'escape dell\'HTML (niente XSS dal codice mostrato)', () => {
    const html = highlight('<img src=x onerror=alert(1)>', 'text');
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
  });
});

describe('router (hash)', () => {
  it('fa il round-trip delle rotte', () => {
    const routes = [
      { name: 'dashboard' },
      { name: 'phase', phaseId: 'A0', tab: 'labs' },
      { name: 'training' },
      { name: 'compare' },
      { name: 'settings' },
      { name: 'ai' },
    ] as const;
    for (const r of routes) expect(parseHash(formatHash(r))).toEqual(r);
  });
  it('hash sconosciuti o vuoti portano alla dashboard', () => {
    expect(parseHash('')).toEqual({ name: 'dashboard' });
    expect(parseHash('#/boh/x')).toEqual({ name: 'dashboard' });
  });
  it('una fase senza tab apre lo studio', () => {
    expect(parseHash('#/phase/B2')).toEqual({ name: 'phase', phaseId: 'B2', tab: 'study' });
  });
});

describe('clipboard', () => {
  it('usa navigator.clipboard quando disponibile', async () => {
    let written = '';
    const ok = await copyText('ciao', { clipboard: { writeText: async (t: string) => { written = t; } } });
    expect(ok).toBe(true);
    expect(written).toBe('ciao');
  });
  it('restituisce false se nessun metodo funziona', async () => {
    const ok = await copyText('ciao', { clipboard: { writeText: async () => { throw new Error('denied'); } } }, null);
    expect(ok).toBe(false);
  });
});
