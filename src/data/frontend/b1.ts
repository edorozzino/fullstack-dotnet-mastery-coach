import { phaseBuilder, RUN } from '../builders';

const P = phaseBuilder('B1', 'B', 1)
  .module('B1.1', 'Componenti, JSX & State', ['Virtual DOM e reconciliation', 'props vs state', 'rendering dichiarativo', 'lifting state up', 'controlled vs uncontrolled', 'key'])
  .module('B1.2', 'Hooks & Ciclo di Vita', ['useState', 'useEffect e cleanup', 'stale closures', 'useRef', 'useMemo/useCallback', 'custom hooks', 'StrictMode'])
  .module('B1.3', 'Data Fetching & State Management', ['Context API e re-render', 'Zustand', 'Redux Toolkit', 'TanStack Query', 'staleTime', 'invalidazione']);

P.card('B1.1', {
  title: 'Il mental model di React',
  summary: 'Un componente è una funzione pura da props + state a UI. Ad ogni cambio di state React ri-esegue il componente (render), confronta il nuovo albero con il precedente (reconciliation) e applica al DOM solo le differenze. Lo state condiviso va sollevato al più vicino antenato comune; gli input controllati hanno il valore nello state React.',
  lang: 'tsx',
  code: `function Filter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <input value={value} onChange={(e) => onChange(e.target.value)} />; // controlled
}

export function ProductsPage({ products }: { products: Product[] }) {
  const [query, setQuery] = useState('');                       // state sollevato nel padre
  const visible = products.filter((p) => p.name.includes(query)); // stato DERIVATO: calcolato, non salvato
  return (
    <>
      <Filter value={query} onChange={setQuery} />
      <ul>{visible.map((p) => <li key={p.id}>{p.name}</li>)}</ul>  {/* key stabile, non l'indice */}
    </>
  );
}`,
  trap: 'Usare l\'indice come `key` in liste riordinabili o filtrabili: React riusa lo stato del componente sbagliato (input che "saltano" tra righe).',
  rule: 'Lo state minimo indispensabile; tutto ciò che si può calcolare si calcola durante il render. Key stabili e uniche.',
  check: {
    q: 'Cosa provoca `setState` in React?',
    options: ['Pianifica un nuovo render del componente (e dei figli), che React riconcilia con il DOM', 'Aggiorna subito il DOM in modo sincrono', 'Muta la variabile di state nel render corrente', 'Ricarica la pagina'],
    explanation: 'Lo state è uno snapshot per render: il nuovo valore è visibile nel render successivo.',
  },
});
P.card('B1.2', {
  title: 'useEffect, dipendenze, cleanup e stale closures',
  summary: '`useEffect` sincronizza il componente con sistemi esterni (rete, timer, subscription). Si riesegue quando cambiano le dipendenze; la cleanup gira prima della riesecuzione e all\'unmount. Una stale closure si ha quando un effect o callback legge valori di un render vecchio. `useMemo`/`useCallback` servono per stabilità referenziale o calcoli costosi, non "per sicurezza".',
  lang: 'tsx',
  code: `useEffect(() => {
  const id = setInterval(() => setCount((c) => c + 1), 1000); // updater: niente stale closure
  return () => clearInterval(id);                              // cleanup
}, []);

useEffect(() => {
  const ctrl = new AbortController();
  fetch(\`/api/users/\${userId}\`, { signal: ctrl.signal })
    .then((r) => r.json()).then(setUser)
    .catch((e) => { if (e.name !== 'AbortError') setError(e); });
  return () => ctrl.abort();                                   // annulla se userId cambia o unmount
}, [userId]);                                                  // primitive come dipendenze`,
  trap: 'Mettere nelle dipendenze un oggetto o una funzione creati durante il render: cambiano riferimento ad ogni render e l\'effect gira all\'infinito.',
  rule: 'Dipendenze oneste (eslint react-hooks), updater function per lo state precedente, cleanup per ogni subscription. In dev lo StrictMode monta due volte: il codice deve reggerlo.',
  check: {
    q: 'Perché `setInterval(() => setCount(count + 1), 1000)` con deps `[]` si blocca a 1?',
    options: ['La callback ha catturato count = 0 del primo render (stale closure)', 'setInterval non funziona in React', 'React ignora i setState nei timer', 'Perché manca il cleanup'],
    explanation: 'Con deps vuote l\'effect gira una volta e la closure vede sempre count = 0: imposta 1 ogni secondo.',
  },
});
P.card('B1.3', {
  title: 'Server state vs client state',
  summary: 'Lo stato che arriva dal server (liste, dettagli) è una cache: TanStack Query gestisce caching, deduplicazione, refetch, `staleTime` e invalidazione dopo le mutation. Lo stato client globale (tema, carrello locale) può stare in Context, Zustand o Redux Toolkit. Ogni cambio del value di un Context ri-renderizza tutti i suoi consumer.',
  lang: 'tsx',
  code: `const { data, isPending, error } = useQuery({
  queryKey: ['orders', customerId],            // chiave di cache
  queryFn: ({ signal }) => api.getOrders(customerId, signal),
  staleTime: 30_000,                           // per 30s i dati sono "freschi": niente refetch
});

const qc = useQueryClient();
const create = useMutation({
  mutationFn: api.createOrder,
  onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }), // ricarica le liste
});

// Zustand: store minimale con selettori (re-render solo se cambia la slice letta)
const useCart = create<CartState>()((set) => ({ items: [], add: (i) => set((s) => ({ items: [...s.items, i] })) }));
const count = useCart((s) => s.items.length);`,
  trap: 'Un unico Context "AppState" con tutto dentro e value `{...}` ricreato ad ogni render: l\'intera app si ri-renderizza a ogni tasto premuto.',
  rule: 'Server state → TanStack Query; client state globale → store con selettori; Context per valori che cambiano di rado (tema, utente, DI).',
  check: {
    q: 'Cosa significa `staleTime: 30_000` in TanStack Query?',
    options: ['Per 30 secondi i dati in cache sono considerati freschi e non vengono rifetchati automaticamente', 'La cache viene cancellata dopo 30 secondi', 'La richiesta va in timeout dopo 30 secondi', 'Il componente si ri-renderizza ogni 30 secondi'],
    explanation: 'La rimozione dalla cache è regolata da `gcTime`; `staleTime` decide quando i dati vanno rivalidati.',
  },
});

