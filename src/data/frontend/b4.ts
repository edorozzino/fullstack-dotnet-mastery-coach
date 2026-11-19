import { phaseBuilder, RUN } from '../builders';

const P = phaseBuilder('B4', 'B', 4)
  .module('B4.1', 'Confronto React vs Angular vs Vue', ['modelli di reattività', 'Virtual DOM vs Signals vs Proxy', 'DI', 'forms', 'curva di apprendimento', 'scelta in azienda'])
  .module('B4.2', 'Web Fundamentals, Sicurezza & Performance', ['rendering pipeline', 'CORS', 'XSS', 'CSRF', 'HttpOnly cookie vs localStorage', 'Core Web Vitals', 'code splitting', 'CSR vs SSR/SSG']);

P.card('B4.1', {
  title: 'Tre modelli di reattività a confronto',
  summary: 'React ri-esegue i componenti a ogni cambio di state e riconcilia un Virtual DOM: semplice da ragionare, ottimizzato con memo o con il React Compiler. Angular storicamente usava Zone.js per scoprire quando controllare l\'albero; oggi i Signals danno reattività fine e abilitano le app zoneless. Vue traccia dipendenze tramite Proxy e aggiorna solo i componenti che leggono i dati cambiati.',
  lang: 'typescript',
  code: `// Lo stesso stato derivato nei tre framework

// React — ricalcolato nel render (useMemo se costoso)
const [items, setItems] = useState<Item[]>([]);
const done = useMemo(() => items.filter((i) => i.done).length, [items]);

// Angular — signal + computed
items = signal<Item[]>([]);
done = computed(() => this.items().filter((i) => i.done).length);

// Vue — ref + computed (tracciamento automatico via Proxy)
const items = ref<Item[]>([]);
const done = computed(() => items.value.filter((i) => i.done).length);`,
  trap: 'Rispondere "X è il migliore" a un colloquio: la risposta attesa è un confronto di trade-off (team, dominio, ecosistema, vincoli enterprise) e non una preferenza personale.',
  rule: 'Conosci il modello mentale di ciascuno: React = UI come funzione dello state; Angular = piattaforma opinionated con DI e Signals; Vue = reattività Proxy con API progressiva.',
  check: {
    q: 'Come scopre Vue 3 quali componenti aggiornare quando cambia un dato?',
    options: ['Traccia le letture tramite Proxy durante il render e notifica solo gli effetti dipendenti', 'Confronta l\'intero Virtual DOM dell\'app', 'Usa Zone.js', 'Fa polling ogni 16 ms'],
    explanation: 'Ogni effetto di render registra le dipendenze lette; una scrittura riattiva solo quegli effetti.',
  },
});
P.card('B4.2', {
  title: 'Sicurezza e performance web da colloquio',
  summary: 'XSS: input non fidato eseguito come codice nella pagina; si previene con l\'escaping automatico dei framework, evitando `innerHTML`/`dangerouslySetInnerHTML`/`v-html` con dati utente e con una CSP. CSRF: il browser invia cookie a richieste cross-site; si mitiga con SameSite e token anti-forgery. Performance: Core Web Vitals (LCP, INP, CLS), code splitting, lazy loading, virtualizzazione, SSR/SSG per il primo caricamento.',
  lang: 'typescript',
  code: `// ❌ XSS
el.innerHTML = comment;                         // <img src=x onerror=...> viene eseguito
<div dangerouslySetInnerHTML={{ __html: comment }} />

// ✅ testo, non HTML (escaping automatico)
el.textContent = comment;
<p>{comment}</p>                               // React/Angular/Vue fanno escape di default

// ✅ token di sessione: cookie impostato dal server
// Set-Cookie: session=...; HttpOnly; Secure; SameSite=Lax; Path=/

// ✅ code splitting
const AdminPage = lazy(() => import('./AdminPage'));   // chunk separato`,
  trap: 'Salvare il JWT in localStorage "perché è comodo": qualsiasi XSS (anche da una dipendenza npm compromessa) può leggerlo ed esfiltrarlo.',
  rule: 'Mai HTML non sanificato, CSP restrittiva, token in cookie HttpOnly+Secure+SameSite, misura i Web Vitals prima di ottimizzare.',
  check: {
    q: 'Quale attributo impedisce a JavaScript di leggere un cookie?',
    options: ['HttpOnly', 'Secure', 'SameSite=Strict', 'Path=/'],
    explanation: 'Secure lo limita a HTTPS e SameSite riguarda l\'invio cross-site; solo HttpOnly lo nasconde a document.cookie.',
  },
});

