import { Rank } from '../types/poker';

export const RANKS_ORDER: Rank[] = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];

export function getHandLabel(row: number, col: number): string {
  const r1 = RANKS_ORDER[row];
  const r2 = RANKS_ORDER[col];
  if (row === col) return `${r1}${r2}`;
  if (row < col) return `${r1}${r2}s`;
  return `${r2}${r1}o`;
}

export interface HandFrequency {
  raise: number; // 0-100%
  call: number;  // 0-100%
  fold: number;  // 0-100%
}

export type RangeMatrix = Record<string, HandFrequency>;

// Helper to construct a matrix
function createMatrix(
  pureRaises: string[],
  pureCalls: string[],
  mixedEntries: Record<string, { raise?: number; call?: number; fold?: number }> = {}
): RangeMatrix {
  const matrix: RangeMatrix = {};

  for (let r = 0; r < 13; r++) {
    for (let c = 0; c < 13; c++) {
      const hand = getHandLabel(r, c);
      if (mixedEntries[hand]) {
        const m = mixedEntries[hand];
        const raise = m.raise ?? 0;
        const call = m.call ?? 0;
        const fold = m.fold ?? Math.max(0, 100 - raise - call);
        matrix[hand] = { raise, call, fold };
      } else if (pureRaises.includes(hand)) {
        matrix[hand] = { raise: 100, call: 0, fold: 0 };
      } else if (pureCalls.includes(hand)) {
        matrix[hand] = { raise: 0, call: 100, fold: 0 };
      } else {
        matrix[hand] = { raise: 0, call: 0, fold: 100 };
      }
    }
  }

  return matrix;
}

// Canonical RFI Open Ranges (6-Max 100BB Cash GTO)
const RFI_UTG = createMatrix(
  [
    'AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77',
    'AKs', 'AQs', 'AJs', 'ATs', 'A5s', 'A4s',
    'KQs', 'KJs', 'KTs',
    'QJs', 'QTs',
    'JTs', 'T9s', '98s',
    'AKo', 'AQo'
  ],
  [],
  {
    '66': { raise: 50, fold: 50 },
    '55': { raise: 25, fold: 75 },
    'A9s': { raise: 60, fold: 40 },
    'A3s': { raise: 45, fold: 55 },
    'A2s': { raise: 30, fold: 70 },
    'K9s': { raise: 40, fold: 60 },
    'Q9s': { raise: 35, fold: 65 },
    'J9s': { raise: 40, fold: 60 },
    '87s': { raise: 50, fold: 50 },
    '76s': { raise: 40, fold: 60 },
    'AJo': { raise: 55, fold: 45 },
    'KQo': { raise: 50, fold: 50 }
  }
);

const RFI_HJ = createMatrix(
  [
    'AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66',
    'AKs', 'AQs', 'AJs', 'ATs', 'A9s', 'A8s', 'A5s', 'A4s', 'A3s',
    'KQs', 'KJs', 'KTs', 'K9s',
    'QJs', 'QTs', 'Q9s',
    'JTs', 'J9s',
    'T9s', '98s', '87s',
    'AKo', 'AQo', 'AJo'
  ],
  [],
  {
    '55': { raise: 60, fold: 40 },
    '44': { raise: 30, fold: 70 },
    'A7s': { raise: 50, fold: 50 },
    'A2s': { raise: 45, fold: 55 },
    'K8s': { raise: 40, fold: 60 },
    'Q8s': { raise: 30, fold: 70 },
    '76s': { raise: 60, fold: 40 },
    '65s': { raise: 45, fold: 55 },
    'KQo': { raise: 75, fold: 25 },
    'ATo': { raise: 50, fold: 50 },
    'KJo': { raise: 40, fold: 60 }
  }
);

