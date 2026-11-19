# FullStack & .NET Mastery Coach

Coach personale rigido ma motivante per due percorsi complementari:

- **Traccia A — .NET, Cloud & AI Backend** (A0 → A5, con 3 binari di specializzazione in A5)
- **Traccia B — Frontend Cross-Framework**: JS/TS, React, Angular, Vue (B0 → B4)

Quattro pilastri: **Schede + active recall**, **IDE Code Labs** (esegui il codice nel tuo editor e scegli l'output), **Spaced Repetition giornaliera**, **Gate Exam** (10 domande, ≥80%, max 1 errore per modulo, recupero obbligatorio se bocciato).

## Avvio

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # Vitest: 140 test (dominio, curriculum, lab eseguiti in Node, UI)
npm run build      # tsc --noEmit + vite build → dist/
npm run preview    # serve la build di produzione
```

Requisiti: Node.js 20.19+ o 22.12+ (richiesto da Vite 7).

## Contenuti

| | Traccia A | Traccia B | Totale |
|---|---|---|---|
| Fasi | 6 (A5 con 3 binari) | 5 | 11 |
| Schede Concept | 26 | 14 | **40** |
| Domande (training + banca esame) | 96 | 60 | **156** |
| IDE Code Labs | 24 | 15 | **39** |

Il 47% delle domande è marcato come "classica da colloquio"; le risposte corrette sono distribuite in modo uniforme su A/B/C/D.
5 Code Labs JS/TS sono **eseguiti davvero dai test** (`src/data/labs.verify.test.ts`): l'output reale deve coincidere con l'opzione corretta.

## Regole di sblocco (Gate System)

Per sbloccare la fase N+1, nella fase N servono:
1. tutte le schede ripassate (micro-check corretto);
2. tutti gli IDE Code Labs risolti;
3. padronanza quiz ≥ 70% (domande di allenamento con ultima risposta corretta);
4. Gate Exam ≥ 80% **e** massimo 1 errore per modulo. Se bocciato → Sessione di Recupero Obbligatoria (schede + domande dei moduli sbagliati) prima di poter ripetere.

La banca d'esame di una fase non entra nell'allenamento finché la fase non è superata.

## Architettura

```
src/
  domain/        logica pura e testata: gate, srs (SM-2), progress (XP/livelli/streak),
                 reducer, storage (localStorage + export/import), training (sessioni, modalità Misto)
  data/          curriculum: dotnetTrack.ts, frontendTrack.ts, dotnet/a0..a5.ts, frontend/b0..b4.ts,
                 comparisonTable.ts, builders.ts (DSL di authoring)
  ai/            AI Coach opzionale (Anthropic o OpenAI-compatibile) con parsing e validazione delle risposte
  lib/           highlight.js (C#, TS/TSX, JS, HTML, SQL, YAML, Dockerfile, Bash, JSON), router hash, clipboard
  ui/            AppContext, componenti, viste (Dashboard, Fase, Allenamento, Confronto, AI Coach, Impostazioni)
```

### Aggiungere contenuti
Usa `phaseBuilder` in `src/data/builders.ts`: nelle opzioni scrivi **sempre prima quella corretta**, il builder la ruota in modo bilanciato. `npm test` verifica automaticamente i vincoli (≥12 domande e ≥3 lab per fase, 4 opzioni con spiegazione, id univoci, copertura dei moduli…). Per un lab JS/TS aggiungi `verify: { runtime: 'node', source: 'starter' | 'solution' }` e il test lo eseguirà.

## AI Coach
In *Impostazioni* inserisci provider, API key ed eventualmente modello/base URL. La chiave resta solo nel localStorage del browser e **non** viene inclusa negli export. Le domande generate entrano nell'allenamento, mai nei gate.
