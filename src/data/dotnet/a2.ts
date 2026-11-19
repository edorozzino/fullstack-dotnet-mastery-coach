import { phaseBuilder, RUN } from '../builders';

const P = phaseBuilder('A2', 'A', 2)
  .module('A2.1', 'Modular Monolith vs Microservizi', ['bounded context', 'deploy indipendente', 'costi operativi', 'Conway'])
  .module('A2.2', 'Clean Architecture / DDD', ['entità', 'value object', 'aggregate', 'invarianti', 'dependency rule'])
  .module('A2.3', 'Messaggistica asincrona', ['RabbitMQ', 'Kafka', 'Azure Service Bus', 'idempotenza', 'retry', 'Dead-Letter Queue', 'Outbox'])
  .module('A2.4', 'Caching distribuito con Redis', ['cache-aside', 'TTL', 'invalidazione', 'stampede', 'HybridCache']);

P.card('A2.1', {
  title: 'Modular Monolith prima, microservizi quando servono',
  summary: 'Un Modular Monolith è un unico deployable diviso in moduli con confini netti (un bounded context ciascuno, API interne esplicite, dati non condivisi). I microservizi aggiungono deploy e scalabilità indipendenti, ma pagano rete, consistenza eventuale, osservabilità distribuita e costi operativi.',
  lang: 'csharp',
  code: `// Modulo Orders: espone solo un contratto pubblico
namespace Shop.Orders.Contracts;
public interface IOrdersModule
{
    Task<OrderSummary?> GetSummaryAsync(Guid orderId, CancellationToken ct);
}

// Il modulo Billing NON accede alle tabelle di Orders: usa il contratto
// o reagisce a eventi di integrazione (OrderPlaced) in-process/outbox.
public sealed class InvoiceService(IOrdersModule orders) { /* ... */ }`,
  trap: 'Microservizi che condividono lo stesso database o si chiamano in catena sincrona: è un "monolite distribuito", con tutti i costi e nessun beneficio.',
  rule: 'Parti modulare; estrai un servizio solo quando hai una ragione misurabile (scalabilità, team autonomi, cadenze di rilascio diverse).',
  check: {
    q: 'Qual è il segnale più chiaro di un "monolite distribuito"?',
    options: ['Servizi che condividono il database e devono essere rilasciati insieme', 'Un solo repository Git', 'Uso di Docker', 'Un\'API Gateway'],
    explanation: 'L\'accoppiamento su dati e rilasci annulla l\'indipendenza che giustifica i microservizi.',
  },
});

P.card('A2.2', {
  title: 'Clean Architecture e DDD tattico',
  summary: 'La dependency rule dice che le dipendenze puntano verso il dominio: Domain non conosce EF Core, HTTP o broker. Un Aggregate è un confine di consistenza con una radice che protegge le invarianti; i Value Object sono immutabili e confrontati per valore; le entità hanno identità.',
  lang: 'csharp',
  code: `// Domain: zero dipendenze da framework
public sealed class Order
{
    private readonly List<OrderLine> _lines = [];
    public OrderStatus Status { get; private set; } = OrderStatus.Draft;
    public IReadOnlyList<OrderLine> Lines => _lines;

    public void AddLine(Sku sku, int qty)
    {
        if (Status != OrderStatus.Draft) throw new DomainException("Ordine non modificabile");
        if (qty <= 0) throw new DomainException("Quantità non valida");
        _lines.Add(new OrderLine(sku, qty));
    }
}
public readonly record struct Sku(string Value);   // Value Object`,
  trap: 'Modello anemico: entità con soli setter pubblici e regole sparse nei service. Le invarianti diventano opzionali e ogni nuovo endpoint può violarle.',
  rule: 'Le regole di business vivono nell\'aggregate; Application orchestra, Infrastructure implementa le porte, Domain non dipende da nessuno.',
  check: {
    q: 'Secondo la dependency rule, quale riferimento è VIETATO?',
    options: ['Domain → Infrastructure (es. entità che usa DbContext)', 'Infrastructure → Domain', 'Application → Domain', 'API → Application'],
    explanation: 'Il dominio è il centro: i dettagli tecnici dipendono da lui, mai il contrario.',
  },
});

