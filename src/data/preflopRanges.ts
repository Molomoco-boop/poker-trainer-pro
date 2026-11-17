import { Rank, Position } from '../types/poker';

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

// ---------------------------------------------------------------------------
// Defensa vs open (6-max 100bb, open 2.5bb; SB abre a 3bb)
// ---------------------------------------------------------------------------

// BB vs BTN / SB (rango amplio)
const DEFENSE_BB_VS_LATE = createMatrix(
  [
    'AA', 'KK', 'QQ', 'JJ', 'TT',
    'AKs', 'AQs', 'AJs', 'ATs', 'A3s', 'A2s',
    'KQs', 'KJs',
    'AKo', 'AQo'
  ],
  [
    '99', '88', '77', '66', '55', '44', '33', '22',
    'A9s', 'A8s', 'A7s', 'A6s',
    'KTs', 'K9s', 'K8s', 'K7s', 'K6s', 'K4s', 'K3s', 'K2s',
    'QJs', 'QTs', 'Q9s', 'Q8s', 'Q7s', 'Q6s', 'Q5s',
    'JTs', 'J9s', 'J8s', 'J7s',
    'T9s', 'T8s', 'T7s',
    '98s', '97s', '87s', '86s', '76s', '65s', '54s',
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

// BB vs CO
const DEFENSE_BB_VS_CO = createMatrix(
  ['AA', 'KK', 'QQ', 'JJ', 'AKs', 'AQs', 'AKo'],
  [
    'TT', '99', '88', '77', '66', '55', '44', '33', '22',
    'AJs', 'ATs', 'A9s', 'A8s', 'A7s', 'A6s', 'A3s', 'A2s',
    'KJs', 'KTs', 'K9s', 'K8s', 'K7s', 'K6s',
    'QJs', 'QTs', 'Q9s', 'Q8s',
    'JTs', 'J9s', 'J8s',
    'T9s', 'T8s', '98s', '97s', '87s', '86s', '76s', '75s', '65s', '64s', '54s',
    'AQo', 'AJo', 'ATo', 'A9o',
    'KQo', 'KJo', 'KTo',
    'QJo', 'QTo', 'JTo'
  ],
  {
    'A5s': { raise: 60, call: 40 },
    'A4s': { raise: 55, call: 45 },
    'KQs': { raise: 40, call: 60 },
    'A8o': { call: 50, fold: 50 },
    'K9o': { call: 40, fold: 60 },
    'Q9o': { call: 40, fold: 60 },
    'J9o': { call: 40, fold: 60 },
    'T9o': { call: 50, fold: 50 },
    '98o': { call: 30, fold: 70 }
  }
);

// BB vs UTG / HJ
const DEFENSE_BB_VS_EARLY = createMatrix(
  ['AA', 'KK', 'QQ', 'AKs', 'AKo'],
  [
    'TT', '99', '88', '77', '66', '55', '44', '33', '22',
    'AQs', 'AJs', 'ATs', 'A9s', 'A8s', 'A7s', 'A6s', 'A4s', 'A3s', 'A2s',
    'KQs', 'KJs', 'KTs', 'K9s',
    'QJs', 'QTs', 'Q9s',
    'JTs', 'J9s', 'T9s', 'T8s', '98s', '97s', '87s', '86s', '76s', '65s', '54s',
    'AQo', 'AJo', 'KQo'
  ],
  {
    'JJ': { raise: 40, call: 60 },
    'A5s': { raise: 50, call: 50 },
    'ATo': { call: 50, fold: 50 },
    'KJo': { call: 50, fold: 50 },
    'QJo': { call: 40, fold: 60 }
  }
);

// SB vs open: 3-bet o fold (sin flat)
const DEFENSE_SB_VS_EARLY = createMatrix(
  ['AA', 'KK', 'QQ', 'JJ', 'TT', 'AKs', 'AQs', 'AJs', 'KQs', 'AKo', 'AQo'],
  [],
  {
    '99': { raise: 60, fold: 40 },
    'A5s': { raise: 50, fold: 50 },
    'ATs': { raise: 45, fold: 55 },
    'KJs': { raise: 40, fold: 60 }
  }
);

const DEFENSE_SB_VS_CO = createMatrix(
  [
    'AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88',
    'AKs', 'AQs', 'AJs', 'ATs', 'A5s', 'A4s',
    'KQs', 'KJs',
    'AKo', 'AQo'
  ],
  [],
  {
    '77': { raise: 70, fold: 30 },
    '66': { raise: 50, fold: 50 },
    'A3s': { raise: 45, fold: 55 },
    'A2s': { raise: 35, fold: 65 },
    'KTs': { raise: 60, fold: 40 },
    'QJs': { raise: 60, fold: 40 },
    'QTs': { raise: 45, fold: 55 },
    'JTs': { raise: 50, fold: 50 },
    'T9s': { raise: 40, fold: 60 },
    'K9s': { raise: 30, fold: 70 },
    'AJo': { raise: 60, fold: 40 },
    'KQo': { raise: 50, fold: 50 }
  }
);

const DEFENSE_SB_VS_BTN = createMatrix(
  [
    'AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66',
    'AKs', 'AQs', 'AJs', 'ATs', 'A9s', 'A8s', 'A5s', 'A4s', 'A3s',
    'KQs', 'KJs', 'KTs', 'K9s',
    'QJs', 'QTs', 'JTs', 'T9s',
    'AKo', 'AQo', 'AJo', 'KQo'
  ],
  [],
  {
    '55': { raise: 60, fold: 40 },
    '44': { raise: 40, fold: 60 },
    'A7s': { raise: 60, fold: 40 },
    'A6s': { raise: 55, fold: 45 },
    'A2s': { raise: 55, fold: 45 },
    'Q9s': { raise: 50, fold: 50 },
    'J9s': { raise: 45, fold: 55 },
    '98s': { raise: 50, fold: 50 },
    '87s': { raise: 40, fold: 60 },
    'ATo': { raise: 60, fold: 40 },
    'KJo': { raise: 55, fold: 45 },
    'QJo': { raise: 35, fold: 65 }
  }
);

// Opener vs 3-bet (call / 4-bet / fold)
const VS_3BET = createMatrix(
  ['AA', 'KK', 'AKs'],
  [
    'JJ', 'TT', '99', '88', '77',
    'AJs', 'ATs', 'KQs', 'KJs', 'QJs', 'JTs', 'T9s', '98s'
  ],
  {
    'QQ': { raise: 60, call: 40 },
    'AKo': { raise: 55, call: 45 },
    'AQs': { raise: 25, call: 75 },
    'A5s': { raise: 45, fold: 55 },
    'A4s': { raise: 30, fold: 70 },
    'AQo': { call: 55, fold: 45 },
    '66': { call: 45, fold: 55 },
    'KTs': { call: 50, fold: 50 },
    'QTs': { call: 45, fold: 55 },
    '87s': { call: 40, fold: 60 },
    '76s': { call: 35, fold: 65 }
  }
);

const RFI_BY_POS: Record<Position, RangeMatrix> = {
  UTG: RFI_UTG, HJ: RFI_HJ, CO: RFI_CO, BTN: RFI_BTN, SB: RFI_SB, BB: RFI_SB
};

export function getBBDefenseMatrix(opener: Position): RangeMatrix {
  if (opener === 'BTN' || opener === 'SB') return DEFENSE_BB_VS_LATE;
  if (opener === 'CO') return DEFENSE_BB_VS_CO;
  return DEFENSE_BB_VS_EARLY;
}

export function getSBDefenseMatrix(opener: Position): RangeMatrix {
  if (opener === 'BTN') return DEFENSE_SB_VS_BTN;
  if (opener === 'CO') return DEFENSE_SB_VS_CO;
  return DEFENSE_SB_VS_EARLY;
}

export type PreflopSituation = 'RFI' | 'VS_OPEN' | 'VS_3BET';

/** Matrix for hero at heroPos. VS_OPEN needs the opener; VS_3BET uses one opener-vs-3bet range. */
export function getPreflopMatrix(situation: PreflopSituation, heroPos: Position, opener?: Position): RangeMatrix {
  if (situation === 'RFI') return RFI_BY_POS[heroPos];
  if (situation === 'VS_3BET') return VS_3BET;
  if (heroPos === 'BB') return getBBDefenseMatrix(opener || 'BTN');
  if (heroPos === 'SB') return getSBDefenseMatrix(opener || 'CO');
  return VS_3BET;
}

export function getHandFrequency(matrix: RangeMatrix, hand: string): HandFrequency {
  return matrix[hand] || { raise: 0, call: 0, fold: 100 };
}

export const ALL_HANDS: string[] = (() => {
  const out: string[] = [];
  for (let r = 0; r < 13; r++) for (let c = 0; c < 13; c++) out.push(getHandLabel(r, c));
  return out;
})();

export function getRangeStats(range: RangeMatrix): { percentage: number; count: number } {
  let weight = 0;
  for (let r = 0; r < 13; r++) {
    for (let c = 0; c < 13; c++) {
      const freq = range[getHandLabel(r, c)];
      const combos = r === c ? 6 : (r < c ? 4 : 12);
      if (freq) weight += combos * (freq.raise + freq.call) / 100;
    }
  }
  return { percentage: Math.round((weight / 1326) * 1000) / 10, count: Math.round(weight) };
}
