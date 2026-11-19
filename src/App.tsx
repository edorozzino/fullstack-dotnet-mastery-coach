import { useSyncExternalStore } from 'react';
import { parseHash, type Route } from './lib/router';
import { useApp } from './ui/AppContext';
import { Header } from './ui/components/Header';
import { Dashboard } from './ui/views/Dashboard';
import { PhaseView } from './ui/views/PhaseView';
import { TrainingView } from './ui/views/TrainingView';
import { CompareView } from './ui/views/CompareView';
import { SettingsView } from './ui/views/SettingsView';
import { AiCoachView } from './ui/views/AiCoachView';

function subscribe(cb: () => void) {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
}
const getHash = () => window.location.hash;

function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, getHash, () => '');
  return parseHash(hash);
}

function View({ route }: { route: Route }) {
  switch (route.name) {
    case 'phase':
      return <PhaseView key={route.phaseId} phaseId={route.phaseId} tab={route.tab} />;
    case 'training':
      return <TrainingView />;
    case 'compare':
      return <CompareView />;
    case 'settings':
      return <SettingsView />;
    case 'ai':
      return <AiCoachView />;
    default:
      return <Dashboard />;
  }
}

export default function App() {
  const route = useRoute();
  const { state } = useApp();

  return (
    <div data-track={state.activeTrack} className="track-scope min-h-screen">
      <Header route={route} />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <View route={route} />
      </main>
      <footer className="mx-auto max-w-7xl px-4 pb-10 pt-4 font-mono text-[11px] text-ink-500">
        FullStack &amp; .NET Mastery Coach · progressi salvati in locale · nessun gate si sblocca senza studio, lab e verifica.
      </footer>
    </div>
  );
}
