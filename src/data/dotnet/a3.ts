import { phaseBuilder } from '../builders';

const P = phaseBuilder('A3', 'A', 3)
  .module('A3.1', 'Docker per .NET', ['multi-stage build', 'layer caching', 'docker-compose', 'reti', 'segreti', 'utente non root'])
  .module('A3.2', 'CI/CD', ['GitHub Actions', 'Azure DevOps', 'build once deploy many', 'ambienti', 'OIDC federation'])
  .module('A3.3', 'Osservabilità', ['Serilog', 'logging strutturato', 'metriche', 'OpenTelemetry', 'Correlation ID', 'trace distribuiti']);

P.card('A3.1', {
  title: 'Dockerfile multi-stage e docker-compose',
  summary: 'Una build multi-stage compila con l\'immagine SDK e copia solo l\'output pubblicato in un\'immagine runtime più piccola. Ordinare i COPY dal meno al più variabile (prima i .csproj e il restore, poi il sorgente) sfrutta la cache dei layer. In compose i servizi si raggiungono per nome sulla rete interna.',
  lang: 'dockerfile',
  code: `FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY ["Api/Api.csproj", "Api/"]
# layer in cache finché il csproj non cambia
RUN dotnet restore "Api/Api.csproj"
COPY . .
RUN dotnet publish "Api/Api.csproj" -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
# utente non root predefinito nelle immagini .NET 8+
USER $APP_UID
ENTRYPOINT ["dotnet", "Api.dll"]`,
  trap: 'Nel container `localhost` è il container stesso: una connection string con `Host=localhost` non raggiunge il Postgres di un altro servizio compose.',
  rule: 'Immagine finale = solo runtime + output; nessun segreto nell\'immagine (né ARG, né ENV, né file copiati); usa .dockerignore.',
  check: {
    q: 'Perché si copia il .csproj e si esegue `dotnet restore` PRIMA di `COPY . .`?',
    options: ['Per riusare il layer di restore in cache quando cambia solo il codice sorgente', 'Perché restore non funziona dopo COPY', 'Per ridurre la dimensione dell\'immagine finale', 'Per eseguire i test'],
    explanation: 'Ogni istruzione crea un layer; se l\'input non cambia, Docker riusa la cache. Il restore dipende solo dai file di progetto.',
  },
});

P.card('A3.2', {
  title: 'Pipeline CI/CD affidabili',
  summary: 'La CI compila, testa e produce un artefatto versionato (immagine con tag = SHA del commit). La CD promuove LO STESSO artefatto tra ambienti (build once, deploy many) con approvazioni e smoke test. L\'autenticazione verso il cloud usa OIDC federation invece di segreti statici.',
  lang: 'yaml',
  code: `name: ci
on: { push: { branches: [main] }, pull_request: {} }
permissions: { contents: read, id-token: write }   # id-token per OIDC verso Azure
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-dotnet@v4
        with: { dotnet-version: '9.0.x' }
      - run: dotnet restore
      - run: dotnet build -c Release --no-restore
      - run: dotnet test -c Release --no-build --logger trx
      - run: docker build -t ghcr.io/acme/api:\${{ github.sha }} .`,
  trap: 'Ricostruire l\'immagine per ogni ambiente: ciò che va in produzione non è ciò che è stato testato in staging.',
  rule: 'Un artefatto immutabile per commit, promosso tra ambienti; segreti nel secret store o via OIDC, mai nel repository.',
  check: {
    q: 'Cosa significa "build once, deploy many"?',
    options: ['Lo stesso artefatto testato viene promosso tra gli ambienti senza ricompilarlo', 'Si fa una sola build al giorno', 'Si deploya su molti server in parallelo', 'Si compila in modalità Debug per i test'],
    explanation: 'Ricompilare per ogni ambiente introduce differenze non testate (dipendenze, flag, base image).',
  },
});

