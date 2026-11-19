// ─── Curriculum model ────────────────────────────────────────────────────────

export type TrackId = 'A' | 'B';
export type CodeLang = 'csharp' | 'typescript' | 'javascript' | 'tsx' | 'html' | 'sql' | 'yaml' | 'dockerfile' | 'bash' | 'json' | 'text';

export interface ChoiceOption {
  text: string;
  /** Spiegazione del Coach: perché questa opzione è giusta o sbagliata. */
  why: string;
}

export interface MicroCheck {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface ConceptCard {
  id: string;
  moduleId: string;
  title: string;
  /** "Cos'è in 3 righe" */
  summary: string;
  code: string;
  codeLang: CodeLang;
  /** Trappola classica da colloquio / produzione */
  trap: string;
  /** Regola d'oro */
  goldenRule: string;
  check: MicroCheck;
}

export interface Module {
  id: string;
  phaseId: string;
  code: string; // es. "B0.1"
  title: string;
  topics: string[];
  branchId?: string;
}

export type QuestionPool = 'training' | 'exam';

export interface Question {
  id: string;
  phaseId: string;
  moduleId: string;
  pool: QuestionPool;
  prompt: string;
  code?: string;
  codeLang?: CodeLang;
  options: ChoiceOption[];
  correctIndex: number;
  /** Domanda classica da colloquio tecnico */
  interview?: boolean;
  branchId?: string;
  /** Domande generate dall'AI Coach */
  generated?: boolean;
}

export interface LabVerification {
  runtime: 'node';
  /** Quale codice produce l'output dell'opzione corretta. */
  source: 'starter' | 'solution';
}

export interface CodeLab {
  id: string;
  phaseId: string;
  moduleId: string;
  title: string;
  objective: string;
  scenario: string;
  runInstructions: string[];
  steps: string[];
  starterCode: string;
  codeLang: CodeLang;
  hints: [string, string];
  resultQuestion: string;
  options: ChoiceOption[];
  correctIndex: number;
  solutionCode: string;
  explanation: string;
  branchId?: string;
  verify?: LabVerification;
}

export interface Branch {
  id: string;
  title: string;
  description: string;
}

export interface Phase {
  id: string;
  trackId: TrackId;
  order: number;
  title: string;
  subtitle: string;
  modules: Module[];
  cards: ConceptCard[];
  questions: Question[];
  labs: CodeLab[];
  branches?: Branch[];
}

export interface Track {
  id: TrackId;
  title: string;
  shortTitle: string;
  description: string;
  phases: Phase[];
}

// ─── User state ──────────────────────────────────────────────────────────────

export interface SrsItem {
  ease: number;
  interval: number; // giorni
  reps: number;
  due: string; // YYYY-MM-DD
  lastCorrect: boolean;
  attempts: number;
  correct: number;
}

export interface ExamAnswer {
  questionId: string;
  moduleId: string;
  chosenIndex: number;
  correct: boolean;
}

export interface ModuleScore {
  moduleId: string;
  total: number;
  correct: number;
  errors: number;
}

export interface ExamResult {
  phaseId: string;
  date: string;
  score: number;
  total: number;
  percent: number;
  passed: boolean;
  moduleScores: ModuleScore[];
  failedModules: string[];
  reasons: string[];
  answers: ExamAnswer[];
}

export interface RecoveryPlan {
  phaseId: string;
  modules: string[];
  /** Schede da ripassare di nuovo (id) */
  pendingCards: string[];
  /** Domande di recupero ancora da azzeccare (id) */
  pendingQuestions: string[];
}

export interface PhaseProgress {
  studiedCards: string[];
  completedLabs: string[];
  labHintsUsed: Record<string, number>;
  examHistory: ExamResult[];
  passed: boolean;
  recovery: RecoveryPlan | null;
  branchId?: string;
}

export type AiProvider = 'anthropic' | 'openai';

export interface AiSettings {
  provider: AiProvider;
  apiKey: string;
  model: string;
  baseUrl: string;
}

export interface UserState {
  version: number;
  createdAt: string;
  xp: number;
  streak: { current: number; best: number; lastActiveDate: string | null };
  activeTrack: TrackId | 'MIX';
  phases: Record<string, PhaseProgress>;
  srs: Record<string, SrsItem>;
  generatedQuestions: Question[];
  ai: AiSettings;
}

export type RequirementKey = 'cards' | 'labs' | 'mastery' | 'exam';

export interface Requirement {
  key: RequirementKey;
  label: string;
  done: boolean;
  current: number;
  target: number;
  detail: string;
}

export type PhaseStatus = 'locked' | 'available' | 'passed';