P.card('A2.3', {
  title: 'Messaggistica: at-least-once, idempotenza, retry e DLQ',
  summary: 'I broker (RabbitMQ, Azure Service Bus, Kafka) garantiscono tipicamente consegna at-least-once: lo stesso messaggio può arrivare più volte. Il consumer deve essere idempotente. I retry con backoff gestiscono errori transitori; dopo N tentativi il messaggio va nella Dead-Letter Queue. L\'Outbox Pattern pubblica eventi in modo atomico con il salvataggio.',
  lang: 'csharp',
  code: `public async Task Handle(PaymentReceived msg, CancellationToken ct)
{
    await using var tx = await db.Database.BeginTransactionAsync(ct);
    // Tabella ProcessedMessages con PK su MessageId → dedup atomico
    if (await db.ProcessedMessages.AnyAsync(p => p.Id == msg.MessageId, ct)) return;

    var account = await db.Accounts.FindAsync([msg.AccountId], ct);
    account!.Credit(msg.Amount);
    db.ProcessedMessages.Add(new ProcessedMessage(msg.MessageId));
    await db.SaveChangesAsync(ct);
    await tx.CommitAsync(ct);
}`,
  trap: 'Pubblicare l\'evento sul broker DOPO il commit senza Outbox: se il processo crasha tra le due operazioni, l\'evento è perso; se lo pubblichi PRIMA, puoi annunciare qualcosa mai salvato.',
  rule: 'Assumi sempre duplicati e riordino: chiave di idempotenza + Outbox + retry con backoff esponenziale + DLQ monitorata.',
  check: {
    q: 'Perché un consumer deve essere idempotente con consegna at-least-once?',
    options: ['Perché lo stesso messaggio può essere consegnato più volte (es. ack perso o timeout)', 'Perché i messaggi arrivano sempre in ordine', 'Perché il broker cancella i messaggi duplicati', 'Perché Kafka non supporta i retry'],
    explanation: 'Elaborare due volte un messaggio non idempotente produce effetti doppi (doppio addebito, doppia email).',
  },
});

P.card('A2.4', {
  title: 'Redis e il pattern Cache-Aside',
  summary: 'Cache-aside: leggi dalla cache; se manca (miss) leggi dal DB, scrivi in cache con TTL e restituisci. Sulle scritture aggiorni il DB e invalidi (o aggiorni) la chiave. Il TTL limita la staleness; un lock o `HybridCache` evita il cache stampede quando molte richieste mancano la stessa chiave.',
  lang: 'csharp',
  code: `public async Task<ProductDto?> GetAsync(int id, CancellationToken ct)
{
    var key = $"product:{id}";
    var cached = await cache.GetStringAsync(key, ct);
    if (cached is not null) return JsonSerializer.Deserialize<ProductDto>(cached);

    var dto = await db.Products.AsNoTracking().Where(p => p.Id == id)
        .Select(p => new ProductDto(p.Id, p.Name, p.Price)).FirstOrDefaultAsync(ct);
    if (dto is not null)
        await cache.SetStringAsync(key, JsonSerializer.Serialize(dto),
            new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10) }, ct);
    return dto;
}`,
  trap: 'Dimenticare l\'invalidazione sulle scritture: l\'utente modifica un prezzo e continua a vedere quello vecchio fino alla scadenza del TTL.',
  rule: 'Ogni chiave ha un TTL, un proprietario e una strategia di invalidazione; la cache è un\'ottimizzazione, il DB resta la fonte di verità.',
  check: {
    q: 'Nel cache-aside, cosa si fa dopo un cache miss?',
    options: ['Si legge dal DB, si popola la cache con TTL e si restituisce il dato', 'Si restituisce null', 'Si attende che un job popoli la cache', 'Si scrive nel DB'],
    explanation: 'È l\'applicazione (non la cache) a caricare il dato on-demand: da qui il nome "cache-aside" o "lazy loading".',
  },
});

