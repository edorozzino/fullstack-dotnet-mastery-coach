import { phaseBuilder, RUN } from '../builders';

const P = phaseBuilder('B2', 'B', 2)
  .module('B2.1', 'Architettura & Componenti', ['standalone components', 'DI gerarchica', 'input/output', 'change detection Default vs OnPush', '@if / @for'])
  .module('B2.2', 'Reattività: RxJS & Signals', ['Observable vs Promise', 'map/switchMap/mergeMap', 'debounceTime', 'catchError', 'async pipe / takeUntilDestroyed', 'signal/computed/effect'])
  .module('B2.3', 'Routing, Forms & HTTP', ['Reactive Forms vs Template-driven', 'route guards', 'HTTP interceptors', 'JWT e refresh token']);

P.card('B2.1', {
  title: 'Componenti standalone, DI e change detection',
  summary: 'Dalla v17 i componenti standalone importano direttamente ciò che usano, senza NgModule. La DI è gerarchica: un servizio `providedIn: \'root\'` è singleton, uno nei `providers` di un componente è un\'istanza per quel sottoalbero. Con `OnPush` il componente si aggiorna solo per nuovi riferimenti negli input, eventi nel template, async pipe o signal letti nel template.',
  lang: 'typescript',
  code: `@Component({
  selector: 'app-order-list',
  standalone: true,                                   // default da Angular 19
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`
    @if (orders().length === 0) { <p>Nessun ordine</p> }
    @for (o of orders(); track o.id) {
      <app-order-row [order]="o" (selected)="open(o.id)" />
    }
  \`,
  imports: [OrderRowComponent],
})
export class OrderListComponent {
  orders = input.required<Order[]>();                 // signal input
  private router = inject(Router);                    // inject() al posto del costruttore
  open(id: number) { this.router.navigate(['/orders', id]); }
}`,
  trap: 'Con OnPush mutare un array in input (`orders.push(x)`) o aggiornare una proprietà dentro un subscribe non aggiorna la vista: il riferimento non cambia e nessun evento del template ha marcato il componente.',
  rule: 'OnPush ovunque, dati immutabili o signal, `track` obbligatorio nei @for, servizi con lo scope più ristretto possibile.',
  check: {
    q: 'Cosa ottieni dichiarando un servizio nei `providers` di un componente?',
    options: ['Un\'istanza dedicata a quel componente e ai suoi figli', 'Lo stesso singleton di providedIn root', 'Un errore: i servizi vanno solo in root', 'Un\'istanza per ogni chiamata a inject()'],
    explanation: 'L\'injector del componente crea la propria istanza, visibile al suo sottoalbero.',
  },
});
P.card('B2.2', {
  title: 'RxJS e Signals: quando usare cosa',
  summary: 'Un Observable è lazy, può emettere più valori ed è cancellabile (unsubscribe); una Promise è eager, un solo valore, non cancellabile. `switchMap` annulla la richiesta interna precedente (ricerche), `mergeMap` le esegue in parallelo, `concatMap` in coda, `exhaustMap` ignora le nuove finché la corrente non termina. I Signals sono valori reattivi sincroni per lo stato della UI: `computed` deriva, `effect` reagisce.',
  lang: 'typescript',
  code: `export class SearchComponent {
  private api = inject(ProductsApi);
  query = new FormControl('', { nonNullable: true });

  results = toSignal(
    this.query.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((q) => this.api.search(q).pipe(catchError(() => of([])))), // errore isolato
    ),
    { initialValue: [] as Product[] },                // toSignal gestisce l'unsubscribe
  );

  count = signal(0);
  double = computed(() => this.count() * 2);         // si ricalcola solo se count cambia
}`,
  trap: 'Mettere `catchError` sulla catena esterna invece che dentro lo `switchMap`: al primo errore lo stream esterno completa e la ricerca smette di funzionare per sempre.',
  rule: 'RxJS per eventi e flussi asincroni (HTTP, input, websocket); Signals per lo stato e i valori derivati della vista; ponte con toSignal/toObservable.',
  check: {
    q: 'Quale operatore usare per una ricerca live che deve mostrare solo i risultati dell\'ultima query?',
    options: ['switchMap', 'mergeMap', 'concatMap', 'exhaustMap'],
    explanation: 'switchMap si disiscrive dall\'Observable interno precedente: le risposte vecchie non arrivano mai.',
  },
});
P.card('B2.3', {
  title: 'Reactive Forms, Guards e HTTP Interceptors',
  summary: 'I Reactive Forms definiscono il modello nel codice (FormGroup/FormControl tipizzati, validatori sincroni e asincroni), i Template-driven nel template con ngModel. I guard funzionali (`CanActivateFn`) proteggono le rotte. Gli interceptor funzionali (`HttpInterceptorFn`) trasformano richieste e risposte: aggiungere il token, gestire 401, loggare.',
  lang: 'typescript',
  code: `export const authGuard: CanActivateFn = () =>
  inject(AuthService).isLoggedIn() ? true : inject(Router).createUrlTree(['/login']);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).accessToken();
  return next(token ? req.clone({ setHeaders: { Authorization: \`Bearer \${token}\` } }) : req);
};

bootstrapApplication(AppComponent, {
  providers: [provideRouter(routes), provideHttpClient(withInterceptors([authInterceptor]))],
});

form = inject(FormBuilder).nonNullable.group({
  email: ['', [Validators.required, Validators.email]],
  password: ['', [Validators.required, Validators.minLength(12)]],
});`,
  trap: 'Le richieste HTTP sono immutabili: `req.headers.set(...)` restituisce nuovi header ma non modifica la richiesta. Serve `req.clone(...)`.',
  rule: 'Reactive Forms tipizzati per form non banali, guard che restituiscono UrlTree, un interceptor per responsabilità (auth, errori, retry).',
  check: {
    q: 'Come si aggiunge un header in un interceptor Angular?',
    options: ['req.clone({ setHeaders: { ... } }) e si passa la copia a next()', 'req.headers.set(...) direttamente', 'Modificando req.url', 'Non si può: serve un servizio dedicato'],
    explanation: 'HttpRequest è immutabile: si crea una copia modificata.',
  },
});

