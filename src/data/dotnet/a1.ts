import { phaseBuilder, RUN } from '../builders';

const P = phaseBuilder('A1', 'A', 1)
  .module('A1.1', 'ASP.NET Core moderno', ['Minimal APIs vs Controller', 'Middleware pipeline', 'ProblemDetails', '.NET 8/9/10'])
  .module('A1.2', 'Dependency Injection', ['Transient', 'Scoped', 'Singleton', 'captive dependency', 'IServiceScopeFactory'])
  .module('A1.3', 'Sicurezza API', ['JWT', 'OAuth2 / OIDC', 'Authorization Policy', 'claims'])
  .module('A1.4', 'Database & ORM', ['PostgreSQL / SQL Server', 'indici', 'transazioni', 'EF Core AsNoTracking', 'N+1', 'Dapper']);

P.card('A1.1', {
  title: 'Pipeline, Minimal APIs e ProblemDetails',
  summary: 'Ogni richiesta attraversa la pipeline dei middleware nell\'ordine di registrazione, poi raggiunge l\'endpoint. Minimal APIs e Controller condividono routing, DI, model binding e filtri; le Minimal APIs sono più leggere e AOT-friendly. ProblemDetails (RFC 9457) standardizza gli errori HTTP in JSON.',
  lang: 'csharp',
  code: `var builder = WebApplication.CreateBuilder(args);
builder.Services.AddProblemDetails();          // errori come application/problem+json

var app = builder.Build();
app.UseExceptionHandler();                      // 1° middleware: cattura tutto ciò che segue
app.UseStatusCodePages();                       // 404/405 vuoti → ProblemDetails
app.UseAuthentication();
app.UseAuthorization();

var orders = app.MapGroup("/orders").RequireAuthorization();
orders.MapGet("/{id:int}", async (int id, IOrderRepo repo, CancellationToken ct) =>
    await repo.FindAsync(id, ct) is { } o ? Results.Ok(o) : Results.NotFound());

app.Run();`,
  trap: 'L\'ordine dei middleware è semantica: `UseAuthorization` prima di `UseAuthentication`, o un exception handler registrato dopo i middleware che lanciano, producono bug silenziosi.',
  rule: 'Exception handler per primo, poi HTTPS/static/routing/CORS/auth/authorization, poi gli endpoint. Tutti gli errori escono come ProblemDetails.',
  check: {
    q: 'Perché `app.UseExceptionHandler()` va registrato tra i primi middleware?',
    options: ['Perché può gestire solo le eccezioni lanciate dai middleware registrati dopo di lui', 'Perché deve girare dopo gli endpoint', 'Perché altrimenti non compila', 'Perché attiva l\'autenticazione'],
    explanation: 'La pipeline è una matrioska: un middleware avvolge solo quelli successivi. Registrato tardi, non vede le eccezioni dei precedenti.',
  },
});

P.card('A1.2', {
  title: 'Lifetime DI e captive dependency',
  summary: '`Transient`: nuova istanza ad ogni risoluzione. `Scoped`: una per richiesta HTTP (scope). `Singleton`: una per tutta l\'app. Una captive dependency si ha quando un servizio a vita più lunga (Singleton) cattura uno a vita più breve (Scoped), prolungandone la vita e condividendolo tra richieste.',
  lang: 'csharp',
  code: `builder.Services.AddDbContext<AppDb>();               // Scoped
builder.Services.AddSingleton<PriceCache>();          // ❌ se PriceCache chiede AppDb nel costruttore

// ✅ Il singleton crea uno scope quando serve
public sealed class PriceCache(IServiceScopeFactory scopes)
{
    public async Task RefreshAsync(CancellationToken ct)
    {
        await using var scope = scopes.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDb>();
        // ... usa db e rilascialo a fine scope
    }
}`,
  trap: 'Un `DbContext` catturato da un singleton viene condiviso tra thread e richieste: errori "A second operation was started on this context", dati stantii e memory leak del change tracker.',
  rule: 'Un servizio può dipendere solo da servizi con vita uguale o più lunga. In Development `ValidateScopes` è attivo: non disattivarlo.',
  check: {
    q: 'Quale combinazione è una captive dependency?',
    options: ['Singleton che riceve nel costruttore un servizio Scoped', 'Scoped che riceve un Singleton', 'Transient che riceve un Singleton', 'Scoped che riceve un Transient'],
    explanation: 'Il problema nasce solo quando il consumatore vive più a lungo della dipendenza.',
  },
});

