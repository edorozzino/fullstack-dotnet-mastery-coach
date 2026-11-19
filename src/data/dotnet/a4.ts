import { phaseBuilder, RUN } from '../builders';

const P = phaseBuilder('A4', 'A', 4)
  .module('A4.1', 'Hosting Azure e dati gestiti', ['Azure Container Apps', 'App Service', 'Azure Database for PostgreSQL', 'Azure SQL', 'basi Kubernetes'])
  .module('A4.2', 'Identità e Segreti', ['Key Vault', 'Managed Identity', 'Entra ID', 'DefaultAzureCredential', 'Options pattern'])
  .module('A4.3', 'Sicurezza API e DevSecOps', ['OWASP API Top 10', 'IDOR / BOLA', 'rate limiting', 'CORS', 'minimo privilegio']);

P.card('A4.1', {
  title: 'Dove far girare un\'API .NET su Azure',
  summary: 'App Service è un PaaS semplice per web app e API. Azure Container Apps esegue container con autoscaling (anche a zero) basato su KEDA, revisioni e Dapr, senza gestire Kubernetes. AKS dà pieno controllo Kubernetes a fronte di più operatività. Per i dati si preferiscono servizi gestiti (Azure Database for PostgreSQL Flexible Server, Azure SQL) con backup e HA inclusi.',
  lang: 'yaml',
  code: `# Kubernetes: le basi da saper leggere a un colloquio
apiVersion: apps/v1
kind: Deployment
metadata: { name: orders-api }
spec:
  replicas: 3
  selector: { matchLabels: { app: orders-api } }
  template:
    metadata: { labels: { app: orders-api } }
    spec:
      containers:
        - name: api
          image: acr.azurecr.io/orders-api:3f2c1ab
          ports: [{ containerPort: 8080 }]
          readinessProbe: { httpGet: { path: /health/ready, port: 8080 } }
          livenessProbe:  { httpGet: { path: /health/live,  port: 8080 } }
          resources: { requests: { cpu: 250m, memory: 256Mi }, limits: { memory: 512Mi } }`,
  trap: 'Usare la stessa probe per liveness e readiness che controlla anche il DB: se il DB ha un blip, Kubernetes riavvia tutti i pod in loop invece di toglierli temporaneamente dal bilanciamento.',
  rule: 'Scegli il servizio più gestito che soddisfa i requisiti: App Service/Container Apps prima di AKS, DB PaaS prima di VM con DB installato.',
  check: {
    q: 'Cosa fa una readiness probe che fallisce in Kubernetes?',
    options: ['Toglie il pod dal bilanciamento del Service finché non torna pronto, senza riavviarlo', 'Riavvia il container', 'Cancella il Deployment', 'Scala il Deployment a zero'],
    explanation: 'La liveness probe riavvia il container; la readiness controlla solo se ricevere traffico.',
  },
});

P.card('A4.2', {
  title: 'Managed Identity, Key Vault e Options validate',
  summary: 'Una Managed Identity è un\'identità Entra ID assegnata alla risorsa Azure: l\'app ottiene token senza segreti nel codice. `DefaultAzureCredential` usa la Managed Identity in cloud e il login di Visual Studio/CLI in locale. Key Vault conserva i segreti; il configuration provider li espone come normale configurazione, validata all\'avvio con il pattern Options.',
  lang: 'csharp',
  code: `builder.Configuration.AddAzureKeyVault(
    new Uri("https://kv-orders-prod.vault.azure.net/"),
    new DefaultAzureCredential());              // Managed Identity in Azure, az login in locale

builder.Services.AddOptions<PaymentOptions>()
    .BindConfiguration("Payment")
    .ValidateDataAnnotations()
    .ValidateOnStart();                         // fallisce all'avvio, non alla prima richiesta

public sealed class PaymentOptions
{
    [Required] public string ApiKey { get; init; } = "";
    [Url] public string Endpoint { get; init; } = "";
}`,
  trap: 'Committare connection string o API key in appsettings.json "solo per lo sviluppo": il segreto resta per sempre nella history di Git.',
  rule: 'Zero segreti nel repository: user-secrets in locale, Key Vault + Managed Identity in cloud, ruoli RBAC con il minimo privilegio.',
  check: {
    q: 'Quale vantaggio dà una Managed Identity rispetto a un client secret?',
    options: ['Le credenziali sono gestite e ruotate da Azure: nessun segreto da salvare o ruotare nel codice', 'Funziona senza Entra ID', 'Dà automaticamente i permessi di Owner', 'Non richiede assegnazioni di ruolo'],
    explanation: 'La Managed Identity elimina il segreto, ma i permessi vanno comunque concessi con RBAC.',
  },
});