// ─── Domande ─────────────────────────────────────────────────────────────────
P.q('B2.1', 'training', { interview: true, prompt: 'Cosa fa scattare la change detection di un componente OnPush?', options: [
  ['Nuovo riferimento in un input, evento nel suo template, emissione dell\'async pipe o cambio di un signal letto nel template', 'Corretto: negli altri casi il componente viene saltato.'],
  ['Qualsiasi setTimeout nell\'app', 'Con OnPush i timer non marcano il componente come dirty.'],
  ['La mutazione di un array in input', 'La mutazione non cambia il riferimento.'],
  ['Solo la chiamata manuale a detectChanges()', 'È una delle possibilità, non l\'unica.'],
] });
P.q('B2.1', 'exam', { prompt: 'Cosa c\'è di sbagliato in questo template Angular 17+?', lang: 'html', code: `@for (item of items) {
  <li>{{ item.name }}</li>
}`, options: [
  ['Manca `track` (es. `track item.id`), obbligatorio nel blocco @for', 'Corretto: senza track il template non compila.'],
  ['@for non esiste, si usa solo *ngFor', 'Il control flow a blocchi è stabile dalla v17.'],
  ['Le parentesi graffe non sono ammesse', 'Sono la sintassi del nuovo control flow.'],
  ['Manca l\'import di NgFor', 'Il control flow nativo non richiede import.'],
] });
P.q('B2.1', 'training', { prompt: 'Qual è il modo moderno di dichiarare un input obbligatorio in un componente Angular?', lang: 'typescript', code: `export class UserCard { /* ??? */ }`, options: [
  ['user = input.required<User>();', 'Corretto: signal input, letto nel template come user().'],
  ['@Input() user!: User;', 'Funziona ancora, ma non è obbligatorio a livello di template né reattivo come signal.'],
  ['user = signal<User>();', 'Un signal locale non è un input del componente.'],
  ['constructor(@Inject(\'user\') user: User) {}', 'Gli input non si ricevono tramite DI.'],
] });
P.q('B2.1', 'exam', { interview: true, prompt: 'Qual è la differenza tra `providedIn: \'root\'` e un provider nel componente?', options: [
  ['root crea un singleton per l\'app (tree-shakable); nel componente un\'istanza per ogni istanza del componente e i suoi figli', 'Corretto: è la DI gerarchica.'],
  ['Nessuna', 'Cambia lo scope dell\'istanza.'],
  ['root è caricato solo in lazy loading', 'È tree-shakable, non legato al lazy loading.'],
  ['Il provider nel componente è sempre singleton', 'È un\'istanza per componente.'],
] });
P.q('B2.2', 'training', { interview: true, prompt: 'Observable vs Promise: quale affermazione è corretta?', options: [
  ['Un Observable è lazy, può emettere più valori ed è cancellabile; una Promise è eager e si risolve una volta', 'Corretto.'],
  ['Una Promise può emettere più valori', 'Si risolve o rifiuta una sola volta.'],
  ['Un Observable parte appena viene creato', 'Parte solo alla subscribe (cold Observable).'],
  ['Sono intercambiabili in ogni caso', 'Hanno semantiche diverse su laziness, molteplicità e cancellazione.'],
] });
P.q('B2.2', 'exam', { interview: true, prompt: 'Per un pulsante "Paga" che non deve avviare un secondo pagamento mentre il primo è in corso, quale operatore è più adatto?', options: [
  ['exhaustMap', 'Corretto: ignora i nuovi click finché la richiesta corrente non è terminata.'],
  ['switchMap', 'Annullerebbe il pagamento in corso al secondo click.'],
  ['mergeMap', 'Eseguirebbe pagamenti in parallelo.'],
  ['concatMap', 'Accoderebbe un secondo pagamento.'],
] });
P.q('B2.2', 'training', { prompt: 'Cosa stampa?', lang: 'typescript', code: `const count = signal(1);
const double = computed(() => count() * 2);
count.set(5);
count.update((c) => c + 1);
console.log(double());`, options: [
  ['12', 'Corretto: count vale 6, computed ricalcola in modo lazy alla lettura.'],
  ['2', 'computed non è uno snapshot: si aggiorna quando cambiano le dipendenze.'],
  ['10', 'update aggiunge 1 dopo set(5).'],
  ['undefined', 'computed restituisce sempre un valore.'],
] });
P.q('B2.2', 'exam', { prompt: 'Qual è il modo idiomatico (v16+) per evitare memory leak da subscribe manuali in un componente?', options: [
  ['Usare async pipe/toSignal oppure `.pipe(takeUntilDestroyed())` nel contesto di injection', 'Corretto: l\'unsubscribe avviene automaticamente alla distruzione.'],
  ['Non serve: Angular disiscrive tutto da solo', 'Le subscribe manuali vanno gestite.'],
  ['Chiamare complete() su ogni Observable HTTP', 'Gli Observable HTTP completano da soli, ma gli altri no.'],
  ['Usare setTimeout per disiscriversi', 'Non è un meccanismo affidabile.'],
] });
P.q('B2.3', 'training', { interview: true, prompt: 'Reactive Forms vs Template-driven: quando preferire i Reactive?', options: [
  ['Per form complessi, dinamici o con validazioni incrociate: modello esplicito, tipizzato e testabile', 'Corretto.'],
  ['Mai, i Template-driven sono sempre migliori', 'Diventano difficili da gestire nei form complessi.'],
  ['Solo per form con un campo', 'Per form semplici i Template-driven vanno benissimo.'],
  ['Quando non serve validazione', 'Entrambi supportano la validazione.'],
] });
P.q('B2.3', 'exam', { prompt: 'Cosa deve restituire un `CanActivateFn` per reindirizzare al login?', options: [
  ['Un UrlTree, es. inject(Router).createUrlTree([\'/login\'])', 'Corretto: il router annulla la navigazione e reindirizza in modo pulito.'],
  ['false e poi router.navigate([\'/login\']) dentro il guard', 'Funziona ma è meno pulito e può causare navigazioni concorrenti.'],
  ['Una stringa con l\'URL', 'Non è un tipo di ritorno valido.'],
  ['Lanciare un\'eccezione', 'Produrrebbe un errore di navigazione.'],
] });
P.q('B2.3', 'training', { prompt: 'Come si registra questo interceptor in un\'app standalone?', lang: 'typescript', code: `export const authInterceptor: HttpInterceptorFn = (req, next) => next(req);

bootstrapApplication(AppComponent, {
  providers: [/* ??? */],
});`, options: [
  ['provideHttpClient(withInterceptors([authInterceptor]))', 'Corretto.'],
  ['HttpClientModule.forRoot(authInterceptor)', 'Non esiste questa API.'],
  ['@Interceptor() sulla funzione', 'Non esiste un decoratore del genere.'],
  ['Nei providers: { provide: HTTP_INTERCEPTORS, useValue: authInterceptor }', 'HTTP_INTERCEPTORS è per gli interceptor a classe, con useClass e multi: true.'],
] });
P.q('B2.3', 'exam', { interview: true, prompt: 'Con un access token scaduto, 3 richieste parallele ricevono 401. Cosa deve garantire un buon interceptor di refresh?', options: [
  ['Una sola chiamata di refresh condivisa, poi il retry delle 3 richieste con il nuovo token', 'Corretto: si condivide la richiesta di refresh in corso (es. shareReplay).'],
  ['Tre refresh in parallelo', 'Può invalidare i refresh token (rotation) e sprecare risorse.'],
  ['Il logout immediato', 'Un token scaduto è un caso normale da gestire con il refresh.'],
  ['Il retry infinito delle richieste', 'Senza limite si rischiano loop su 401 persistenti.'],
] });

