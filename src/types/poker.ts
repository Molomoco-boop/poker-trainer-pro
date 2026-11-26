export type Suit = 's' | 'h' | 'd' | 'c';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  rank: Rank;
  suit: Suit;
}

export type Position = 'UTG' | 'HJ' | 'CO' | 'BTN' | 'SB' | 'BB';

export const CLOCKWISE_POSITIONS: Position[] = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];

export type Street = 'preflop' | 'flop' | 'turn' | 'river';

export type CategoryId = 'simulator' | 'math';

export type SubcategoryId =
  | 'full_hand'
  | 'preflop'
  | 'postflop'
  | 'odds'
  | 'equity'
  | 'ev';

export type PracticeMode = 'continuous' | 'daily' | SubcategoryId;

export type PlayerStatus = 'hero' | 'active' | 'folded';

export interface PlayerState {
  id: string;
  position: Position;
  isHero: boolean;
  isDealer: boolean;
  stack: number; // in BB
  currentBet: number; // in BB (street bet)
  totalInvestedHand: number; // in BB
  status: PlayerStatus;
  cards?: [Card, Card];
  /** Last action this street, e.g. "Check", "Call 2.5", "Bet 3", "Raise 8", "Fold". */
  streetAction?: string;
  /** Opponent profile tag (bots only). */
  profile?: 'regular' | 'recreativo' | 'nit' | 'maniac';
  /** Seat that won the current hand (shown briefly at the end). */
  winner?: boolean;
}

export type StakeLevel = 'NL2' | 'NL5' | 'NL10' | 'NL25' | 'NL50' | 'NL100';

export const STAKE_CONFIG: Record<StakeLevel, { label: string; bbInEuros: number }> = {
  NL2: { label: 'NL2 (0.01€/0.02€)', bbInEuros: 0.02 },
  NL5: { label: 'NL5 (0.02€/0.05€)', bbInEuros: 0.05 },
  NL10: { label: 'NL10 (0.05€/0.10€)', bbInEuros: 0.10 },
  NL25: { label: 'NL25 (0.10€/0.25€)', bbInEuros: 0.25 },
  NL50: { label: 'NL50 (0.25€/0.50€)', bbInEuros: 0.50 },
  NL100: { label: 'NL100 (0.50€/1.00€)', bbInEuros: 1.00 },
};

export type PedagogicalLevel = 1 | 2 | 3 | 4;

export const PEDAGOGICAL_LEVEL_NAMES: Record<PedagogicalLevel, { name: string; desc: string }> = {
  1: { name: 'Basic', desc: 'Open raise and BB defense' },
  2: { name: 'Standard', desc: '+ SB vs open, C-bet' },
  3: { name: 'Intermediate', desc: '+ 3-bet pots' },
  4: { name: 'Advanced', desc: 'Everything, borderline hands only' },
};

export type SpotType =
  | 'RFI_OPEN'
  | 'BB_DEFENSE'
  | 'SB_VS_OPEN'
  | '3BET_POT'
  | 'CBET_FLOP'
  | 'FACING_CBET'
  | 'TURN_RIVER_DECISION'
  | 'POT_ODDS_DRILL';

export const SPOT_TYPE_NAMES: Record<SpotType, string> = {
  RFI_OPEN: 'Open raise',
  BB_DEFENSE: 'BB defense',
  SB_VS_OPEN: 'SB vs open',
  '3BET_POT': '3-bet pot',
  CBET_FLOP: 'C-bet',
  FACING_CBET: 'Vs C-bet',
  TURN_RIVER_DECISION: 'Turn/River',
  POT_ODDS_DRILL: 'Pot odds'
};

export type DecisionVerdict = 'optimal' | 'mixed' | 'error';

/** Honest grade of an answer: frequency based, no invented EV. */
export type Grade = 'best' | 'valid' | 'imprecise' | 'error' | 'blunder';

export const GRADE_ES: Record<Grade, string> = {
  best: 'Best',
  valid: 'Valid',
  imprecise: 'Imprecise',
  error: 'Error',
  blunder: 'Blunder'
};

/** Learning concepts: curriculum order (ranges → postflop), then math. */
export type ConceptId =
  | 'rfi_early' | 'rfi_late' | 'bb_def' | 'sb_3b' | 'vs3b' | 'cbet' | 'flop_def' | 'turn' | 'river'
  | 'm_mdf' | 'm_bluff' | 'm_combos' | 'm_equity' | 'm_odds' | 'm_outs' | 'm_ev';

