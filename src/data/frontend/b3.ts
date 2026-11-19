import { phaseBuilder, RUN } from '../builders';

const P = phaseBuilder('B3', 'B', 3)
  .module('B3.1', 'Composition API & Reattività', ['<script setup>', 'ref vs reactive', 'destructuring e toRefs', 'computed', 'watch vs watchEffect'])
  .module('B3.2', 'Comunicazione & Componenti', ['defineProps', 'defineEmits', 'v-model custom / defineModel', 'slots (default, named, scoped)', 'provide/inject', 'composables'])
  .module('B3.3', 'Ecosistema Vue', ['Vue Router', 'navigation guards', 'Pinia: state, getters, actions', 'storeToRefs']);

P.card('B3.1', {
  title: 'Reattività basata su Proxy: ref, reactive, computed, watch',
  summary: '`ref` avvolge qualsiasi valore in un oggetto con `.value` (auto-unwrapped nel template); `reactive` restituisce un Proxy profondo di un oggetto. Vue traccia le letture durante il render/computed e notifica le scritture. `computed` deriva valori memoizzati; `watch` esegue side effect su sorgenti esplicite; `watchEffect` traccia automaticamente ciò che legge.',
  lang: 'html',
  code: `<script setup lang="ts">
import { ref, reactive, computed, watch, toRefs } from 'vue';

const count = ref(0);                          // count.value nello script, {{ count }} nel template
const form = reactive({ email: '', accepted: false });
const { email } = toRefs(form);                // ✅ destructuring che mantiene la reattività
const canSubmit = computed(() => email.value.includes('@') && form.accepted);

watch(email, (nuovo, vecchio) => {             // side effect su una sorgente precisa
  console.log(\`email: \${vecchio} → \${nuovo}\`);
});
</script>

<template>
  <input v-model="form.email" /> <button :disabled="!canSubmit" @click="count++">Invia ({{ count }})</button>
</template>`,
  trap: 'Destrutturare un `reactive` (`const { email } = form`) o riassegnarlo (`form = reactive({...})`): si ottengono valori normali scollegati dal Proxy e la UI smette di aggiornarsi.',
  rule: '`ref` come default, `reactive` per oggetti che non riassegni mai; `toRefs` per destrutturare; `computed` per derivare, `watch` solo per side effect.',
  check: {
    q: 'Perché `const { count } = reactive({ count: 0 })` perde la reattività?',
    options: ['Il destructuring copia il valore primitivo fuori dal Proxy: le letture successive non passano più dal Proxy', 'reactive non supporta i numeri', 'Serve sempre .value', 'È un bug di Vue 3'],
    explanation: 'La reattività di reactive vive nell\'accesso alle proprietà tramite Proxy: `count` è ora un semplice numero.',
  },
});
P.card('B3.2', {
  title: 'Props down, events up, v-model, slots e composables',
  summary: 'Il padre passa dati con le props (in sola lettura per il figlio) e il figlio comunica con eventi tipizzati. `defineModel()` (Vue 3.4+) semplifica il v-model custom. Gli slot permettono al padre di iniettare markup; gli scoped slot ricevono dati dal figlio. `provide/inject` passa dipendenze in profondità; i composables (`useXxx`) riusano logica reattiva.',
  lang: 'html',
  code: `<!-- RatingInput.vue -->
<script setup lang="ts">
const model = defineModel<number>({ required: true });   // v-model="rating" nel padre
const props = defineProps<{ max?: number }>();
const emit = defineEmits<{ (e: 'committed', value: number): void }>();
</script>
<template>
  <button v-for="n in (props.max ?? 5)" :key="n" @click="model = n; emit('committed', n)">
    <slot name="star" :filled="n <= model">{{ n <= model ? '★' : '☆' }}</slot>
  </button>
</template>

<!-- Padre -->
<RatingInput v-model="rating" @committed="save">
  <template #star="{ filled }"><span :class="{ gold: filled }">♥</span></template>
</RatingInput>`,
  trap: 'Modificare direttamente una prop (`props.items.push(...)`): rompe il flusso unidirezionale e, sugli oggetti, muta lo stato del padre di nascosto.',
  rule: 'Props in sola lettura, eventi tipizzati per comunicare verso l\'alto, slot per la composizione, composables per la logica condivisa.',
  check: {
    q: 'A cosa serve uno scoped slot?',
    options: ['A far ricevere al contenuto dello slot dati esposti dal componente figlio', 'A rendere lo slot privato', 'A caricare lo slot in lazy loading', 'A limitare il CSS allo slot'],
    explanation: 'Il figlio passa props allo slot (`<slot :item="item">`) e il padre le usa nel template dello slot.',
  },
});
P.card('B3.3', {
  title: 'Vue Router guards e Pinia',
  summary: 'Vue Router gestisce le rotte, il lazy loading dei componenti e le navigation guards (`beforeEach`, `beforeEnter`) che possono annullare o reindirizzare. Pinia è lo store ufficiale: state, getters (computed) e actions (anche async), tipizzati e modulari. Per destrutturare lo state di uno store mantenendo la reattività si usa `storeToRefs`.',
  lang: 'typescript',
  code: `export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const isLoggedIn = computed(() => user.value !== null);   // getter
  async function login(email: string, password: string) {    // action async
    user.value = await api.login(email, password);
  }
  return { user, isLoggedIn, login };
});

router.beforeEach((to) => {
  const auth = useAuthStore();
  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    return { name: 'login', query: { redirect: to.fullPath } };  // redirect
  }
});

// Nel componente
const auth = useAuthStore();
const { user, isLoggedIn } = storeToRefs(auth);   // ✅ reattivi
const { login } = auth;                          // le action si destrutturano direttamente`,
  trap: '`const { total } = useCartStore()`: lo store è un reactive, quindi il destructuring congela il valore del momento e la UI non si aggiorna più.',
  rule: 'Store piccoli per dominio, getters per i derivati, actions per le mutazioni e l\'I/O; storeToRefs per lo state, destructuring diretto solo per le action.',
  check: {
    q: 'Come si destrutturano state e getters di uno store Pinia mantenendo la reattività?',
    options: ['storeToRefs(store)', 'toRaw(store)', 'Object.assign({}, store)', 'JSON.parse(JSON.stringify(store))'],
    explanation: 'storeToRefs crea ref per state e getters, ignorando le action.',
  },
});