P.card('A4.3', {
  title: 'OWASP API Top 10, rate limiting e CORS',
  summary: 'Il rischio n.1 delle API è la Broken Object Level Authorization (BOLA/IDOR): l\'utente accede a oggetti altrui cambiando un id. Il rate limiting protegge da abusi e consumo eccessivo di risorse. CORS è una protezione del BROWSER che decide quali origini possono leggere le risposte: non è autenticazione né protegge da client non-browser.',
  lang: 'csharp',
  code: `// BOLA/IDOR: filtra SEMPRE per il proprietario
app.MapGet("/invoices/{id:int}", async (int id, ClaimsPrincipal user, AppDb db) =>
{
    var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
    var inv = await db.Invoices.AsNoTracking()
        .FirstOrDefaultAsync(i => i.Id == id && i.OwnerId == userId);
    return inv is null ? Results.NotFound() : Results.Ok(inv);
}).RequireAuthorization();

builder.Services.AddCors(o => o.AddPolicy("spa", p => p
    .WithOrigins("https://app.contoso.com")   // mai AllowAnyOrigin + AllowCredentials
    .AllowAnyHeader().WithMethods("GET", "POST")));`,
  trap: 'Pensare che CORS "protegga l\'API": un attaccante con curl o Postman ignora completamente CORS. L\'autorizzazione va fatta lato server.',
  rule: 'Autorizza ogni accesso a livello di oggetto, limita le richieste per utente/IP, restringi CORS alle origini note e dai a ogni identità il minimo privilegio.',
  check: {
    q: 'Cosa protegge CORS?',
    options: ['Impedisce a pagine di altre origini, nel browser, di leggere le risposte della tua API', 'Impedisce a qualunque client di chiamare la tua API', 'Cifra le risposte', 'Sostituisce l\'autenticazione'],
    explanation: 'CORS rilassa in modo controllato la Same-Origin Policy dei browser; non vale per client server-to-server.',
  },
});