P.card('A1.3', {
  title: 'JWT, OAuth2/OIDC e Authorization Policy',
  summary: 'OAuth2 è un protocollo di delega dell\'autorizzazione (access token); OIDC aggiunge l\'identità (id token). Un JWT è firmato, non cifrato: l\'API ne valida firma, issuer, audience e scadenza. Le Policy esprimono regole di autorizzazione basate su claims, ruoli o requirement personalizzati.',
  lang: 'csharp',
  code: `builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.Authority = "https://login.microsoftonline.com/<tenant>/v2.0"; // scarica le chiavi di firma (JWKS)
        o.Audience = "api://orders-api";
    });

builder.Services.AddAuthorizationBuilder()
    .AddPolicy("orders:write", p => p.RequireClaim("scp", "orders.write"));

app.MapPost("/orders", CreateOrder).RequireAuthorization("orders:write");`,
  trap: 'Mettere dati sensibili nel payload del JWT pensando che sia cifrato: è solo Base64Url, chiunque può leggerlo.',
  rule: 'Valida sempre issuer, audience, firma e lifetime; access token brevi + refresh token; autorizza per scope/policy, non per "utente loggato".',
  check: {
    q: 'Cosa garantisce la firma di un JWT?',
    options: ['Integrità e autenticità del token (non è stato alterato e proviene dall\'issuer)', 'Riservatezza del payload', 'Che il token non scada mai', 'Che l\'utente abbia i permessi richiesti dall\'endpoint'],
    explanation: 'La firma protegge da manomissioni; la riservatezza richiederebbe un JWE (token cifrato).',
  },
});

P.card('A1.4', {
  title: 'EF Core vs Dapper, N+1, indici e transazioni',
  summary: 'EF Core offre change tracking, migrazioni e LINQ tradotto in SQL; Dapper mappa SQL scritto a mano con overhead minimo. Il problema N+1 nasce quando per N righe si esegue una query aggiuntiva ciascuna. Gli indici velocizzano le letture filtrate/ordinate a costo delle scritture; le transazioni garantiscono atomicità.',
  lang: 'csharp',
  code: `// ✅ Lettura: niente tracking, proiezione solo dei campi necessari, 1 query
var list = await db.Orders
    .AsNoTracking()
    .Where(o => o.CustomerId == id)
    .Select(o => new OrderDto(o.Id, o.Total, o.Lines.Count))
    .ToListAsync(ct);

// ✅ Transazione esplicita su più SaveChanges
await using var tx = await db.Database.BeginTransactionAsync(ct);
// ... più operazioni
await tx.CommitAsync(ct);

// Dapper per query di reporting complesse
var rows = await conn.QueryAsync<SalesRow>("SELECT ... WHERE region = @region", new { region });`,
  trap: 'Lazy loading attivo + accesso a una navigation property dentro un ciclo = N+1 query invisibili nel codice ma evidenti nei log SQL.',
  rule: 'Per le letture: AsNoTracking + Select su DTO; per le scritture: entità tracciate. Guarda sempre l\'SQL generato.',
  check: {
    q: 'A cosa serve `AsNoTracking()`?',
    options: ['Evita che il DbContext tracci le entità lette, riducendo memoria e CPU per query di sola lettura', 'Disabilita la cache delle query SQL', 'Impedisce le transazioni', 'Forza il lazy loading'],
    explanation: 'Senza tracking EF non crea snapshot per il rilevamento delle modifiche: ideale per letture.',
  },
});