P.card('A3.3', {
  title: 'Log strutturati, metriche, trace e Correlation ID',
  summary: 'I log strutturati registrano proprietà interrogabili (`{OrderId}`) invece di stringhe concatenate. OpenTelemetry standardizza trace, metriche e log; il trace context W3C (`traceparent`) collega le chiamate tra servizi. Un Correlation ID per richiesta permette di filtrare tutti i log di un\'operazione.',
  lang: 'csharp',
  code: `// ✅ template con proprietà strutturate (non interpolazione!)
logger.LogInformation("Ordine {OrderId} creato per {CustomerId} in {ElapsedMs} ms", order.Id, customerId, sw.ElapsedMilliseconds);

builder.Services.AddOpenTelemetry()
    .ConfigureResource(r => r.AddService("orders-api"))
    .WithTracing(t => t.AddAspNetCoreInstrumentation().AddHttpClientInstrumentation().AddOtlpExporter())
    .WithMetrics(m => m.AddAspNetCoreInstrumentation().AddRuntimeInstrumentation().AddOtlpExporter());`,
  trap: '`logger.LogInformation($"Ordine {id}")` produce un messaggio piatto: perdi la proprietà interrogabile e allochi la stringa anche quando il livello è disabilitato.',
  rule: 'Message template con placeholder, livelli coerenti, nessun dato sensibile nei log, e un ID di correlazione/trace su ogni riga.',
  check: {
    q: 'Perché preferire `LogInformation("Ordine {Id}", id)` a `LogInformation($"Ordine {id}")`?',
    options: ['Il template conserva Id come proprietà strutturata interrogabile ed evita allocazioni inutili', 'È più corto', 'L\'interpolazione non compila', 'Il template cifra i valori'],
    explanation: 'I provider strutturati (Serilog, OTel, Seq, App Insights) indicizzano le proprietà del template.',
  },
});

