import { phaseBuilder, RUN } from '../builders';

const P = phaseBuilder('A0', 'A', 0)
  .module('A0.1', 'Tipi e Immutabilità', ['class', 'struct', 'record', 'init', 'required'])
  .module('A0.2', 'Nullability e Pattern Matching', ['string?', '?.', '??', 'switch expressions', 'property patterns'])
  .module('A0.3', 'Asincronia', ['async/await', 'Task vs ValueTask', 'CancellationToken', 'Task.WhenAll', '.Result', 'async void'])
  .module('A0.4', 'LINQ e Collezioni', ['IEnumerable vs IQueryable', 'esecuzione differita', 'Dictionary', 'HashSet'])
  .module('A0.5', 'Memoria e Risorse', ['GC', 'IDisposable', 'IAsyncDisposable', 'using'])
  .module('A0.6', 'Gestione Errori', ['Eccezioni vs Result Pattern', 'throw; vs throw ex;']);

// ─── Schede ──────────────────────────────────────────────────────────────────
P.card('A0.1', {
  title: 'class, struct, record: semantica di riferimento vs valore',
  summary: '`class` è un tipo riferimento con uguaglianza per identità. `struct` è un tipo valore copiato ad ogni assegnazione. `record` (class o struct) genera uguaglianza per valore, `ToString`, deconstruct e `with`. `init` e `required` rendono gli oggetti immutabili e completi già alla costruzione.',
  lang: 'csharp',
  code: `public sealed record Money(decimal Amount, string Currency);

public class Customer
{
    public required string Email { get; init; } // obbligatorio, immutabile dopo l'init
    public string? Nickname { get; init; }
}

var a = new Money(10m, "EUR");
var b = a with { Amount = 20m }; // copia non distruttiva
Console.WriteLine(a == new Money(10m, "EUR")); // True: uguaglianza per valore
var c = new Customer { Email = "dev@acme.it" }; // senza Email → errore di compilazione`,
  trap: '`record` non significa "profondamente immutabile": una proprietà `List<T>` dentro un record resta mutabile e l\'uguaglianza confronta il riferimento della lista, non il contenuto.',
  rule: 'Usa `record` per DTO e Value Object, `class` per entità con identità, `struct` solo per tipi piccoli (≤16 byte) e immutabili (`readonly struct`).',
  check: {
    q: 'Cosa fa `a with { Amount = 20m }` su un record?',
    options: ['Crea una nuova istanza copiando a e cambiando solo Amount', 'Modifica a sul posto', 'Crea una copia profonda di tutti i riferimenti interni', 'Compila solo se Amount è required'],
    explanation: '`with` esegue una copia superficiale (shallow) tramite il copy constructor generato e applica gli init indicati: l\'originale non cambia.',
  },
});

P.card('A0.2', {
  title: 'Nullable Reference Types e Pattern Matching',
  summary: 'Con `<Nullable>enable</Nullable>` il compilatore distingue `string` (mai null) da `string?` (può essere null) e avvisa sulle dereferenziazioni pericolose. `?.` e `??` gestiscono i null in modo conciso; le switch expression con property/relational pattern sostituiscono catene di if.',
  lang: 'csharp',
  code: `string Describe(object? input) => input switch
{
    null => "nessun valore",
    int n when n < 0 => "negativo",
    int n => $"intero {n}",
    string { Length: 0 } => "stringa vuota",
    string s => $"testo '{s}'",
    _ => "altro"
};

string? city = user?.Address?.City;   // null se qualunque anello è null
string label = city ?? "N/D";          // fallback
user.Tags ??= new List<string>();      // assegna solo se null`,
  trap: 'L\'operatore null-forgiving `!` zittisce il warning ma non impedisce la `NullReferenceException` a runtime: usarlo per "far passare la build" è un debito tecnico.',
  rule: 'Abilita i nullable reference types in ogni progetto e tratta i warning di nullabilità come errori (`<WarningsAsErrors>nullable</WarningsAsErrors>`).',
  check: {
    q: 'In una switch expression, cosa succede se nessun ramo corrisponde e manca il discard `_`?',
    options: ['Il compilatore avvisa e a runtime viene lanciata SwitchExpressionException', 'Restituisce default(T)', 'Non compila mai', 'Restituisce null'],
    explanation: 'Il compilatore emette un warning di non esaustività; a runtime un input non gestito genera `SwitchExpressionException`.',
  },
});