// ─── Domande ─────────────────────────────────────────────────────────────────
P.q('A1.1', 'training', {
  interview: true,
  prompt: 'Quale affermazione su Minimal APIs e Controller è corretta?',
  options: [
    ['Condividono routing, DI e model binding; le Minimal APIs hanno meno cerimonia e supportano meglio Native AOT', 'Corretto: la scelta è soprattutto di stile e organizzazione, oltre al supporto AOT.'],
    ['Le Minimal APIs non supportano autenticazione e autorizzazione', 'Supportano RequireAuthorization, policy e filtri.'],
    ['I Controller sono deprecati da .NET 8', 'I Controller restano pienamente supportati.'],
    ['Le Minimal APIs non possono essere testate con WebApplicationFactory', 'I test di integrazione funzionano identicamente.'],
  ],
});
P.q('A1.1', 'exam', {
  prompt: 'In che ordine vengono stampati i messaggi per una richiesta a `/`?',
  lang: 'csharp',
  code: `app.Use(async (ctx, next) => { Console.Write("A1 "); await next(); Console.Write("A2 "); });
app.Use(async (ctx, next) => { Console.Write("B1 "); await next(); Console.Write("B2 "); });
app.MapGet("/", () => { Console.Write("E "); return "ok"; });`,
  options: [
    ['A1 B1 E B2 A2', 'Corretto: ogni middleware avvolge i successivi; il codice dopo next() gira in ordine inverso.'],
    ['A1 A2 B1 B2 E', 'next() cede il controllo al middleware successivo prima di proseguire.'],
    ['E A1 B1 B2 A2', 'L\'endpoint è l\'ultimo anello della catena in ingresso.'],
    ['A1 B1 E A2 B2', 'Il ritorno attraversa la pipeline in ordine inverso: prima B2, poi A2.'],
  ],
});
P.q('A1.1', 'exam', {
  interview: true,
  prompt: 'Cos\'è ProblemDetails in ASP.NET Core?',
  options: [
    ['Un formato standard (RFC 9457) per gli errori HTTP in JSON, con type, title, status, detail e estensioni', 'Corretto: `AddProblemDetails()` lo applica a eccezioni ed errori di status code.'],
    ['Un logger per le eccezioni', 'È un formato di risposta, non un sistema di logging.'],
    ['Una pagina HTML di debug', 'Quella è la Developer Exception Page.'],
    ['Un attributo di validazione dei modelli', 'La validazione può produrre ValidationProblemDetails, ma ProblemDetails è il formato.'],
  ],
});
P.q('A1.2', 'exam', {
  interview: true,
  prompt: 'Un servizio `Scoped` viene risolto due volte nella stessa richiesta HTTP e una volta in un\'altra richiesta. Quante istanze vengono create?',
  options: [
    ['2: una per ciascuna richiesta (scope)', 'Corretto: all\'interno dello stesso scope si riceve sempre la stessa istanza.'],
    ['3: una per ogni risoluzione', 'Quello è il comportamento Transient.'],
    ['1: condivisa da tutte le richieste', 'Quello è il comportamento Singleton.'],
    ['Dipende dal numero di thread', 'Il lifetime è legato allo scope, non ai thread.'],
  ],
});
P.q('A1.2', 'training', {
  prompt: 'Cosa succede avviando questa app in ambiente Development?',
  lang: 'csharp',
  code: `builder.Services.AddDbContext<AppDb>(o => o.UseNpgsql(cs)); // Scoped
builder.Services.AddSingleton<ReportCache>();
public class ReportCache(AppDb db) { /* ... */ }`,
  options: [
    ['Alla risoluzione di ReportCache viene lanciata InvalidOperationException: Cannot consume scoped service from singleton', 'Corretto: in Development ValidateScopes (e ValidateOnBuild) sono attivi.'],
    ['Funziona: il DbContext verrà ricreato ad ogni richiesta', 'Il singleton riceve una sola volta il DbContext e lo trattiene per sempre.'],
    ['Errore di compilazione', 'Il compilatore non conosce i lifetime DI: è un errore a runtime.'],
    ['ReportCache diventa automaticamente Scoped', 'Il container non modifica i lifetime registrati.'],
  ],
});
P.q('A1.2', 'exam', {
  prompt: 'Un `BackgroundService` (singleton) deve usare un DbContext ad ogni ciclo. Qual è l\'approccio corretto?',
  options: [
    ['Iniettare IServiceScopeFactory e creare uno scope (CreateAsyncScope) ad ogni iterazione', 'Corretto: il DbContext vive solo per la durata dell\'iterazione.'],
    ['Iniettare direttamente il DbContext nel costruttore', 'È una captive dependency: DbContext condiviso a tempo indefinito.'],
    ['Registrare il DbContext come Singleton', 'DbContext non è thread-safe e accumula entità tracciate.'],
    ['Usare `new AppDb()` senza DI', 'Si perdono configurazione, pooling e testabilità.'],
  ],
});
P.q('A1.3', 'training', {
  interview: true,
  prompt: 'Qual è la differenza tra OAuth2 e OpenID Connect?',
  options: [
    ['OAuth2 delega l\'autorizzazione (access token); OIDC aggiunge un layer di autenticazione con id token e userinfo', 'Corretto: OIDC è costruito sopra OAuth2.'],
    ['Sono sinonimi', 'OAuth2 da solo non definisce come identificare l\'utente.'],
    ['OIDC sostituisce i JWT con cookie', 'L\'id token OIDC è proprio un JWT.'],
    ['OAuth2 è solo per app mobili', 'Si usa per web, SPA, mobile, machine-to-machine.'],
  ],
});
P.q('A1.3', 'exam', {
  prompt: 'Un JWT ha payload `{"sub":"42","role":"admin"}`. Un attaccante lo decodifica e cambia role in "superadmin" senza ri-firmarlo. Cosa succede con JwtBearer configurato correttamente?',
  options: [
    ['Il token viene rifiutato con 401 perché la firma non corrisponde più al contenuto', 'Corretto: la firma copre header e payload.'],
    ['Viene accettato: il payload non è protetto', 'Il payload è leggibile ma non modificabile senza invalidare la firma.'],
    ['Viene accettato con il ruolo originale', 'Il middleware non "ripara" i token: li rifiuta.'],
    ['Restituisce 403 Forbidden', '403 indica utente autenticato ma non autorizzato; qui l\'autenticazione stessa fallisce.'],
  ],
});
P.q('A1.3', 'training', {
  prompt: 'Quale codice HTTP restituisce questo endpoint a un utente autenticato privo del claim richiesto?',
  lang: 'csharp',
  code: `builder.Services.AddAuthorizationBuilder()
    .AddPolicy("orders:write", p => p.RequireClaim("scp", "orders.write"));

app.MapPost("/orders", CreateOrder).RequireAuthorization("orders:write");
// token valido, ma con scp = "orders.read"`,
  options: [
    ['403 Forbidden', 'Corretto: identità valida ma permessi insufficienti.'],
    ['401 Unauthorized', '401 è per richieste non autenticate o con token non valido.'],
    ['404 Not Found', 'Alcune API nascondono le risorse con 404, ma non è il default delle policy.'],
    ['400 Bad Request', 'La richiesta è sintatticamente valida.'],
  ],
});
P.q('A1.4', 'exam', {
  interview: true,
  prompt: 'Cosa produce il problema N+1 in questo codice EF Core con lazy loading attivo?',
  lang: 'csharp',
  code: `var customers = await db.Customers.ToListAsync();      // 100 clienti
foreach (var c in customers)
    Console.WriteLine(c.Orders.Count);                 // navigation lazy`,
  options: [
    ['101 query: 1 per i clienti + 1 per gli ordini di ciascun cliente', 'Corretto: si risolve con proiezione (Select) o Include.'],
    ['1 query: EF Core unisce tutto automaticamente', 'Senza Include/Select EF non conosce in anticipo le navigation che userai.'],
    ['2 query', 'Sarebbe il risultato con AsSplitQuery + Include.'],
    ['Un\'eccezione perché Orders è null', 'Con lazy loading la proprietà viene caricata al primo accesso.'],
  ],
});
P.q('A1.4', 'training', {
  interview: true,
  prompt: 'Quando scegliere Dapper rispetto a EF Core?',
  options: [
    ['Per query di lettura complesse o critiche per le performance dove si vuole pieno controllo dell\'SQL', 'Corretto: molti team usano EF per i comandi e Dapper per i report.'],
    ['Sempre, EF Core è deprecato', 'EF Core è attivamente sviluppato e performante.'],
    ['Quando servono migrazioni automatiche', 'Le migrazioni sono una feature di EF Core, non di Dapper.'],
    ['Quando serve il change tracking', 'Dapper non ha change tracking.'],
  ],
});
P.q('A1.4', 'exam', {
  prompt: 'Una query `WHERE customer_id = @id ORDER BY created_at DESC LIMIT 20` è lenta su 10M righe. Quale indice è più efficace?',
  lang: 'sql',
  code: `SELECT id, total FROM orders
WHERE customer_id = @id
ORDER BY created_at DESC
LIMIT 20;`,
  options: [
    ['Indice composto (customer_id, created_at DESC)', 'Corretto: filtra per uguaglianza e restituisce le righe già ordinate, senza sort.'],
    ['Indice su created_at', 'Aiuta l\'ordinamento ma il DB deve scorrere molte righe di altri clienti.'],
    ['Indice su total', 'total non compare nel filtro né nell\'ordinamento.'],
    ['Due indici separati su customer_id e created_at', 'Il planner ne userà tipicamente uno solo e dovrà comunque ordinare.'],
  ],
});

