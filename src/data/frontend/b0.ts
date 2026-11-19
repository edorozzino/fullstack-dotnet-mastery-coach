import { phaseBuilder, RUN } from '../builders';

const P = phaseBuilder('B0', 'B', 0)
  .module('B0.1', 'Core JS', ['var/let/const', 'closures', 'this binding', 'prototipi', 'destructuring', 'spread/rest', 'immutabilità', 'map/filter/reduce/flatMap'])
  .module('B0.2', 'Asincronia & Event Loop', ['call stack', 'Web APIs', 'microtask queue', 'macrotask queue', 'async/await', 'Promise.all/allSettled/race'])
  .module('B0.3', 'TypeScript per il Frontend', ['interface vs type', 'union/intersection', 'generics', 'Partial/Pick/Omit/Record', 'narrowing', 'unknown vs any']);

P.card('B0.1', {
  title: 'Scope, closures, this e immutabilità',
  summary: '`let`/`const` hanno scope di blocco e TDZ, `var` ha scope di funzione ed è hoistato. Una closure è una funzione che ricorda le variabili dello scope in cui è stata creata. `this` dipende da COME la funzione viene chiamata (le arrow function lo ereditano lessicalmente). Spread e metodi come `map`/`filter` permettono aggiornamenti immutabili.',
  lang: 'javascript',
  code: `function counter() {
  let count = 0;                       // catturata dalla closure
  return { inc: () => ++count, get: () => count };
}
const c = counter(); c.inc(); c.inc(); // c.get() === 2

const user = { name: 'Ada', greet() { return this.name; } };
const greet = user.greet;
greet();                               // undefined (strict) → this non è più user

const next = { ...state, items: [...state.items, newItem] }; // copia superficiale, niente mutazioni
const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);`,
  trap: 'Lo spread è una copia SUPERFICIALE: `{ ...state }` copia il riferimento a `state.items`; fare `next.items.push(x)` muta anche lo state originale.',
  rule: '`const` di default, `let` se riassegni, mai `var`; aggiorna lo stato creando nuovi oggetti a ogni livello modificato.',
  check: {
    q: 'Cosa stampa `for (var i = 0; i < 3; i++) setTimeout(() => console.log(i));`?',
    options: ['3 3 3', '0 1 2', '0 0 0', 'undefined ×3'],
    explanation: 'Con `var` c\'è una sola variabile `i` condivisa: quando i timeout scattano vale 3. Con `let` ogni iterazione ha il proprio binding e si ottiene 0 1 2.',
  },
});
P.card('B0.2', {
  title: 'Event Loop: microtask vs macrotask',
  summary: 'Il codice sincrono gira sul call stack. Le callback delle Promise (`then`, continuazioni di `await`, `queueMicrotask`) vanno nella microtask queue, svuotata COMPLETAMENTE dopo ogni task. `setTimeout`, eventi e I/O sono macrotask: ne viene eseguito uno per giro, poi di nuovo tutte le microtask, poi il rendering.',
  lang: 'javascript',
  code: `console.log('sync 1');
setTimeout(() => console.log('macrotask'), 0);
Promise.resolve().then(() => console.log('microtask'));
console.log('sync 2');
// sync 1 → sync 2 → microtask → macrotask

const [user, orders] = await Promise.all([getUser(), getOrders()]);   // fallisce al primo errore
const results = await Promise.allSettled(urls.map((u) => fetch(u)));  // mai rejected: stato per ciascuno
const fastest = await Promise.race([fetch(url), timeout(3000)]);      // la prima che si risolve o fallisce`,
  trap: 'Un ciclo di microtask che si riaccodano all\'infinito blocca rendering e timer: la pagina si congela anche se "è tutto asincrono".',
  rule: 'Sync → tutte le microtask → un macrotask → render. Usa allSettled quando i risultati sono indipendenti e AbortController per le richieste superate.',
  check: {
    q: 'Dopo `await` in una funzione async, dove viene messa la continuazione?',
    options: ['Nella microtask queue', 'Nella macrotask queue come setTimeout(0)', 'Viene eseguita subito in modo sincrono', 'In un Web Worker'],
    explanation: '`await` si comporta come `.then`: il resto della funzione è una microtask.',
  },
});
P.card('B0.3', {
  title: 'TypeScript: tipi che proteggono il frontend',
  summary: '`interface` è estendibile e fondibile (declaration merging); `type` esprime anche union, intersection, tuple e mapped types. I generics creano funzioni e componenti riusabili mantenendo i tipi. Le utility types derivano tipi da tipi esistenti. `unknown` obbliga al narrowing prima dell\'uso, `any` disattiva il type checker.',
  lang: 'typescript',
  code: `type Status = 'idle' | 'loading' | 'success' | 'error';                // union di letterali
type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string }; // discriminated union

interface User { id: number; name: string; email: string }
type UserPatch = Partial<Pick<User, 'name' | 'email'>>;   // campi opzionali modificabili
type PublicUser = Omit<User, 'email'>;
type ById<T> = Record<number, T>;

function handle(r: ApiResult<User>) {
  if (r.ok) return r.data.name;   // narrowing sul discriminante: qui r.data esiste
  return r.error;
}

function parseJson(text: string): unknown { return JSON.parse(text); } // poi valida!`,
  trap: 'Fare `const user = (await res.json()) as User`: il cast non valida nulla a runtime; se l\'API cambia, l\'errore esplode lontano dal punto d\'ingresso.',
  rule: 'Dati esterni = `unknown` + validazione (type guard/Zod); union discriminate per gli stati; niente `any` nel codice applicativo.',
  check: {
    q: 'Qual è la differenza tra `unknown` e `any`?',
    options: ['unknown richiede un narrowing prima dell\'uso; any disabilita ogni controllo', 'Sono identici', 'any è più sicuro perché accetta tutto', 'unknown esiste solo nei file .d.ts'],
    explanation: 'Con `unknown` il compilatore vieta accessi e chiamate finché non dimostri il tipo.',
  },
});

