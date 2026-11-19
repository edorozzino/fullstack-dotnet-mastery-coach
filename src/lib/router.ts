export type PhaseTab = 'study' | 'labs' | 'quiz' | 'exam';

export type Route =
  | { name: 'dashboard' }
  | { name: 'phase'; phaseId: string; tab: PhaseTab }
  | { name: 'training' }
  | { name: 'compare' }
  | { name: 'settings' }
  | { name: 'ai' };

const TABS: PhaseTab[] = ['study', 'labs', 'quiz', 'exam'];

export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  switch (parts[0]) {
    case 'phase':
      if (!parts[1]) return { name: 'dashboard' };
      return { name: 'phase', phaseId: parts[1], tab: TABS.includes(parts[2] as PhaseTab) ? (parts[2] as PhaseTab) : 'study' };
    case 'training':
      return { name: 'training' };
    case 'compare':
      return { name: 'compare' };
    case 'settings':
      return { name: 'settings' };
    case 'ai':
      return { name: 'ai' };
    default:
      return { name: 'dashboard' };
  }
}

export function formatHash(route: Route): string {
  switch (route.name) {
    case 'dashboard':
      return '#/';
    case 'phase':
      return `#/phase/${route.phaseId}/${route.tab}`;
    default:
      return `#/${route.name}`;
  }
}
