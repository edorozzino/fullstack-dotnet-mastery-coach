import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactElement } from 'react';
import { AppProvider } from '../AppContext';
import { Dashboard } from './Dashboard';
import { PhaseView } from './PhaseView';
import { CompareView } from './CompareView';
import { Header } from '../components/Header';
import { createInitialState } from '../../domain/storage';
import { emptyPhaseProgress } from '../../domain/gate';
import { COMPARISON_TABLE } from '../../data/comparisonTable';
import type { UserState } from '../../domain/types';

const today = '2026-11-19';
const render = (el: ReactElement, state: UserState = createInitialState(today)) =>
  renderToStaticMarkup(<AppProvider initialState={state} storage={null}>{el}</AppProvider>);

describe('Header', () => {
  it('mostra switcher delle tracce, streak, XP e livello', () => {
    const out = render(<Header route={{ name: 'dashboard' }} />);
    expect(out).toContain('.NET &amp; Cloud');
    expect(out).toContain('Frontend');
    expect(out).toContain('Misto Full-Stack');
    expect(out).toContain('Junior Dev');
    expect(out).toContain('XP');
  });
});

describe('Dashboard', () => {
  it('Traccia A: A0 disponibile, A1–A5 bloccate', () => {
    const out = render(<Dashboard />);
    expect(out).toContain('data-phase="A0" data-status="available"');
    expect(out).toContain('data-phase="A1" data-status="locked"');
    expect(out).toContain('data-phase="A5" data-status="locked"');
  });
  it('dopo il gate di A0, A1 risulta disponibile', () => {
    const s = createInitialState(today);
    s.phases.A0 = { ...emptyPhaseProgress(), passed: true };
    const out = render(<Dashboard />, s);
    expect(out).toContain('data-phase="A0" data-status="passed"');
    expect(out).toContain('data-phase="A1" data-status="available"');
  });
  it('in modalità Misto mostra entrambe le tracce', () => {
    const s = { ...createInitialState(today), activeTrack: 'MIX' as const };
    const out = render(<Dashboard />, s);
    expect(out).toContain('data-phase="A0"');
    expect(out).toContain('data-phase="B0"');
  });
});

describe('PhaseView', () => {
  it('una fase bloccata non mostra i contenuti e indica il gate da superare', () => {
    const out = render(<PhaseView phaseId="B1" tab="study" />);
    expect(out).toContain('Fase bloccata');
    expect(out).toContain('B0');
    expect(out).not.toContain('Micro-check');
  });
  it('una fase disponibile mostra schede con i 4 blocchi e il micro-check', () => {
    const out = render(<PhaseView phaseId="A0" tab="study" />);
    expect(out).toContain('Cos&#x27;è in 3 righe');
    expect(out).toContain('Trappola classica');
    expect(out).toContain('Regola d&#x27;oro');
    expect(out).toContain('Micro-check');
  });
  it('il tab esame elenca i requisiti mancanti e non permette di iniziare', () => {
    const out = render(<PhaseView phaseId="A0" tab="exam" />);
    expect(out).toContain('Requisiti mancanti');
    expect(out).toContain('disabled');
  });
  it('A5 chiede di scegliere il binario', () => {
    const s = createInitialState(today);
    ['A0', 'A1', 'A2', 'A3', 'A4'].forEach((id) => (s.phases[id] = { ...emptyPhaseProgress(), passed: true }));
    const out = render(<PhaseView phaseId="A5" tab="study" />, s);
    expect(out).toContain('Scegli il tuo binario');
    expect(out).toContain('AI-Enabled Backend Engineer');
  });
});

describe('CompareView', () => {
  it('renderizza la tabella comparativa React vs Angular vs Vue completa', () => {
    const out = render(<CompareView />);
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/'/g, '&#x27;');
    for (const row of COMPARISON_TABLE) expect(out).toContain(esc(row.aspect));
    expect(out).toContain('React');
    expect(out).toContain('Angular');
    expect(out).toContain('Vue');
  });
});