export const CURRICULUM: ConceptId[] = ['rfi_early', 'rfi_late', 'bb_def', 'sb_3b', 'vs3b', 'cbet', 'flop_def', 'turn', 'river'];
export const MATH_CONCEPTS: ConceptId[] = ['m_mdf', 'm_bluff', 'm_combos', 'm_equity', 'm_odds', 'm_outs', 'm_ev'];

export const CONCEPT_ES: Record<ConceptId, string> = {
  rfi_early: 'Open UTG/HJ',
  rfi_late: 'Open CO/BTN/SB',
  bb_def: 'BB defense',
  sb_3b: 'SB vs open',
  vs3b: 'Vs 3-bet',
  cbet: 'C-bet flop',
  flop_def: 'Flop without initiative',
  turn: 'Turn',
  river: 'River',
  m_mdf: 'MDF',
  m_bluff: 'Bluffs',
  m_combos: 'Combos',
  m_equity: 'Equity vs range',
  m_odds: 'Pot odds',
  m_outs: 'Outs',
  m_ev: 'EV'
};

/** Short description of each topic (back of the topic card). */
export const CONCEPT_DESC: Record<ConceptId, string> = {
  rfi_early: 'RFI from early position when it is folded to you',
  rfi_late: 'RFI from cutoff, button or small blind',
  bb_def: 'BB: call or 3-bet when facing an open',
  sb_3b: 'SB vs an open: 3-bet or fold',
  vs3b: 'You opened and got 3-bet: call, 4-bet or fold',
  cbet: 'You raised preflop: do you C-bet the flop?',
  flop_def: 'You called preflop and face a C-bet',
  turn: 'Fourth card: continue, call or give up',
  river: 'Last card: value, bluff or bluff-catch',
  m_mdf: 'Minimum defense frequency so bluffs are not free',
  m_bluff: 'How many bluffs belong in your river betting range',
  m_combos: 'Count hand combinations, removing yours and the board',
  m_equity: 'Your % equity against the villain’s range',
  m_odds: 'What % equity you need to call a bet',
  m_outs: 'Cards that give you the best hand, and their %',
  m_ev: 'Expected value of a play, on average'
};

export interface DetailRow {
  k: 'odds' | 'hand' | 'range' | 'board' | 'plan';
  label: string;
  value: string;
}

export interface RatingState { r: number; rd: number; n: number }

/** What a practice screen trains. */
export type SessionSpec =
  | { kind: 'rated' }
  | { kind: 'cash' }
  | { kind: 'daily' }
  | { kind: 'placement' }
  | { kind: 'concept'; concept: ConceptId }
  | { kind: 'leak'; pos: Position; street: Street };

export interface DecisionOption {
  id: string;
  label: string; // e.g. "FOLD", "CALL 1.5 BB", "RAISE 2.5 BB"
  amountBB?: number;
  isCorrect: boolean;
  verdict: DecisionVerdict;
  grade: Grade;
  frequencyGTO: number; // 0-100%
  /** Exploitative frequency vs the current opponent profile, when not Regular. */
  frequencyExploit?: number;
  /** Short label, e.g. "Vs nit". */
  exploitLabel?: string;
}

export interface HandStep {
  id: string;
  street: Street;
  pot: number; // in BB
  communityCards: Card[];
  players: PlayerState[];
  heroPosition: Position;
  spotType: SpotType;
  relativePosition: 'IP' | 'OOP';
  actionTicker: string;
  contextNotice: string; // Short pill inside table
  prompt: string; // e.g. "Your action"
  questionType: 'action' | 'pot_odds' | 'outs' | 'ev' | 'mdf' | 'bluff' | 'combos' | 'equity';
  options: DecisionOption[];
  hint: {
    relativePosition: 'IP' | 'OOP';
    potOddsPct: number;
    boardTexture: string;
    spr?: number;
  };
  /** One line explaining pot, probabilities or range for this decision. */
  why: string;
  /** Same explanation as 2-3 schematic rows (pot odds · tu mano · plan). */
  detail?: DetailRow[];
  /** Concept trained by this decision (curriculum, leak map). */
  concept: ConceptId;
  /** Spot rating (Glicko opponent), ~1100-1900. */
  difficulty: number;
  /** Shown after the continuing answer when the hand ends there (e.g. "BTN foldea"). */
  endNote?: string;
  /** Describes the spot so a similar one can be generated for review. */
  review: ReviewKey;
  /** Easy preflop fold outside every open range: a correct answer does not count for level. */
  trivial?: boolean;
  isReviewOfMistake?: boolean;
  reviewOf?: string;
  /** Plays the chosen (correct) option and returns the next hero decision, or null when the hand ends. */
  advance?: (optionId: string) => StepAdvance;
}