P.card('A0.3', {
  title: 'async/await, Task vs ValueTask, cancellazione',
  summary: '`await` libera il thread durante l\'I/O e riprende la continuazione al termine. `Task.WhenAll` esegue operazioni indipendenti in parallelo. `CancellationToken` va propagato fino alle API di I/O. `ValueTask` evita allocazioni quando il risultato è spesso sincrono, ma va awaitato una sola volta.',
  lang: 'csharp',
  code: `public async Task<Dashboard> LoadAsync(int userId, CancellationToken ct)
{
    var ordersTask = _orders.GetAsync(userId, ct);   // parte subito
    var profileTask = _profile.GetAsync(userId, ct); // parte subito
    await Task.WhenAll(ordersTask, profileTask);     // attende entrambe in parallelo
    return new Dashboard(await profileTask, await ordersTask);
}

// ❌ blocca il thread e rischia deadlock in contesti con SynchronizationContext
var data = LoadAsync(1, ct).Result;`,
  trap: '`async void` non è awaitabile: le eccezioni non sono catturabili dal chiamante e possono abbattere il processo. Si usa solo per gli event handler.',
  rule: 'Async fino in fondo: niente `.Result`/`.Wait()`, `CancellationToken` come ultimo parametro di ogni metodo async pubblico.',
  check: {
    q: 'Qual è il vincolo principale di `ValueTask<T>`?',
    options: ['Va awaitato una sola volta e non va awaitato in concorrenza', 'Non può restituire valori', 'Non supporta CancellationToken', 'È sempre più lento di Task'],
    explanation: 'Un `ValueTask` può essere supportato da un oggetto riutilizzato (IValueTaskSource): awaitarlo più volte o conservarlo porta a comportamenti indefiniti. Se serve, si converte con `.AsTask()`.',
  },
});

P.card('A0.4', {
  title: 'LINQ: esecuzione differita, IEnumerable vs IQueryable',
  summary: 'Una query LINQ non viene eseguita quando la scrivi ma quando la enumeri (`foreach`, `ToList`, `Count`). `IEnumerable<T>` esegue in memoria con delegate; `IQueryable<T>` costruisce un expression tree tradotto (es. in SQL da EF Core). `Dictionary` e `HashSet` danno lookup O(1).',
  lang: 'csharp',
  code: `IQueryable<Order> q = db.Orders.Where(o => o.Total > 100); // ancora nessuna query SQL
var page = await q.OrderBy(o => o.Id).Take(20).ToListAsync(); // ORA parte la SQL

IEnumerable<Order> mem = db.Orders.AsEnumerable()
    .Where(o => o.Total > 100); // ❌ scarica TUTTA la tabella e filtra in memoria

var ids = new HashSet<int>(blockedIds);          // O(1) Contains
var byId = customers.ToDictionary(c => c.Id);   // O(1) lookup per chiave`,
  trap: 'Enumerare due volte una query differita la esegue due volte (doppio round-trip al DB o doppio side effect). Materializza con `ToList()` quando devi riusarla.',
  rule: 'Filtra, ordina e pagina su `IQueryable` prima di materializzare; usa `HashSet`/`Dictionary` invece di `List.Contains` dentro i cicli.',
  check: {
    q: 'Quando viene eseguita `var q = list.Where(x => x > 2);`?',
    options: ['Quando q viene enumerata (foreach, ToList, Count…)', 'Subito alla dichiarazione', 'Al Garbage Collection', 'Solo se si chiama Execute()'],
    explanation: '`Where` restituisce un iteratore lazy: il predicato gira solo durante l\'enumerazione, e ad ogni enumerazione.',
  },
});