// ─── Domande B4.1 ────────────────────────────────────────────────────────────
P.q('B4.1', 'training', { interview: true, prompt: 'Un grande gruppo bancario con molti team, forti standard e app enterprise longeve chiede quale framework adottare. Quale argomento è più solido?', options: [
  ['Angular: piattaforma opinionated (DI, router, forms, HttpClient, CLI) che uniforma molti team e codebase longeve', 'Corretto: l\'uniformità batteries-included pesa molto in contesti enterprise.'],
  ['Angular perché è più veloce di React in ogni benchmark', 'Le performance dipendono più dall\'app che dal framework.'],
  ['Vue perché non supporta TypeScript', 'Vue supporta pienamente TypeScript.'],
  ['React perché include già router e form ufficiali', 'React è una libreria UI: router e form sono librerie esterne.'],
] });
P.q('B4.1', 'training', { prompt: 'Come si fa Dependency Injection nei tre framework?', options: [
  ['Angular ha un sistema DI gerarchico nativo; Vue usa provide/inject; React usa Context (o librerie esterne)', 'Corretto.'],
  ['Solo Angular supporta qualsiasi forma di DI', 'Vue e React hanno meccanismi equivalenti per passare dipendenze.'],
  ['React ha @Injectable', 'È un decoratore di Angular.'],
  ['Vue usa i decoratori @Inject obbligatori', 'Vue 3 usa le funzioni provide/inject.'],
] });
P.q('B4.1', 'training', { prompt: 'Quale coppia "concetto ↔ equivalente" è corretta?', options: [
  ['React useMemo ↔ Angular computed ↔ Vue computed', 'Corretto: valori derivati memoizzati.'],
  ['React useEffect ↔ Angular computed ↔ Vue computed', 'useEffect è per side effect, non per derivare valori.'],
  ['React useState ↔ Angular effect ↔ Vue watch', 'useState è stato sorgente; effect e watch sono side effect.'],
  ['React Context ↔ Angular @for ↔ Vue v-for', 'Sono concetti non correlati.'],
] });
P.q('B4.1', 'exam', { interview: true, prompt: 'Cosa cambia per Angular con l\'adozione dei Signals e della modalità zoneless?', options: [
  ['La change detection può essere guidata dai signal invece che da Zone.js, aggiornando solo ciò che dipende dai dati cambiati', 'Corretto: meno lavoro per ciclo e niente monkey-patching delle API asincrone.'],
  ['Angular adotta il Virtual DOM di React', 'Angular non usa un Virtual DOM.'],
  ['RxJS viene rimosso da Angular', 'RxJS resta, con interop tramite toSignal/toObservable.'],
  ['I componenti diventano funzioni come in React', 'Restano classi con decoratori.'],
] });
P.q('B4.1', 'exam', { prompt: 'Quale affermazione sui form è corretta?', options: [
  ['Angular offre Reactive e Template-driven Forms nativi; in React si usano spesso librerie (React Hook Form, Formik); Vue usa v-model più librerie di validazione', 'Corretto.'],
  ['React include un modulo form ufficiale con validatori', 'React non ha un modulo form ufficiale completo.'],
  ['Vue non supporta i form', 'v-model è nativo.'],
  ['Angular supporta solo form template-driven', 'Supporta anche i Reactive Forms.'],
] });
P.q('B4.1', 'exam', { interview: true, prompt: 'Qual è la differenza fondamentale nel modello di aggiornamento di React rispetto a Vue?', options: [
  ['React ri-esegue il componente e riconcilia il Virtual DOM; Vue sa quali componenti dipendono dal dato cambiato grazie al tracciamento delle dipendenze', 'Corretto: React è "pull" a livello di componente, Vue "push" a grana fine.'],
  ['Vue non usa nessuna forma di Virtual DOM', 'Vue usa un Virtual DOM ottimizzato dal compilatore.'],
  ['React traccia le dipendenze tramite Proxy', 'React non usa Proxy per lo state.'],
  ['Nessuna differenza', 'I modelli sono diversi.'],
] });