// ─── Domande ─────────────────────────────────────────────────────────────────
P.q('A2.1', 'training', {
  interview: true,
  prompt: 'Una startup con 4 sviluppatori e un unico prodotto chiede se partire a microservizi. Qual è la risposta più solida?',
  options: [
    ['Modular Monolith con confini chiari, estraendo servizi solo quando emerge un bisogno concreto', 'Corretto: massimizza velocità e mantiene aperta l\'evoluzione.'],
    ['Microservizi subito, così sarà già scalabile', 'Il costo operativo e cognitivo è enorme per un team così piccolo.'],
    ['Un monolite senza moduli, il refactoring si farà dopo', 'Senza confini il monolite diventa una "big ball of mud" difficile da scomporre.'],
    ['Serverless per ogni singola funzione', 'Frammenta il dominio senza una ragione di business.'],
  ],
});
P.q('A2.1', 'exam', {
  interview: true,
  prompt: 'Quale caratteristica distingue un vero microservizio?',
  options: [
    ['Possiede i propri dati ed è rilasciabile in modo indipendente', 'Corretto: autonomia di dati e deploy è la proprietà fondamentale.'],
    ['Ha meno di 1000 righe di codice', 'La dimensione del codice non è il criterio.'],
    ['Gira in un container Docker', 'Anche un monolite può girare in un container.'],
    ['Espone un\'API REST', 'Anche un monolite espone API; e un microservizio può comunicare solo via messaggi.'],
  ],
});
P.q('A2.1', 'training', {
  prompt: 'Nel modulo Billing di un Modular Monolith serve il totale di un ordine del modulo Orders. Quale approccio rispetta i confini?',
  options: [
    ['Chiamare il contratto pubblico di Orders (es. IOrdersModule) o reagire a un evento OrderPlaced', 'Corretto: i moduli comunicano tramite API esplicite o eventi.'],
    ['Fare una JOIN diretta sulla tabella orders dal DbContext di Billing', 'Accoppia gli schemi e rende impossibile evolvere Orders in autonomia.'],
    ['Copiare la classe Order nel progetto Billing', 'Duplica il modello e lo fa divergere.'],
    ['Rendere public tutte le classi interne di Orders', 'Rompe l\'incapsulamento del modulo.'],
  ],
});
P.q('A2.2', 'exam', {
  prompt: 'Quale implementazione protegge meglio l\'invariante "un ordine spedito non può essere modificato"?',
  options: [
    ['Metodo AddLine nell\'aggregate Order che verifica lo Status e lancia DomainException', 'Corretto: l\'invariante è garantita da chiunque usi l\'aggregate.'],
    ['Un controllo nel controller HTTP prima di chiamare il repository', 'Altri punti d\'ingresso (job, consumer) possono aggirarlo.'],
    ['Un trigger nel database', 'Sposta la regola di business fuori dal dominio e la rende difficile da testare.'],
    ['Proprietà Lines pubblica con setter, controllata da un validator', 'Chiunque può modificare la lista bypassando il validator.'],
  ],
});
P.q('A2.2', 'training', {
  interview: true,
  prompt: 'Qual è la differenza tra Entity e Value Object in DDD?',
  options: [
    ['L\'Entity ha un\'identità che persiste nel tempo; il Value Object è definito solo dai suoi valori ed è immutabile', 'Corretto: due Money(10, EUR) sono intercambiabili, due Customer con lo stesso nome no.'],
    ['L\'Entity è salvata nel DB, il Value Object no', 'Anche i Value Object vengono persistiti (es. owned types in EF Core).'],
    ['Il Value Object ha sempre un Id', 'È proprio l\'assenza di identità a caratterizzarlo.'],
    ['Non c\'è differenza pratica', 'Cambia uguaglianza, ciclo di vita e mutabilità.'],
  ],
});
P.q('A2.2', 'exam', {
  interview: true,
  prompt: 'In Clean Architecture, dove si definisce l\'interfaccia `IOrderRepository`?',
  options: [
    ['Nel Domain o nell\'Application (porta), implementata in Infrastructure (adapter)', 'Corretto: inversione delle dipendenze, il centro definisce il contratto.'],
    ['In Infrastructure, insieme alla sua implementazione', 'Così Application dipenderebbe da Infrastructure.'],
    ['Nel progetto API', 'Il layer di presentazione non deve definire i contratti di persistenza.'],
    ['Non serve un\'interfaccia: si usa direttamente DbContext ovunque', 'È una scelta pragmatica possibile, ma non è Clean Architecture.'],
  ],
});
P.q('A2.3', 'training', {
  interview: true,
  prompt: 'Cos\'è una Dead-Letter Queue?',
  options: [
    ['Una coda dove finiscono i messaggi non elaborabili dopo N tentativi o scaduti, per analisi e reprocessing', 'Corretto: evita che un "poison message" blocchi la coda principale.'],
    ['Una coda per i messaggi già elaborati con successo', 'Quelli vengono rimossi (ack/complete).'],
    ['Una coda con priorità più bassa', 'Non riguarda le priorità.'],
    ['Un backup automatico del broker', 'Non è un meccanismo di backup.'],
  ],
});
P.q('A2.3', 'exam', {
  interview: true,
  prompt: 'Quale problema risolve l\'Outbox Pattern?',
  options: [
    ['Garantisce che salvataggio dei dati e pubblicazione dell\'evento avvengano in modo atomico', 'Corretto: l\'evento viene scritto nella stessa transazione e pubblicato da un relay.'],
    ['Ordina i messaggi per timestamp', 'L\'ordinamento è un tema separato (partition key, session).'],
    ['Comprime i messaggi per ridurre la banda', 'Non riguarda la dimensione dei messaggi.'],
    ['Elimina la necessità di consumer idempotenti', 'Il relay può pubblicare due volte: l\'idempotenza resta necessaria.'],
  ],
});
P.q('A2.3', 'training', {
  prompt: 'In Kafka, come si garantisce che tutti gli eventi dello stesso ordine siano elaborati in sequenza?',
  options: [
    ['Usando l\'OrderId come chiave del messaggio, così finiscono nella stessa partizione', 'Corretto: Kafka garantisce l\'ordine solo all\'interno di una partizione.'],
    ['Usando un solo topic', 'Con più partizioni l\'ordine globale non è garantito.'],
    ['Aumentando il numero di consumer', 'Più consumer aumentano il parallelismo, non l\'ordinamento.'],
    ['Impostando retention infinita', 'La retention non influisce sull\'ordine.'],
  ],
});
P.q('A2.4', 'exam', {
  prompt: 'Una chiave molto richiesta scade e 5.000 richieste concorrenti vanno tutte al DB. Come si chiama il problema e come si mitiga?',
  options: [
    ['Cache stampede: lock/single-flight per chiave (es. HybridCache) o refresh anticipato', 'Corretto: una sola richiesta ricostruisce il valore, le altre attendono.'],
    ['Cache poisoning: firmare i valori', 'Il poisoning riguarda l\'inserimento di dati malevoli.'],
    ['Thundering herd sul broker: aumentare le partizioni', 'Il problema è sul DB dietro la cache.'],
    ['Memory leak: aumentare la RAM di Redis', 'Non è un problema di memoria.'],
  ],
});
P.q('A2.4', 'training', {
  interview: true,
  prompt: 'Dopo aver aggiornato il prezzo di un prodotto nel DB, cosa va fatto in un sistema cache-aside?',
  options: [
    ['Invalidare (o aggiornare) la chiave in cache dopo il commit', 'Corretto: altrimenti si serve il valore vecchio fino al TTL.'],
    ['Niente, il TTL risolverà', 'Gli utenti vedranno dati stantii per tutto il TTL.'],
    ['Svuotare l\'intera cache Redis', 'FLUSHALL causa un picco di miss su tutto il sistema.'],
    ['Riavviare l\'applicazione', 'Non è una strategia di invalidazione.'],
  ],
});
P.q('A2.4', 'exam', {
  prompt: 'Cosa non va in questa implementazione?',
  lang: 'csharp',
  code: `public async Task<Product> Get(int id)
{
    var json = await cache.GetStringAsync($"product:{id}");
    if (json is not null) return JsonSerializer.Deserialize<Product>(json)!;
    var p = await db.Products.FindAsync(id);
    await cache.SetStringAsync($"product:{id}", JsonSerializer.Serialize(p));
    return p!;
}`,
  options: [
    ['Nessun TTL e caching anche del null: dati stantii per sempre e chiavi "vuote" persistenti', 'Corretto: serve una scadenza e una gestione esplicita dei miss.'],
    ['Usa JSON invece di MessagePack', 'Il formato influisce sulle performance ma non è l\'errore principale.'],
    ['GetStringAsync non esiste in IDistributedCache', 'È un extension method esistente.'],
    ['FindAsync non funziona con la cache', 'FindAsync è indipendente dalla cache distribuita.'],
  ],
});

