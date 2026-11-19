import type { CodeLab, Phase, Question, Track, TrackId } from '../domain/types';
import { dotnetTrack } from './dotnetTrack';
import { frontendTrack } from './frontendTrack';

export const TRACKS: Track[] = [dotnetTrack, frontendTrack];

const phaseIndex = new Map<string, Phase>(TRACKS.flatMap((t) => t.phases.map((p) => [p.id, p] as const)));

export function getTrack(id: TrackId): Track {
  return TRACKS.find((t) => t.id === id)!;
}

export function getPhase(id: string): Phase | undefined {
  return phaseIndex.get(id);
}

export function allQuestions(): Question[] {
  return TRACKS.flatMap((t) => t.phases.flatMap((p) => p.questions));
}

export function allLabs(): CodeLab[] {
  return TRACKS.flatMap((t) => t.phases.flatMap((p) => p.labs));
}

export function moduleTitle(moduleId: string): string {
  for (const p of phaseIndex.values()) {
    const m = p.modules.find((x) => x.id === moduleId);
    if (m) return `${m.code} ${m.title}`;
  }
  return moduleId;
}

/** Fase con le domande generate dall'AI incluse (per allenamento e ripasso). */
export function findQuestion(id: string, generated: Question[] = []): Question | undefined {
  return generated.find((q) => q.id === id) ?? allQuestions().find((q) => q.id === id);
}