// ─── Domande B4.2 ────────────────────────────────────────────────────────────
P.q('B4.2', 'training', { interview: true, prompt: 'Dove conviene salvare il token di sessione di una SPA dal punto di vista della sicurezza?', options: [
  ['In un cookie HttpOnly, Secure, SameSite impostato dal server (eventualmente tramite BFF)', 'Corretto: non è leggibile da JS, quindi un XSS non può rubarlo.'],
  ['In localStorage', 'Qualsiasi script nella pagina può leggerlo.'],
  ['In una variabile globale window.token', 'Accessibile a qualsiasi script.'],
  ['Nell\'URL come query string', 'Finisce in log, history e header Referer.'],
] });
P.q('B4.2', 'training', { prompt: 'Cosa misura l\'INP (Interaction to Next Paint)?', options: [
  ['La reattività: il tempo tra un\'interazione dell\'utente e il successivo aggiornamento visivo', 'Corretto: ha sostituito il FID tra i Core Web Vitals.'],
  ['Il tempo di caricamento dell\'elemento più grande', 'Quello è LCP.'],
  ['Lo spostamento inatteso del layout', 'Quello è CLS.'],
  ['Il tempo al primo byte', 'Quello è TTFB.'],
] });
P.q('B4.2', 'training', { prompt: 'Una SPA su https://app.contoso.com chiama https://api.contoso.com e il browser blocca la risposta per CORS. Dove si risolve?', options: [
  ['Sul server API, rispondendo con Access-Control-Allow-Origin: https://app.contoso.com (e gestendo il preflight)', 'Corretto: è il server a dichiarare quali origini possono leggere le risposte.'],
  ['Nel frontend aggiungendo l\'header Access-Control-Allow-Origin alla richiesta', 'È un header di risposta: impostarlo nella richiesta non ha effetto.'],
  ['Disabilitando CORS nel browser', 'Non è una soluzione per gli utenti.'],
  ['Usando mode: \'no-cors\' nella fetch', 'Si ottiene una risposta opaca, illeggibile.'],
] });
P.q('B4.2', 'exam', { interview: true, prompt: 'Qual è la differenza tra CSR, SSR e SSG?', options: [
  ['CSR renderizza nel browser; SSR genera l\'HTML sul server per ogni richiesta; SSG lo genera al build time', 'Corretto: SSR/SSG migliorano primo caricamento e SEO, poi l\'app si idrata.'],
  ['SSR significa che l\'app non usa JavaScript', 'Dopo l\'SSR il JS idrata la pagina per renderla interattiva.'],
  ['SSG è sempre la scelta migliore', 'Non adatto a contenuti molto dinamici o personalizzati.'],
  ['CSR ha sempre l\'LCP migliore', 'Il CSR deve scaricare ed eseguire JS prima di mostrare il contenuto.'],
] });
P.q('B4.2', 'exam', { prompt: 'Quale codice React è vulnerabile a XSS se `bio` arriva dall\'utente?', lang: 'tsx', code: `// A
<p>{bio}</p>
// B
<p dangerouslySetInnerHTML={{ __html: bio }} />
// C
<p title={bio}>Profilo</p>`, options: [
  ['Solo B', 'Corretto: dangerouslySetInnerHTML inserisce HTML non sanificato. A e C sono sottoposti a escaping.'],
  ['A e B', 'In A React fa escape del testo.'],
  ['Tutti', 'Gli attributi e il testo vengono gestiti in modo sicuro.'],
  ['Nessuno', 'B è un classico vettore XSS.'],
] });
P.q('B4.2', 'exam', { interview: true, prompt: 'Una lista di 10.000 righe rende la pagina lenta. Qual è l\'ottimizzazione più efficace?', options: [
  ['Virtualizzazione: renderizzare solo le righe visibili (più un piccolo overscan)', 'Corretto: il DOM resta di poche decine di nodi.'],
  ['Aggiungere React.memo a ogni riga', 'Riduce i re-render ma il DOM resta enorme.'],
  ['Usare un font più leggero', 'Non incide sul costo di 10.000 nodi.'],
  ['Spostare il CSS inline', 'Non risolve il problema del numero di nodi.'],
] });

