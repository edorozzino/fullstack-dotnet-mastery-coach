import { useState } from 'react';
import { TRACKS } from '../../data/curriculum';
import { buildTrainingSession, trainingPool } from '../../domain/training';
import { isDue } from '../../domain/srs';
import { createRng, randomSeed } from '../../domain/random';
import { useApp } from '../AppContext';
import { QuizRunner } from '../components/QuizRunner';
import { Badge, Card, SectionTitle } from '../components/ui';

const SESSION_SIZE = 12;

export function TrainingView() {
  const { state, dispatch, today } = useApp();
  const scope = state.activeTrack;
  const [round, setRound] = useState(0);
  const [session, setSession] = useState(() =>
    buildTrainingSession(TRACKS, state, scope, today(), { size: SESSION_SIZE, rng: createRng(randomSeed()) }),
  );
  const [sessionScope, setSessionScope] = useState(scope);

  // Cambio traccia dall'header → nuova sessione
  if (sessionScope !== scope) {
    setSessionScope(scope);
    setSession(buildTrainingSession(TRACKS, state, scope, today(), { size: SESSION_SIZE, rng: createRng(randomSeed()) }));
    setRound((r) => r + 1);
  }

  const pool = trainingPool(TRACKS, state, scope);
  const now = today();
  const due = pool.filter((q) => state.srs[q.id]?.attempts && isDue(state.srs[q.id], now)).length;
  const label = scope === 'MIX' ? 'Allenamento Misto Full-Stack' : scope === 'A' ? 'Allenamento .NET & Cloud' : 'Allenamento Frontend';

  return (
    <div data-track={scope === 'MIX' ? undefined : scope} className="track-scope grid gap-5">
      <SectionTitle kicker="Spaced Repetition" title={label}>
        Prima le domande in scadenza (le più in ritardo per prime), poi le nuove. Risposta giusta → l'intervallo si allunga (1 → 6 → ~15 giorni…);
        risposta sbagliata → la rivedi domani. {scope === 'MIX' && 'Le domande alternano Traccia A e Traccia B.'}
      </SectionTitle>
      <Card className="flex flex-wrap items-center gap-3">
        <Badge tone="accent">{pool.length} domande nel pool</Badge>
        <Badge tone={due ? 'warn' : 'ok'}>{due} in scadenza oggi</Badge>
        <Badge>{state.generatedQuestions.length} generate dall'AI</Badge>
        <span className="text-xs text-ink-400">Le banche d'esame delle fasi non ancora superate restano escluse.</span>
      </Card>
      <QuizRunner
        key={round}
        questions={session}
        onAnswer={(q, correct) => dispatch({ type: 'QUIZ_ANSWER', questionId: q.id, correct, today: today(), phaseId: q.phaseId })}
        onRestart={() => {
          setSession(buildTrainingSession(TRACKS, state, scope, today(), { size: SESSION_SIZE, rng: createRng(randomSeed()) }));
          setRound((r) => r + 1);
        }}
        emptyTitle="Niente da ripassare per ora"
        emptyText="Hai smaltito tutto il dovuto e le domande nuove: torna domani o sblocca la prossima fase."
      />
    </div>
  );
}