// ─── Domande ─────────────────────────────────────────────────────────────────
P.q('B1.1', 'training', { interview: true, prompt: 'Cosa mostra il bottone dopo UN click?', lang: 'tsx', code: `function Counter() {
  const [n, setN] = useState(0);
  return <button onClick={() => { setN(n + 1); setN(n + 1); setN(n + 1); }}>{n}</button>;
}`, options: [
  ['1', 'Corretto: n è lo snapshot del render (0) in tutte e tre le chiamate. Con `setN((x) => x + 1)` sarebbe 3.'],
  ['3', 'Servirebbe la forma updater, che riceve il valore aggiornato.'],
  ['0', 'Il setState viene applicato al render successivo.'],
  ['Errore: troppi re-render', 'I tre aggiornamenti vengono raggruppati (batching) in un solo render.'],
] });
P.q('B1.1', 'exam', { interview: true, prompt: 'Qual è la differenza tra input controllato e non controllato?', options: [
  ['Controllato: il valore vive nello state React (value + onChange). Non controllato: lo tiene il DOM, letto con ref o FormData', 'Corretto: il controllato abilita validazione e formattazione live.'],
  ['Il non controllato non può essere inviato in un form', 'Si può inviare normalmente.'],
  ['Il controllato non supporta onChange', 'onChange è proprio ciò che aggiorna lo state.'],
  ['Sono la stessa cosa con nomi diversi', 'Cambia chi è la fonte di verità del valore.'],
] });
P.q('B1.1', 'training', { prompt: 'Una lista di input è renderizzata con `key={index}`. Cancelli la prima riga: cosa può succedere?', options: [
  ['Il testo digitato "scivola" sulla riga sbagliata, perché React associa lo stato dei componenti alla posizione', 'Corretto: usa un id stabile come key.'],
  ['Nulla: le key servono solo per le performance', 'Le key determinano l\'identità dei componenti.'],
  ['React lancia un errore', 'Al massimo un warning per key duplicate o mancanti.'],
  ['La lista non si aggiorna', 'Si aggiorna, ma con le associazioni sbagliate.'],
] });
P.q('B1.1', 'exam', { prompt: 'Due componenti fratelli devono condividere il valore di un filtro. Qual è l\'approccio React di base?', options: [
  ['Sollevare lo state nel padre comune e passarlo come props (lifting state up)', 'Corretto: un\'unica fonte di verità.'],
  ['Duplicare lo state in entrambi e sincronizzarlo con useEffect', 'Crea due fonti di verità e bug di sincronizzazione.'],
  ['Usare una variabile globale `let filter`', 'React non saprebbe quando ri-renderizzare.'],
  ['Leggere il valore dal DOM dell\'altro componente', 'Viola il modello dichiarativo.'],
] });
P.q('B1.2', 'training', { interview: true, prompt: 'Perché questo effect va in loop infinito?', lang: 'tsx', code: `const filters = { status: 'open' };
useEffect(() => {
  fetchOrders(filters).then(setOrders);
}, [filters]);`, options: [
  ['filters è un nuovo oggetto ad ogni render: la dipendenza "cambia" sempre e setOrders causa un nuovo render', 'Corretto: usa primitive come dipendenze o useMemo.'],
  ['fetchOrders è asincrona', 'L\'asincronia non causa il loop.'],
  ['Manca il cleanup', 'Il cleanup non impedirebbe il loop.'],
  ['useEffect non accetta oggetti nelle dipendenze', 'Li accetta, confrontandoli per riferimento.'],
] });
P.q('B1.2', 'exam', { interview: true, prompt: 'Quando `useCallback` è davvero utile?', options: [
  ['Quando la funzione è passata a un figlio memoizzato (React.memo) o usata come dipendenza di un effect/hook', 'Corretto: serve per la stabilità referenziale.'],
  ['Sempre, per ogni funzione del componente', 'Aggiunge costo e complessità senza beneficio.'],
  ['Per rendere la funzione asincrona', 'Non cambia la natura della funzione.'],
  ['Per evitare che la funzione venga eseguita', 'Memoizza la funzione, non ne impedisce l\'esecuzione.'],
] });
P.q('B1.2', 'training', { prompt: 'In sviluppo con `<StrictMode>`, un effect con cleanup viene…', options: [
  ['Eseguito, ripulito e rieseguito subito al mount, per far emergere cleanup mancanti', 'Corretto: solo in development.'],
  ['Eseguito una sola volta come in produzione', 'In dev React simula un remount.'],
  ['Disabilitato', 'Gli effect girano normalmente.'],
  ['Eseguito due volte anche in produzione', 'Il doppio mount avviene solo in development.'],
] });
P.q('B1.2', 'exam', { prompt: 'A cosa serve `useRef` oltre a riferire elementi DOM?', options: [
  ['A conservare un valore mutabile tra i render senza provocare re-render', 'Corretto: es. id di timer, valore precedente, flag.'],
  ['A creare state reattivo', 'Modificare ref.current non ri-renderizza.'],
  ['A memoizzare calcoli costosi', 'Quello è useMemo.'],
  ['A condividere dati tra componenti non correlati', 'Quello è il ruolo di Context o di uno store.'],
] });
P.q('B1.3', 'training', { interview: true, prompt: 'Perché TanStack Query è preferibile a useEffect + useState per il server state?', options: [
  ['Gestisce cache, deduplicazione, retry, refetch, stati di caricamento e invalidazione in modo coerente', 'Corretto: evita di reimplementare (male) una cache.'],
  ['Perché useEffect è deprecato', 'useEffect resta l\'API per sincronizzarsi con sistemi esterni.'],
  ['Perché non fa richieste HTTP', 'Usa la queryFn che fornisci.'],
  ['Perché sostituisce il backend', 'È una libreria client.'],
] });
P.q('B1.3', 'exam', { interview: true, prompt: 'Un Context fornisce `value={{ user, theme, setTheme }}`. Qual è il problema di performance?', options: [
  ['L\'oggetto value è nuovo ad ogni render del provider: tutti i consumer si ri-renderizzano anche se nulla è cambiato', 'Corretto: memoizza il value con useMemo o separa i contesti.'],
  ['I Context non supportano funzioni', 'Possono contenere qualsiasi valore.'],
  ['useContext è asincrono', 'È sincrono.'],
  ['Nessun problema', 'Il re-render a cascata è un problema reale su alberi grandi.'],
] });
P.q('B1.3', 'training', { prompt: 'Dopo una mutation che crea un ordine, come si aggiorna la lista in TanStack Query?', options: [
  ['queryClient.invalidateQueries({ queryKey: [\'orders\'] }) in onSuccess', 'Corretto: le query corrispondenti vengono marcate stale e rifetchate.'],
  ['window.location.reload()', 'Ricarica tutta l\'app perdendo lo stato.'],
  ['Chiamando di nuovo useQuery dentro onSuccess', 'Gli hook non si chiamano dentro callback.'],
  ['Non serve: la lista si aggiorna da sola', 'Senza invalidazione o setQueryData resta in cache il dato vecchio.'],
] });
P.q('B1.3', 'exam', { prompt: 'In Zustand, perché scrivere `useCart((s) => s.items.length)` invece di `useCart()`?', options: [
  ['Il componente si ri-renderizza solo quando cambia il valore selezionato, non a ogni cambio dello store', 'Corretto: i selettori limitano i re-render.'],
  ['useCart() senza argomenti non è valido', 'È valido e restituisce l\'intero stato.'],
  ['Per rendere lo store immutabile', 'L\'immutabilità dipende da come scrivi set.'],
  ['Per persistere lo store', 'La persistenza richiede il middleware persist.'],
] });