const RFI_CO = createMatrix(
  [
    'AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', '55', '44',
    'AKs', 'AQs', 'AJs', 'ATs', 'A9s', 'A8s', 'A7s', 'A6s', 'A5s', 'A4s', 'A3s', 'A2s',
    'KQs', 'KJs', 'KTs', 'K9s', 'K8s', 'K7s',
    'QJs', 'QTs', 'Q9s', 'Q8s',
    'JTs', 'J9s', 'J8s',
    'T9s', 'T8s',
    '98s', '97s',
    '87s', '76s', '65s',
    'AKo', 'AQo', 'AJo', 'ATo',
    'KQo', 'KJo',
    'QJo'
  ],
  [],
  {
    '33': { raise: 65, fold: 35 },
    '22': { raise: 50, fold: 50 },
    'K6s': { raise: 50, fold: 50 },
    'K5s': { raise: 40, fold: 60 },
    'Q7s': { raise: 45, fold: 55 },
    'J7s': { raise: 40, fold: 60 },
    '86s': { raise: 40, fold: 60 },
    '54s': { raise: 60, fold: 40 },
    'A9o': { raise: 40, fold: 60 },
    'KTo': { raise: 65, fold: 35 },
    'QTo': { raise: 55, fold: 45 },
    'JTo': { raise: 45, fold: 55 }
  }
);

const RFI_BTN = createMatrix(
  [
    'AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', '55', '44', '33', '22',
    'AKs', 'AQs', 'AJs', 'ATs', 'A9s', 'A8s', 'A7s', 'A6s', 'A5s', 'A4s', 'A3s', 'A2s',
    'KQs', 'KJs', 'KTs', 'K9s', 'K8s', 'K7s', 'K6s', 'K5s', 'K4s', 'K3s', 'K2s',
    'QJs', 'QTs', 'Q9s', 'Q8s', 'Q7s', 'Q6s', 'Q5s',
    'JTs', 'J9s', 'J8s', 'J7s', 'J6s',
    'T9s', 'T8s', 'T7s', 'T6s',
    '98s', '97s', '96s',
    '87s', '86s', '85s',
    '76s', '75s',
    '65s', '64s',
    '54s', '53s',
    '43s',
    'AKo', 'AQo', 'AJo', 'ATo', 'A9o', 'A8o', 'A7o', 'A6o', 'A5o',
    'KQo', 'KJo', 'KTo', 'K9o', 'K8o',
    'QJo', 'QTo', 'Q9o',
    'JTo', 'J9o',
    'T9o', '98o'
  ],
  [],
  {
    'Q4s': { raise: 50, fold: 50 },
    'J5s': { raise: 45, fold: 55 },
    'T5s': { raise: 35, fold: 65 },
    '84s': { raise: 35, fold: 65 },
    'A4o': { raise: 55, fold: 45 },
    'A3o': { raise: 45, fold: 55 },
    'A2o': { raise: 35, fold: 65 },
    'K7o': { raise: 50, fold: 50 },
    'Q8o': { raise: 45, fold: 55 },
    'J8o': { raise: 40, fold: 60 },
    '87o': { raise: 50, fold: 50 }
  }
);

const RFI_SB = createMatrix(
  [
    'AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', '55', '44', '33', '22',
    'AKs', 'AQs', 'AJs', 'ATs', 'A9s', 'A8s', 'A7s', 'A6s', 'A5s', 'A4s', 'A3s', 'A2s',
    'KQs', 'KJs', 'KTs', 'K9s', 'K8s', 'K7s', 'K6s', 'K5s',
    'QJs', 'QTs', 'Q9s', 'Q8s', 'Q7s',
    'JTs', 'J9s', 'J8s', 'J7s',
    'T9s', 'T8s', 'T7s',
    '98s', '97s',
    '87s', '86s',
    '76s', '65s', '54s',
    'AKo', 'AQo', 'AJo', 'ATo', 'A9o', 'A8o',
    'KQo', 'KJo', 'KTo',
    'QJo', 'QTo',
    'JTo'
  ],
  [],
  {
    'K4s': { raise: 55, fold: 45 },
    'Q6s': { raise: 50, fold: 50 },
    'J6s': { raise: 45, fold: 55 },
    'T6s': { raise: 40, fold: 60 },
    'A7o': { raise: 50, fold: 50 },
    'A6o': { raise: 40, fold: 60 },
    'K9o': { raise: 55, fold: 45 },
    'Q9o': { raise: 45, fold: 55 },
    '98o': { raise: 45, fold: 55 }
  }
);