// ─── Domande ─────────────────────────────────────────────────────────────────
P.q('A3.1', 'training', {
  interview: true,
  prompt: 'Qual è il vantaggio principale di una build multi-stage per un\'API .NET?',
  options: [
    ['L\'immagine finale contiene solo il runtime e l\'output pubblicato: più piccola e con minore superficie d\'attacco', 'Corretto: SDK, sorgenti e cache NuGet restano nello stage di build.'],
    ['La build è sempre più veloce', 'La velocità dipende soprattutto dalla cache dei layer.'],
    ['Permette di usare più versioni di .NET a runtime', 'Non è lo scopo.'],
    ['Evita di dover scrivere un .dockerignore', 'Il .dockerignore resta importante per il contesto di build.'],
  ],
});
P.q('A3.1', 'exam', {
  prompt: 'In docker-compose, l\'API ha la connection string `Host=localhost;Port=5432` verso il servizio `db`. Cosa succede?',
  options: [
    ['Connessione rifiutata: nel container localhost è l\'API stessa; va usato Host=db', 'Corretto: compose crea un DNS interno con i nomi dei servizi.'],
    ['Funziona perché compose mappa localhost su tutti i servizi', 'Ogni container ha il proprio network namespace.'],
    ['Funziona solo se la porta 5432 è pubblicata con ports:', 'La pubblicazione espone la porta all\'host, non agli altri container tramite localhost.'],
    ['Docker restituisce un errore di build', 'È un errore a runtime, non di build.'],
  ],
});
P.q('A3.1', 'training', {
  prompt: '`depends_on: [db]` senza condizione cosa garantisce?',
  lang: 'yaml',
  code: `services:
  api:
    depends_on: [db]
  db:
    image: postgres:17`,
  options: [
    ['Solo l\'ordine di avvio dei container, non che Postgres sia pronto ad accettare connessioni', 'Corretto: serve `condition: service_healthy` con un healthcheck.'],
    ['Che il database sia pronto prima dell\'avvio dell\'API', 'Il container può essere avviato ma Postgres ancora in inizializzazione.'],
    ['Che l\'API venga riavviata se il DB cade', 'Il riavvio dipende da `restart:`.'],
    ['Nulla, è un campo deprecato', 'È supportato; la forma estesa aggiunge le condizioni.'],
  ],
});
P.q('A3.1', 'exam', {
  interview: true,
  prompt: 'Dove NON va mai messa la password del database in un progetto containerizzato?',
  options: [
    ['In un ENV o ARG del Dockerfile o in un file copiato nell\'immagine', 'Corretto: finisce nei layer ed è estraibile da chiunque abbia l\'immagine.'],
    ['In un secret di Docker/Kubernetes montato a runtime', 'È un approccio corretto.'],
    ['In Azure Key Vault letto con Managed Identity', 'È l\'approccio consigliato in cloud.'],
    ['In una variabile d\'ambiente iniettata dall\'orchestratore al deploy', 'È accettabile se il valore arriva da un secret store.'],
  ],
});
P.q('A3.2', 'training', {
  interview: true,
  prompt: 'Perché usare OIDC federation tra GitHub Actions e Azure invece di un client secret salvato nei secrets?',
  options: [
    ['Il token è a breve durata ed emesso per quel workflow: niente segreti a lunga scadenza da ruotare o far trapelare', 'Corretto: si configura una federated credential sull\'identità Entra.'],
    ['È più veloce', 'La differenza non è di performance.'],
    ['È l\'unico modo di autenticarsi ad Azure', 'Esistono anche service principal con secret o certificato.'],
    ['Evita di dover assegnare ruoli RBAC', 'I ruoli vanno comunque assegnati con il minimo privilegio.'],
  ],
});
P.q('A3.2', 'exam', {
  prompt: 'In GitHub Actions, come si fa in modo che il job `deploy` parta solo se `build` ha avuto successo?',
  lang: 'yaml',
  code: `jobs:
  build: { runs-on: ubuntu-latest, steps: [...] }
  deploy:
    runs-on: ubuntu-latest
    # ???
    steps: [...]`,
  options: [
    ['needs: build', 'Corretto: needs crea la dipendenza e salta deploy se build fallisce.'],
    ['after: build', 'Non è una chiave valida di GitHub Actions.'],
    ['depends_on: build', 'È la sintassi di docker-compose, non di Actions.'],
    ['if: build.success', 'Non è un\'espressione valida; inoltre senza needs i job partono in parallelo.'],
  ],
});
P.q('A3.2', 'training', {
  prompt: 'Qual è il tag d\'immagine più adatto per tracciare cosa gira in produzione?',
  options: [
    ['Lo SHA del commit (eventualmente insieme alla versione semantica)', 'Corretto: è immutabile e riconduce esattamente al codice.'],
    [':latest', 'È mutabile: non sai quale build stia girando né puoi fare rollback affidabili.'],
    ['La data di build', 'Non identifica univocamente il codice.'],
    ['Il nome del branch', 'Il branch si muove: lo stesso tag punterebbe a codice diverso.'],
  ],
});
P.q('A3.2', 'exam', {
  interview: true,
  prompt: 'Una pipeline matura dovrebbe fallire la PR se…',
  options: [
    ['build o test falliscono, la copertura/qualità scende sotto soglia o vengono trovate vulnerabilità critiche', 'Corretto: i quality gate proteggono il ramo principale.'],
    ['la PR ha più di 10 file modificati', 'La dimensione non è un criterio tecnico di fallimento.'],
    ['l\'autore non è un admin', 'I permessi si gestiscono con branch protection, non facendo fallire la build.'],
    ['ci sono TODO nel codice', 'Può essere un warning, non un criterio standard di blocco.'],
  ],
});
P.q('A3.3', 'training', {
  interview: true,
  prompt: 'Quali sono i tre segnali principali dell\'osservabilità secondo OpenTelemetry?',
  options: [
    ['Trace, metriche e log', 'Corretto: i "three pillars", correlati tramite trace id e resource attributes.'],
    ['CPU, RAM e disco', 'Sono metriche, cioè solo uno dei segnali.'],
    ['Alert, dashboard e report', 'Sono modi di consumare i segnali.'],
    ['Unit, integration e e2e test', 'Sono livelli di test, non segnali di osservabilità.'],
  ],
});
P.q('A3.3', 'exam', {
  prompt: 'Cosa produce questo log in un sink strutturato (Seq, App Insights, Elastic)?',
  lang: 'csharp',
  code: `logger.LogWarning("Pagamento {PaymentId} rifiutato dopo {Attempts} tentativi", paymentId, 3);`,
  options: [
    ['Un evento con proprietà PaymentId e Attempts filtrabili e il messaggio renderizzato', 'Corretto: il template definisce i nomi delle proprietà.'],
    ['Solo una stringa: "Pagamento ... rifiutato dopo 3 tentativi"', 'Il template viene conservato insieme ai valori come proprietà.'],
    ['Un errore perché mancano le virgolette attorno ai placeholder', 'I placeholder non richiedono virgolette.'],
    ['Un evento senza livello', 'LogWarning imposta il livello Warning.'],
  ],
});
P.q('A3.3', 'training', {
  prompt: 'Come si propaga il contesto di tracing tra due servizi HTTP con OpenTelemetry?',
  options: [
    ['Tramite l\'header W3C `traceparent` aggiunto dall\'instrumentation di HttpClient e letto da ASP.NET Core', 'Corretto: lo span figlio eredita trace-id e parent-id.'],
    ['Condividendo lo stesso database', 'Il DB non trasporta il contesto delle richieste.'],
    ['Scrivendo il trace id nel body JSON', 'Non serve: lo standard usa gli header.'],
    ['Non si propaga: ogni servizio ha trace separati', 'La propagazione automatica è proprio lo scopo del tracing distribuito.'],
  ],
});
P.q('A3.3', 'exam', {
  interview: true,
  prompt: 'Quale metrica è più utile per un SLO di latenza di un\'API?',
  options: [
    ['Il percentile p95/p99 della durata delle richieste (istogramma)', 'Corretto: la media nasconde la coda lenta che gli utenti percepiscono.'],
    ['La media della durata delle richieste', 'Pochi valori molto alti o molto bassi la distorcono.'],
    ['Il numero totale di richieste', 'È throughput, non latenza.'],
    ['L\'uso medio della CPU', 'È una metrica di saturazione, non di esperienza utente.'],
  ],
});