P.card('A0.5', {
  title: 'GC, IDisposable e IAsyncDisposable',
  summary: 'Il Garbage Collector generazionale (Gen0/1/2 + LOH) libera la memoria gestita, ma non le risorse non gestite (socket, file handle, connessioni). `IDisposable` e `IAsyncDisposable` le rilasciano in modo deterministico, e `using`/`await using` garantiscono la chiamata anche in caso di eccezione.',
  lang: 'csharp',
  code: `await using var conn = new NpgsqlConnection(cs); // DisposeAsync a fine scope
await conn.OpenAsync(ct);

using (var stream = File.OpenRead(path))
{
    // ...
} // Dispose() chiamato qui, anche se viene lanciata un'eccezione

// ❌ HttpClient creato e distrutto per ogni richiesta → socket exhaustion
// ✅ usa IHttpClientFactory o un'istanza condivisa`,
  trap: 'Restituire un `IEnumerable` lazy che legge da una risorsa creata con `using` nello stesso metodo: quando il chiamante enumera, la risorsa è già stata chiusa.',
  rule: 'Chi crea una risorsa disposable ne è il proprietario e la rilascia; per HttpClient usa `IHttpClientFactory`.',
  check: {
    q: 'Cosa garantisce `using var x = ...;`?',
    options: ['Dispose() viene chiamato a fine scope, anche in caso di eccezione', 'L\'oggetto non verrà mai raccolto dal GC', 'L\'oggetto è thread-safe', 'Dispose() viene chiamato subito dopo la dichiarazione'],
    explanation: '`using` si traduce in un try/finally che invoca Dispose alla fine dello scope che lo contiene.',
  },
});

P.card('A0.6', {
  title: 'Eccezioni vs Result Pattern, throw; vs throw ex;',
  summary: 'Le eccezioni sono per situazioni eccezionali (bug, infrastruttura giù). Gli errori di dominio attesi (validazione, regole di business) si modellano meglio con un Result tipizzato, esplicito nella firma. Per rilanciare un\'eccezione catturata si usa `throw;` per preservare lo stack trace.',
  lang: 'csharp',
  code: `public readonly record struct Result<T>(T? Value, string? Error)
{
    public bool IsSuccess => Error is null;
    public static Result<T> Ok(T v) => new(v, null);
    public static Result<T> Fail(string e) => new(default, e);
}

try { await repo.SaveAsync(order, ct); }
catch (DbUpdateException ex)
{
    logger.LogError(ex, "Salvataggio fallito per {OrderId}", order.Id);
    throw;     // ✅ preserva lo stack trace originale
    // throw ex; ❌ resetta lo stack trace al punto corrente
}`,
  trap: '`catch (Exception) { }` vuoto inghiotte gli errori e rende i bug invisibili; anche `throw ex;` cancella l\'informazione su dove l\'errore è nato.',
  rule: 'Eccezioni per l\'imprevisto, Result per l\'atteso; cattura solo ciò che sai gestire e rilancia con `throw;`.',
  check: {
    q: 'Qual è la differenza tra `throw;` e `throw ex;` in un blocco catch?',
    options: ['throw; preserva lo stack trace originale, throw ex; lo reimposta', 'Nessuna differenza', 'throw ex; è più veloce', 'throw; non compila fuori da un finally'],
    explanation: '`throw ex;` tratta l\'eccezione come nuova dal punto di vista dello stack trace, perdendo i frame originali.',
  },
});