// ─── Domande ─────────────────────────────────────────────────────────────────
P.q('B0.1', 'training', { interview: true, prompt: 'Cosa stampa?', lang: 'javascript', code: `const fns = [];
for (let i = 0; i < 3; i++) fns.push(() => i);
console.log(fns.map((f) => f()).join(','));`, options: [
  ['0,1,2', 'Corretto: `let` crea un nuovo binding per ogni iterazione, catturato dalla closure.'],
  ['3,3,3', 'Sarebbe l\'output con `var`.'],
  ['undefined,undefined,undefined', 'Le closure catturano i valori corretti di i.'],
  ['ReferenceError', 'i è nello scope del ciclo, accessibile dalle closure.'],
] });
P.q('B0.1', 'exam', { interview: true, prompt: 'Cosa stampa?', lang: 'javascript', code: `const obj = {
  name: 'Ada',
  regular() { return this?.name; },
  arrow: () => this?.name,
};
const { regular } = obj;
console.log(obj.regular(), regular(), obj.arrow());
// in un modulo ES (strict mode, this top-level = undefined)`, options: [
  ['Ada undefined undefined', 'Corretto: chiamata come metodo → this = obj; estratta → this undefined; arrow → this lessicale del modulo.'],
  ['Ada Ada Ada', 'Destrutturare un metodo perde il legame con l\'oggetto e l\'arrow non usa obj come this.'],
  ['Ada Ada undefined', 'La funzione estratta non è più chiamata su obj.'],
  ['TypeError', 'Il `?.` evita l\'errore su this undefined.'],
] });
P.q('B0.1', 'training', { prompt: 'Cosa stampa?', lang: 'javascript', code: `const state = { items: [1, 2] };
const next = { ...state };
next.items.push(3);
console.log(state.items.length);`, options: [
  ['3', 'Corretto: lo spread copia solo il primo livello; items è lo stesso array.'],
  ['2', 'Sarebbe 2 con `{ ...state, items: [...state.items, 3] }`.'],
  ['undefined', 'items esiste in entrambi gli oggetti.'],
  ['TypeError: object is not extensible', 'L\'oggetto non è congelato.'],
] });
P.q('B0.1', 'exam', { prompt: 'Quale espressione produce `[1, 2, 3, 4]` da `[[1, 2], [3], [4]]` in modo idiomatico?', options: [
  ['arr.flat() oppure arr.flatMap((x) => x)', 'Corretto: appiattiscono di un livello.'],
  ['arr.map((x) => x)', 'Restituisce una copia con gli stessi sotto-array.'],
  ['arr.reduce((a, b) => a + b)', 'Il + concatena stringhe: "1,234".'],
  ['arr.join(\',\')', 'Restituisce una stringa.'],
] });
P.q('B0.2', 'training', { interview: true, prompt: 'Qual è l\'ordine di stampa?', lang: 'javascript', code: `setTimeout(() => console.log('timeout'));
Promise.resolve().then(() => console.log('promise'));
console.log('sync');`, options: [
  ['sync, promise, timeout', 'Corretto: prima il codice sincrono, poi le microtask, poi i macrotask.'],
  ['sync, timeout, promise', 'Le microtask vengono svuotate prima del prossimo macrotask.'],
  ['promise, sync, timeout', 'Il `then` è asincrono anche se la Promise è già risolta.'],
  ['timeout, promise, sync', 'Il codice sincrono gira sempre per primo.'],
] });
P.q('B0.2', 'exam', { interview: true, prompt: 'Qual è la differenza tra `Promise.all` e `Promise.allSettled`?', options: [
  ['all rifiuta al primo errore; allSettled attende tutte e restituisce lo stato di ciascuna', 'Corretto: allSettled non viene mai rifiutata.'],
  ['allSettled esegue le promise in sequenza', 'Entrambe attendono promise già avviate in parallelo.'],
  ['all annulla le altre richieste al primo errore', 'Le Promise non sono annullabili: le altre continuano (serve AbortController).'],
  ['Nessuna differenza', 'Gestiscono gli errori in modo opposto.'],
] });
P.q('B0.2', 'training', { prompt: 'Cosa stampa?', lang: 'javascript', code: `async function f() {
  console.log(1);
  await null;
  console.log(3);
}
f();
console.log(2);`, options: [
  ['1 2 3', 'Corretto: il corpo gira in modo sincrono fino al primo await, poi la continuazione è una microtask.'],
  ['1 3 2', 'Anche `await null` cede il controllo al chiamante.'],
  ['2 1 3', 'Chiamare f() esegue subito la parte sincrona.'],
  ['1 2 (3 non viene mai stampato)', 'La continuazione viene eseguita come microtask.'],
] });
P.q('B0.2', 'exam', { prompt: 'Come si implementa un timeout di 3 secondi per una fetch in modo che la richiesta venga davvero annullata?', options: [
  ['fetch(url, { signal: AbortSignal.timeout(3000) })', 'Corretto: il signal annulla la richiesta di rete e la Promise viene rifiutata.'],
  ['Promise.race([fetch(url), sleep(3000)])', 'Restituisce prima, ma la richiesta continua in background.'],
  ['setTimeout(() => fetch.cancel(), 3000)', 'fetch non ha un metodo cancel.'],
  ['fetch(url, { timeout: 3000 })', 'fetch non supporta l\'opzione timeout.'],
] });
P.q('B0.3', 'training', { interview: true, prompt: 'Quando preferire `interface` a `type`?', options: [
  ['Per descrivere forme di oggetti estendibili (anche tramite declaration merging, es. tipi di librerie)', 'Corretto: per union, tuple e tipi derivati serve `type`.'],
  ['Sempre: type è deprecato', 'type è pienamente supportato e necessario per molti costrutti.'],
  ['Quando servono union di stringhe', 'Le union si esprimono con type.'],
  ['Solo nei file .js', 'Sono costrutti TypeScript.'],
] });
P.q('B0.3', 'exam', { prompt: 'Quale tipo rappresenta "un utente con solo name ed email, entrambi opzionali"?', lang: 'typescript', code: `interface User { id: number; name: string; email: string; role: 'admin' | 'user' }`, options: [
  ['Partial<Pick<User, \'name\' | \'email\'>>', 'Corretto: Pick seleziona i campi, Partial li rende opzionali.'],
  ['Pick<Partial<User>, \'id\'>', 'Seleziona id, non name ed email.'],
  ['Omit<User, \'name\' | \'email\'>', 'Rimuove proprio i campi richiesti.'],
  ['Record<\'name\' | \'email\', string>', 'Li rende obbligatori.'],
] });
P.q('B0.3', 'training', { prompt: 'Cosa segnala il compilatore?', lang: 'typescript', code: `function len(x: unknown) {
  return x.length;
}`, options: [
  ['Errore: \'x\' is of type \'unknown\'', 'Corretto: serve un narrowing (es. typeof x === \'string\').'],
  ['Nessun errore', 'Con `any` non ci sarebbe errore, con `unknown` sì.'],
  ['Errore solo a runtime', 'È un errore di compilazione.'],
  ['Warning ma compila', 'È un errore bloccante con strict.'],
] });
P.q('B0.3', 'exam', { interview: true, prompt: 'A cosa serve l\'assegnazione a `never` nel ramo default di uno switch su una discriminated union?', lang: 'typescript', code: `default: {
  const _exhaustive: never = action;
  return _exhaustive;
}`, options: [
  ['Fa fallire la compilazione se un nuovo membro della union non viene gestito', 'Corretto: è un controllo di esaustività.'],
  ['Lancia un\'eccezione a runtime', 'Da solo non lancia nulla.'],
  ['Ottimizza le performance dello switch', 'Non ha effetti sulle performance.'],
  ['Disattiva il type checking nel default', 'Al contrario, lo rafforza.'],
] });