// ─── IDE Code Labs ───────────────────────────────────────────────────────────
P.lab('A3.1', {
  title: 'Ottimizzazione di un Dockerfile multi-stage',
  objective: 'Ridurre dimensione e tempi di rebuild dell\'immagine di un\'API ASP.NET Core.',
  scenario: 'L\'immagine attuale pesa quasi 1 GB, contiene l\'SDK e i sorgenti, gira come root e ogni modifica a un .cs riesegue il restore NuGet.',
  run: [
    'dotnet new webapi -n Api -o Api (oppure usa un tuo progetto)',
    'Salva il Dockerfile nella cartella che contiene Api/',
    'docker build -t api:lab . && docker images api:lab',
    'Modifica un file .cs e ricostruisci osservando quali step risultano CACHED',
  ],
  steps: [
    'Separa uno stage `build` (SDK) da uno `final` (aspnet).',
    'Copia prima solo il .csproj ed esegui il restore, poi il resto del sorgente.',
    'Pubblica con `--no-restore`, copia solo /app/publish nello stage finale e usa un utente non root.',
  ],
  lang: 'dockerfile',
  starter: `# TODO: immagine enorme, nessuna cache del restore, gira come root
FROM mcr.microsoft.com/dotnet/sdk:9.0
WORKDIR /src
COPY . .
RUN dotnet restore Api/Api.csproj
RUN dotnet publish Api/Api.csproj -c Release -o /app
WORKDIR /app
EXPOSE 8080
ENTRYPOINT ["dotnet", "Api.dll"]`,
  hints: [
    'Ogni modifica a un file copiato con `COPY . .` invalida la cache di TUTTI gli step successivi.',
    'Lo stage finale parte da `mcr.microsoft.com/dotnet/aspnet:9.0` e usa `COPY --from=build`.',
  ],
  question: 'Dopo l\'ottimizzazione, modifichi solo un file .cs e ricostruisci. Cosa osservi?',
  options: [
    ['Il RUN dotnet restore risulta CACHED; si rieseguono COPY del sorgente e publish; l\'immagine finale è basata su aspnet (~1/4 della dimensione SDK)', 'Corretto: il layer di restore dipende solo dal .csproj e lo stage finale non contiene l\'SDK.'],
    ['Tutti gli step vengono rieseguiti, restore incluso', 'È il comportamento dello starter, dove COPY . . precede il restore.'],
    ['Nessuno step viene rieseguito: l\'immagine non cambia', 'Il sorgente è cambiato: publish deve essere rieseguito.'],
    ['Il restore è CACHED ma l\'immagine finale pesa come quella SDK', 'Lo stage finale aspnet non include SDK né sorgenti.'],
  ],
  solution: `# ---------- stage 1: build ----------
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
# 1) solo i file di progetto: questo layer cambia raramente
COPY ["Api/Api.csproj", "Api/"]
RUN dotnet restore "Api/Api.csproj"
# 2) ora il sorgente: invalida solo gli step successivi
COPY . .
RUN dotnet publish "Api/Api.csproj" -c Release -o /app/publish --no-restore /p:UseAppHost=false

# ---------- stage 2: runtime ----------
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app
# solo i binari pubblicati
COPY --from=build /app/publish .
# utente non root (immagini .NET 8+)
USER $APP_UID
# porta predefinita di ASP.NET Core 8+ nei container
EXPOSE 8080
ENTRYPOINT ["dotnet", "Api.dll"]

# Nel .dockerignore: bin/ obj/ .git/ .vs/ .idea/ **/*.user`,
  explanation: 'Il layer del restore dipende solo dal .csproj: modificando un .cs Docker lo marca CACHED e riesegue solo COPY . . e publish. Lo stage finale parte dall\'immagine aspnet, molto più piccola dell\'SDK, e non contiene sorgenti né cache NuGet. `USER $APP_UID` sfrutta l\'utente non privilegiato già presente nelle immagini .NET 8+.',
});