// ─── Domande ─────────────────────────────────────────────────────────────────
P.q('A4.1', 'training', {
  interview: true,
  prompt: 'Un team piccolo deve eseguire 4 microservizi containerizzati con scaling basato su coda e senza gestire un cluster. Quale servizio Azure è più adatto?',
  options: [
    ['Azure Container Apps', 'Corretto: container serverless con scaling KEDA (anche a zero) e senza gestione del cluster.'],
    ['AKS', 'Dà più controllo, ma richiede la gestione di cluster, upgrade e networking.'],
    ['Azure Virtual Machines', 'IaaS: patching e orchestrazione restano a carico del team.'],
    ['Azure Storage Static Website', 'Ospita file statici, non container.'],
  ],
});
P.q('A4.1', 'exam', {
  prompt: 'Qual è la differenza tra liveness e readiness probe?',
  options: [
    ['Liveness fallita → container riavviato; readiness fallita → pod escluso dal traffico', 'Corretto: hanno scopi diversi e non vanno confuse.'],
    ['Sono sinonimi', 'Hanno effetti molto diversi.'],
    ['La readiness riavvia il pod, la liveness lo esclude dal traffico', 'È l\'esatto contrario.'],
    ['Liveness si usa solo in Azure, readiness solo on-premise', 'Sono concetti di Kubernetes, indipendenti dal provider.'],
  ],
});
P.q('A4.1', 'training', {
  prompt: 'Perché preferire Azure Database for PostgreSQL Flexible Server a un Postgres installato su una VM?',
  options: [
    ['Backup automatici, alta disponibilità, patching e monitoraggio gestiti dalla piattaforma', 'Corretto: si riduce drasticamente il carico operativo.'],
    ['Perché è sempre più economico', 'Non sempre; il vantaggio principale è operativo.'],
    ['Perché supporta SQL standard mentre la VM no', 'Postgres è lo stesso motore.'],
    ['Perché non richiede networking', 'Va comunque configurato (private endpoint, firewall, VNet).'],
  ],
});
P.q('A4.1', 'exam', {
  interview: true,
  prompt: 'In Kubernetes, quale oggetto espone in modo stabile un insieme di pod che cambiano nel tempo?',
  options: [
    ['Service', 'Corretto: fornisce un indirizzo/DNS stabile e bilancia sui pod selezionati dalle label.'],
    ['Deployment', 'Gestisce repliche e rollout, ma non espone un endpoint stabile.'],
    ['ConfigMap', 'Contiene configurazione.'],
    ['PersistentVolume', 'Riguarda lo storage.'],
  ],
});
P.q('A4.2', 'training', {
  interview: true,
  prompt: 'Cosa fa `DefaultAzureCredential`?',
  options: [
    ['Prova in sequenza più sorgenti di credenziali (env, workload/managed identity, VS, Azure CLI…) usando la prima disponibile', 'Corretto: lo stesso codice funziona in locale e in cloud.'],
    ['Usa sempre un client secret letto da appsettings', 'Non richiede segreti nel file di configurazione.'],
    ['Crea automaticamente una Managed Identity', 'L\'identità va abilitata sulla risorsa.'],
    ['Disabilita l\'autenticazione in Development', 'Autentica sempre, usando le credenziali dello sviluppatore in locale.'],
  ],
});
P.q('A4.2', 'exam', {
  prompt: 'Cosa succede avviando l\'app senza la configurazione `Payment:ApiKey`?',
  lang: 'csharp',
  code: `builder.Services.AddOptions<PaymentOptions>()
    .BindConfiguration("Payment")
    .ValidateDataAnnotations()
    .ValidateOnStart();
public sealed class PaymentOptions { [Required] public string? ApiKey { get; init; } }`,
  options: [
    ['L\'host non si avvia: OptionsValidationException all\'avvio', 'Corretto: ValidateOnStart esegue la validazione durante lo start dell\'host (fail fast).'],
    ['L\'app parte e fallisce solo alla prima richiesta che usa PaymentOptions', 'Sarebbe così senza ValidateOnStart.'],
    ['ApiKey vale stringa vuota e tutto funziona', '[Required] considera null/vuoto come errore.'],
    ['Errore di compilazione', 'È una validazione a runtime.'],
  ],
});
P.q('A4.2', 'training', {
  prompt: 'In sviluppo locale, dove conviene tenere i segreti di un progetto ASP.NET Core?',
  options: [
    ['In dotnet user-secrets (fuori dalla cartella del repository)', 'Corretto: vengono caricati in Development e non finiscono in Git.'],
    ['In appsettings.Development.json versionato', 'Finirebbero nella history del repository.'],
    ['Hardcoded in Program.cs dentro un #if DEBUG', 'Restano comunque nel codice sorgente.'],
    ['In un file .txt sul desktop letto all\'avvio', 'Non è un meccanismo standard né sicuro.'],
  ],
});
P.q('A4.2', 'exam', {
  interview: true,
  prompt: 'L\'app con Managed Identity deve solo leggere i segreti di un Key Vault (modello RBAC). Quale ruolo assegnare?',
  options: [
    ['Key Vault Secrets User sul singolo vault', 'Corretto: minimo privilegio, lettura dei segreti e nient\'altro.'],
    ['Owner sulla subscription', 'Privilegi enormemente superiori al necessario.'],
    ['Key Vault Administrator', 'Consente di gestire tutto il vault, non solo leggere.'],
    ['Contributor sul resource group', 'Il piano di gestione non dà accesso ai segreti e concede troppi permessi.'],
  ],
});
P.q('A4.3', 'training', {
  interview: true,
  prompt: 'Cos\'è una vulnerabilità IDOR/BOLA?',
  options: [
    ['L\'API restituisce o modifica un oggetto in base all\'id fornito senza verificare che appartenga all\'utente', 'Corretto: è il rischio n.1 dell\'OWASP API Security Top 10.'],
    ['Un\'iniezione SQL nei parametri', 'È una categoria diversa (injection).'],
    ['Un token JWT scaduto accettato dall\'API', 'È un problema di autenticazione.'],
    ['Un attacco DDoS', 'Riguarda la disponibilità.'],
  ],
});
P.q('A4.3', 'exam', {
  prompt: 'Quale configurazione CORS è pericolosa e rifiutata da ASP.NET Core?',
  lang: 'csharp',
  code: `p.AllowAnyOrigin().AllowCredentials();`,
  options: [
    ['AllowAnyOrigin insieme ad AllowCredentials: qualsiasi sito potrebbe fare richieste con i cookie dell\'utente', 'Corretto: la spec CORS lo vieta e ASP.NET Core lancia un\'eccezione.'],
    ['Nessun problema, è la configurazione consigliata per le SPA', 'È esattamente ciò da evitare.'],
    ['È pericolosa solo in HTTP, non in HTTPS', 'Il problema è indipendente dal protocollo.'],
    ['Blocca tutte le richieste preflight', 'Il problema è che le consentirebbe da ogni origine.'],
  ],
});
P.q('A4.3', 'training', {
  prompt: 'Con questa configurazione, quale status code riceve la quarta richiesta nella stessa finestra?',
  lang: 'csharp',
  code: `builder.Services.AddRateLimiter(o =>
    o.AddFixedWindowLimiter("api", l => { l.PermitLimit = 3; l.Window = TimeSpan.FromMinutes(1); }));
app.UseRateLimiter();
app.MapGet("/quote", () => "ok").RequireRateLimiting("api");`,
  options: [
    ['503 Service Unavailable (va impostato RejectionStatusCode = 429)', 'Corretto: il default è 503, ma per i client 429 Too Many Requests è più corretto.'],
    ['429 Too Many Requests', 'È il codice consigliato, ma va configurato esplicitamente.'],
    ['403 Forbidden', 'Non è un problema di autorizzazione.'],
    ['400 Bad Request', 'La richiesta è valida.'],
  ],
});
P.q('A4.3', 'exam', {
  interview: true,
  prompt: 'Quale pratica applica il principio del minimo privilegio a una pipeline di deploy?',
  options: [
    ['Identità dedicata per ambiente con ruoli limitati alle sole risorse da aggiornare', 'Corretto: compromettere la pipeline di staging non dà accesso alla produzione.'],
    ['Un unico service principal Owner su tutta la subscription', 'Concentra un rischio enorme in una sola credenziale.'],
    ['Condividere le credenziali di un amministratore', 'Nessuna tracciabilità e permessi eccessivi.'],
    ['Disabilitare RBAC per semplificare', 'Rimuove ogni controllo.'],
  ],
});

