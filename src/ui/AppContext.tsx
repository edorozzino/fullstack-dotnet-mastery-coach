import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import type { UserState } from '../domain/types';
import { appReducer, type Action } from '../domain/reducer';
import { createInitialState, loadState, saveState, type KeyValueStorage } from '../domain/storage';
import { toDay } from '../domain/dates';

interface AppCtx {
  state: UserState;
  dispatch: (action: Action) => void;
  today: () => string;
}

const Ctx = createContext<AppCtx | null>(null);

function browserStorage(): KeyValueStorage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

interface Props {
  children: ReactNode;
  /** Per test e import: stato iniziale esplicito. */
  initialState?: UserState;
  /** null = nessuna persistenza (test); undefined = localStorage del browser. */
  storage?: KeyValueStorage | null;
}

export function AppProvider({ children, initialState, storage }: Props) {
  const store = storage === undefined ? browserStorage() : storage;
  const [state, dispatch] = useReducer(appReducer, undefined, () =>
    initialState ?? (store ? loadState(store, toDay()) : createInitialState(toDay())),
  );

  // Salvataggio automatico ad ogni cambio di stato
  useEffect(() => {
    if (store) saveState(store, state);
  }, [state, store]);

  const value = useMemo<AppCtx>(() => ({ state, dispatch, today: () => toDay() }), [state]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp deve essere usato dentro <AppProvider>');
  return ctx;
}