// ─── IDE Code Labs (verificati eseguendo Node) ──────────────────────────────
P.lab('B0.2', {
  title: 'Predici l\'ordine dell\'Event Loop',
  objective: 'Prevedere l\'ordine esatto di esecuzione tra codice sincrono, microtask e macrotask.',
  scenario: 'In un colloquio ti mostrano questo snippet e ti chiedono l\'output prima di eseguirlo. Poi devi spiegare come far apparire un log dopo tutte le microtask.',
  run: RUN.node,
  steps: [
    'Leggi il codice e scrivi su carta l\'ordine previsto.',
    'Esegui con `node lab.mjs` e confronta.',
    'Bonus (nella soluzione): sposta un log in modo che venga eseguito dopo il setTimeout.',
  ],
  lang: 'javascript',
  starter: `console.log('A');
setTimeout(() => console.log('B'), 0);
Promise.resolve()
  .then(() => console.log('C'))
  .then(() => console.log('D'));
queueMicrotask(() => console.log('E'));
(async () => {
  console.log('F');
  await null;
  console.log('G');
})();
console.log('H');`,
  hints: [
    'Prima tutto il sincrono: anche il corpo della async IIFE fino al primo await.',
    'D viene accodata solo quando C è stata eseguita, quindi dopo E e G che erano già in coda.',
  ],
  question: 'Quale output stampa lo snippet (una lettera per riga)?',
  options: [
    ['A\nF\nH\nC\nE\nG\nD\nB', 'Corretto: sync (A F H), microtask in ordine di accodamento (C E G), poi D accodata da C, infine il macrotask B.'],
    ['A\nH\nF\nC\nE\nG\nD\nB', 'Il corpo della funzione async gira subito, prima di H.'],
    ['A\nF\nH\nC\nD\nE\nG\nB', 'D non è in coda finché C non viene eseguita.'],
    ['A\nF\nH\nB\nC\nE\nG\nD', 'Le microtask vengono svuotate prima di qualsiasi macrotask.'],
  ],
  solution: `console.log('A');                              // 1° sync
setTimeout(() => console.log('B'), 0);         // macrotask: dopo TUTTE le microtask
Promise.resolve()
  .then(() => console.log('C'))                // microtask #1 (accodata subito)
  .then(() => console.log('D'));               // accodata solo quando C termina → #4
queueMicrotask(() => console.log('E'));        // microtask #2
(async () => {
  console.log('F');                            // 2° sync: il corpo async parte subito
  await null;                                  // il resto diventa microtask #3
  console.log('G');
})();
console.log('H');                              // 3° sync
// Output: A F H C E G D B

// Bonus: per eseguire qualcosa DOPO B serve un altro macrotask accodato dopo:
// setTimeout(() => console.log('dopo B'), 0);`,
  explanation: 'Il codice sincrono stampa A, F (il corpo della async IIFE gira fino all\'await) e H. A stack vuoto si svuota la microtask queue nell\'ordine di accodamento: C, E, G. L\'esecuzione di C accoda D, che viene eseguita nello stesso svuotamento. Solo allora l\'event loop prende il macrotask del setTimeout: B.',
  verify: { runtime: 'node', source: 'starter' },
});
P.lab('B0.1', {
  title: 'Trasformazioni immutabili e race condition con allSettled + AbortController',
  objective: 'Aggiornare dati senza mutazioni, raccogliere risultati parziali e annullare richieste superate.',
  scenario: 'Una pagina utenti muta lo stato condiviso, perde tutti i profili se uno fallisce e nella ricerca live mostra a volte i risultati di una query vecchia.',
  run: RUN.node,
  steps: [
    'Aggiungi il tag "beta" a tutti gli utenti senza mutare l\'array congelato.',
    'Carica i tre profili con `Promise.allSettled` e stampa valore o messaggio d\'errore.',
    'In `search`, annulla la richiesta precedente con AbortController e ignora gli AbortError.',
  ],
  lang: 'javascript',
  starter: `const users = Object.freeze([
  { id: 1, name: 'Ada', tags: ['admin'] },
  { id: 2, name: 'Linus', tags: [] },
]);

// TODO 1: questo muta lo stato condiviso
users.forEach((u) => u.tags.push('beta'));
console.log(\`originale invariato: \${users[0].tags.length === 1}\`);

const fakeFetch = (label, ms, { signal, fail = false } = {}) =>
  new Promise((resolve, reject) => {
    const t = setTimeout(() => (fail ? reject(new Error(\`boom \${label}\`)) : resolve(label)), ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(t);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });

// TODO 2: un errore fa perdere tutti i profili
try {
  const all = await Promise.all([fakeFetch('p1', 10), fakeFetch('p2', 5, { fail: true }), fakeFetch('p3', 1)]);
  console.log(\`profili: \${all.join(', ')}\`);
} catch (e) {
  console.log(\`profili: errore \${e.message}\`);
}

// TODO 3: race condition — vince chi arriva ultimo, non l'ultima query
let shown = null;
async function search(q, ms) {
  shown = await fakeFetch(q, ms);
}
await Promise.all([search('re', 50), search('rea', 10)]);
console.log(\`mostrato: \${shown}\`);`,
  hints: [
    '`users.map((u) => ({ ...u, tags: [...u.tags, \'beta\'] }))` crea nuovi oggetti E nuovi array.',
    'Tieni il controller in una variabile esterna: `controller?.abort(); controller = new AbortController();` prima di ogni richiesta.',
  ],
  question: 'Cosa stampa la soluzione?',
  options: [
    ['originale invariato: true\ntag: admin+beta | beta\nprofili: p1, boom p2, p3\nannullata: re\nmostrato: rea', 'Corretto: nessuna mutazione, risultati parziali conservati, query vecchia annullata.'],
    ['originale invariato: false\nprofili: errore boom p2\nmostrato: re', 'È lo starter: muta i tag (Object.freeze è superficiale), perde i profili e mostra la query vecchia.'],
    ['originale invariato: true\ntag: admin+beta | beta\nprofili: errore boom p2\nannullata: re\nmostrato: rea', 'Con allSettled l\'errore di p2 non cancella p1 e p3.'],
    ['originale invariato: true\ntag: admin+beta | beta\nprofili: p1, boom p2, p3\nmostrato: re', 'Senza abort vince la risposta più lenta ("re"); con abort "re" viene annullata.'],
  ],
  solution: `const users = Object.freeze([
  { id: 1, name: 'Ada', tags: ['admin'] },
  { id: 2, name: 'Linus', tags: [] },
]);

// ✅ 1. Nuovo array, nuovi oggetti, nuovi array di tag (Object.freeze è solo superficiale!)
const withBeta = users.map((u) => ({ ...u, tags: [...u.tags, 'beta'] }));
console.log(\`originale invariato: \${users[0].tags.length === 1}\`);
console.log(\`tag: \${withBeta.map((u) => u.tags.join('+')).join(' | ')}\`);

const fakeFetch = (label, ms, { signal, fail = false } = {}) =>
  new Promise((resolve, reject) => {
    const t = setTimeout(() => (fail ? reject(new Error(\`boom \${label}\`)) : resolve(label)), ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(t);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });

// ✅ 2. allSettled: ogni risultato ha il suo stato, un errore non cancella gli altri
const settled = await Promise.allSettled([fakeFetch('p1', 10), fakeFetch('p2', 5, { fail: true }), fakeFetch('p3', 1)]);
console.log(\`profili: \${settled.map((r) => (r.status === 'fulfilled' ? r.value : r.reason.message)).join(', ')}\`);

// ✅ 3. Ogni nuova ricerca annulla la precedente: vince sempre l'ULTIMA query
let controller = null;
let shown = null;
async function search(q, ms) {
  controller?.abort();                      // annulla la richiesta in volo
  controller = new AbortController();
  try {
    shown = await fakeFetch(q, ms, { signal: controller.signal });
  } catch (e) {
    if (e.name === 'AbortError') console.log(\`annullata: \${q}\`); // atteso: non è un errore
    else throw e;
  }
}
await Promise.all([search('re', 50), search('rea', 10)]);
console.log(\`mostrato: \${shown}\`);`,
  explanation: 'Object.freeze congela solo il primo livello: gli array tags restano mutabili, quindi lo starter altera lo stato. Con map + spread a ogni livello l\'originale resta intatto. allSettled restituisce lo stato di ogni Promise, così un errore non fa perdere p1 e p3. Infine, la query "re" (lenta) arriverebbe dopo "rea" sovrascrivendo il risultato: abortendo la richiesta precedente si mostra sempre l\'ultima query digitata.',
  verify: { runtime: 'node', source: 'solution' },
});
P.lab('B0.3', {
  title: 'Risposte API e reducer tipizzati con Generics e Utility Types',
  objective: 'Validare dati `unknown`, modellare il risultato con una discriminated union generica e scrivere un reducer esaustivo e immutabile.',
  scenario: 'Il frontend fa `as User[]` sulla risposta API, mette l\'email (dato sensibile) nello state e il reducer muta gli oggetti.',
  run: RUN.nodeTs,
  steps: [
    'Definisci `ApiResult<T>` come union discriminata su `ok`.',
    'Scrivi un type guard `isUserArray` e una funzione generica `parse<T>(raw, guard)`.',
    'Salva nello state solo `Omit<User, \'email\'>` e implementa il reducer con controllo di esaustività `never`.',
  ],
  lang: 'typescript',
  starter: `type User = { id: number; name: string; email: string };
// TODO: ApiResult<T>, PublicUser, State, Action

const raw: any = JSON.parse('[{"id":1,"name":"Ada","email":"a@x.it"},{"id":2,"name":"Linus","email":"l@x.it"}]');
const users = raw as User[];                     // TODO: nessuna validazione!

const state: any = { users: {} };
users.forEach((u) => (state.users[u.id] = u));   // TODO: email nello state + mutazione
state.users[1].name = 'Ada Lovelace';            // TODO: muta lo stato precedente
console.log(Object.values(state.users).map((u: any) => \`\${u.id}:\${u.name}\`).join(','));`,
  hints: [
    '`const isUserArray = (x: unknown): x is User[] => Array.isArray(x) && x.every(...)`',
    'Per togliere l\'email: `res.data.map(({ email: _e, ...pub }) => pub)` ha tipo `Omit<User, \'email\'>[]`.',
  ],
  question: 'Cosa stampa la soluzione?',
  options: [
    ['utenti: 1:Ada,2:Linus\ndopo rename: 1:Ada Lovelace,2:Linus\nstato precedente intatto: true\nerrore: payload non valido\nemail nello state: false', 'Corretto: validazione, immutabilità ed esclusione dell\'email.'],
    ['1:Ada Lovelace,2:Linus', 'È lo starter: un solo log e lo stato mutato sul posto.'],
    ['utenti: 1:Ada,2:Linus\ndopo rename: 1:Ada Lovelace,2:Linus\nstato precedente intatto: false\nerrore: payload non valido\nemail nello state: false', 'Il reducer crea nuovi oggetti: lo stato precedente non cambia.'],
    ['utenti: 1:Ada,2:Linus\ndopo rename: 1:Ada Lovelace,2:Linus\nstato precedente intatto: true\nok\nemail nello state: true', 'Il guard rifiuta { id: \'x\' } e Omit esclude l\'email.'],
  ],
  solution: `type User = { id: number; name: string; email: string };
type PublicUser = Omit<User, 'email'>;                         // ✅ niente dati sensibili nello state
type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string }; // ✅ union discriminata

type State = Readonly<{ users: Readonly<Record<number, PublicUser>>; error: string | null }>;
type Action =
  | { type: 'loaded'; payload: PublicUser[] }
  | { type: 'renamed'; id: number; name: string }
  | { type: 'failed'; error: string };

// ✅ type guard: da unknown a User[] SOLO dopo una verifica a runtime
const isUserArray = (x: unknown): x is User[] =>
  Array.isArray(x) && x.every((u) => typeof u?.id === 'number' && typeof u?.name === 'string');

function parse<T>(raw: unknown, guard: (x: unknown) => x is T): ApiResult<T> {
  return guard(raw) ? { ok: true, data: raw } : { ok: false, error: 'payload non valido' };
}

// ✅ reducer puro, immutabile ed esaustivo
function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'loaded':
      return { ...state, error: null, users: Object.fromEntries(action.payload.map((u) => [u.id, u])) };
    case 'renamed': {
      const current = state.users[action.id];
      if (!current) return state;
      return { ...state, users: { ...state.users, [action.id]: { ...current, name: action.name } } };
    }
    case 'failed':
      return { ...state, error: action.error };
    default: {
      const _exhaustive: never = action;                         // nuovo case non gestito → errore TS
      return _exhaustive;
    }
  }
}

const fmt = (s: State) => Object.values(s.users).map((u) => \`\${u.id}:\${u.name}\`).join(',');

let state: State = { users: {}, error: null };
const res = parse(JSON.parse('[{"id":1,"name":"Ada","email":"a@x.it"},{"id":2,"name":"Linus","email":"l@x.it"}]'), isUserArray);
if (res.ok) state = reducer(state, { type: 'loaded', payload: res.data.map(({ email: _e, ...pub }) => pub) });
console.log(\`utenti: \${fmt(state)}\`);
const renamed = reducer(state, { type: 'renamed', id: 1, name: 'Ada Lovelace' });
console.log(\`dopo rename: \${fmt(renamed)}\`);
console.log(\`stato precedente intatto: \${state.users[1].name === 'Ada'}\`);
const bad = parse({ id: 'x' }, isUserArray);
console.log(bad.ok ? 'ok' : \`errore: \${bad.error}\`);
console.log(\`email nello state: \${'email' in state.users[1]}\`);`,
  explanation: 'Il cast `as User[]` non controlla nulla: il type guard sì, e `parse<T>` restituisce un `ApiResult<T>` che obbliga il chiamante a gestire il caso di errore (narrowing su `ok`). `Omit<User, \'email\'>` impedisce a livello di tipi di salvare l\'email. Il reducer restituisce nuovi oggetti, quindi lo stato precedente resta "Ada" (fondamentale per React, che confronta i riferimenti), e il `never` nel default rende lo switch esaustivo.',
  verify: { runtime: 'node', source: 'solution' },
});

export const phaseB0 = P.build({
  title: 'JavaScript Moderno (ES6+) & TypeScript',
  subtitle: 'Il linguaggio sotto ogni framework: scope, event loop e tipi che reggono in produzione.',
});