// ─── IDE Code Labs ───────────────────────────────────────────────────────────
P.lab('A4.2', {
  title: 'Gestione sicura dei segreti con Options validate',
  objective: 'Togliere un segreto dal repository e far fallire l\'avvio se la configurazione è incompleta.',
  scenario: 'La API key del provider di pagamenti è in appsettings.json ed è letta "al volo" nell\'endpoint: se manca, l\'errore emerge solo quando un cliente paga.',
  run: [
    'dotnet new web -n SecretsLab && cd SecretsLab',
    'Incolla il codice in Program.cs e rimuovi la chiave da appsettings.json',
    'ASPNETCORE_ENVIRONMENT=Production dotnet run   (senza variabile Payment__ApiKey)',
    'Poi: Payment__ApiKey=test-123 ASPNETCORE_ENVIRONMENT=Production dotnet run',
  ],
  steps: [
    'Crea `PaymentOptions` con `[Required] ApiKey` e `[Url] Endpoint` (con default).',
    'Registra le options con BindConfiguration, ValidateDataAnnotations e ValidateOnStart.',
    'Inietta `IOptions<PaymentOptions>` nell\'endpoint; in locale usa `dotnet user-secrets`, in cloud Key Vault.',
  ],
  lang: 'csharp',
  starter: `var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.MapPost("/pay", (IConfiguration cfg) =>
{
    // TODO: letto a runtime, nessuna validazione, segreto in appsettings.json
    var key = cfg["Payment:ApiKey"];
    return Results.Ok(new { usingKey = key?[..3] + "***" });
});

app.Run();

// appsettings.json (TODO: rimuovere!)
// { "Payment": { "ApiKey": "sk_live_51H...", "Endpoint": "https://pay.example.com" } }`,
  hints: [
    '`AddOptions<T>().BindConfiguration("Payment").ValidateDataAnnotations().ValidateOnStart()`.',
    'Le variabili d\'ambiente usano `__` come separatore di sezione: `Payment__ApiKey`.',
  ],
  question: 'Con la soluzione, cosa succede avviando in Production SENZA Payment__ApiKey e poi CON la variabile?',
  options: [
    ['Senza: l\'host non parte (OptionsValidationException su ApiKey). Con: l\'app parte e /pay usa la chiave', 'Corretto: fail-fast all\'avvio e segreto fuori dal repository.'],
    ['Senza: l\'app parte e /pay risponde con usingKey "***". Con: idem con la chiave', 'È il comportamento dello starter: l\'errore emerge solo a runtime.'],
    ['In entrambi i casi l\'app non parte', 'Con la variabile d\'ambiente la validazione passa.'],
    ['Senza: l\'app parte ma ogni richiesta restituisce 500', 'ValidateOnStart blocca già l\'avvio dell\'host.'],
  ],
  solution: `using System.ComponentModel.DataAnnotations;
using Microsoft.Extensions.Options;

var builder = WebApplication.CreateBuilder(args);

// In cloud: builder.Configuration.AddAzureKeyVault(new Uri(kvUri), new DefaultAzureCredential());
// In locale: dotnet user-secrets set "Payment:ApiKey" "sk_test_..."

builder.Services.AddOptions<PaymentOptions>()
    .BindConfiguration("Payment")      // legge la sezione da QUALSIASI provider (json, env, Key Vault)
    .ValidateDataAnnotations()         // applica [Required], [Url]
    .ValidateOnStart();                // ✅ fail fast: l'host non parte con config invalida

var app = builder.Build();

app.MapPost("/pay", (IOptions<PaymentOptions> opt) =>
    Results.Ok(new { usingKey = opt.Value.ApiKey[..3] + "***" })); // mai loggare/restituire il segreto intero

app.Run();

public sealed class PaymentOptions
{
    [Required] public string ApiKey { get; init; } = "";               // stringa vuota → invalida
    [Url] public string Endpoint { get; init; } = "https://pay.example.com";
}`,
  explanation: '`ValidateOnStart` registra un servizio che valida le options durante l\'avvio dell\'host: senza ApiKey, `[Required]` fallisce e viene lanciata OptionsValidationException prima di accettare traffico. Con `Payment__ApiKey` nell\'ambiente (o in Key Vault/user-secrets) il binding la trova e l\'app parte. Il segreto non è più nel repository.',
});