// ─── Domande ─────────────────────────────────────────────────────────────────
P.q('B3.1', 'training', { interview: true, prompt: 'Quando usare `ref` invece di `reactive`?', options: [
  ['Per primitive e per valori che potresti riassegnare interamente; ref è la scelta di default consigliata', 'Corretto: reactive non funziona con primitive e non sopporta la riassegnazione.'],
  ['Mai: reactive è sempre migliore', 'reactive ha limitazioni su primitive, destructuring e riassegnazione.'],
  ['Solo dentro i template', 'ref si usa nello script; nel template è auto-unwrapped.'],
  ['Solo per gli array', 'ref accetta qualsiasi tipo.'],
] });
P.q('B3.1', 'exam', { interview: true, prompt: 'Qual è la differenza tra `computed` e `watch`?', options: [
  ['computed deriva un valore memoizzato e senza side effect; watch esegue side effect quando una sorgente cambia', 'Corretto.'],
  ['watch restituisce un valore da usare nel template', 'watch restituisce una funzione di stop.'],
  ['computed è asincrono', 'computed è sincrono e non dovrebbe fare I/O.'],
  ['Sono intercambiabili', 'Hanno scopi diversi.'],
] });
P.q('B3.1', 'training', { prompt: 'Cosa stampa la console dopo il click (Vue 3)?', lang: 'html', code: `<script setup>
import { ref } from 'vue';
const n = ref(1);
function inc() { n.value++; n.value++; console.log(n.value); }
</script>
<template><button @click="inc">{{ n }}</button></template>`, options: [
  ['3 (e il DOM si aggiorna una volta sola, al prossimo tick)', 'Corretto: le scritture sono sincrone sul ref, il render è raggruppato.'],
  ['1', 'Il valore del ref cambia subito; è il DOM a essere aggiornato in modo asincrono.'],
  ['2', 'Gli incrementi sono due.'],
  ['undefined', 'n.value è un numero.'],
] });
P.q('B3.1', 'exam', { prompt: 'Cosa fa `watchEffect`?', lang: 'typescript', code: `watchEffect(() => {
  document.title = \`\${unread.value} messaggi - \${user.value.name}\`;
});`, options: [
  ['Esegue subito la funzione e la riesegue quando cambia una qualsiasi dipendenza reattiva letta (unread, user)', 'Corretto: tracciamento automatico delle dipendenze.'],
  ['Si esegue solo quando cambia unread', 'Traccia tutto ciò che legge durante l\'esecuzione.'],
  ['Non si esegue finché non cambia qualcosa', 'watchEffect parte subito (a differenza di watch senza immediate).'],
  ['Funziona solo nei template', 'Si usa nello script.'],
] });
P.q('B3.2', 'training', { interview: true, prompt: 'Come comunica un componente figlio con il padre in Vue?', options: [
  ['Emettendo eventi dichiarati con defineEmits (o aggiornando il v-model con defineModel)', 'Corretto: props down, events up.'],
  ['Modificando direttamente le props', 'Le props sono in sola lettura per il figlio.'],
  ['Accedendo a $parent', 'Crea accoppiamento forte ed è sconsigliato.'],
  ['Usando localStorage', 'Non è un meccanismo di comunicazione tra componenti.'],
] });
P.q('B3.2', 'exam', { prompt: 'Con `defineModel()` nel figlio, quale uso nel padre è corretto?', lang: 'html', code: `<!-- Figlio: const title = defineModel<string>('title') -->`, options: [
  ['<Child v-model:title="pageTitle" />', 'Corretto: model con nome "title".'],
  ['<Child :title="pageTitle" />', 'Passa solo il valore, senza ascoltare update:title.'],
  ['<Child v-bind:model="pageTitle" />', 'Non collega il v-model nominato.'],
  ['<Child @title="pageTitle" />', 'Ascolta un evento, non crea un binding bidirezionale.'],
] });
P.q('B3.2', 'training', { prompt: 'Quando usare provide/inject invece delle props?', options: [
  ['Per passare dipendenze a discendenti profondi senza attraversare ogni livello (prop drilling)', 'Corretto: es. tema, servizi, contesto di un form.'],
  ['Sempre, al posto delle props', 'Rende il flusso dei dati meno esplicito.'],
  ['Per comunicare dal figlio al padre', 'Il flusso è dall\'antenato verso i discendenti.'],
  ['Per lo stato globale di tutta l\'app persistito', 'Per lo stato globale si usa Pinia.'],
] });
P.q('B3.2', 'exam', { interview: true, prompt: 'Cos\'è un composable in Vue 3?', options: [
  ['Una funzione (useXxx) che incapsula logica reattiva riusabile usando la Composition API', 'Corretto: l\'equivalente dei custom hooks di React.'],
  ['Un componente senza template', 'È una funzione, non un componente.'],
  ['Un plugin globale', 'I plugin si installano con app.use.'],
  ['Un mixin di Vue 2', 'I composables sostituiscono i mixin con un modello più esplicito.'],
] });
P.q('B3.3', 'training', { interview: true, prompt: 'Come si protegge una rotta che richiede login con Vue Router 4?', options: [
  ['Con una navigation guard (es. router.beforeEach) che restituisce una route di redirect se non autenticato', 'Corretto: restituire false annulla, restituire una location reindirizza.'],
  ['Con v-if nel componente della pagina', 'Il componente e i suoi dati verrebbero comunque caricati.'],
  ['Con CSS display:none', 'Non è una protezione.'],
  ['Non si può fare lato client', 'Si fa lato client per la UX; la sicurezza vera resta lato server.'],
] });
P.q('B3.3', 'exam', { prompt: 'Cosa mostra il template quando `cart.add()` aggiorna il totale?', lang: 'html', code: `<script setup>
const cart = useCartStore();
const { total } = cart;          // total è un getter
</script>
<template><p>{{ total }}</p></template>`, options: [
  ['Il valore iniziale, che non si aggiorna più', 'Corretto: il destructuring di un reactive copia il valore. Serve storeToRefs(cart).'],
  ['Il totale aggiornato', 'La reattività si perde con il destructuring.'],
  ['Un errore di compilazione', 'È valido, ma sbagliato.'],
  ['undefined', 'Il valore iniziale viene letto correttamente.'],
] });
P.q('B3.3', 'training', { prompt: 'In uno store Pinia "setup", cosa corrisponde a un getter?', options: [
  ['Un computed restituito dalla funzione setup', 'Corretto: ref → state, computed → getters, function → actions.'],
  ['Una funzione async', 'Le funzioni sono actions.'],
  ['Un watch', 'I watch non vengono esposti come getter.'],
  ['Un ref', 'I ref sono state.'],
] });
P.q('B3.3', 'exam', { interview: true, prompt: 'Perché caricare le pagine con `component: () => import(\'./views/Admin.vue\')` nel router?', options: [
  ['Lazy loading: il codice della pagina finisce in un chunk separato scaricato solo quando la rotta viene visitata', 'Corretto: riduce il bundle iniziale.'],
  ['Per rendere il componente reattivo', 'La reattività non dipende dall\'import.'],
  ['Perché il router non accetta componenti importati staticamente', 'Li accetta.'],
  ['Per abilitare il SSR', 'Non è un requisito del SSR.'],
] });