// ─── Domande ─────────────────────────────────────────────────────────────────
P.q('A0.1', 'training', {
  interview: true,
  prompt: 'Cosa stampa questo codice?',
  lang: 'csharp',
  code: `public record Point(int X, int Y);
public class PointC { public int X; public int Y; }

var r1 = new Point(1, 2); var r2 = new Point(1, 2);
var c1 = new PointC { X = 1, Y = 2 }; var c2 = new PointC { X = 1, Y = 2 };
Console.WriteLine($"{r1 == r2} {c1 == c2}");`,
  options: [
    ['True False', 'Corretto: il record confronta i valori, la class confronta i riferimenti (due istanze distinte).'],
    ['True True', 'La class non ridefinisce == né Equals: due istanze diverse non sono uguali.'],
    ['False False', 'Il record genera Equals e operator== basati sui valori delle proprietà.'],
    ['False True', 'È l\'opposto del comportamento reale.'],
  ],
});
P.q('A0.1', 'exam', {
  prompt: 'Quale dichiarazione impedisce di creare un oggetto senza Email e di modificarla dopo l\'inizializzazione?',
  options: [
    ['public required string Email { get; init; }', 'Corretto: required obbliga l\'object initializer a valorizzarla, init la rende immutabile dopo.'],
    ['public string Email { get; set; } = "";', 'È mutabile e non obbligatoria (ha un default).'],
    ['public readonly string Email;', 'Un campo readonly non obbliga il chiamante a valorizzarlo nell\'initializer.'],
    ['public string Email { get; private set; }', 'Non è obbligatoria e la classe stessa può mutarla.'],
  ],
});
P.q('A0.2', 'training', {
  prompt: 'Cosa restituisce `Classify(150)`?',
  lang: 'csharp',
  code: `string Classify(int t) => t switch
{
    < 0 => "invalido",
    >= 0 and < 100 => "basso",
    >= 100 and < 200 => "medio",
    _ => "alto"
};`,
  options: [
    ['"medio"', 'Corretto: 150 soddisfa il relational pattern >= 100 and < 200.'],
    ['"alto"', 'Il ramo `_` viene valutato solo se nessun pattern precedente corrisponde.'],
    ['"basso"', '150 non è < 100.'],
    ['Errore di compilazione', 'I relational e logical patterns (and/or/not) sono supportati da C# 9.'],
  ],
});
P.q('A0.2', 'exam', {
  interview: true,
  prompt: 'Con `string? name = null;`, quale espressione restituisce la lunghezza oppure 0 senza rischiare NullReferenceException?',
  options: [
    ['name?.Length ?? 0', 'Corretto: ?. produce int? (null se name è null) e ?? fornisce il fallback.'],
    ['name!.Length', 'Il null-forgiving operator zittisce il compilatore ma a runtime lancia NullReferenceException.'],
    ['name.Length ?? 0', 'Non compila: Length è int (non nullable) e name viene dereferenziato direttamente.'],
    ['(name ?? null).Length', 'Il fallback è ancora null: NullReferenceException a runtime.'],
  ],
});
P.q('A0.3', 'training', {
  interview: true,
  prompt: 'Due chiamate indipendenti impiegano 1s ciascuna. Quanto dura circa questo metodo?',
  lang: 'csharp',
  code: `var a = GetUserAsync();   // ~1s
var b = GetOrdersAsync(); // ~1s
await Task.WhenAll(a, b);`,
  options: [
    ['~1 secondo', 'Corretto: entrambe le Task partono subito alla chiamata; WhenAll attende la più lenta.'],
    ['~2 secondi', 'Sarebbero 2 secondi con `await GetUserAsync(); await GetOrdersAsync();` in sequenza.'],
    ['~0 secondi', 'WhenAll attende il completamento di entrambe.'],
    ['Dipende dal numero di core: ~2s su single core', 'Sono operazioni di I/O asincrone: non occupano thread durante l\'attesa.'],
  ],
});
P.q('A0.3', 'exam', {
  interview: true,
  prompt: 'Perché `async void` è pericoloso in un metodo di servizio?',
  options: [
    ['Il chiamante non può awaitarlo e le eccezioni non sono catturabili: possono terminare il processo', 'Corretto: le eccezioni vengono rilanciate sul SynchronizationContext/ThreadPool, fuori dal try del chiamante.'],
    ['È più lento di async Task', 'Il problema non è la performance ma la gestione di completamento ed errori.'],
    ['Non può usare await al suo interno', 'Può usare await normalmente.'],
    ['Blocca il thread chiamante fino al termine', 'Al contrario: ritorna subito al primo await, senza modo di sapere quando finisce.'],
  ],
});
P.q('A0.4', 'training', {
  prompt: 'Cosa stampa?',
  lang: 'csharp',
  code: `var list = new List<int> { 1, 2, 3 };
var query = list.Where(x => x > 1);
list.Add(4);
Console.WriteLine(query.Count());`,
  options: [
    ['3', 'Corretto: esecuzione differita — il filtro gira al momento di Count(), quando la lista contiene già 4.'],
    ['2', 'Sarebbe 2 se la query fosse materializzata (ToList) prima dell\'Add.'],
    ['4', 'Il filtro x > 1 esclude l\'1.'],
    ['InvalidOperationException', 'L\'eccezione "collection was modified" si ha modificando la lista durante l\'enumerazione, non prima.'],
  ],
});
P.q('A0.4', 'exam', {
  interview: true,
  prompt: 'Con EF Core, qual è la differenza pratica tra filtrare un `IQueryable<T>` e un `IEnumerable<T>`?',
  options: [
    ['IQueryable traduce il filtro in SQL eseguito dal DB; IEnumerable filtra in memoria dopo aver caricato i dati', 'Corretto: è la differenza tra expression tree e delegate compilato.'],
    ['Nessuna: EF Core ottimizza entrambi allo stesso modo', 'Dopo AsEnumerable() EF non vede più gli operatori successivi.'],
    ['IEnumerable è sempre più veloce perché evita la traduzione SQL', 'Scaricare tutta la tabella è quasi sempre molto più lento.'],
    ['IQueryable funziona solo con chiamate sincrone', 'IQueryable supporta ToListAsync, FirstOrDefaultAsync, ecc.'],
  ],
});
P.q('A0.5', 'training', {
  prompt: 'Cosa stampa?',
  lang: 'csharp',
  code: `using (var r = new Res("A"))
{
    Console.Write("body ");
    throw new Exception();
}
// catch esterno che ignora l'eccezione...
class Res(string n) : IDisposable { public void Dispose() => Console.Write($"dispose-{n} "); }`,
  options: [
    ['body dispose-A', 'Corretto: using è un try/finally, Dispose viene chiamato anche in caso di eccezione.'],
    ['body', 'Il finally implicito di using viene sempre eseguito.'],
    ['dispose-A body', 'Dispose avviene all\'uscita dallo scope, quindi dopo "body".'],
    ['Nulla, il GC chiama Dispose più tardi', 'Il GC non chiama mai Dispose: al massimo un finalizzatore, se definito.'],
  ],
});
P.q('A0.5', 'exam', {
  interview: true,
  prompt: 'Perché creare un nuovo `HttpClient` con `using` ad ogni richiesta è un anti-pattern?',
  options: [
    ['I socket restano in TIME_WAIT dopo il Dispose e sotto carico si esauriscono le porte disponibili', 'Corretto: si usa IHttpClientFactory o un\'istanza condivisa con SocketsHttpHandler.PooledConnectionLifetime.'],
    ['HttpClient non implementa IDisposable', 'Lo implementa, ed è proprio il Dispose frequente a causare il problema.'],
    ['Perché HttpClient non è thread-safe', 'Le chiamate SendAsync/GetAsync su un\'istanza condivisa sono thread-safe.'],
    ['Perché il GC non riesce a raccoglierlo', 'Il problema riguarda le connessioni TCP, non la memoria gestita.'],
  ],
});
P.q('A0.6', 'training', {
  interview: true,
  prompt: 'Quando è preferibile un Result Pattern rispetto alle eccezioni?',
  options: [
    ['Per errori di dominio attesi (es. validazione, saldo insufficiente) da gestire esplicitamente', 'Corretto: rende l\'errore parte del contratto ed evita il costo e l\'opacità delle eccezioni.'],
    ['Per qualsiasi errore, incluso il database irraggiungibile', 'Gli errori infrastrutturali imprevisti restano eccezioni.'],
    ['Solo nei metodi sincroni', 'Funziona identicamente con Task<Result<T>>.'],
    ['Mai: le eccezioni sono sempre la scelta idiomatica in .NET', 'Il Result Pattern è ampiamente adottato per errori di dominio previsti.'],
  ],
});
P.q('A0.6', 'exam', {
  prompt: 'Cosa cambia nello stack trace rilanciando con `throw ex;` invece di `throw;`?',
  lang: 'csharp',
  code: `try { Repository.Save(); }
catch (Exception ex) { Log(ex); throw ex; }`,
  options: [
    ['Lo stack trace riparte dal catch: si perdono i frame interni di Repository.Save', 'Corretto: per preservarlo usa `throw;` (o ExceptionDispatchInfo.Capture(ex).Throw()).'],
    ['Nulla, sono equivalenti', 'throw ex; reimposta lo stack trace.'],
    ['throw ex; aggiunge un\'InnerException', 'Non viene creata nessuna InnerException.'],
    ['throw ex; non compila dentro un catch', 'Compila (è solo sconsigliato, e gli analyzer CA2200 lo segnalano).'],
  ],
});