// ─── IDE Code Labs ───────────────────────────────────────────────────────────
P.lab('A1.2', {
  title: 'Fix di una Captive Dependency',
  objective: 'Osservare una captive dependency, farla emergere con `ValidateScopes` e correggerla.',
  scenario: 'Un `ReportService` singleton riceve un `UnitOfWork` scoped: in produzione due richieste diverse condividono lo stesso UnitOfWork (e lo stesso DbContext).',
  run: [
    'dotnet new console -n CaptiveLab && cd CaptiveLab',
    'dotnet add package Microsoft.Extensions.DependencyInjection',
    'Incolla il codice in Program.cs e lancia dotnet run',
  ],
  steps: [
    'Esegui lo starter: nota che due scope diversi vedono lo stesso UnitOfWork e che la validazione fallisce.',
    'Correggi registrando `ReportService` con il lifetime giusto (oppure usando IServiceScopeFactory).',
    'Riesegui e scegli l\'output ottenuto.',
  ],
  lang: 'csharp',
  starter: `using Microsoft.Extensions.DependencyInjection;

var services = new ServiceCollection();
services.AddScoped<UnitOfWork>();
services.AddSingleton<ReportService>(); // TODO: captive dependency!

var provider = services.BuildServiceProvider(new ServiceProviderOptions { ValidateScopes = false });

Guid Use()
{
    using var scope = provider.CreateScope();          // simula una richiesta HTTP
    return scope.ServiceProvider.GetRequiredService<ReportService>().UowId;
}
var first = Use();
var second = Use();
Console.WriteLine($"Stesso UnitOfWork tra due richieste: {first == second}");

try
{
    var strict = services.BuildServiceProvider(new ServiceProviderOptions { ValidateScopes = true });
    using var scope = strict.CreateScope();
    scope.ServiceProvider.GetRequiredService<ReportService>();
    Console.WriteLine("Validazione: OK");
}
catch (InvalidOperationException)
{
    Console.WriteLine("Validazione: InvalidOperationException");
}

public sealed class UnitOfWork { public Guid Id { get; } = Guid.NewGuid(); }
public sealed class ReportService(UnitOfWork uow) { public Guid UowId => uow.Id; }`,
  hints: [
    'Un servizio non deve vivere più a lungo delle sue dipendenze.',
    'Se ReportService non ha stato da condividere tra richieste, la correzione più semplice è `AddScoped<ReportService>()`.',
  ],
  question: 'Dopo la correzione, cosa stampa il programma?',
  options: [
    ['Stesso UnitOfWork tra due richieste: False\nValidazione: OK', 'Corretto: ogni scope ottiene il proprio UnitOfWork e la validazione passa.'],
    ['Stesso UnitOfWork tra due richieste: True\nValidazione: InvalidOperationException', 'È l\'output dello starter: il singleton ha catturato il primo UnitOfWork.'],
    ['Stesso UnitOfWork tra due richieste: True\nValidazione: OK', 'Se la condivisione persiste, la validazione segnala ancora la captive dependency.'],
    ['Stesso UnitOfWork tra due richieste: False\nValidazione: InvalidOperationException', 'Con ReportService scoped non c\'è più nulla da segnalare.'],
  ],
  solution: `using Microsoft.Extensions.DependencyInjection;

var services = new ServiceCollection();
services.AddScoped<UnitOfWork>();
services.AddScoped<ReportService>();   // ✅ stesso lifetime della dipendenza: niente cattura

var provider = services.BuildServiceProvider(new ServiceProviderOptions { ValidateScopes = false });

Guid Use()
{
    using var scope = provider.CreateScope();                       // nuova "richiesta"
    return scope.ServiceProvider.GetRequiredService<ReportService>().UowId;
}
Console.WriteLine($"Stesso UnitOfWork tra due richieste: {Use() == Use()}"); // False

try
{
    var strict = services.BuildServiceProvider(new ServiceProviderOptions { ValidateScopes = true });
    using var scope = strict.CreateScope();
    scope.ServiceProvider.GetRequiredService<ReportService>();
    Console.WriteLine("Validazione: OK");                            // ✅ nessuna captive dependency
}
catch (InvalidOperationException)
{
    Console.WriteLine("Validazione: InvalidOperationException");
}

// Alternativa se ReportService DEVE restare singleton (es. cache):
// public sealed class ReportService(IServiceScopeFactory f)
// {
//     public Guid NewUowId() { using var s = f.CreateScope(); return s.ServiceProvider.GetRequiredService<UnitOfWork>().Id; }
// }

public sealed class UnitOfWork { public Guid Id { get; } = Guid.NewGuid(); }
public sealed class ReportService(UnitOfWork uow) { public Guid UowId => uow.Id; }`,
  explanation: 'Il singleton viene costruito una sola volta, nel primo scope, e trattiene quel UnitOfWork per sempre: ecco perché due richieste vedono lo stesso Id. Con `ValidateScopes = true` (default in Development su ASP.NET Core) il container rileva il problema e lancia InvalidOperationException ("Cannot consume scoped service … from singleton …"). Allineando i lifetime ogni scope riceve la propria istanza.',
});