// ─── IDE Code Labs ───────────────────────────────────────────────────────────
P.lab('A2.3', {
  title: 'Consumer idempotente con consegna at-least-once',
  objective: 'Rendere idempotente un consumer di pagamenti che riceve messaggi duplicati.',
  scenario: 'Il broker riconsegna PaymentReceived quando l\'ack va in timeout. I clienti si ritrovano accrediti doppi o tripli.',
  run: RUN.console,
  steps: [
    'Esegui lo starter e osserva il saldo.',
    'Aggiungi la deduplicazione per MessageId (in produzione: tabella ProcessedMessages con PK, nella stessa transazione).',
    'Conta i duplicati scartati e riesegui.',
  ],
  lang: 'csharp',
  starter: `var id1 = Guid.Parse("11111111-1111-1111-1111-111111111111");
var id2 = Guid.Parse("22222222-2222-2222-2222-222222222222");
var deliveries = new[]
{
    new PaymentReceived(id1, "acc-1", 100),
    new PaymentReceived(id1, "acc-1", 100), // riconsegna (ack perso)
    new PaymentReceived(id2, "acc-1", 50),
    new PaymentReceived(id1, "acc-1", 100), // riconsegna dopo timeout
};

var consumer = new PaymentConsumer();
foreach (var m in deliveries) consumer.Handle(m);
Console.WriteLine($"Saldo: {consumer.Balance}");
Console.WriteLine($"Duplicati scartati: {consumer.Duplicates}");

public sealed record PaymentReceived(Guid MessageId, string AccountId, int Amount);

public sealed class PaymentConsumer
{
    public int Balance { get; private set; }
    public int Duplicates { get; private set; }

    public void Handle(PaymentReceived msg)
    {
        // TODO: rendi idempotente questo handler
        Balance += msg.Amount;
    }
}`,
  hints: [
    'La chiave di idempotenza è il MessageId, non l\'importo né l\'account.',
    '`HashSet<Guid>.Add` restituisce false se l\'elemento era già presente: perfetto per un check-and-set.',
  ],
  question: 'Dopo la correzione, cosa stampa il programma?',
  options: [
    ['Saldo: 150\nDuplicati scartati: 2', 'Corretto: id1 elaborato una volta, id2 una volta, due riconsegne scartate.'],
    ['Saldo: 350\nDuplicati scartati: 0', 'È l\'output dello starter non idempotente.'],
    ['Saldo: 100\nDuplicati scartati: 3', 'Il messaggio id2 è diverso e va elaborato.'],
    ['Saldo: 150\nDuplicati scartati: 3', 'Le riconsegne di id1 sono 2, non 3.'],
  ],
  solution: `public sealed class PaymentConsumer
{
    // In produzione: tabella ProcessedMessages(MessageId PK) aggiornata
    // NELLA STESSA TRANSAZIONE dell'accredito, così dedup ed effetto sono atomici.
    private readonly HashSet<Guid> _processed = [];

    public int Balance { get; private set; }
    public int Duplicates { get; private set; }

    public void Handle(PaymentReceived msg)
    {
        if (!_processed.Add(msg.MessageId))   // già visto → è una riconsegna
        {
            Duplicates++;
            return;                            // ack senza rieseguire l'effetto
        }
        Balance += msg.Amount;                 // effetto applicato una sola volta
    }
}`,
  explanation: 'Con consegna at-least-once la stessa istanza logica di messaggio può arrivare più volte con lo stesso MessageId. Registrando gli id elaborati, le riconsegne vengono riconosciute e confermate senza riapplicare l\'effetto: 100 + 50 = 150 e 2 duplicati scartati. In un sistema reale il set va persistito in modo transazionale, altrimenti un crash tra accredito e registrazione riaprirebbe il problema.',
});