// ─── IDE Code Labs ───────────────────────────────────────────────────────────
P.lab('A0.1', {
  title: 'Refactoring in record + pattern matching',
  objective: 'Trasformare un DTO mutabile in `record` immutabile e sostituire la catena di if con una switch expression con property patterns.',
  scenario: 'Il servizio ordini confronta gli ordini per riferimento e la logica di classificazione è un groviglio di if. Rendi il modello un Value Object e la classificazione dichiarativa.',
  run: RUN.console,
  steps: [
    'Trasforma `Order` in `public sealed record Order(int Id, string Currency, decimal Amount, OrderStatus Status);`',
    'Sostituisci `Clone()` con l\'espressione `with` (es. `a with { }` e `a with { Amount = 80m }`).',
    'Riscrivi `Describe` come switch expression con property patterns, mantenendo la priorità: annullato → premium EUR (> 100) → standard (> 0) → vuoto.',
    'Esegui e confronta l\'output con le opzioni.',
  ],
  lang: 'csharp',
  starter: `var a = new Order(1, "EUR", 120m, OrderStatus.Paid);
var b = a.Clone();
var c = a.Clone(); c.Amount = 80m;
var d = a.Clone(); d.Status = OrderStatus.Cancelled;

Console.WriteLine(a == b);                 // TODO: dopo il refactoring cosa stampa?
Console.WriteLine(ReferenceEquals(a, b));
Console.WriteLine(Describe(c));
Console.WriteLine(Describe(d));

static string Describe(Order o)
{
    // TODO: sostituisci con una switch expression + property patterns
    if (o.Status == OrderStatus.Cancelled) return "Annullato";
    if (o.Amount > 100m && o.Currency == "EUR") return "Premium EUR";
    if (o.Amount > 0m) return $"Standard {o.Amount}";
    return "Vuoto";
}

public enum OrderStatus { Pending, Paid, Cancelled }

// TODO: trasforma in record posizionale immutabile
public class Order
{
    public Order(int id, string currency, decimal amount, OrderStatus status)
        => (Id, Currency, Amount, Status) = (id, currency, amount, status);
    public int Id { get; set; }
    public string Currency { get; set; }
    public decimal Amount { get; set; }
    public OrderStatus Status { get; set; }
    public Order Clone() => (Order)MemberwiseClone();
}`,
  hints: [
    'Un record posizionale genera costruttore, proprietà init-only, Equals/== per valore e supporta `with`.',
    'Nei property patterns l\'ordine dei rami conta: `{ Status: OrderStatus.Cancelled }` deve venire prima di `{ Amount: > 100m, Currency: "EUR" }`.',
  ],
  question: 'Dopo il refactoring, quale output ottieni?',
  options: [
    ['True\nFalse\nStandard 80\nAnnullato', 'Corretto: uguaglianza per valore, istanze distinte, 80 → Standard, Cancelled ha priorità.'],
    ['False\nFalse\nStandard 80\nAnnullato', 'È l\'output della versione class: == confronta i riferimenti.'],
    ['True\nTrue\nStandard 80\nAnnullato', '`with` crea sempre una nuova istanza: ReferenceEquals è False.'],
    ['True\nFalse\nStandard 80\nPremium EUR', 'Il ramo Cancelled viene valutato per primo e vince.'],
  ],
  solution: `var a = new Order(1, "EUR", 120m, OrderStatus.Paid);
var b = a with { };                              // copia non distruttiva: nuova istanza, stessi valori
var c = a with { Amount = 80m };                 // cambia solo Amount
var d = a with { Status = OrderStatus.Cancelled };

Console.WriteLine(a == b);                       // True  → record: uguaglianza per valore
Console.WriteLine(ReferenceEquals(a, b));        // False → sono due oggetti distinti
Console.WriteLine(Describe(c));                  // Standard 80
Console.WriteLine(Describe(d));                  // Annullato

static string Describe(Order o) => o switch
{
    { Status: OrderStatus.Cancelled } => "Annullato",          // priorità più alta
    { Amount: > 100m, Currency: "EUR" } => "Premium EUR",      // property + relational pattern
    { Amount: > 0m } => $"Standard {o.Amount}",
    _ => "Vuoto"                                                // ramo di default: switch esaustivo
};

public enum OrderStatus { Pending, Paid, Cancelled }

// Record posizionale: proprietà init-only, Equals/GetHashCode/== per valore, ToString, Deconstruct, with
public sealed record Order(int Id, string Currency, decimal Amount, OrderStatus Status);`,
  explanation: 'Il record genera un\'uguaglianza strutturale: `a == b` confronta Id, Currency, Amount e Status. `with` usa il copy constructor e restituisce sempre una nuova istanza, quindi ReferenceEquals è False. Le switch expression valutano i rami in ordine: il pattern sullo stato annullato precede quello sull\'importo, esattamente come gli if originali.',
});