P.lab('A3.1', {
  title: 'docker-compose: API + Postgres con healthcheck',
  objective: 'Avviare API e database nell\'ordine corretto, con connessione via DNS di compose e segreti fuori dal file.',
  scenario: 'Con `docker compose up` l\'API crasha al primo avvio: prova a connettersi a `localhost` e parte prima che Postgres sia pronto.',
  run: [
    'Salva il file come compose.yaml accanto al Dockerfile dell\'API',
    'Crea un file .env con POSTGRES_PASSWORD=<una password> (e aggiungilo al .gitignore)',
    'docker compose up --build e osserva lo stato con docker compose ps',
  ],
  steps: [
    'Aggiungi a `db` un healthcheck con `pg_isready`.',
    'Fai dipendere `api` da `db` con `condition: service_healthy`.',
    'Usa `Host=db` nella connection string e leggi la password da variabile/.env.',
  ],
  lang: 'yaml',
  starter: `services:
  api:
    build: .
    ports: ["8080:8080"]
    environment:
      ConnectionStrings__Default: "Host=localhost;Port=5432;Database=shop;Username=app;Password=SuperSegreta1!"
    depends_on: [db]          # TODO
  db:
    image: postgres:17
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: SuperSegreta1!   # TODO: segreto in chiaro
      POSTGRES_DB: shop
    # TODO: healthcheck`,
  hints: [
    '`test: ["CMD-SHELL", "pg_isready -U app -d shop"]` con interval/timeout/retries.',
    'Nella rete di default di compose il nome del servizio (`db`) è anche il suo hostname.',
  ],
  question: 'Con la soluzione, cosa mostra `docker compose up`?',
  options: [
    ['db passa a "healthy", solo allora parte api che si connette a Host=db senza errori', 'Corretto: l\'avvio è ordinato sulla prontezza reale del DB e il DNS interno risolve "db".'],
    ['api parte subito e fallisce con "Connection refused" su localhost:5432', 'È il comportamento dello starter.'],
    ['api e db partono in parallelo; api riprova finché il DB risponde', 'Senza retry applicativo l\'API non riprova; con service_healthy non ce n\'è bisogno all\'avvio.'],
    ['compose rifiuta il file perché depends_on non supporta condizioni', 'La forma estesa con condition è supportata dalla Compose Specification.'],
  ],
  solution: `services:
  api:
    build: .
    ports: ["8080:8080"]
    environment:
      # ✅ "db" è il nome del servizio = hostname sulla rete interna di compose
      ConnectionStrings__Default: "Host=db;Port=5432;Database=shop;Username=app;Password=\${POSTGRES_PASSWORD}"
    depends_on:
      db:
        condition: service_healthy   # ✅ attende il healthcheck, non solo l'avvio del container
    restart: on-failure

  db:
    image: postgres:17
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD}   # ✅ dal file .env (non versionato)
      POSTGRES_DB: shop
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d shop"]
      interval: 5s
      timeout: 3s
      retries: 10
    # niente "ports:" → il DB non è esposto all'host, solo alla rete interna

volumes:
  pgdata:`,
  explanation: '`depends_on` semplice ordina solo l\'avvio dei container; con `condition: service_healthy` compose attende che `pg_isready` abbia successo. Nella rete di compose ogni servizio è raggiungibile dal suo nome, quindi `Host=db`. La password arriva da `.env` (interpolazione `${...}`) e non è nel file versionato; in produzione si userebbe un secret store.',
});