P.lab('A2.4', {
  title: 'Pattern Cache-Aside con invalidazione',
  objective: 'Implementare cache-aside su uno store chiave/valore stile Redis e invalidare la chiave sulle scritture.',
  scenario: 'Il catalogo interroga il DB ad ogni richiesta. Un primo tentativo di cache ha introdotto un bug: dopo un cambio prezzo, gli utenti vedono il prezzo vecchio.',
  run: RUN.console,
  steps: [
    'In `GetPrice` leggi prima da `FakeRedis`; in caso di miss leggi dal DB e salva in cache.',
    'In `UpdatePrice` aggiorna il DB e poi invalida la chiave.',
    'Esegui: 3 letture, 1 aggiornamento, 1 lettura finale.',
  ],
  lang: 'csharp',
  starter: `using System.Text.Json;

var db = new FakeDb();
var cache = new FakeRedis();
var catalog = new Catalog(db, cache);

catalog.GetPrice(1); catalog.GetPrice(1); catalog.GetPrice(1);
catalog.UpdatePrice(1, 1250);
var price = catalog.GetPrice(1);

Console.WriteLine($"DB hits: {db.Hits}");
Console.WriteLine($"Prezzo: {price}");

public sealed class Catalog(FakeDb db, FakeRedis cache)
{
    public int GetPrice(int id)
    {
        // TODO: cache-aside (chiave "price:{id}")
        return db.LoadPrice(id);
    }

    public void UpdatePrice(int id, int cents)
    {
        db.SavePrice(id, cents);
        // TODO: invalidazione
    }
}

public sealed class FakeDb
{
    private readonly Dictionary<int, int> _prices = new() { [1] = 1000 };
    public int Hits { get; private set; }
    public int LoadPrice(int id) { Hits++; return _prices[id]; }
    public void SavePrice(int id, int cents) => _prices[id] = cents;
}

public sealed class FakeRedis // simula IDistributedCache.GetString/SetString/Remove
{
    private readonly Dictionary<string, string> _store = [];
    public string? GetString(string key) => _store.GetValueOrDefault(key);
    public void SetString(string key, string value) => _store[key] = value;
    public void Remove(string key) => _store.Remove(key);
}`,
  hints: [
    'Serializza con `JsonSerializer.Serialize(price)` e deserializza con `JsonSerializer.Deserialize<int>(json)`.',
    'Senza `cache.Remove($"price:{id}")` dopo il salvataggio, la lettura finale restituirebbe 1000 dalla cache.',
  ],
  question: 'Con cache-aside e invalidazione corrette, cosa stampa?',
  options: [
    ['DB hits: 2\nPrezzo: 1250', 'Corretto: 1 miss iniziale, 2 hit in cache, invalidazione, 1 miss finale con il prezzo nuovo.'],
    ['DB hits: 4\nPrezzo: 1250', 'È lo starter senza cache: ogni lettura va al DB.'],
    ['DB hits: 1\nPrezzo: 1000', 'È il bug della cache senza invalidazione: prezzo stantio.'],
    ['DB hits: 1\nPrezzo: 1250', 'Il valore aggiornato va riletto dal DB dopo l\'invalidazione: servono 2 accessi.'],
  ],
  solution: `public sealed class Catalog(FakeDb db, FakeRedis cache)
{
    private static string Key(int id) => $"price:{id}";   // convenzione di naming delle chiavi

    public int GetPrice(int id)
    {
        var cached = cache.GetString(Key(id));            // 1) prova la cache
        if (cached is not null)
            return JsonSerializer.Deserialize<int>(cached); // hit: nessun accesso al DB

        var price = db.LoadPrice(id);                       // 2) miss → fonte di verità
        cache.SetString(Key(id), JsonSerializer.Serialize(price)); // 3) popola (in Redis: con TTL!)
        return price;
    }

    public void UpdatePrice(int id, int cents)
    {
        db.SavePrice(id, cents);                            // 1) scrivi sul DB
        cache.Remove(Key(id));                              // 2) invalida DOPO il commit
    }
}`,
  explanation: 'Prima lettura: miss → DB (hit 1) e popolamento cache. Seconda e terza: servite dalla cache. L\'aggiornamento scrive sul DB e rimuove la chiave; la lettura finale è di nuovo un miss → DB (hit 2) con il prezzo 1250. Senza invalidazione si avrebbe 1 solo accesso al DB ma prezzo 1000: dati stantii. In Redis reale aggiungi sempre un TTL come rete di sicurezza.',
});