// ─── IDE Code Labs ───────────────────────────────────────────────────────────
P.lab('B3.1', {
  title: 'Debug di perdita di reattività su `reactive`',
  objective: 'Individuare perché la UI non si aggiorna e correggere con `toRefs` (o `ref`).',
  scenario: 'Un contatore con passo configurabile non si aggiorna al click, ma nessun errore compare in console.',
  run: [...RUN.vue, 'Incolla il codice in src/App.vue e clicca 3 volte il pulsante'],
  steps: [
    'Clicca 3 volte e osserva entrambi i valori mostrati.',
    'Sostituisci il destructuring con `toRefs(state)` e usa `.value` nello script.',
    'Riprova e confronta.',
  ],
  lang: 'html',
  starter: `<script setup lang="ts">
import { reactive } from 'vue';

const state = reactive({ count: 0, step: 1 });
let { count, step } = state;            // TODO: perché la UI non si aggiorna?

function inc() {
  count += step;
}
</script>

<template>
  <button @click="inc">Valore: {{ count }}</button>
  <p>state.count = {{ state.count }}</p>
</template>`,
  hints: [
    'Il destructuring copia i numeri 0 e 1 in variabili locali: il Proxy non vede più né letture né scritture.',
    '`const { count, step } = toRefs(state)` crea ref collegati alle proprietà: `count.value += step.value` scrive nel Proxy.',
  ],
  question: 'Con la soluzione, dopo 3 click cosa mostra la pagina?',
  options: [
    ['Valore: 3 — state.count = 3', 'Corretto: i ref creati da toRefs sono collegati alle proprietà del reactive.'],
    ['Valore: 0 — state.count = 0', 'È lo starter: count è una variabile locale non reattiva.'],
    ['Valore: 3 — state.count = 0', 'toRefs non copia: legge e scrive direttamente su state.'],
    ['Valore: 0 — state.count = 3', 'Il template legge lo stesso ref aggiornato.'],
  ],
  solution: `<script setup lang="ts">
import { reactive, toRefs } from 'vue';

const state = reactive({ count: 0, step: 1 });
const { count, step } = toRefs(state);   // ✅ ref collegati a state.count e state.step

function inc() {
  count.value += step.value;              // ✅ scrive attraverso il Proxy → la UI si aggiorna
}

// Alternativa più semplice: usare ref fin dall'inizio
// const count = ref(0); const step = ref(1);
</script>

<template>
  <!-- nel template i ref sono auto-unwrapped: niente .value -->
  <button @click="inc">Valore: {{ count }}</button>
  <p>state.count = {{ state.count }}</p>
</template>`,
  explanation: 'La reattività di `reactive` funziona intercettando l\'accesso alle proprietà del Proxy. Destrutturando, `count` e `step` diventano semplici numeri: incrementarli non notifica nessuno, quindi entrambi i valori restano 0. `toRefs` crea per ogni proprietà un ref che legge e scrive `state[key]`: dopo 3 click sia il pulsante sia `state.count` mostrano 3.',
});
P.lab('B3.2', {
  title: 'Composable `useDebouncedSearch` con watch e cleanup',
  objective: 'Creare un composable riusabile con debounce, cancellazione della richiesta superata e stati di caricamento/errore.',
  scenario: 'La ricerca prodotti invia una richiesta per ogni tasto e, smontando il componente durante una richiesta, compare un warning.',
  run: [...RUN.vue, 'Crea src/composables/useDebouncedSearch.ts e usalo in App.vue', 'Digita "vue" velocemente con il tab Network aperto'],
  steps: [
    'Implementa il composable con `watch(query, (q, _old, onCleanup) => { ... })`.',
    'Dentro il watcher avvia un setTimeout e un AbortController; nel cleanup cancella entrambi.',
    'Esponi `results`, `loading`, `error` come ref.',
  ],
  lang: 'typescript',
  starter: `// src/composables/useDebouncedSearch.ts
import { ref, watch, type Ref } from 'vue';

export function useDebouncedSearch<T>(
  query: Ref<string>,
  fetcher: (q: string, signal: AbortSignal) => Promise<T[]>,
  delay = 300,
) {
  const results = ref<T[]>([]) as Ref<T[]>;
  // TODO: loading, error, debounce, cancellazione
  watch(query, async (q) => {
    results.value = await fetcher(q, new AbortController().signal);
  });
  return { results };
}

// App.vue
// const q = ref('');
// const { results } = useDebouncedSearch(q, (q, signal) =>
//   fetch(\`https://dummyjson.com/products/search?q=\${q}\`, { signal }).then(r => r.json()).then(d => d.products));`,
  hints: [
    'Il terzo argomento della callback di watch è `onCleanup`: viene chiamato prima della riesecuzione e quando lo scope viene distrutto.',
    'Nel cleanup: `clearTimeout(timer); ctrl.abort();` — ignora gli AbortError nel catch.',
  ],
  question: 'Con il composable, digitando "vue" velocemente, cosa vedi nel tab Network?',
  options: [
    ['Una sola richiesta, per "vue", partita ~300 ms dopo l\'ultimo tasto', 'Corretto: i timer precedenti vengono cancellati dal cleanup.'],
    ['Tre richieste: "v", "vu", "vue"', 'È lo starter senza debounce.'],
    ['Tre richieste, di cui due "(canceled)"', 'Con il debounce le prime due non partono nemmeno.'],
    ['Nessuna richiesta', 'Dopo la pausa il timer scatta e la richiesta parte.'],
  ],
  solution: `import { ref, watch, type Ref } from 'vue';

export function useDebouncedSearch<T>(
  query: Ref<string>,
  fetcher: (q: string, signal: AbortSignal) => Promise<T[]>,
  delay = 300,
) {
  const results = ref<T[]>([]) as Ref<T[]>;
  const loading = ref(false);
  const error = ref<Error | null>(null);

  watch(query, (q, _old, onCleanup) => {
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {          // ✅ debounce
      if (!q.trim()) { results.value = []; return; }
      loading.value = true;
      error.value = null;
      try {
        results.value = await fetcher(q, ctrl.signal);
      } catch (e) {
        if ((e as Error).name !== 'AbortError') error.value = e as Error; // annullamento = non è un errore
      } finally {
        if (!ctrl.signal.aborted) loading.value = false;
      }
    }, delay);

    onCleanup(() => {                                // ✅ nuovo tasto o unmount
      clearTimeout(timer);                           // il timer pendente non parte
      ctrl.abort();                                  // la richiesta in volo viene annullata
    });
  });

  return { results, loading, error };
}
// Vue 3.5+: in alternativa onWatcherCleanup(() => ...) importato da 'vue'.`,
  explanation: 'Ad ogni tasto il watcher si riesegue, ma prima Vue chiama il cleanup della run precedente: il timeout pendente viene cancellato, quindi solo l\'ultimo valore ("vue") supera i 300 ms e fa partire la fetch. Se l\'utente digita mentre una richiesta è in volo, `abort()` la annulla; lo stesso accade all\'unmount, perché il watcher creato in setup viene fermato e ripulito con il componente.',
});
P.lab('B3.3', {
  title: 'Store Pinia con azioni asincrone e stato derivato',
  objective: 'Implementare uno store carrello con state, getters e actions async, e consumarlo senza perdere la reattività.',
  scenario: 'Il badge del carrello resta a 0 anche dopo aver aggiunto prodotti, e il caricamento iniziale non mostra errori.',
  run: [...RUN.vue, 'Crea src/stores/cart.ts e usa lo store in App.vue'],
  steps: [
    'Definisci uno store setup con `items`, `status`, i getter `total` e `count`, le actions `load()` e `add()`.',
    'In `add`, se il prodotto esiste incrementa la quantità in modo immutabile.',
    'Nel componente usa `storeToRefs` per state e getters.',
  ],
  lang: 'typescript',
  starter: `// src/stores/cart.ts
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

export type CartItem = { id: number; name: string; price: number; qty: number };

export const useCartStore = defineStore('cart', () => {
  const items = ref<CartItem[]>([]);
  // TODO: status, total, count, load(), add()
  return { items };
});

// App.vue (script setup)
// const cart = useCartStore();
// const { total, count } = cart;                // TODO: perde la reattività!
// onMounted(async () => { await cart.load(); cart.add({ id: 2, name: 'Mouse', price: 5 }); });
// <p>Totale: {{ total }} € · Articoli: {{ count }}</p>`,
  hints: [
    '`load` simula l\'API restituendo [{ id: 1, name: \'Tastiera\', price: 10, qty: 2 }, { id: 2, name: \'Mouse\', price: 5, qty: 1 }].',
    '`const { total, count } = storeToRefs(cart)`; le actions (`load`, `add`) si possono destrutturare direttamente.',
  ],
  question: 'Con la soluzione, dopo load() e add(Mouse), cosa mostra il paragrafo?',
  options: [
    ['Totale: 30 € · Articoli: 4', 'Corretto: 10×2 + 5×2 = 30, quantità 2 + 2 = 4.'],
    ['Totale: 0 € · Articoli: 0', 'È lo starter: il destructuring dello store congela i valori iniziali.'],
    ['Totale: 30 € · Articoli: 3', 'Il Mouse esistente passa a qty 2: gli articoli sono 4.'],
    ['Totale: 25 € · Articoli: 3', 'È il valore dopo il solo load(), senza add.'],
  ],
  solution: `// src/stores/cart.ts
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

export type CartItem = { id: number; name: string; price: number; qty: number };

const fakeApi = (): Promise<CartItem[]> =>
  new Promise((r) => setTimeout(() => r([
    { id: 1, name: 'Tastiera', price: 10, qty: 2 },
    { id: 2, name: 'Mouse', price: 5, qty: 1 },
  ]), 200));

export const useCartStore = defineStore('cart', () => {
  // state
  const items = ref<CartItem[]>([]);
  const status = ref<'idle' | 'loading' | 'error'>('idle');

  // getters
  const total = computed(() => items.value.reduce((sum, i) => sum + i.price * i.qty, 0));
  const count = computed(() => items.value.reduce((sum, i) => sum + i.qty, 0));

  // actions
  async function load() {
    status.value = 'loading';
    try {
      items.value = await fakeApi();
      status.value = 'idle';
    } catch {
      status.value = 'error';                       // la UI può mostrare un messaggio
    }
  }

  function add(p: Omit<CartItem, 'qty'>) {
    const existing = items.value.find((i) => i.id === p.id);
    items.value = existing
      ? items.value.map((i) => (i.id === p.id ? { ...i, qty: i.qty + 1 } : i)) // immutabile
      : [...items.value, { ...p, qty: 1 }];
  }

  return { items, status, total, count, load, add };
});

// App.vue
// <script setup lang="ts">
// import { onMounted } from 'vue';
// import { storeToRefs } from 'pinia';
// import { useCartStore } from './stores/cart';
// const cart = useCartStore();
// const { total, count, status } = storeToRefs(cart);   // ✅ ref reattivi
// const { load, add } = cart;                           // ✅ le action non sono reattive: ok destrutturarle
// onMounted(async () => { await load(); add({ id: 2, name: 'Mouse', price: 5 }); });
// </script>
// <template><p>Totale: {{ total }} € · Articoli: {{ count }}</p></template>`,
  explanation: 'Dopo `load()` il carrello vale 10×2 + 5×1 = 25 con 3 articoli; `add` del Mouse già presente porta la sua quantità a 2: totale 30, articoli 4. I getter `computed` si ricalcolano da soli. Lo store Pinia è un oggetto reactive: destrutturarlo direttamente copia i valori del momento (0), mentre `storeToRefs` crea ref collegati.',
});

export const phaseB3 = P.build({
  title: 'Vue 3 Moderno: Composition API & Reattività',
  subtitle: 'Proxy, composables, comunicazione tra componenti e lo stack Router + Pinia.',
});