P.lab('A0.3', {
  title: 'Pipeline asincrona con CancellationToken e Task.WhenAll',
  objective: 'Parallelizzare chiamate indipendenti con `Task.WhenAll` e propagare un timeout tramite `CancellationToken`.',
  scenario: 'Una dashboard chiama tre servizi in sequenza e non ha timeout: se il servizio C si blocca, l\'utente aspetta. Serve parallelismo e un budget totale di 250 ms.',
  run: RUN.console,
  steps: [
    'Crea un `CancellationTokenSource` con timeout di 250 ms.',
    'Fai partire le tre chiamate `Fetch` insieme passando il token e attendile con `Task.WhenAll`.',
    'Cattura `OperationCanceledException` e stampa il tempo trascorso arrotondato per difetto alle centinaia.',
  ],
  lang: 'csharp',
  starter: `using System.Diagnostics;

var sw = Stopwatch.StartNew();
// TODO: crea un CancellationTokenSource da 250 ms
// TODO: avvia le tre Fetch in parallelo con Task.WhenAll, passando il token
var r1 = await Fetch("A", 100, CancellationToken.None);
var r2 = await Fetch("B", 150, CancellationToken.None);
var r3 = await Fetch("C", 1000, CancellationToken.None);
Console.WriteLine(string.Join(",", r1, r2, r3));
// TODO: gestisci OperationCanceledException e stampa:
// $"Cancellato dopo ~{(sw.ElapsedMilliseconds / 100) * 100}ms"

static async Task<string> Fetch(string name, int ms, CancellationToken ct)
{
    await Task.Delay(ms, ct);
    Console.WriteLine($"{name} ok");
    return name;
}`,
  hints: [
    '`new CancellationTokenSource(TimeSpan.FromMilliseconds(250))` si cancella da solo allo scadere.',
    'Se almeno una Task viene cancellata (e nessuna fallisce), `await Task.WhenAll(...)` lancia `TaskCanceledException`, che deriva da `OperationCanceledException`.',
  ],
  question: 'Con la soluzione corretta, cosa stampa il programma?',
  options: [
    ['A ok\nB ok\nCancellato dopo ~200ms', 'Corretto: A e B terminano entro 250 ms, C viene cancellata e WhenAll propaga la cancellazione.'],
    ['A ok\nB ok\nC ok\nA,B,C', 'È l\'output dello starter sequenziale senza timeout (dopo ~1,25 s).'],
    ['Cancellato dopo ~200ms', 'A e B completano prima della scadenza e stampano il loro messaggio.'],
    ['A ok\nB ok\nCancellato dopo ~1200ms', 'Le chiamate sono in parallelo: la cancellazione arriva a ~250 ms, non dopo la somma dei tempi.'],
  ],
  solution: `using System.Diagnostics;

var sw = Stopwatch.StartNew();
using var cts = new CancellationTokenSource(TimeSpan.FromMilliseconds(250)); // budget totale
try
{
    // Le tre Task partono SUBITO: nessun await intermedio
    Task<string>[] tasks =
    [
        Fetch("A", 100, cts.Token),
        Fetch("B", 150, cts.Token),
        Fetch("C", 1000, cts.Token), // verrà cancellata a ~250 ms
    ];
    var results = await Task.WhenAll(tasks);         // attende tutte (o propaga errore/cancellazione)
    Console.WriteLine(string.Join(",", results));
}
catch (OperationCanceledException)                   // include TaskCanceledException
{
    Console.WriteLine($"Cancellato dopo ~{(sw.ElapsedMilliseconds / 100) * 100}ms");
}

static async Task<string> Fetch(string name, int ms, CancellationToken ct)
{
    await Task.Delay(ms, ct);                        // l'I/O rispetta il token
    Console.WriteLine($"{name} ok");
    return name;
}`,
  explanation: 'Avviando le Task senza await intermedi le attese si sovrappongono: A termina a ~100 ms, B a ~150 ms. A ~250 ms il token scatta, `Task.Delay` di C lancia la cancellazione e `Task.WhenAll` termina in stato Canceled, quindi l\'await lancia `TaskCanceledException`. Il tempo misurato (~250–270 ms) arrotondato per difetto alle centinaia dà 200.',
});