// BB vs BTN Open Defense
const DEFENSE_BB_VS_BTN = createMatrix(
  // 3-Bet pure (Raise)
  [
    'AA', 'KK', 'QQ', 'JJ', 'TT',
    'AKs', 'AQs', 'AJs', 'ATs', 'A5s', 'A4s', 'A3s', 'A2s',
    'KQs', 'KJs',
    'AKo', 'AQo'
  ],
  // Calls
  [
    '99', '88', '77', '66', '55', '44', '33', '22',
    'A9s', 'A8s', 'A7s', 'A6s',
    'KTs', 'K9s', 'K8s', 'K7s', 'K6s', 'K5s', 'K4s', 'K3s', 'K2s',
    'QJs', 'QTs', 'Q9s', 'Q8s', 'Q7s', 'Q6s', 'Q5s',
    'JTs', 'J9s', 'J8s', 'J7s',
    'T9s', 'T8s', 'T7s',
    '98s', '97s', '87s', '86s', '76s', '75s', '65s', '64s', '54s',
    'AJo', 'ATo', 'A9o', 'A8o', 'A7o', 'A6o', 'A5o', 'A4o', 'A3o', 'A2o',
    'KQo', 'KJo', 'KTo', 'K9o', 'K8o', 'K7o',
    'QJo', 'QTo', 'Q9o', 'Q8o',
    'JTo', 'J9o', 'J8o',
    'T9o', 'T8o', '98o', '87o'
  ],
  {
    'A5s': { raise: 80, call: 20 },
    'A4s': { raise: 75, call: 25 },
    'K5s': { raise: 35, call: 65 },
    '75s': { raise: 30, call: 70 },
    '64s': { raise: 30, call: 70 },
    '53s': { raise: 30, call: 70 },
    'K6o': { call: 45, fold: 55 },
    'Q7o': { call: 50, fold: 50 },
    'J7o': { call: 40, fold: 60 },
    '97o': { call: 45, fold: 55 },
    '86o': { call: 40, fold: 60 },
    '76o': { call: 50, fold: 50 }
  }
);

// SB vs CO Open Defense (Strict 3-Bet or Fold; weak hands fold pure)
const DEFENSE_SB_VS_CO = createMatrix(
  // 3-Bet
  [
    'AA', 'KK', 'QQ', 'JJ', 'TT', '99',
    'AKs', 'AQs', 'AJs', 'ATs', 'A5s', 'A4s',
    'KQs', 'KJs',
    'AKo', 'AQo'
  ],
  // Small Call frequencies for pairs/suited broadways
  [
    '88', '77', '66', '55',
    'KTs', 'QJs', 'QTs', 'JTs', 'T9s', '98s'
  ],
  {
    'A3s': { raise: 45, fold: 55 },
    'A2s': { raise: 35, fold: 65 },
    'K9s': { raise: 30, fold: 70 },
    'AJo': { raise: 60, fold: 40 },
    'KQo': { raise: 50, fold: 50 },
    'Q5o': { fold: 100 }
  }
);