P.lab('A2.2', {
  title: 'Isolamento del dominio puro (aggregate con invarianti)',
  objective: 'Trasformare un modello anemico in un aggregate che protegge le proprie invarianti senza dipendere da framework.',
  scenario: 'Le regole sugli ordini sono duplicate in tre service diversi; un job notturno ha aggiunto righe a ordini già spediti.',
  run: RUN.console,
  steps: [
    'Rendi privati setter e lista delle righe; esponi `IReadOnlyList<OrderLine>`.',
    'Implementa `AddLine` che unisce le quantità dello stesso SKU e rifiuta modifiche se lo stato non è Draft.',
    'Implementa `Ship()` che richiede almeno una riga.',
  ],
  lang: 'csharp',
  starter: `var order = new Order();
order.AddLine("SKU-1", 2);
order.AddLine("SKU-1", 1);
order.Ship();
Console.WriteLine($"Righe: {order.Lines.Count}, Quantità: {order.Lines.Sum(l => l.Quantity)}");
try
{
    order.AddLine("SKU-2", 1);
    Console.WriteLine("Aggiunta riuscita");
}
catch (DomainException ex)
{
    Console.WriteLine($"Errore: {ex.Message}");
}

public sealed class DomainException(string message) : Exception(message);
public enum OrderStatus { Draft, Shipped }
public sealed record OrderLine(string Sku, int Quantity);

// TODO: modello anemico → aggregate che protegge le invarianti
public sealed class Order
{
    public OrderStatus Status { get; set; }
    public List<OrderLine> Lines { get; set; } = [];
    public void AddLine(string sku, int qty) => Lines.Add(new OrderLine(sku, qty));
    public void Ship() => Status = OrderStatus.Shipped;
}`,
  hints: [
    'Per unire le quantità cerca una riga con lo stesso SKU e sostituiscila con `line with { Quantity = line.Quantity + qty }`.',
    'Il messaggio richiesto per l\'invariante è "Ordine già spedito".',
  ],
  question: 'Con l\'aggregate corretto, cosa stampa il programma?',
  options: [
    ['Righe: 1, Quantità: 3\nErrore: Ordine già spedito', 'Corretto: le righe dello stesso SKU vengono unite e l\'ordine spedito è immutabile.'],
    ['Righe: 2, Quantità: 3\nAggiunta riuscita', 'È lo starter anemico: nessuna regola applicata.'],
    ['Righe: 2, Quantità: 3\nErrore: Ordine già spedito', 'Con l\'unione per SKU le righe sono una sola.'],
    ['Righe: 1, Quantità: 3\nAggiunta riuscita', 'Lo stato Shipped deve bloccare le modifiche.'],
  ],
  solution: `public sealed class Order
{
    private readonly List<OrderLine> _lines = [];             // stato interno incapsulato
    public OrderStatus Status { get; private set; } = OrderStatus.Draft;
    public IReadOnlyList<OrderLine> Lines => _lines;          // sola lettura verso l'esterno

    public void AddLine(string sku, int qty)
    {
        if (Status != OrderStatus.Draft) throw new DomainException("Ordine già spedito"); // invariante
        if (qty <= 0) throw new DomainException("Quantità non valida");

        var i = _lines.FindIndex(l => l.Sku == sku);
        if (i >= 0) _lines[i] = _lines[i] with { Quantity = _lines[i].Quantity + qty }; // unisce lo SKU
        else _lines.Add(new OrderLine(sku, qty));
    }

    public void Ship()
    {
        if (_lines.Count == 0) throw new DomainException("Ordine vuoto");
        Status = OrderStatus.Shipped;                         // unica transizione consentita
    }
}
// Nota: nessun using di EF Core, ASP.NET o broker → il dominio è testabile in isolamento.`,
  explanation: 'L\'aggregate è l\'unico punto che può modificare le proprie righe: unisce le quantità per SKU (1 riga, quantità 3) e, una volta spedito, rifiuta qualsiasi modifica con DomainException. Le regole non dipendono più da quale service, job o endpoint usa l\'ordine. Il dominio non referenzia framework: lo si testa con un semplice unit test.',
});

export const phaseA2 = P.build({
  title: 'Architettura e Comunicazione Asincrona',
  subtitle: 'Confini, dominio, messaggi affidabili e caching: progettare sistemi che reggono il carico e il cambiamento.',
});