P.lab('A4.3', {
  title: 'Rate Limiting in ASP.NET Core',
  objective: 'Proteggere un endpoint costoso con un limiter a finestra fissa e uno status code corretto per i client.',
  scenario: 'Un endpoint di quotazione viene martellato da uno script: il DB va in saturazione.',
  run: [
    ...RUN.webapi,
    'for i in 1 2 3 4 5; do curl -s -o /dev/null -w "%{http_code} " http://localhost:5000/api/quote; done',
  ],
  steps: [
    'Registra `AddRateLimiter` con un fixed window limiter "quote": 3 permessi ogni 10 secondi, coda 0.',
    'Imposta `RejectionStatusCode = 429`.',
    'Aggiungi `UseRateLimiter()` e `.RequireRateLimiting("quote")` sull\'endpoint.',
  ],
  lang: 'csharp',
  starter: `var builder = WebApplication.CreateBuilder(args);
// TODO: AddRateLimiter con fixed window "quote"
var app = builder.Build();
// TODO: UseRateLimiter

app.MapGet("/api/quote", () => Results.Ok(new { price = Random.Shared.Next(100, 200) }));
// TODO: RequireRateLimiting

app.Run();`,
  hints: [
    '`o.AddFixedWindowLimiter("quote", l => { l.PermitLimit = 3; l.Window = TimeSpan.FromSeconds(10); l.QueueLimit = 0; });`',
    'Senza `o.RejectionStatusCode = StatusCodes.Status429TooManyRequests` le richieste rifiutate ricevono 503.',
  ],
  question: 'Con la soluzione, cosa stampa il ciclo curl di 5 richieste ravvicinate?',
  options: [
    ['200 200 200 429 429', 'Corretto: 3 permessi nella finestra, le altre rifiutate con 429.'],
    ['200 200 200 200 200', 'È lo starter senza limiter.'],
    ['200 200 200 503 503', 'È ciò che ottieni dimenticando RejectionStatusCode (default 503).'],
    ['429 429 429 429 429', 'Le prime 3 richieste rientrano nel limite.'],
  ],
  solution: `using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests; // ✅ default sarebbe 503
    o.AddFixedWindowLimiter("quote", l =>
    {
        l.PermitLimit = 3;                       // 3 richieste...
        l.Window = TimeSpan.FromSeconds(10);     // ...ogni 10 secondi
        l.QueueLimit = 0;                        // niente coda: rifiuta subito
        l.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
    });
    // In produzione: PartitionedRateLimiter per utente/IP (es. RateLimitPartition.GetFixedWindowLimiter(userId, ...))
});

var app = builder.Build();
app.UseRateLimiter();                            // dopo UseRouting se lo usi esplicitamente

app.MapGet("/api/quote", () => Results.Ok(new { price = Random.Shared.Next(100, 200) }))
   .RequireRateLimiting("quote");               // ✅ applica la policy all'endpoint

app.Run();`,
  explanation: 'Il fixed window limiter concede 3 permessi per finestra di 10 secondi; con `QueueLimit = 0` la quarta e la quinta richiesta vengono rifiutate subito. Il middleware usa `RejectionStatusCode`, che di default è 503: impostandolo a 429 i client (e i retry policy) capiscono che devono rallentare. Il limiter è globale: in produzione si partiziona per utente o IP.',
});

