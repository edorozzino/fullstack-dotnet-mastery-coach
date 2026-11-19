import type { Track } from '../domain/types';
import { phaseB0 } from './frontend/b0';
import { phaseB1 } from './frontend/b1';
import { phaseB2 } from './frontend/b2';
import { phaseB3 } from './frontend/b3';
import { phaseB4 } from './frontend/b4';

export const frontendTrack: Track = {
  id: 'B',
  title: 'Traccia B — Frontend Moderno Cross-Framework',
  shortTitle: 'Frontend',
  description: 'JavaScript/TypeScript moderno, React, Angular e Vue: padronanza comparativa per colloqui e produzione.',
  phases: [phaseB0, phaseB1, phaseB2, phaseB3, phaseB4],
};
