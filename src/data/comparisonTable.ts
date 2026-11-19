export type FrameworkId = 'react' | 'angular' | 'vue';

export const FRAMEWORKS: { id: FrameworkId; name: string; tagline: string }[] = [
  { id: 'react', name: 'React', tagline: 'Libreria UI: componenti funzione + hooks' },
  { id: 'angular', name: 'Angular', tagline: 'Piattaforma completa e opinionated' },
  { id: 'vue', name: 'Vue', tagline: 'Framework progressivo con reattività Proxy' },
];

export type ComparisonCategory = 'Reattività' | 'Architettura' | 'Ecosistema' | 'Team & Carriera';

export interface ComparisonRow {
  aspect: string;
  category: ComparisonCategory;
  react: string;
  angular: string;
  vue: string;
  interviewTip: string;
}

export const COMPARISON_TABLE: ComparisonRow[] = [
  {
    aspect: 'Modello di reattività', category: 'Reattività',
    react: 'Re-render del componente a ogni setState + reconciliation del Virtual DOM; stato immutabile.',
    angular: 'Signals (signal/computed/effect) per reattività fine; storicamente Zone.js; oggi anche zoneless.',
    vue: 'Proxy che traccia le letture: aggiorna solo i componenti che dipendono dal dato cambiato.',
    interviewTip: 'Spiega "chi sa cosa è cambiato": React lo scopre confrontando, Vue/Angular Signals lo sanno già.',
  },
  {
    aspect: 'Stato locale', category: 'Reattività',
    react: 'useState / useReducer; aggiornamenti con nuovi oggetti.',
    angular: 'signal() con set/update; proprietà di classe con OnPush.',
    vue: 'ref() per qualsiasi valore, reactive() per oggetti.',
    interviewTip: 'Cita le trappole: stale closure (React), mutazioni con OnPush (Angular), destructuring di reactive (Vue).',
  },
  {
    aspect: 'Stato derivato', category: 'Reattività',
    react: 'Calcolato nel render; useMemo se costoso (React Compiler lo automatizza).',
    angular: 'computed() memoizzato e lazy.',
    vue: 'computed() memoizzato con tracciamento automatico.',
    interviewTip: 'Mai sincronizzare un derivato con useEffect/effect/watch.',
  },
  {
    aspect: 'Side effect', category: 'Reattività',
    react: 'useEffect con dependency array e cleanup.',
    angular: 'effect() per i signal, RxJS per i flussi asincroni, DestroyRef per il cleanup.',
    vue: 'watch / watchEffect con onCleanup; lifecycle onMounted/onUnmounted.',
    interviewTip: 'Ogni subscription/timer/fetch ha un cleanup: dimostralo nel codice.',
  },
  {
    aspect: 'Template / Rendering', category: 'Architettura',
    react: 'JSX: JavaScript ovunque, condizioni con && e ternari, liste con map + key.',
    angular: 'Template HTML con control flow @if/@for (track obbligatorio) e binding [ ] ( ).',
    vue: 'SFC con template HTML, direttive v-if/v-for/v-model; JSX opzionale.',
    interviewTip: 'JSX = flessibilità; template = vincoli che il compilatore può ottimizzare.',
  },
  {
    aspect: 'Dependency Injection', category: 'Architettura',
    react: 'Nessuna DI nativa: Context per passare dipendenze, o librerie.',
    angular: 'DI gerarchica nativa (inject(), providedIn, providers per componente).',
    vue: 'provide / inject nativi, app.provide per il livello globale.',
    interviewTip: 'La DI di Angular è un punto di forza per testabilità e architetture enterprise.',
  },
  {
    aspect: 'Comunicazione tra componenti', category: 'Architettura',
    react: 'Props verso il basso, callback verso l\'alto, children/render props.',
    angular: 'input()/output() o @Input/@Output, model() per two-way binding, content projection.',
    vue: 'defineProps / defineEmits, defineModel per v-model, slot (anche scoped).',
    interviewTip: 'Stesso principio ovunque: dati giù, eventi su.',
  },
  {
    aspect: 'Form', category: 'Ecosistema',
    react: 'Controlled/uncontrolled + librerie (React Hook Form, Formik) e Zod per la validazione.',
    angular: 'Reactive Forms tipizzati e Template-driven, validatori sync/async inclusi.',
    vue: 'v-model nativo + librerie (VeeValidate, FormKit).',
    interviewTip: 'Angular ha la soluzione più completa "out of the box".',
  },
  {
    aspect: 'Routing', category: 'Ecosistema',
    react: 'Librerie esterne: React Router, TanStack Router; meta-framework Next.js / Remix.',
    angular: '@angular/router ufficiale: lazy loading, guard funzionali, resolver.',
    vue: 'Vue Router ufficiale: navigation guards, lazy loading; meta-framework Nuxt.',
    interviewTip: 'Le guard lato client migliorano la UX, la sicurezza vera è sul server.',
  },
  {
    aspect: 'State management globale', category: 'Ecosistema',
    react: 'Context, Zustand, Redux Toolkit; server state con TanStack Query.',
    angular: 'Servizi con signal, NgRx (Store/SignalStore) per casi complessi.',
    vue: 'Pinia (ufficiale): state, getters, actions, devtools.',
    interviewTip: 'Distingui server state (cache) da client state (UI).',
  },
  {
    aspect: 'HTTP & asincronia', category: 'Ecosistema',
    react: 'fetch/axios + TanStack Query; AbortController per cancellare.',
    angular: 'HttpClient basato su Observable, interceptor funzionali, cancellazione con unsubscribe.',
    vue: 'fetch/axios in composables o TanStack Query for Vue.',
    interviewTip: 'switchMap (Angular) e AbortController (React/Vue) risolvono la stessa race condition.',
  },
  {
    aspect: 'SSR / meta-framework', category: 'Ecosistema',
    react: 'Next.js (App Router, Server Components), Remix/React Router.',
    angular: 'Angular SSR integrato con hydration (anche incrementale).',
    vue: 'Nuxt (SSR, SSG, ibrido).',
    interviewTip: 'SSR/SSG migliorano LCP e SEO; il costo è complessità e hydration.',
  },
  {
    aspect: 'TypeScript', category: 'Team & Carriera',
    react: 'Ottimo supporto, opzionale; tipizzazione di props e hook.',
    angular: 'Obbligatorio e nativo, strict mode di default.',
    vue: 'Ottimo con <script setup lang="ts"> e Volar; opzionale.',
    interviewTip: 'In Angular TS è parte della piattaforma, negli altri una scelta (quasi sempre fatta).',
  },
  {
    aspect: 'Curva di apprendimento', category: 'Team & Carriera',
    react: 'API piccola, ma molte scelte architetturali lasciate al team.',
    angular: 'Più concetti iniziali (DI, RxJS, decoratori), poi molta uniformità.',
    vue: 'La più dolce per partire; scala bene con Composition API.',
    interviewTip: 'Libertà (React) vs convenzioni (Angular) vs progressività (Vue).',
  },
  {
    aspect: 'Quando sceglierlo in azienda', category: 'Team & Carriera',
    react: 'Prodotti con UI ricche, grande mercato del lavoro, ecosistema enorme, React Native per il mobile.',
    angular: 'Enterprise con molti team, app gestionali longeve, standard forti e stack .NET/Java.',
    vue: 'Team piccoli/medi, adozione incrementale su app esistenti, produttività rapida.',
    interviewTip: 'Rispondi con criteri: team, dominio, longevità, ecosistema e competenze disponibili.',
  },
];
