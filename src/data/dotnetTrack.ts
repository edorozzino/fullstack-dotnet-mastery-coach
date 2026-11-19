import type { Track } from '../domain/types';
import { phaseA0 } from './dotnet/a0';
import { phaseA1 } from './dotnet/a1';
import { phaseA2 } from './dotnet/a2';
import { phaseA3 } from './dotnet/a3';
import { phaseA4 } from './dotnet/a4';
import { phaseA5 } from './dotnet/a5';

export const dotnetTrack: Track = {
  id: 'A',
  title: 'Traccia A — .NET, Cloud & AI Backend Roadmap',
  shortTitle: '.NET & Cloud',
  description: 'Dalle fondamenta di C# moderno fino ad Azure, architetture distribuite e specializzazione.',
  phases: [phaseA0, phaseA1, phaseA2, phaseA3, phaseA4, phaseA5],
};
