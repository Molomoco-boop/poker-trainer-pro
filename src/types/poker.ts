export type Suit = 's' | 'h' | 'd' | 'c';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  rank: Rank;
  suit: Suit;
}

export type Position = 'UTG' | 'HJ' | 'CO' | 'BTN' | 'SB' | 'BB';

export const CLOCKWISE_POSITIONS: Position[] = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];

export type Street = 'preflop' | 'flop' | 'turn' | 'river';

export type CategoryId = 'simulator' | 'math' | 'fundamentals';

export type SubcategoryId =
  | 'full_hand'
  | 'preflop'
  | 'postflop'
  | 'odds'
  | 'equity'
  | 'ev'
  | 'hand_ranking'
  | 'best_hand';

export type PracticeMode = 'continuous' | SubcategoryId;

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
  1: { name: 'Básico', desc: 'Open raise, fold y decisiones claras' },
  2: { name: 'Estándar', desc: 'Defensa de ciegas y C-bet' },
  3: { name: 'Intermedio', desc: 'Spots marginales y semi-bluffs' },
  4: { name: 'Avanzado', desc: 'Bluff-catchers y frecuencias mixtas' },
};

export type OpponentProfile = 'gto_balanced' | 'micro_exploitative';

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
  RFI_OPEN: 'Open Raise (RFI)',
  BB_DEFENSE: 'Defensa de BB',
  SB_VS_OPEN: 'SB vs Open',
  '3BET_POT': '3-Bet Pots',
  CBET_FLOP: 'C-Bet Flop',
  FACING_CBET: 'Defensa vs C-Bet',
  TURN_RIVER_DECISION: 'Decisiones Turn/River',
  POT_ODDS_DRILL: 'Cálculo de Pot Odds'
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

export interface GtoFrequencies {
  fold: number;
  call: number;
  raise: number;
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
  questionType: 'action' | 'pot_odds' | 'outs' | 'equity' | 'best_hand';
  options: DecisionOption[];
  gtoFrequencies: GtoFrequencies;
  tacticalExplanation: {
    headline: string;
    positionAndRange: string;
    math: {
      payBB: number;
      finalPotBB: number;
      potOddsPct: number;
      estimatedEquityPct: number;
      spr?: number;
    };
    gameplan: string;
  };
  hint: {
    relativePosition: 'IP' | 'OOP';
    potOddsPct: number;
    boardTexture: string;
  };
  handStrengthName?: string;
  isReviewOfMistake?: boolean;
}

export interface FullHandScenario {
  id: string;
  title: string;
  pedagogicalLevel: PedagogicalLevel;
  spotType: SpotType;
  steps: HandStep[];
}

export interface MistakeRecord {
  id: string;
  timestamp: number;
  step: HandStep;
  failedAtHandIndex: number;
  repetitionCount: number;
  consecutiveSuccesses: number;
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
  opponentProfile: OpponentProfile;
  autoAdjustDifficulty: boolean;
  consecutiveCorrect: number;
  recentAnswers: boolean[]; // last 5 answers
  totalHandsPlayed: number;
  totalCorrectDecisions: number;
  totalDecisions: number;
  totalEvAccumulatedBB: number;
  dailyDrillCount: number; // 0-10
  sessionHands: SessionHandResult[];
  preferences: {
    volume: number; // 0-100
    soundEnabled: boolean;
    hapticsEnabled: boolean;
    animationSpeed: 'normal' | 'fast' | 'instant';
    dailyReminder: boolean;
    displayUnits: 'bb' | 'units'; // 'bb' | 'units' (€)
    deckColorMode: '4color' | '2color';
    showHandStrength: boolean;
  };
  categoryStats: Record<SpotType, { total: number; correct: number }>;
  mistakeQueue: MistakeRecord[];
}