P.lab('A1.4', {
  title: 'Ottimizzazione query EF Core: da N+1 a una sola query',
  objective: 'Misurare il numero di query SQL con un interceptor e eliminare il pattern N+1 con una proiezione.',
  scenario: 'La pagina "blog e numero di post" esegue una query per ogni blog. Con 3 blog va bene, con 3.000 il DB soffre.',
  run: [
    'dotnet new console -n NPlusOneLab && cd NPlusOneLab',
    'dotnet add package Microsoft.EntityFrameworkCore.Sqlite',
    'Incolla il codice in Program.cs e lancia dotnet run',
  ],
  steps: [
    'Esegui lo starter e annota quante query vengono contate.',
    'Riscrivi la lettura con `AsNoTracking()` e una proiezione `Select` che calcola `b.Posts.Count` lato DB.',
    'Riesegui e scegli l\'output.',
  ],
  lang: 'csharp',
  starter: `using System.Data.Common;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

using var conn = new SqliteConnection("DataSource=:memory:");
conn.Open();
var counter = new QueryCounter();
var options = new DbContextOptionsBuilder<BlogDb>().UseSqlite(conn).AddInterceptors(counter).Options;

using (var seed = new BlogDb(options))
{
    seed.Database.EnsureCreated();
    for (var i = 1; i <= 3; i++)
        seed.Blogs.Add(new Blog { Name = $"Blog {i}", Posts = [new Post { Title = "a" }, new Post { Title = "b" }] });
    seed.SaveChanges();
}

counter.Count = 0;
using var db = new BlogDb(options);

// TODO: questo è un N+1
var blogs = db.Blogs.ToList();
var total = 0;
foreach (var b in blogs)
    total += db.Posts.Where(p => p.BlogId == b.Id).ToList().Count;

Console.WriteLine($"Query eseguite: {counter.Count}");
Console.WriteLine($"Post totali: {total}");

public sealed class QueryCounter : DbCommandInterceptor
{
    public int Count;
    public override InterceptionResult<DbDataReader> ReaderExecuting(
        DbCommand command, CommandEventData eventData, InterceptionResult<DbDataReader> result)
    {
        Count++;
        return result;
    }
}
public sealed class BlogDb(DbContextOptions<BlogDb> o) : DbContext(o)
{
    public DbSet<Blog> Blogs => Set<Blog>();
    public DbSet<Post> Posts => Set<Post>();
}
public sealed class Blog { public int Id { get; set; } public string Name { get; set; } = ""; public List<Post> Posts { get; set; } = []; }
public sealed class Post { public int Id { get; set; } public string Title { get; set; } = ""; public int BlogId { get; set; } }`,
  hints: [
    'Ogni `ToList()` dentro il foreach è un round-trip al database.',
    '`db.Blogs.AsNoTracking().Select(b => new { b.Name, PostCount = b.Posts.Count }).ToList()` genera una sola SELECT con subquery COUNT.',
  ],
  question: 'Dopo l\'ottimizzazione, cosa stampa il programma?',
  options: [
    ['Query eseguite: 1\nPost totali: 6', 'Corretto: una sola SELECT con COUNT correlato, stesso risultato.'],
    ['Query eseguite: 4\nPost totali: 6', 'È l\'output dello starter: 1 query per i blog + 3 per i post.'],
    ['Query eseguite: 1\nPost totali: 0', 'La proiezione calcola correttamente il conteggio lato database.'],
    ['Query eseguite: 7\nPost totali: 6', 'Non si esegue una query per ogni post.'],
  ],
  solution: `// ... setup identico (connessione, interceptor, seed) ...
counter.Count = 0;
using var db = new BlogDb(options);

var summaries = db.Blogs
    .AsNoTracking()                                   // sola lettura: niente change tracking
    .Select(b => new { b.Name, PostCount = b.Posts.Count }) // proiezione: EF genera una subquery COUNT
    .ToList();                                        // ✅ UN solo round-trip

var total = summaries.Sum(s => s.PostCount);          // aggregazione in memoria su 3 righe

Console.WriteLine($"Query eseguite: {counter.Count}"); // 1
Console.WriteLine($"Post totali: {total}");            // 6

// Alternativa: db.Blogs.Include(b => b.Posts).AsNoTracking().ToList() → 1 query con JOIN
// (ma carica tutte le colonne dei post: la proiezione è più leggera)`,
  explanation: 'Lo starter esegue 1 SELECT sui blog e poi una SELECT sui post per ciascun blog (3): 4 query. La proiezione con `b.Posts.Count` viene tradotta in `SELECT b.Name, (SELECT COUNT(*) FROM Posts p WHERE b.Id = p.BlogId) FROM Blogs b`: una sola query. L\'interceptor conta solo i comandi che restituiscono un reader, cioè le SELECT.',
});