// ─── IDE Code Labs ───────────────────────────────────────────────────────────
P.lab('B2.2', {
  title: 'Ricerca live senza race condition: switchMap vs mergeMap',
  objective: 'Costruire una ricerca live che invii poche richieste e mostri sempre i risultati dell\'ultima query.',
  scenario: 'Digitando "ang" la lista mostra a volte i risultati di "a": il server risponde più lentamente alle query corte.',
  run: [...RUN.angular, 'Nel componente SearchComponent apri DevTools → Network e digita "ang" velocemente'],
  steps: [
    'Aggiungi debounceTime(300) e distinctUntilChanged().',
    'Sostituisci mergeMap con switchMap.',
    'Sposta catchError dentro lo switchMap ed esponi i risultati con toSignal.',
  ],
  lang: 'typescript',
  starter: `import { Component, inject, Injectable } from '@angular/core';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { Observable, of, delay, mergeMap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SearchApi {
  // Simula un server: le query corte sono più lente
  search(q: string): Observable<string[]> {
    return of([\`\${q} - risultato 1\`, \`\${q} - risultato 2\`]).pipe(delay(600 - q.length * 150));
  }
}

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: \`
    <input [formControl]="query" placeholder="Cerca…" />
    <ul>@for (r of results; track r) { <li>{{ r }}</li> }</ul>
  \`,
})
export class SearchComponent {
  private api = inject(SearchApi);
  query = new FormControl('', { nonNullable: true });
  results: string[] = [];

  constructor() {
    // TODO: nessun debounce, mergeMap, subscribe manuale senza unsubscribe
    this.query.valueChanges
      .pipe(mergeMap((q) => this.api.search(q)))
      .subscribe((r) => (this.results = r));
  }
}`,
  hints: [
    'Con mergeMap le tre richieste ("a", "an", "ang") viaggiano in parallelo e l\'ultima a rispondere è "a" (la più lenta).',
    '`results = toSignal(this.query.valueChanges.pipe(...), { initialValue: [] })` e nel template `results()`.',
  ],
  question: 'Con la soluzione, digitando "ang" velocemente, cosa succede?',
  options: [
    ['Parte una sola richiesta (per "ang") e la lista mostra "ang - risultato 1/2"', 'Corretto: il debounce raggruppa i tasti e switchMap garantisce l\'ultima query.'],
    ['Partono 3 richieste e la lista finisce con i risultati di "a"', 'È lo starter: mergeMap non annulla e la risposta più lenta arriva per ultima.'],
    ['Partono 3 richieste, le prime due vengono annullate, si vede "ang"', 'Sarebbe switchMap SENZA debounce.'],
    ['Nessuna richiesta finché non si preme Invio', 'debounceTime emette dopo 300 ms di pausa, senza Invio.'],
  ],
  solution: `import { Component, inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { Observable, of, delay, debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SearchApi {
  search(q: string): Observable<string[]> {
    return of([\`\${q} - risultato 1\`, \`\${q} - risultato 2\`]).pipe(delay(600 - q.length * 150));
  }
}

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: \`
    <input [formControl]="query" placeholder="Cerca…" />
    <ul>@for (r of results(); track r) { <li>{{ r }}</li> }</ul>
  \`,
})
export class SearchComponent {
  private api = inject(SearchApi);
  query = new FormControl('', { nonNullable: true });

  results = toSignal(
    this.query.valueChanges.pipe(
      debounceTime(300),                  // ✅ aspetta che l'utente smetta di digitare
      distinctUntilChanged(),             // ✅ niente richieste per lo stesso testo
      switchMap((q) =>                    // ✅ annulla la richiesta precedente
        this.api.search(q).pipe(
          catchError(() => of([])),       // ✅ errore isolato: lo stream esterno sopravvive
        ),
      ),
    ),
    { initialValue: [] as string[] },     // ✅ toSignal si disiscrive alla distruzione
  );
}`,
  explanation: 'mergeMap mantiene tutte le richieste interne: "a" (600 ms) risponde dopo "ang" (150 ms) e sovrascrive la lista. switchMap si disiscrive dalla richiesta precedente appena arriva una nuova query (con HttpClient la richiesta viene davvero annullata), e debounceTime riduce le query a una sola dopo la pausa. catchError dentro lo switchMap evita che un errore completi lo stream principale.',
});
P.lab('B2.2', {
  title: 'Da proprietà mutabili a Angular Signals con computed',
  objective: 'Rendere lo stato derivato automatico e compatibile con OnPush usando signal, computed e aggiornamenti immutabili.',
  scenario: 'Una todo list OnPush riceve un nuovo elemento da un "server push" (setTimeout): la vista non si aggiorna finché l\'utente non clicca da qualche parte.',
  run: RUN.angular,
  steps: [
    'Trasforma `todos` e `filter` in signal.',
    'Sostituisci i getter con `computed` per visibili e rimanenti.',
    'Aggiorna lo stato con `update` creando nuovi array; leggi i signal nel template.',
  ],
  lang: 'typescript',
  starter: `import { ChangeDetectionStrategy, Component } from '@angular/core';

type Todo = { id: number; title: string; done: boolean };

@Component({
  selector: 'app-todos',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`
    <p>{{ todos.length }} todo, {{ remaining }} da fare</p>
    <button (click)="filter = filter === 'all' ? 'open' : 'all'">Filtro: {{ filter }}</button>
    <ul>@for (t of visible; track t.id) { <li>{{ t.title }}</li> }</ul>
  \`,
})
export class TodosComponent {
  todos: Todo[] = [
    { id: 1, title: 'Studiare RxJS', done: true },
    { id: 2, title: 'Studiare Signals', done: false },
  ];
  filter: 'all' | 'open' = 'all';

  get remaining() { return this.todos.filter((t) => !t.done).length; } // ricalcolato ad ogni CD
  get visible() { return this.filter === 'all' ? this.todos : this.todos.filter((t) => !t.done); }

  constructor() {
    // simula un push dal server dopo 1s
    setTimeout(() => this.todos.push({ id: 3, title: 'Colloquio Angular', done: false }), 1000); // TODO
  }
}`,
  hints: [
    '`todos = signal<Todo[]>([...])` e `remaining = computed(() => this.todos().filter((t) => !t.done).length)`.',
    '`this.todos.update((list) => [...list, nuovo])`: un nuovo array notifica i consumer del signal anche con OnPush.',
  ],
  question: 'Con la soluzione, cosa mostra il paragrafo 1 secondo dopo il caricamento (senza interagire)?',
  options: [
    ['"3 todo, 2 da fare" — aggiornato automaticamente', 'Corretto: il template legge i signal, che marcano il componente da aggiornare.'],
    ['"2 todo, 1 da fare" finché l\'utente non interagisce con la pagina', 'È lo starter: con OnPush la mutazione nel setTimeout non marca il componente.'],
    ['"3 todo, 1 da fare"', 'Il nuovo todo non è completato: i rimanenti diventano 2.'],
    ['Errore: i signal non sono compatibili con OnPush', 'Signals e OnPush sono pensati per lavorare insieme.'],
  ],
  solution: `import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';

type Todo = { id: number; title: string; done: boolean };

@Component({
  selector: 'app-todos',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`
    <p>{{ todos().length }} todo, {{ remaining() }} da fare</p>
    <button (click)="toggleFilter()">Filtro: {{ filter() }}</button>
    <ul>@for (t of visible(); track t.id) { <li>{{ t.title }}</li> }</ul>
  \`,
})
export class TodosComponent {
  // ✅ stato sorgente come signal
  readonly todos = signal<Todo[]>([
    { id: 1, title: 'Studiare RxJS', done: true },
    { id: 2, title: 'Studiare Signals', done: false },
  ]);
  readonly filter = signal<'all' | 'open'>('all');

  // ✅ stato derivato: memoizzato, ricalcolato solo quando cambiano le dipendenze
  readonly remaining = computed(() => this.todos().filter((t) => !t.done).length);
  readonly visible = computed(() =>
    this.filter() === 'all' ? this.todos() : this.todos().filter((t) => !t.done),
  );

  constructor() {
    setTimeout(
      () => this.todos.update((list) => [...list, { id: 3, title: 'Colloquio Angular', done: false }]), // ✅ immutabile
      1000,
    );
  }

  toggleFilter() {
    this.filter.update((f) => (f === 'all' ? 'open' : 'all'));
  }
}`,
  explanation: 'Con OnPush il componente viene controllato solo in casi precisi: un push dentro un setTimeout non è tra questi, quindi lo starter resta fermo a "2 todo, 1 da fare" finché un evento non marca il componente. Un signal letto nel template, quando cambia, notifica Angular che quella vista va aggiornata. `computed` sostituisce i getter, ricalcolati ad ogni ciclo, con valori memoizzati.',
});
P.lab('B2.3', {
  title: 'HTTP Interceptor: gestione 401 con refresh e retry',
  objective: 'Aggiungere il token alle richieste e, su 401, ottenere un nuovo token con un\'unica chiamata di refresh condivisa e ripetere le richieste.',
  scenario: 'Quando l\'access token scade, la dashboard fa 3 chiamate in parallelo, tutte falliscono con 401 e l\'utente viene sbattuto fuori.',
  run: [...RUN.angular, 'Simula il backend con un mock (es. json-server o un interceptor di test) che restituisce 401 finché il token è "old"'],
  steps: [
    'Nell\'interceptor clona la richiesta con l\'header Authorization.',
    'Su 401 (e se la richiesta non è già il refresh) chiama `auth.refresh()` e ripeti la richiesta col nuovo token.',
    'In AuthService condividi la richiesta di refresh in corso con `shareReplay(1)`; se il refresh fallisce, logout.',
  ],
  lang: 'typescript',
  starter: `import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).accessToken();
  // TODO: aggiungi il token
  // TODO: su 401 → refresh condiviso + retry, altrimenti propaga l'errore
  return next(req);
};

// auth.service.ts (estratto)
// @Injectable({ providedIn: 'root' })
// export class AuthService {
//   private http = inject(HttpClient);
//   readonly accessToken = signal<string | null>('old');
//   refresh(): Observable<string> { /* TODO */ }
//   logout() { this.accessToken.set(null); inject(Router).navigate(['/login']); }
// }`,
  hints: [
    '`next(withToken(token)).pipe(catchError((err) => err instanceof HttpErrorResponse && err.status === 401 ? auth.refresh().pipe(switchMap((t) => next(withToken(t)))) : throwError(() => err)))`',
    'In AuthService: `this.refreshing$ ??= this.http.post(...).pipe(map(...), tap(...), finalize(() => this.refreshing$ = null), shareReplay(1))`.',
  ],
  question: 'Con la soluzione e il token scaduto, cosa avviene per le 3 chiamate parallele?',
  options: [
    ['3 risposte 401 → 1 sola POST /auth/refresh → 3 richieste ripetute con il nuovo token, tutte 200', 'Corretto: il refresh è condiviso e ogni richiesta viene ripetuta una volta.'],
    ['3 risposte 401 e redirect al login', 'È lo starter, senza gestione del refresh.'],
    ['3 risposte 401 → 3 POST /auth/refresh → 3 retry', 'Senza shareReplay ogni richiesta avvierebbe il proprio refresh.'],
    ['Loop infinito di 401 e refresh', 'Il refresh è escluso dall\'interceptor e ogni richiesta viene ripetuta una sola volta.'],
  ],
  solution: `// auth.interceptor.ts
import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  if (req.url.includes('/auth/refresh')) return next(req);           // ✅ evita ricorsione

  const withToken = (r: HttpRequest<unknown>, t: string | null) =>
    t ? r.clone({ setHeaders: { Authorization: \`Bearer \${t}\` } }) : r; // ✅ le request sono immutabili

  return next(withToken(req, auth.accessToken())).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && err.status === 401) {
        return auth.refresh().pipe(                                    // ✅ refresh condiviso
          switchMap((newToken) => next(withToken(req, newToken))),     // ✅ retry UNA volta
          catchError((refreshErr) => { auth.logout(); return throwError(() => refreshErr); }),
        );
      }
      return throwError(() => err);                                    // altri errori: propaga
    }),
  );
};

// auth.service.ts
import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, finalize, map, shareReplay, tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  readonly accessToken = signal<string | null>('old');
  private refreshing$: Observable<string> | null = null;

  refresh(): Observable<string> {
    // ✅ se un refresh è già in volo, tutti si agganciano allo stesso
    this.refreshing$ ??= this.http
      .post<{ accessToken: string }>('/auth/refresh', {}, { withCredentials: true }) // refresh token in cookie HttpOnly
      .pipe(
        map((r) => r.accessToken),
        tap((t) => this.accessToken.set(t)),
        finalize(() => (this.refreshing$ = null)),
        shareReplay(1),
      );
    return this.refreshing$;
  }

  logout() {
    this.accessToken.set(null);
    this.router.navigate(['/login']);
  }
}

// main.ts: provideHttpClient(withInterceptors([authInterceptor]))`,
  explanation: 'Ogni richiesta parte con il token corrente; le tre ricevono 401 e chiamano `refresh()`. La prima crea l\'Observable condiviso con `shareReplay(1)`, le altre si agganciano allo stesso: una sola POST. Quando arriva il nuovo token, `switchMap` ripete ciascuna richiesta originale (clonata) una volta. La richiesta di refresh è esclusa dall\'interceptor per evitare ricorsioni, e se il refresh fallisce si fa logout.',
});

export const phaseB2 = P.build({
  title: 'Angular Moderno: Architettura Enterprise, RxJS & Signals',
  subtitle: 'Componenti standalone, DI gerarchica, flussi reattivi e HTTP robusto.',
});