P.lab('A3.3', {
  title: 'Logging strutturato con Correlation ID',
  objective: 'Garantire che ogni riga di log di una richiesta porti lo stesso CorrelationId, propagato anche nella risposta.',
  scenario: 'In produzione è impossibile ricostruire cosa è successo durante una richiesta fallita: i log sono stringhe piatte senza un identificativo comune.',
  run: [
    'dotnet new web -n LogLab && cd LogLab',
    'Incolla il codice in Program.cs e lancia dotnet run',
    'curl -i -H "X-Correlation-ID: abc-123" http://localhost:5000/orders/42',
  ],
  steps: [
    'Configura il console logger JSON con `IncludeScopes = true`.',
    'Scrivi un middleware che legge `X-Correlation-ID` (o ne genera uno), apre uno scope di logging e lo rimanda nell\'header di risposta.',
    'Trasforma il log dell\'endpoint in un message template strutturato.',
  ],
  lang: 'csharp',
  starter: `var builder = WebApplication.CreateBuilder(args);
// TODO: logger JSON con scope
var app = builder.Build();

// TODO: middleware Correlation ID

app.MapGet("/orders/{id:int}", (int id, ILogger<Program> logger) =>
{
    logger.LogInformation($"Caricamento ordine {id}"); // TODO: template strutturato
    return Results.Ok(new { id });
});

app.Run();`,
  hints: [
    '`builder.Logging.ClearProviders().AddJsonConsole(o => o.IncludeScopes = true);`',
    '`using (logger.BeginScope(new Dictionary<string, object> { ["CorrelationId"] = id })) { await next(); }` e `ctx.Response.Headers["X-Correlation-ID"] = id;` prima di next().',
  ],
  question: 'Con la soluzione, cosa ottieni dalla chiamata curl?',
  options: [
    ['Header di risposta X-Correlation-ID: abc-123 e log JSON con "OrderId": 42 e lo scope "CorrelationId": "abc-123"', 'Corretto: header propagato e ogni log della richiesta porta l\'ID nello scope.'],
    ['Log testuale "Caricamento ordine 42" senza proprietà e nessun header', 'È il comportamento dello starter.'],
    ['Header con un nuovo GUID diverso da abc-123', 'Il middleware riusa l\'ID ricevuto; ne genera uno solo se manca.'],
    ['Log JSON con CorrelationId ma OrderId assente', 'Con il template "{OrderId}" la proprietà viene registrata.'],
  ],
  solution: `var builder = WebApplication.CreateBuilder(args);
builder.Logging.ClearProviders()
    .AddJsonConsole(o => o.IncludeScopes = true);       // ✅ JSON + scope in ogni evento

var app = builder.Build();

app.Use(async (ctx, next) =>
{
    // ✅ riusa l'ID del chiamante o ne crea uno nuovo
    var id = ctx.Request.Headers["X-Correlation-ID"].FirstOrDefault() ?? Guid.NewGuid().ToString("n");
    ctx.Response.Headers["X-Correlation-ID"] = id;      // prima di next(): poi gli header sono già inviati
    var logger = ctx.RequestServices.GetRequiredService<ILogger<Program>>();
    using (logger.BeginScope(new Dictionary<string, object> { ["CorrelationId"] = id }))
    {
        await next();                                   // tutto ciò che segue logga dentro lo scope
    }
});

app.MapGet("/orders/{id:int}", (int id, ILogger<Program> logger) =>
{
    logger.LogInformation("Caricamento ordine {OrderId}", id); // ✅ proprietà strutturata
    return Results.Ok(new { id });
});

app.Run();

// Con Serilog: LogContext.PushProperty("CorrelationId", id) + Enrich.FromLogContext()
// Con OpenTelemetry il TraceId svolge lo stesso ruolo tra servizi diversi.`,
  explanation: 'Lo scope di logging (o LogContext di Serilog) arricchisce automaticamente ogni evento emesso durante la richiesta, compresi quelli di framework e librerie. L\'header in risposta permette al frontend o al supporto di citare l\'ID. Il message template trasforma `{OrderId}` in una proprietà filtrabile invece di una stringa concatenata.',
});

export const phaseA3 = P.build({
  title: 'Container, CI/CD e Osservabilità',
  subtitle: 'Impacchettare, rilasciare e capire cosa succede in produzione.',
});