P.lab('A1.1', {
  title: 'ProblemDetails + validazione in una Minimal API',
  objective: 'Restituire errori standard RFC 9457 sia per la validazione sia per le eccezioni non gestite.',
  scenario: 'L\'API restituisce errori in formati diversi: testo semplice per la validazione e la pagina di eccezione per i crash. Il frontend non riesce a gestirli in modo uniforme.',
  run: RUN.webapi,
  steps: [
    'Registra `AddProblemDetails()` e aggiungi `UseExceptionHandler()` come primo middleware.',
    'Nella POST, se Quantity <= 0 restituisci `Results.ValidationProblem` con l\'errore sul campo.',
    'Lancia l\'app in Production (`ASPNETCORE_ENVIRONMENT=Production`) e chiama `POST /orders {"quantity":0}` e `GET /boom`.',
  ],
  lang: 'csharp',
  starter: `var builder = WebApplication.CreateBuilder(args);
// TODO: registra ProblemDetails
var app = builder.Build();
// TODO: exception handler

app.MapPost("/orders", (CreateOrder cmd) =>
{
    if (cmd.Quantity <= 0)
        return Results.BadRequest("quantity non valida"); // TODO: ValidationProblem
    return Results.Created($"/orders/1", cmd);
});

app.MapGet("/boom", () => { throw new InvalidOperationException("DB giù"); });

app.Run();

public record CreateOrder(string Sku, int Quantity);`,
  hints: [
    '`Results.ValidationProblem(new Dictionary<string, string[]> { ["quantity"] = ["Deve essere > 0"] })` produce un 400 con la proprietà `errors`.',
    '`app.UseExceptionHandler()` senza parametri richiede che sia registrato un IProblemDetailsService, cioè `AddProblemDetails()`.',
  ],
  question: 'Con la soluzione, che risposte ottieni dalle due chiamate (in Production)?',
  options: [
    ['POST → 400 application/problem+json con "errors": {"quantity": [...]}\nGET /boom → 500 application/problem+json senza stack trace', 'Corretto: validazione e crash parlano lo stesso formato e non espongono dettagli interni.'],
    ['POST → 400 text/plain "quantity non valida"\nGET /boom → 500 con corpo vuoto', 'È il comportamento dello starter in Production.'],
    ['POST → 422 application/json\nGET /boom → 500 pagina HTML con stack trace', 'ValidationProblem usa 400 di default e la pagina con stack trace appare solo in Development.'],
    ['POST → 400 application/problem+json\nGET /boom → 500 application/problem+json con lo stack trace nel campo detail', 'In Production ProblemDetails non include lo stack trace: sarebbe un information disclosure.'],
  ],
  solution: `var builder = WebApplication.CreateBuilder(args);
builder.Services.AddProblemDetails(o =>
    o.CustomizeProblemDetails = ctx =>
        ctx.ProblemDetails.Extensions["traceId"] = ctx.HttpContext.TraceIdentifier); // utile per il supporto

var app = builder.Build();
app.UseExceptionHandler();   // ✅ primo middleware: eccezioni → 500 problem+json
app.UseStatusCodePages();    // ✅ 404/405 senza body → problem+json

app.MapPost("/orders", (CreateOrder cmd) =>
{
    if (cmd.Quantity <= 0)
        return Results.ValidationProblem(new Dictionary<string, string[]>
        {
            ["quantity"] = ["Deve essere maggiore di zero."]   // errore legato al campo
        });                                                      // → 400 + "errors"
    return Results.Created($"/orders/1", cmd);
});

app.MapGet("/boom", () => { throw new InvalidOperationException("DB giù"); }); // → 500 problem+json

app.Run();

public record CreateOrder(string Sku, int Quantity);`,
  explanation: '`AddProblemDetails` registra IProblemDetailsService; `UseExceptionHandler()` cattura le eccezioni dei middleware successivi e scrive un ProblemDetails 500 generico (in Production senza stack trace). `Results.ValidationProblem` produce un `HttpValidationProblemDetails` con status 400 e il dizionario `errors`. Il frontend ora può gestire ogni errore leggendo `status`, `title` ed `errors`.',
});

export const phaseA1 = P.build({
  title: 'Backend .NET moderno, API e Database',
  subtitle: 'ASP.NET Core, DI, sicurezza delle API e accesso ai dati senza sorprese in produzione.',
});
