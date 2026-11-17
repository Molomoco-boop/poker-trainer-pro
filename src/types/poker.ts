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
  1: { name: 'Básico', desc: 'Open raise y defensa de BB' },
  2: { name: 'Estándar', desc: '+ SB vs open, C-bet' },
  3: { name: 'Intermedio', desc: '+ Botes 3-bet' },
  4: { name: 'Avanzado', desc: 'Todo, solo manos frontera' },
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
  BB_DEFENSE: 'Defensa BB',
  SB_VS_OPEN: 'SB vs open',
  '3BET_POT': 'Bote 3-bet',
  CBET_FLOP: 'C-bet',
  FACING_CBET: 'Vs C-bet',
  TURN_RIVER_DECISION: 'Turn/River',
  POT_ODDS_DRILL: 'Pot odds'
};

export type DecisionVerdict = 'optimal' | 'mixed' | 'error';

export interface DecisionOption {
  id: string;
  label: string; // e.g. "FOLD", "CALL 1.5 BB", "RAISE 2.5 BB"
  amountBB?: number;
  isCorrect: boolean;
  verdict: DecisionVerdict;
  evDiff: string; // e.g. "+0.60 BB" or "-0.65 BB"
  evDiffNum: number;
  frequencyGTO: number; // 0-100%
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
  prompt: string; // e.g. "¿Cuál es tu jugada?"
  questionType: 'action' | 'pot_odds' | 'outs' | 'ev';
  options: DecisionOption[];
  hint: {
    relativePosition: 'IP' | 'OOP';
    potOddsPct: number;
    boardTexture: string;
    spr?: number;
  };
  /** One line explaining pot, probabilities or range for this decision. */
  why: string;
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

export type ReviewKind = 'pre' | 'post' | 'odds' | 'equity' | 'ev';

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
  evLostBB: number;
}

export interface SessionHandResult {
  id: string;
  handName: string;
  position: Position;
  street: Street;
  verdict: DecisionVerdict;
  evDiffNum: number;
  userAnswer: string;
  correctAnswer: string;
}

export interface UserStats {
  username: string;
  email: string;
  stake: StakeLevel;
  pedagogicalLevel: PedagogicalLevel;
  autoAdjustDifficulty: boolean;
  consecutiveCorrect: number;
  recentAnswers: boolean[]; // last 20 counted answers (level progression)
  totalHandsPlayed: number;
  totalCorrectDecisions: number;
  totalDecisions: number;
  totalEvAccumulatedBB: number;
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
  };
  categoryStats: Record<SpotType, { total: number; correct: number }>;
  mistakeQueue: MistakeRecord[];
}