export const GTO_PREFLOP_SOLUTIONS: Record<string, Record<string, RangeMatrix>> = {
  RFI: {
    UTG: RFI_UTG,
    HJ: RFI_HJ,
    CO: RFI_CO,
    BTN: RFI_BTN,
    SB: RFI_SB,
    BB: RFI_BTN // Default placeholder
  },
  VS_OPEN: {
    UTG: RFI_UTG,
    HJ: RFI_HJ,
    CO: DEFENSE_SB_VS_CO,
    BTN: DEFENSE_BB_VS_BTN,
    SB: DEFENSE_SB_VS_CO,
    BB: DEFENSE_BB_VS_BTN
  },
  VS_3BET: {
    UTG: RFI_UTG,
    HJ: RFI_HJ,
    CO: RFI_CO,
    BTN: DEFENSE_BB_VS_BTN,
    SB: DEFENSE_SB_VS_CO,
    BB: DEFENSE_BB_VS_BTN
  },
  BB_DEFENSE: {
    UTG: DEFENSE_BB_VS_BTN,
    HJ: DEFENSE_BB_VS_BTN,
    CO: DEFENSE_BB_VS_BTN,
    BTN: DEFENSE_BB_VS_BTN,
    SB: DEFENSE_BB_VS_BTN,
    BB: DEFENSE_BB_VS_BTN
  }
};

// 80% Borderline Zone hands per position
export const BORDERLINE_HANDS_PER_POS: Record<string, string[]> = {
  UTG: ['66', '55', 'A9s', 'A8s', 'A4s', 'A3s', 'K9s', 'Q9s', 'J9s', '87s', '76s', 'AJo', 'KQo', 'ATo'],
  HJ: ['55', '44', 'A8s', 'A7s', 'A3s', 'A2s', 'K8s', 'Q8s', 'J8s', '76s', '65s', 'ATo', 'KJo', 'QJo'],
  CO: ['44', '33', '22', 'A7s', 'A6s', 'A2s', 'K7s', 'K6s', 'Q8s', 'Q7s', 'J8s', 'T8s', '97s', '54s', 'ATo', 'A9o', 'KTo', 'QTo', 'JTo'],
  BTN: ['33', '22', 'A6s', 'A5s', 'A4s', 'A3s', 'A2s', 'K6s', 'K5s', 'K4s', 'Q7s', 'Q6s', 'J7s', 'T7s', '96s', '85s', '75s', '64s', '53s', 'A8o', 'A7o', 'A6o', 'A5o', 'K9o', 'K8o', 'Q9o', 'Q8o', 'J9o', 'J8o', 'T8o', '98o', '87o'],
  SB: ['55', '44', '33', '22', 'A5s', 'A4s', 'A3s', 'A2s', 'K5s', 'K4s', 'Q7s', 'Q6s', 'J7s', 'T7s', '97s', '86s', '75s', '64s', '54s', 'A9o', 'A8o', 'A7o', 'KTo', 'K9o', 'QTo', 'Q9o', 'JTo', '98o'],
  BB: ['A5s', 'A4s', 'A3s', 'A2s', 'K7s', 'K6s', 'K5s', 'Q7s', 'Q6s', 'J7s', 'T7s', '97s', '86s', '75s', '64s', '53s', 'A8o', 'A7o', 'A6o', 'A5o', 'K8o', 'K7o', 'Q8o', 'Q7o', 'J8o', 'J7o', 'T8o', '97o', '86o', '76o']
};

export function getHandFrequency(situation: string, position: string, hand: string): HandFrequency {
  const sit = GTO_PREFLOP_SOLUTIONS[situation] || GTO_PREFLOP_SOLUTIONS.RFI;
  const pos = sit[position] || sit.BTN || RFI_BTN;
  return pos[hand] || { raise: 0, call: 0, fold: 100 };
}

export function getPositionStats(pos: string, situation = 'RFI'): { percentage: number; count: number } {
  const sit = GTO_PREFLOP_SOLUTIONS[situation] || GTO_PREFLOP_SOLUTIONS.RFI;
  const range = sit[pos] || RFI_BTN;
  let weight = 0;
  for (let r = 0; r < 13; r++) {
    for (let c = 0; c < 13; c++) {
      const hand = getHandLabel(r, c);
      const freq = range[hand];
      const combos = r === c ? 6 : (r < c ? 4 : 12);
      if (freq) {
        const playablePct = (freq.raise + freq.call) / 100;
        weight += combos * playablePct;
      }
    }
  }
  const percentage = Math.round((weight / 1326) * 1000) / 10;
  return { percentage, count: Math.round(weight) };
}