export interface StepAdvance {
  next: HandStep | null;
  /** What happened after hero's action when the hand ends (e.g. "BTN foldea"). */
  note?: string;
}

export interface FullHandScenario {
  id: string;
  title: string;
  pedagogicalLevel: PedagogicalLevel;
  spotType: SpotType;
  steps: HandStep[];
}

export type ReviewKind = 'pre' | 'post' | 'odds' | 'equity' | 'ev' | 'math';

export interface ReviewKey {
  kind: ReviewKind;
  /** Scenario spot used to generate it (preflop spot for 'pre', forced spot for 'post'). */
  spot: SpotType;
  heroPos: Position;
  villainPos?: Position;
  hand?: string;
  street?: Street;
  /** Postflop: strength class and decision type ('lead' | 'facing' | 'raise'). */
  cls?: string;
  decision?: 'lead' | 'facing' | 'raise';
  /** Math drills: which drill. */
  concept?: ConceptId;
}

export interface MistakeRecord {
  id: string;
  timestamp: number;
  key: ReviewKey;
  /** Review stage: 0 → due 3 decisions later, 1 → 10, 2 → 30; passing stage 2 removes it. */
  stage: number;
  dueAt: number;
  failedAtHandIndex: number;
  repetitionCount: number;
  label: string;
  userAnswerId: string;
  userAnswerLabel: string;
  correctAnswerLabel: string;
}

export interface SessionHandResult {
  id: string;
  handName: string;
  position: Position;
  street: Street;
  verdict: DecisionVerdict;
  grade: Grade;
  ratingDelta: number;
  userAnswer: string;
  correctAnswer: string;
}

export type SupportedLang = 'en' | 'es' | 'pt' | 'fr' | 'de' | 'it' | 'ru' | 'zh' | 'ja' | 'ko';
export type LanguagePref = 'auto' | SupportedLang;

export interface UserStats {
  username: string;
  email: string;
  stake: StakeLevel;
  /** Global rating (Glicko-1). */
  rating: RatingState;
  /** Rating per concept. */
  conceptRatings: Partial<Record<ConceptId, RatingState>>;
  /** Last ratings for the sparkline. */
  ratingHistory: number[];
  /** Consecutive correct answers (Lichess-style streak). */
  consecutiveCorrect: number;
  bestStreak: number;
  totalHandsPlayed: number;
  totalCorrectDecisions: number;
  totalDecisions: number;
  /** Sum of chance of a random answer being correct (for "above chance" accuracy). */
  totalChance: number;
  /** Position × street results: key "BTN|flop". */
  leakStats: Record<string, { n: number; ok: number; chance: number }>;
  placementDone: boolean;
  /** Index in CURRICULUM of the concept being learnt. */
  curriculumIndex: number;
  sprintBest: number;
  rangeBest: Record<string, number>;
  /** Days with at least 3 decisions in a row. */
  dayStreak: number;
  lastActiveDay: string;
  todayDecisions: number;
  lastReviewAt: number;
  dailyDrillCount: number; // 0-10
  dailyDrillDate: string; // YYYY-MM-DD of dailyDrillCount
  schemaVersion: number;
  sessionHands: SessionHandResult[];
  preferences: {
    volume: number; // 0-100
    soundEnabled: boolean;
    hapticsEnabled: boolean;
    animationSpeed: 'normal' | 'fast' | 'instant';
    dailyReminder: boolean;
    displayUnits: 'bb' | 'units'; // 'bb' | 'units' (€)
    deckColorMode: '4color' | '2color';
    trainingPositions: Position[];
    language?: LanguagePref;
  };
  categoryStats: Record<SpotType, { total: number; correct: number }>;
  mistakeQueue: MistakeRecord[];
}