P.lab('A0.5', {
  title: 'Trappola: esecuzione differita LINQ + IDisposable',
  objective: 'Riconoscere e correggere un `IEnumerable` lazy che sopravvive alla risorsa da cui legge.',
  scenario: 'Un repository legge righe da un reader disposable e restituisce una query LINQ. In produzione compare `ObjectDisposedException` "a caso".',
  run: RUN.console,
  steps: [
    'Esegui lo starter così com\'è e osserva l\'ordine dei messaggi.',
    'Individua perché il reader è già chiuso quando il foreach parte.',
    'Correggi materializzando con `.ToList()` dentro lo scope, oppure trasformando `ReadLines` in un iteratore con `yield return`.',
  ],
  lang: 'csharp',
  starter: `var lines = ReadLines();
Console.WriteLine("query creata");
try
{
    foreach (var l in lines) Console.WriteLine(l);
}
catch (ObjectDisposedException)
{
    Console.WriteLine("ObjectDisposedException");
}

static IEnumerable<string> ReadLines()
{
    using var reader = new FakeReader();
    return reader.Lines().Where(l => l.Length > 0); // TODO: c'è un bug
}

sealed class FakeReader : IDisposable
{
    private bool _disposed;
    private readonly string[] _data = ["alpha", "", "beta"];

    public IEnumerable<string> Lines()
    {
        foreach (var d in _data)
        {
            ObjectDisposedException.ThrowIf(_disposed, this);
            yield return d;
        }
    }

    public void Dispose()
    {
        _disposed = true;
        Console.WriteLine("reader chiuso");
    }
}`,
  hints: [
    '`return` di una query LINQ non esegue nulla: restituisce un oggetto che descrive la query.',
    'Il `using var` chiude il reader all\'uscita da `ReadLines`, cioè PRIMA che il chiamante inizi il foreach.',
  ],
  question: 'Cosa stampa lo starter, prima della correzione?',
  options: [
    ['reader chiuso\nquery creata\nObjectDisposedException', 'Corretto: Dispose avviene al return, poi l\'enumerazione tocca un reader chiuso.'],
    ['query creata\nalpha\nbeta\nreader chiuso', 'Sarebbe vero se ReadLines fosse un iteratore (yield) con using al suo interno.'],
    ['reader chiuso\nquery creata\nalpha\nbeta', 'È l\'output dopo il fix con .ToList() dentro lo scope del using.'],
    ['query creata\nreader chiuso\nObjectDisposedException', 'Il reader viene chiuso già all\'uscita da ReadLines, prima di "query creata".'],
  ],
  solution: `var lines = ReadLines();
Console.WriteLine("query creata");
foreach (var l in lines) Console.WriteLine(l);

static IEnumerable<string> ReadLines()
{
    using var reader = new FakeReader();
    // ✅ FIX 1: materializza mentre la risorsa è ancora aperta
    return reader.Lines().Where(l => l.Length > 0).ToList();
}

// ✅ FIX 2 (alternativa lazy): rendi ReadLines un iteratore.
// Il using vive dentro la macchina a stati e il Dispose avviene a fine enumerazione:
// static IEnumerable<string> ReadLines()
// {
//     using var reader = new FakeReader();
//     foreach (var l in reader.Lines().Where(l => l.Length > 0))
//         yield return l;
// }

sealed class FakeReader : IDisposable
{
    private bool _disposed;
    private readonly string[] _data = ["alpha", "", "beta"];
    public IEnumerable<string> Lines()
    {
        foreach (var d in _data)
        {
            ObjectDisposedException.ThrowIf(_disposed, this); // .NET 7+
            yield return d;
        }
    }
    public void Dispose() { _disposed = true; Console.WriteLine("reader chiuso"); }
}`,
  explanation: '`Where` e `Lines()` sono lazy: chiamarli non legge nulla. Il `using var` esegue Dispose all\'uscita dal metodo, quindi "reader chiuso" viene stampato per primo, poi "query creata". Solo il foreach avvia l\'iteratore, che trova `_disposed = true` e lancia. È lo stesso bug di chi restituisce una query EF Core da un metodo che fa il Dispose del DbContext.',
});

export const phaseA0 = P.build({
  title: 'Fondamenta solide di C# moderno',
  subtitle: 'Tipi, nullability, async, LINQ, memoria ed errori: le basi che ogni colloquio .NET dà per scontate.',
});