// ─── IDE Code Labs ───────────────────────────────────────────────────────────
P.lab('B4.2', {
  title: 'Mitigare una XSS e gestire in modo sicuro il token',
  objective: 'Rendere sicuro il rendering di contenuti utente e spostare il token di sessione in un cookie HttpOnly.',
  scenario: 'Un commento con `<img src=x onerror=...>` esegue codice nelle pagine degli altri utenti, e il token è in localStorage: l\'attaccante lo ha già esfiltrato.',
  run: RUN.node,
  steps: [
    'Implementa `escapeHtml` per &, <, >, ", \' e usalo nel render dei commenti.',
    'Rimuovi il token da localStorage: il server lo imposterà come cookie.',
    'Implementa `sessionCookie(id)` che costruisce il valore di Set-Cookie con HttpOnly, Secure, SameSite=Lax, Path=/ e Max-Age=3600.',
  ],
  lang: 'javascript',
  starter: `const comment = \`<img src=x onerror="alert('xss')">Ciao\`;

// TODO: rendering non sicuro
const renderComment = (c) => \`<p>\${c}</p>\`;
console.log(renderComment(comment));

// TODO: token leggibile da qualsiasi script della pagina
// localStorage.setItem('token', 'eyJhbGciOi...');
// TODO: function sessionCookie(id) { ... }`,
  hints: [
    'Mappa i caratteri: { \'&\': \'&amp;\', \'<\': \'&lt;\', \'>\': \'&gt;\', \'"\': \'&quot;\', "\'": \'&#39;\' } con una regex /[&<>"\']/g.',
    'Gli attributi del cookie si separano con "; ".',
  ],
  question: 'Cosa stampa la soluzione?',
  options: [
    ['<p>&lt;img src=x onerror=&quot;alert(&#39;xss&#39;)&quot;&gt;Ciao</p>\nSet-Cookie: session=s3cr3t; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=3600', 'Corretto: il commento diventa testo innocuo e il token non è più accessibile a JS.'],
    ['<p><img src=x onerror="alert(\'xss\')">Ciao</p>', 'È lo starter: l\'HTML dell\'attaccante viene inserito così com\'è.'],
    ['<p>&lt;img src=x onerror="alert(\'xss\')"&gt;Ciao</p>\nSet-Cookie: session=s3cr3t; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=3600', 'Anche virgolette e apici vanno sottoposti a escaping (fondamentale negli attributi).'],
    ['<p>&lt;img src=x onerror=&quot;alert(&#39;xss&#39;)&quot;&gt;Ciao</p>\nSet-Cookie: session=s3cr3t; Secure; SameSite=None', 'Senza HttpOnly il cookie resta leggibile da JS; SameSite=None riapre il CSRF.'],
  ],
  solution: `const comment = \`<img src=x onerror="alert('xss')">Ciao\`;

// ✅ escaping dei 5 caratteri speciali HTML: il contenuto resta testo, mai markup
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escapeHtml = (s) => s.replace(/[&<>"']/g, (ch) => ESC[ch]);
const renderComment = (c) => \`<p>\${escapeHtml(c)}</p>\`;
console.log(renderComment(comment));
// Nei framework: {comment} in React, {{ comment }} in Angular/Vue fanno già escape.
// Se DEVI renderizzare HTML utente: sanitizza con DOMPurify + CSP (script-src 'self').

// ✅ token in cookie impostato dal SERVER: invisibile a document.cookie
function sessionCookie(id) {
  return [\`session=\${id}\`, 'HttpOnly', 'Secure', 'SameSite=Lax', 'Path=/', 'Max-Age=3600'].join('; ');
}
console.log(\`Set-Cookie: \${sessionCookie('s3cr3t')}\`);
// HttpOnly → niente furto via XSS; Secure → solo HTTPS; SameSite=Lax → mitiga il CSRF.`,
  explanation: 'Con l\'escaping, `<` e `>` diventano entità e il browser mostra il testo invece di creare un `<img>` con l\'handler onerror. Vanno trattati anche `"` e `\'`, altrimenti un valore inserito in un attributo può chiuderlo e aggiungere handler. Il token in un cookie HttpOnly non è leggibile da JavaScript, quindi anche un eventuale XSS residuo non può esfiltrarlo; SameSite=Lax riduce il rischio CSRF.',
  verify: { runtime: 'node', source: 'solution' },
});
P.lab('B4.2', {
  title: 'Lista pesante: virtualizzazione, memoization e debounce',
  objective: 'Applicare le tre tecniche che risolvono la maggior parte dei problemi di performance delle liste.',
  scenario: 'Una lista di 10.000 elementi con ricerca live: ogni tasto ricalcola il filtro, invia una richiesta e renderizza tutte le righe.',
  run: RUN.node,
  steps: [
    'Implementa `visibleRange(scrollTop, viewport, rowHeight, total, overscan)` per renderizzare solo le righe visibili.',
    'Implementa `memoizeLast(fn)` che riusa il risultato se gli argomenti sono gli stessi (Object.is).',
    'Implementa `debounce(fn, ms)` per inviare la ricerca solo dopo una pausa.',
  ],
  lang: 'javascript',
  starter: `const items = Array.from({ length: 10000 }, (_, i) => \`item \${i}\`);

// TODO 1: renderizza tutto
const rendered = items.length;
console.log(\`righe renderizzate: \${rendered} su \${items.length}\`);

// TODO 2: ricalcola sempre
let computations = 0;
const filterItems = (list, q) => { computations++; return list.filter((x) => x.includes(q)); };
filterItems(items, '99'); filterItems(items, '99'); filterItems(items, '999');
console.log(\`filtri calcolati: \${computations}\`);

// TODO 3: una richiesta per tasto
const sent = [];
const search = (q) => sent.push(q);
search('r'); setTimeout(() => search('re'), 50); setTimeout(() => search('react'), 100);
setTimeout(() => console.log(\`ricerche inviate: \${sent.length} (\${sent.join(',')})\`), 400);`,
  hints: [
    'first = max(0, floor(scrollTop / rowHeight) - overscan); last = min(total - 1, ceil((scrollTop + viewport) / rowHeight) + overscan).',
    'Debounce: `clearTimeout(t); t = setTimeout(() => fn(...args), ms)` ad ogni chiamata.',
  ],
  question: 'Con scrollTop=1000, viewport=400, rowHeight=40, overscan=3 e debounce di 150 ms, cosa stampa la soluzione?',
  options: [
    ['righe renderizzate: 17 su 10000 (22-38)\nfiltri calcolati: 2\nricerche inviate: 1 (react)', 'Corretto: 17 nodi invece di 10.000, il secondo filtro identico viene riusato e il debounce invia solo l\'ultima query.'],
    ['righe renderizzate: 10000 su 10000\nfiltri calcolati: 3\nricerche inviate: 3 (r,re,react)', 'È lo starter senza ottimizzazioni.'],
    ['righe renderizzate: 11 su 10000 (25-35)\nfiltri calcolati: 2\nricerche inviate: 1 (react)', 'Senza overscan; con overscan 3 si aggiungono 3 righe per lato.'],
    ['righe renderizzate: 17 su 10000 (22-38)\nfiltri calcolati: 1\nricerche inviate: 1 (react)', '"999" è un argomento diverso: il filtro va ricalcolato.'],
  ],
  solution: `// ✅ 1. Virtualizzazione: solo le righe nel viewport (+ overscan per uno scroll fluido)
function visibleRange(scrollTop, viewport, rowHeight, total, overscan = 3) {
  const first = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const last = Math.min(total - 1, Math.ceil((scrollTop + viewport) / rowHeight) + overscan);
  return { first, last, count: last - first + 1 };
}

// ✅ 2. Memoization dell'ultimo risultato (come useMemo / computed)
function memoizeLast(fn) {
  let lastArgs = null, lastResult;
  return (...args) => {
    if (lastArgs && args.length === lastArgs.length && args.every((a, i) => Object.is(a, lastArgs[i]))) return lastResult;
    lastArgs = args; lastResult = fn(...args); return lastResult;
  };
}

// ✅ 3. Debounce: esegue solo dopo 'ms' di silenzio
function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

const items = Array.from({ length: 10000 }, (_, i) => \`item \${i}\`);
const r = visibleRange(1000, 400, 40, items.length);
console.log(\`righe renderizzate: \${r.count} su \${items.length} (\${r.first}-\${r.last})\`);

let computations = 0;
const filterItems = memoizeLast((list, q) => { computations++; return list.filter((x) => x.includes(q)); });
filterItems(items, '99'); filterItems(items, '99'); filterItems(items, '999');
console.log(\`filtri calcolati: \${computations}\`);

const sent = [];
const search = debounce((q) => sent.push(q), 150);
search('r'); setTimeout(() => search('re'), 50); setTimeout(() => search('react'), 100);
setTimeout(() => console.log(\`ricerche inviate: \${sent.length} (\${sent.join(',')})\`), 400);
// Nei framework: TanStack Virtual / CDK Virtual Scroll / vue-virtual-scroller, useMemo / computed, debounceTime.`,
  explanation: 'Con scroll a 1000px e righe da 40px la prima riga visibile è la 25 e l\'ultima la 35; con overscan 3 si renderizzano le righe 22–38, cioè 17 nodi. La memoization riconosce la seconda chiamata con gli stessi argomenti (stesso array, stessa stringa) e non ricalcola: 2 calcoli. Il debounce azzera il timer a ogni tasto: parte solo "react", 150 ms dopo l\'ultimo input.',
  verify: { runtime: 'node', source: 'solution' },
});
P.lab('B4.1', {
  title: 'Sfida comparativa: la stessa logica nei tre framework',
  objective: 'Tradurre un contatore filtrato con fetch negli idiomi corretti di React, Angular e Vue.',
  scenario: 'Al colloquio ti chiedono: "carica i todo da un\'API, mostra quanti sono completati e permetti di filtrarli per testo; scrivilo in React, Angular e Vue".',
  run: ['Crea tre progetti (vedi le istruzioni delle fasi B1, B2, B3)', 'Incolla ciascuna sezione nel progetto corrispondente', 'Verifica che il conteggio si aggiorni filtrando e che la fetch venga annullata all\'unmount'],
  steps: [
    'React: useState per sorgente e filtro, useMemo per il derivato, useEffect + AbortController per la fetch.',
    'Angular: signal per il filtro, toSignal(HttpClient) per i dati, computed per il derivato.',
    'Vue: ref per sorgente e filtro, computed per il derivato, fetch in onMounted con cleanup in onUnmounted.',
  ],
  lang: 'typescript',
  starter: `// Completa i TODO nei tre idiomi. API: https://jsonplaceholder.typicode.com/todos?_limit=20
type Todo = { id: number; title: string; completed: boolean };

// ── React ───────────────────────────────────────
export function TodosReact() {
  // TODO: stato todos + filtro, derivati visible/doneCount, fetch con cleanup
  return null;
}

// ── Angular ─────────────────────────────────────
// @Component({ ... })
// export class TodosAngular {
//   TODO: filter signal, todos via toSignal(http.get(...)), computed visible/doneCount
// }

// ── Vue (<script setup lang="ts">) ──────────────
// TODO: ref todos + filter, computed visible/doneCount, fetch in onMounted con AbortController`,
  hints: [
    'Il "derivato" non va MAI salvato in uno state separato sincronizzato con un effect/watch: si calcola (useMemo / computed / computed).',
    'In Angular `toSignal(this.http.get<Todo[]>(url), { initialValue: [] })` si disiscrive da solo; HttpClient annulla la richiesta all\'unsubscribe.',
  ],
  question: 'Quale tabella di corrispondenze rispetta gli idiomi dei tre framework?',
  options: [
    ['Sorgente: useState / signal / ref · Derivato: useMemo / computed / computed · Fetch: useEffect+AbortController / toSignal(HttpClient) / onMounted+AbortController', 'Corretto: stato sorgente minimale, derivati calcolati, side effect con cleanup.'],
    ['Sorgente: useState / signal / ref · Derivato: useEffect+setState / effect+set / watch+assegnazione · Fetch: come sopra', 'Sincronizzare un derivato con un effect crea render extra e stati intermedi incoerenti.'],
    ['Sorgente: useRef / BehaviorSubject / reactive · Derivato: useCallback / pipe(map) / watchEffect · Fetch: in fase di render', 'useRef non provoca render, watchEffect è un side effect e la fetch nel render è un anti-pattern.'],
    ['Sorgente: variabili globali in tutti e tre · Derivato: getter · Fetch: nel costruttore', 'Nessun framework traccerebbe correttamente questi valori.'],
  ],
  solution: `type Todo = { id: number; title: string; completed: boolean };
const URL = 'https://jsonplaceholder.typicode.com/todos?_limit=20';

// ── React ───────────────────────────────────────
import { useEffect, useMemo, useState } from 'react';
export function TodosReact() {
  const [todos, setTodos] = useState<Todo[]>([]);              // sorgente
  const [filter, setFilter] = useState('');
  useEffect(() => {                                           // side effect con cleanup
    const ctrl = new AbortController();
    fetch(URL, { signal: ctrl.signal }).then((r) => r.json()).then(setTodos).catch(() => {});
    return () => ctrl.abort();
  }, []);
  const visible = useMemo(() => todos.filter((t) => t.title.includes(filter)), [todos, filter]); // derivato
  const doneCount = visible.filter((t) => t.completed).length; // derivato economico: niente memo
  return (<><input value={filter} onChange={(e) => setFilter(e.target.value)} /><p>{doneCount}/{visible.length} completati</p></>);
}

// ── Angular ─────────────────────────────────────
// @Component({
//   selector: 'app-todos', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush,
//   template: \`<input [value]="filter()" (input)="filter.set($any($event.target).value)" />
//              <p>{{ doneCount() }}/{{ visible().length }} completati</p>\`,
// })
// export class TodosAngular {
//   private http = inject(HttpClient);
//   filter = signal('');                                                   // sorgente
//   todos = toSignal(this.http.get<Todo[]>(URL), { initialValue: [] });   // fetch: unsubscribe automatico
//   visible = computed(() => this.todos().filter((t) => t.title.includes(this.filter()))); // derivato
//   doneCount = computed(() => this.visible().filter((t) => t.completed).length);
// }

// ── Vue ─────────────────────────────────────────
// <script setup lang="ts">
// import { computed, onMounted, onUnmounted, ref } from 'vue';
// const todos = ref<Todo[]>([]);                                          // sorgente
// const filter = ref('');
// const ctrl = new AbortController();
// onMounted(async () => { try { todos.value = await (await fetch(URL, { signal: ctrl.signal })).json(); } catch {} });
// onUnmounted(() => ctrl.abort());                                        // cleanup
// const visible = computed(() => todos.value.filter((t) => t.title.includes(filter.value))); // derivato
// const doneCount = computed(() => visible.value.filter((t) => t.completed).length);
// </script>
// <template><input v-model="filter" /><p>{{ doneCount }}/{{ visible.length }} completati</p></template>`,
  explanation: 'Il pattern è identico nei tre framework: stato sorgente minimale (todos, filter), valori derivati calcolati in modo dichiarativo e memoizzato, e il side effect (fetch) isolato con la sua cancellazione. Cambiano solo le primitive: hook in React, signal + RxJS interop in Angular, ref/computed + lifecycle hooks in Vue. Sincronizzare i derivati con effect/watch è l\'errore più comune in tutti e tre.',
});

export const phaseB4 = P.build({
  title: 'Confronto Architetturale & Simulazione Colloquio Frontend',
  subtitle: 'React vs Angular vs Vue, sicurezza web e performance: la preparazione finale per il colloquio.',
});