P.lab('A4.3', {
  title: 'Fix vulnerabilità OWASP: IDOR + CORS',
  objective: 'Correggere un endpoint vulnerabile a BOLA/IDOR e una policy CORS troppo permissiva.',
  scenario: 'Un penetration test ha scoperto che cambiando l\'id nell\'URL si scaricano le fatture di altri clienti, e che la CORS policy accetta qualsiasi origine.',
  run: [
    ...RUN.webapi,
    'curl -H "X-User: alice" http://localhost:5000/invoices/2   (la fattura 2 appartiene a bob)',
  ],
  steps: [
    'Ricava l\'utente corrente (qui simulato dall\'header X-User; in produzione dal ClaimsPrincipal).',
    'Filtra la fattura per id E proprietario; restituisci 404 se non è dell\'utente.',
    'Restringi CORS alla sola origine della SPA.',
  ],
  lang: 'csharp',
  starter: `var builder = WebApplication.CreateBuilder(args);
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod())); // TODO

var app = builder.Build();
app.UseCors();

var invoices = new[]
{
    new Invoice(1, "alice", 120),
    new Invoice(2, "bob", 990),
};

app.MapGet("/invoices/{id:int}", (int id, HttpContext ctx) =>
{
    // TODO: vulnerabile a IDOR
    var inv = invoices.FirstOrDefault(i => i.Id == id);
    return inv is null ? Results.NotFound() : Results.Ok(inv);
});

app.Run();

public record Invoice(int Id, string Owner, int Total);`,
  hints: [
    'La condizione deve essere `i.Id == id && i.Owner == currentUser`.',
    'Restituire 404 invece di 403 evita di confermare l\'esistenza della risorsa a chi non ne è proprietario.',
  ],
  question: 'Con la soluzione, cosa risponde l\'API ad alice che chiede /invoices/2?',
  options: [
    ['404 Not Found', 'Corretto: la fattura non appartiene ad alice, e non se ne rivela l\'esistenza.'],
    ['200 OK con la fattura di bob (990)', 'È la vulnerabilità IDOR dello starter.'],
    ['401 Unauthorized', 'Alice è identificata: il problema è l\'accesso all\'oggetto.'],
    ['Errore CORS', 'CORS non si applica a curl e non è un controllo di autorizzazione.'],
  ],
  solution: `var builder = WebApplication.CreateBuilder(args);
builder.Services.AddCors(o => o.AddPolicy("spa", p => p
    .WithOrigins("https://app.contoso.com")   // ✅ solo l'origine nota della SPA
    .WithMethods("GET")
    .AllowAnyHeader()));

var app = builder.Build();
app.UseCors("spa");

var invoices = new[] { new Invoice(1, "alice", 120), new Invoice(2, "bob", 990) };

app.MapGet("/invoices/{id:int}", (int id, HttpContext ctx) =>
{
    // In produzione: ctx.User.FindFirstValue(ClaimTypes.NameIdentifier) con .RequireAuthorization()
    var currentUser = ctx.Request.Headers["X-User"].ToString();
    if (string.IsNullOrEmpty(currentUser)) return Results.Unauthorized();

    // ✅ Object-level authorization: id E proprietario
    var inv = invoices.FirstOrDefault(i => i.Id == id && i.Owner == currentUser);
    return inv is null ? Results.NotFound() : Results.Ok(inv); // 404: non riveliamo che esiste
});

app.Run();

public record Invoice(int Id, string Owner, int Total);`,
  explanation: 'L\'autorizzazione a livello di oggetto va verificata ad ogni accesso: il filtro su proprietario rende la fattura di bob invisibile ad alice, che riceve 404. CORS è un meccanismo del browser: va ristretto alle origini note, ma non avrebbe mai impedito l\'attacco via curl. Il vero fix è lato server.',
});

export const phaseA4 = P.build({
  title: 'Cloud (Azure) e DevSecOps',
  subtitle: 'Hosting gestito, identità senza segreti e API difese secondo OWASP.',
});