// ─── IDE Code Labs ───────────────────────────────────────────────────────────
P.lab('B1.2', {
  title: 'Fix di una stale closure e di un loop infinito in useEffect',
  objective: 'Correggere due bug classici di useEffect: closure obsoleta in un timer e dipendenza instabile.',
  scenario: 'Il widget "sessione" ha un contatore fermo a 1 e il tab Network mostra centinaia di richieste a /users/1.',
  run: RUN.react,
  steps: [
    'Incolla lo starter e osserva contatore e tab Network per 5 secondi.',
    'Correggi il timer con la forma updater di setCount.',
    'Correggi l\'effect di fetch usando una dipendenza primitiva e un AbortController nel cleanup.',
  ],
  lang: 'tsx',
  starter: `import { useEffect, useState } from 'react';

type User = { id: number; name: string };

export default function App() {
  const [seconds, setSeconds] = useState(0);
  const [user, setUser] = useState<User | null>(null);
  const options = { id: 1 };

  // BUG 1: stale closure
  useEffect(() => {
    const t = setInterval(() => setSeconds(seconds + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // BUG 2: loop infinito
  useEffect(() => {
    fetch(\`https://jsonplaceholder.typicode.com/users/\${options.id}\`)
      .then((r) => r.json())
      .then(setUser);
  }, [options]);

  return <p>{seconds}s — {user?.name ?? 'caricamento...'}</p>;
}`,
  hints: [
    '`setSeconds((s) => s + 1)` legge sempre il valore più recente, senza dipendere dalla closure.',
    'Dipendi da `userId` (number) invece che da un oggetto ricreato ad ogni render; con AbortController il doppio mount dello StrictMode annulla la prima richiesta.',
  ],
  question: 'Dopo il fix, cosa osservi dopo ~5 secondi (in `npm run dev`, con StrictMode)?',
  options: [
    ['Contatore a ~5s e nome "Leanne Graham"; nel Network una richiesta annullata (StrictMode) e una completata', 'Corretto: updater function e dipendenza stabile; l\'abort gestisce il doppio mount di sviluppo.'],
    ['Contatore fermo a 1s e richieste continue a /users/1', 'È il comportamento dello starter.'],
    ['Contatore a ~5s ma richieste continue a /users/1', 'Con una dipendenza primitiva l\'effect non si riesegue a ogni render.'],
    ['Contatore a ~10s perché lo StrictMode raddoppia gli intervalli', 'Il cleanup elimina il primo intervallo prima del secondo mount.'],
  ],
  solution: `import { useEffect, useState } from 'react';

type User = { id: number; name: string };

export default function App({ userId = 1 }: { userId?: number }) {
  const [seconds, setSeconds] = useState(0);
  const [user, setUser] = useState<User | null>(null);

  // ✅ FIX 1: updater function → nessuna dipendenza dal valore catturato
  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);                 // cleanup: niente intervalli duplicati
  }, []);

  // ✅ FIX 2: dipendenza primitiva + cancellazione
  useEffect(() => {
    const ctrl = new AbortController();
    fetch(\`https://jsonplaceholder.typicode.com/users/\${userId}\`, { signal: ctrl.signal })
      .then((r) => r.json() as Promise<User>)
      .then(setUser)
      .catch((e) => { if (e.name !== 'AbortError') console.error(e); });
    return () => ctrl.abort();                      // userId cambia o unmount → annulla
  }, [userId]);                                     // number: stabile tra i render

  return <p>{seconds}s — {user?.name ?? 'caricamento...'}</p>;
}`,
  explanation: 'Con deps `[]` la callback del timer cattura `seconds = 0` e imposta sempre 1: la forma updater riceve il valore corrente. L\'oggetto `options` è nuovo a ogni render, quindi l\'effect si riesegue a ogni render e `setUser` (nuovo oggetto) ne provoca un altro: loop. Dipendendo da un numero l\'effect gira solo quando cambia. In dev lo StrictMode monta/smonta/rimonta: la prima fetch viene annullata dal cleanup, la seconda completa.',
});
P.lab('B1.3', {
  title: 'Custom Hook `useFetchWithAbort<T>` tipizzato',
  objective: 'Incapsulare fetch, stati di caricamento/errore e cancellazione in un hook generico riusabile.',
  scenario: 'Tre pagine copiano la stessa logica di fetch, nessuna annulla le richieste e cambiando rapidamente utente compaiono i dati sbagliati.',
  run: RUN.react,
  steps: [
    'Definisci il tipo di ritorno come union discriminata: idle/loading/success/error.',
    'Implementa l\'hook con AbortController, ignorando gli AbortError e gestendo `!res.ok`.',
    'Usa l\'hook in App con una select che cambia rapidamente userId (1 → 2).',
  ],
  lang: 'tsx',
  starter: `import { useEffect, useState } from 'react';

// TODO: type FetchState<T> = ...
// TODO: export function useFetchWithAbort<T>(url: string | null): FetchState<T>

type User = { id: number; name: string };

export default function App() {
  const [userId, setUserId] = useState(1);
  const [user, setUser] = useState<any>(null);       // TODO: niente any, usa l'hook
  useEffect(() => {
    fetch(\`https://jsonplaceholder.typicode.com/users/\${userId}\`).then((r) => r.json()).then(setUser);
  }, [userId]);
  return (
    <>
      <select value={userId} onChange={(e) => setUserId(Number(e.target.value))}>
        <option value={1}>1</option><option value={2}>2</option>
      </select>
      <p>{user?.name}</p>
    </>
  );
}`,
  hints: [
    '`type FetchState<T> = { status: \'idle\' } | { status: \'loading\' } | { status: \'success\'; data: T } | { status: \'error\'; error: Error }`.',
    'Nel cleanup chiama `ctrl.abort()`; nel catch, se `e.name === \'AbortError\'` non aggiornare lo state.',
  ],
  question: 'Con l\'hook, passando rapidamente da utente 1 a utente 2, cosa succede?',
  options: [
    ['Viene mostrato solo l\'utente 2; la richiesta per l\'utente 1 risulta "(canceled)" nel Network e non produce errori', 'Corretto: il cleanup annulla la richiesta superata e l\'AbortError viene ignorato.'],
    ['Può comparire l\'utente 1 se la sua risposta arriva per ultima', 'È la race condition dello starter.'],
    ['Viene mostrato un errore "AbortError" all\'utente', 'L\'hook deve ignorare gli AbortError: sono cancellazioni volute.'],
    ['Vengono mostrati entrambi gli utenti in sequenza', 'La risposta annullata non aggiorna lo state.'],
  ],
  solution: `import { useEffect, useState } from 'react';

// ✅ stato come union discriminata: impossibile avere data ed error insieme
export type FetchState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

export function useFetchWithAbort<T>(url: string | null): FetchState<T> {
  const [state, setState] = useState<FetchState<T>>({ status: 'idle' });

  useEffect(() => {
    if (!url) { setState({ status: 'idle' }); return; }
    const ctrl = new AbortController();
    setState({ status: 'loading' });
    fetch(url, { signal: ctrl.signal })
      .then((res) => {
        if (!res.ok) throw new Error(\`HTTP \${res.status}\`);   // fetch non rifiuta sui 4xx/5xx!
        return res.json() as Promise<T>;
      })
      .then((data) => setState({ status: 'success', data }))
      .catch((e: Error) => {
        if (e.name === 'AbortError') return;                    // cancellazione voluta: ignora
        setState({ status: 'error', error: e });
      });
    return () => ctrl.abort();                                  // nuovo url o unmount → annulla
  }, [url]);

  return state;
}

type User = { id: number; name: string };

export default function App() {
  const [userId, setUserId] = useState(1);
  const user = useFetchWithAbort<User>(\`https://jsonplaceholder.typicode.com/users/\${userId}\`);
  return (
    <>
      <select value={userId} onChange={(e) => setUserId(Number(e.target.value))}>
        <option value={1}>1</option><option value={2}>2</option>
      </select>
      {user.status === 'loading' && <p>Caricamento…</p>}
      {user.status === 'error' && <p role="alert">{user.error.message}</p>}
      {user.status === 'success' && <p>{user.data.name}</p>}   {/* narrowing: data esiste */}
    </>
  );
}`,
  explanation: 'Ogni cambio di url esegue il cleanup dell\'effect precedente, che abortisce la richiesta in volo: la sua Promise viene rifiutata con AbortError, che l\'hook ignora. Così l\'ultima selezione vince sempre. Il tipo `FetchState<T>` rende esplicito ogni stato e grazie al narrowing su `status` il componente accede a `data` solo quando esiste. Nota: fetch non rifiuta sugli errori HTTP, va controllato `res.ok`.',
});
P.lab('B1.1', {
  title: 'Eliminare re-render inutili in un albero di componenti',
  objective: 'Misurare e ridurre i re-render di una lista costosa con colocation dello state, React.memo, useMemo e useCallback.',
  scenario: 'In una pagina con 5.000 prodotti, scrivere nel campo "nota" (che non c\'entra con la lista) fa scattare la UI.',
  run: [...RUN.react, 'Apri la console: ogni render della lista stampa "render ProductList"'],
  steps: [
    'Digita 5 caratteri nel campo nota e conta i log "render ProductList".',
    'Avvolgi ProductList in `memo`, stabilizza `visible` con useMemo e `onSelect` con useCallback.',
    'Alternativa ancora migliore: sposta lo state della nota in un componente dedicato (colocation).',
  ],
  lang: 'tsx',
  starter: `import { useState } from 'react';

type Product = { id: number; name: string };
const PRODUCTS: Product[] = Array.from({ length: 5000 }, (_, i) => ({ id: i, name: \`Prodotto \${i}\` }));

function ProductList({ items, onSelect }: { items: Product[]; onSelect: (id: number) => void }) {
  console.log('render ProductList');
  return <ul>{items.slice(0, 50).map((p) => <li key={p.id} onClick={() => onSelect(p.id)}>{p.name}</li>)}</ul>;
}

export default function App() {
  const [query, setQuery] = useState('');
  const [note, setNote] = useState('');
  const [selected, setSelected] = useState<number | null>(null);
  const visible = PRODUCTS.filter((p) => p.name.includes(query));   // nuovo array ad ogni render

  return (
    <>
      <input placeholder="cerca" value={query} onChange={(e) => setQuery(e.target.value)} />
      <input placeholder="nota" value={note} onChange={(e) => setNote(e.target.value)} />
      <p>Selezionato: {selected}</p>
      <ProductList items={visible} onSelect={(id) => setSelected(id)} />  {/* nuova funzione ad ogni render */}
    </>
  );
}`,
  hints: [
    '`React.memo` confronta le props per riferimento: senza useMemo/useCallback riceve sempre props "nuove" e non serve a nulla.',
    '`const onSelect = useCallback((id: number) => setSelected(id), [])` — setSelected è già stabile.',
  ],
  question: 'Dopo l\'ottimizzazione, digitando 5 caratteri nel campo "nota", quanti log "render ProductList" compaiono?',
  options: [
    ['0', 'Corretto: le props di ProductList restano identiche per riferimento, quindi memo salta il render.'],
    ['5 (10 in sviluppo, con i doppi render dello StrictMode)', 'È lo starter: ogni tasto ri-renderizza App e quindi la lista.'],
    ['50', 'Il numero di righe renderizzate non incide sul numero di render del componente.'],
    ['1', 'Nessuna prop della lista cambia mentre si scrive la nota.'],
  ],
  solution: `import { memo, useCallback, useMemo, useState } from 'react';

type Product = { id: number; name: string };
const PRODUCTS: Product[] = Array.from({ length: 5000 }, (_, i) => ({ id: i, name: \`Prodotto \${i}\` }));

// ✅ memo: salta il render se le props sono le stesse (confronto per riferimento)
const ProductList = memo(function ProductList({ items, onSelect }: { items: Product[]; onSelect: (id: number) => void }) {
  console.log('render ProductList');
  return <ul>{items.slice(0, 50).map((p) => <li key={p.id} onClick={() => onSelect(p.id)}>{p.name}</li>)}</ul>;
});

// ✅ colocation: lo state della nota vive qui, non ri-renderizza App
function NoteField() {
  const [note, setNote] = useState('');
  return <input placeholder="nota" value={note} onChange={(e) => setNote(e.target.value)} />;
}

export default function App() {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<number | null>(null);

  // ✅ stesso array finché query non cambia
  const visible = useMemo(() => PRODUCTS.filter((p) => p.name.includes(query)), [query]);
  // ✅ stessa funzione tra i render
  const onSelect = useCallback((id: number) => setSelected(id), []);

  return (
    <>
      <input placeholder="cerca" value={query} onChange={(e) => setQuery(e.target.value)} />
      <NoteField />
      <p>Selezionato: {selected}</p>
      <ProductList items={visible} onSelect={onSelect} />
    </>
  );
}
// Nota: con il React Compiler (React 19) molta di questa memoizzazione diventa automatica.`,
  explanation: 'Nello starter ogni tasto aggiorna lo state di App, che crea un nuovo array `visible` e una nuova arrow function: ProductList riceve props diverse e si ri-renderizza (5 log, 10 con StrictMode). Con useMemo e useCallback le props restano le stesse e `memo` salta il render. Spostare la nota in un componente dedicato è ancora meglio: App non si ri-renderizza affatto.',
});

export const phaseB1 = P.build({
  title: 'React Moderno: Mental Model, Hooks & Performance',
  subtitle: 'Pensare in render, padroneggiare gli effect e ottimizzare solo dove serve.',
});
