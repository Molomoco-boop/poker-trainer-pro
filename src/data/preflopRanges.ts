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
  call: number; // 0-100%
  fold: number; // 0-100%
}

export type RangeMatrix = Record<string, HandFrequency>;

export const ALL_HANDS: string[] = (() => {
  const out: string[] = [];
  for (let r = 0; r < 13; r++) for (let c = 0; c < 13; c++) out.push(getHandLabel(r, c));
  return out;
})();

// ---------------------------------------------------------------------------
// Range notation: "TT+", "22-99", "A2s+", "K9s+", "A2s-A5s", "ATo+", "54s"
// ---------------------------------------------------------------------------

const idx = (r: string) => RANKS_ORDER.indexOf(r as Rank);

function expandToken(tok: string): string[] {
  const t = tok.trim();
  if (!t) return [];
  const plus = t.endsWith('+');
  const body = plus ? t.slice(0, -1) : t;
  if (body.includes('-')) {
    const [a, b] = body.split('-');
    if (a[0] === a[1]) {
      // pair range 22-99
      const lo = idx(a[0]), hi = idx(b[0]);
      const out: string[] = [];
      for (let i = Math.min(lo, hi); i <= Math.max(lo, hi); i++) out.push(RANKS_ORDER[i] + RANKS_ORDER[i]);
      return out;
    }
    const top = a[0], kind = a[2];
    const k1 = idx(a[1]), k2 = idx(b[1]);
    const out: string[] = [];
    for (let i = Math.min(k1, k2); i <= Math.max(k1, k2); i++) out.push(top + RANKS_ORDER[i] + kind);
    return out;
  }
  if (body.length === 2) {
    // pair
    if (!plus) return [body];
    const out: string[] = [];
    for (let i = idx(body[0]); i >= 0; i--) out.push(RANKS_ORDER[i] + RANKS_ORDER[i]);
    return out;
  }
  if (!plus) return [body];
  const top = body[0], kind = body[2];
  const out: string[] = [];
  for (let i = idx(body[1]); i > idx(top); i--) out.push(top + RANKS_ORDER[i] + kind);
  return out;
}

export function expandRange(notation: string): string[] {
  return notation.split(',').flatMap(expandToken);
}

type Mix = Partial<Pick<HandFrequency, 'raise' | 'call'>>;

function build(raise: string, call = '', mixes: [string, Mix][] = []): RangeMatrix {
  const m: RangeMatrix = {};
  ALL_HANDS.forEach(h => { m[h] = { raise: 0, call: 0, fold: 100 }; });
  expandRange(call).forEach(h => { m[h] = { raise: 0, call: 100, fold: 0 }; });
  expandRange(raise).forEach(h => { m[h] = { raise: 100, call: 0, fold: 0 }; });
  for (const [notation, mix] of mixes) {
    expandRange(notation).forEach(h => {
      const raiseF = mix.raise ?? 0;
      const callF = mix.call ?? 0;
      m[h] = { raise: raiseF, call: callF, fold: Math.max(0, 100 - raiseF - callF) };
    });
  }
  for (const h of Object.keys(m)) if (!ALL_HANDS.includes(h)) throw new Error(`Bad hand ${h}`);
  return m;
}

// ---------------------------------------------------------------------------
// Open raise (RFI) · 6-max 100 BB
// ---------------------------------------------------------------------------

const RFI_UTG = build('66+, ATs+, A5s-A3s, KTs+, QTs+, JTs, T9s, AJo+, KQo', '', [
  ['55', { raise: 70 }], ['A9s', { raise: 70 }], ['A8s', { raise: 60 }], ['A2s', { raise: 40 }],
  ['K9s', { raise: 60 }], ['Q9s', { raise: 40 }], ['J9s', { raise: 50 }], ['98s', { raise: 60 }],
  ['87s', { raise: 40 }], ['76s', { raise: 30 }], ['ATo', { raise: 50 }], ['KJo', { raise: 60 }], ['44', { raise: 30 }]
]);

const RFI_HJ = build('55+, A2s+, K9s+, Q9s+, J9s+, T9s, 98s, ATo+, KJo+', '', [
  ['44', { raise: 50 }], ['K8s', { raise: 60 }], ['K7s', { raise: 30 }], ['Q8s', { raise: 40 }],
  ['T8s', { raise: 50 }], ['87s', { raise: 60 }], ['76s', { raise: 50 }], ['65s', { raise: 40 }],
  ['KTo', { raise: 50 }], ['QJo', { raise: 50 }], ['A9o', { raise: 30 }]
]);

const RFI_CO = build('33+, A2s+, K6s+, Q8s+, J8s+, T8s+, 97s+, 87s, 76s, A8o+, KTo+, QTo+, JTo', '', [
  ['22', { raise: 50 }], ['K5s', { raise: 60 }], ['K4s', { raise: 30 }], ['Q7s', { raise: 50 }],
  ['J7s', { raise: 30 }], ['86s', { raise: 50 }], ['75s', { raise: 40 }], ['65s', { raise: 70 }],
  ['54s', { raise: 60 }], ['A7o', { raise: 50 }], ['A5o', { raise: 50 }], ['K9o', { raise: 50 }],
  ['Q9o', { raise: 30 }], ['T9o', { raise: 30 }]
]);

const RFI_BTN = build('22+, A2s+, K2s+, Q4s+, J6s+, T6s+, 96s+, 85s+, 75s+, 64s+, 53s+, 43s, A2o+, K8o+, Q9o+, J9o+, T9o', '', [
  ['Q3s', { raise: 50 }], ['Q2s', { raise: 30 }], ['J5s', { raise: 50 }], ['T5s', { raise: 40 }],
  ['95s', { raise: 40 }], ['74s', { raise: 50 }], ['63s', { raise: 40 }], ['K7o', { raise: 50 }],
  ['K6o', { raise: 30 }], ['Q8o', { raise: 50 }], ['J8o', { raise: 40 }], ['T8o', { raise: 50 }],
  ['98o', { raise: 40 }]
]);

/** SB raise-or-fold strategy (no limps). */
const RFI_SB = build('22+, A2s+, K4s+, Q6s+, J7s+, T7s+, 97s+, 86s+, 75s+, 65s, 54s, A4o+, K9o+, QTo+, JTo', '', [
  ['K3s', { raise: 50 }], ['K2s', { raise: 40 }], ['Q5s', { raise: 50 }], ['J6s', { raise: 40 }],
  ['96s', { raise: 40 }], ['64s', { raise: 50 }], ['A3o', { raise: 50 }], ['A2o', { raise: 40 }],
  ['K8o', { raise: 50 }], ['Q9o', { raise: 50 }], ['J9o', { raise: 40 }], ['T9o', { raise: 50 }]
]);

const RFI_BY_POS: Record<Position, RangeMatrix> = {
  UTG: RFI_UTG, HJ: RFI_HJ, CO: RFI_CO, BTN: RFI_BTN, SB: RFI_SB, BB: RFI_SB
};

// ---------------------------------------------------------------------------
// BB vs open (raise = 3-bet)
// ---------------------------------------------------------------------------

const BB_VS_UTG = build('QQ+, AKs', '22-JJ, A2s-AQs, K8s+, Q9s+, J9s+, T8s+, 97s+, 87s, 76s, 65s, 54s, ATo+, KJo+', [
  ['AKo', { raise: 50, call: 50 }], ['A5s', { raise: 30, call: 70 }], ['K7s', { call: 50 }], ['K6s', { call: 40 }],
  ['Q8s', { call: 60 }], ['J8s', { call: 50 }], ['86s', { call: 50 }], ['75s', { call: 50 }], ['64s', { call: 40 }],
  ['QJo', { call: 60 }], ['KTo', { call: 40 }], ['A9o', { call: 40 }], ['QTo', { call: 30 }], ['JTo', { call: 30 }]
]);

const BB_VS_HJ = build('QQ+, AKs, AKo', '22-JJ, A2s-AQs, K8s+, Q8s+, J8s+, T8s+, 97s+, 86s+, 76s, 65s, 54s, ATo+, KJo+, QJo', [
  ['A5s', { raise: 40, call: 60 }], ['K7s', { call: 60 }], ['K6s', { call: 40 }], ['Q7s', { call: 40 }],
  ['75s', { call: 70 }], ['64s', { call: 60 }], ['53s', { call: 50 }], ['K5s-K2s', { call: 50 }], ['Q6s', { call: 50 }],
  ['J7s', { call: 50 }], ['T7s', { call: 50 }], ['96s', { call: 50 }], ['A9o', { call: 70 }], ['A8o', { call: 50 }],
  ['A7o-A5o', { call: 40 }], ['KTo', { call: 80 }], ['K9o', { call: 50 }], ['QTo', { call: 70 }], ['Q9o', { call: 40 }],
  ['JTo', { call: 70 }], ['J9o', { call: 40 }], ['T9o', { call: 50 }]
]);

const BB_VS_CO = build('QQ+, AKs, AKo', '22-JJ, A2s-AQs, K2s+, Q5s+, J7s+, T7s+, 96s+, 85s+, 75s+, 64s+, 54s, A7o-AQo, KTo+, QTo+, JTo', [
  ['A5s', { raise: 50, call: 50 }], ['A4s', { raise: 30, call: 70 }], ['JJ', { raise: 30, call: 70 }],
  ['K9s', { raise: 20, call: 80 }], ['Q4s', { call: 50 }], ['J6s', { call: 50 }], ['T6s', { call: 40 }],
  ['53s', { call: 70 }], ['43s', { call: 50 }], ['Q3s-Q2s', { call: 50 }], ['J5s', { call: 50 }], ['95s', { call: 50 }],
  ['74s', { call: 50 }], ['63s', { call: 40 }], ['52s', { call: 40 }], ['A6o-A2o', { call: 80 }], ['K9o', { call: 80 }],
  ['K8o', { call: 60 }], ['K7o', { call: 40 }], ['Q9o', { call: 70 }], ['Q8o', { call: 50 }], ['J9o', { call: 70 }],
  ['J8o', { call: 50 }], ['T9o', { call: 70 }], ['T8o', { call: 50 }], ['98o', { call: 50 }], ['97o', { call: 30 }],
  ['87o', { call: 40 }], ['76o', { call: 30 }]
]);

const BB_VS_BTN = build('QQ+, AKs, AKo, A5s', '22-JJ, A2s-AQs, K2s+, Q2s+, J4s+, T5s+, 95s+, 84s+, 74s+, 63s+, 52s+, 42s+, 32s, A2o-AQo, K5o+, Q7o+, J7o+, T7o+, 97o+, 86o+, 76o, 65o', [
  ['JJ', { raise: 40, call: 60 }], ['AQs', { raise: 40, call: 60 }], ['A4s', { raise: 50, call: 50 }],
  ['K9s', { raise: 30, call: 70 }], ['Q9s', { raise: 25, call: 75 }], ['J3s', { call: 60 }], ['J2s', { call: 50 }],
  ['T4s', { call: 60 }], ['T3s', { call: 40 }], ['94s', { call: 50 }], ['73s', { call: 50 }],
  ['K4o', { call: 60 }], ['K3o', { call: 40 }], ['Q6o', { call: 50 }], ['J6o', { call: 40 }],
  ['T6o', { call: 40 }], ['96o', { call: 50 }], ['85o', { call: 50 }], ['75o', { call: 50 }],
  ['64o', { call: 40 }], ['54o', { call: 40 }]
]);

/** BB vs SB 3x open: in position, very wide. */
const BB_VS_SB = build('TT+, AJs+, KQs, AQo+, A5s, A4s', '22-99, A2s-ATs, K2s+, Q2s+, J2s+, T3s+, 94s+, 84s+, 73s+, 63s+, 52s+, 42s+, 32s, A2o-AJo, K3o+, Q5o+, J6o+, T6o+, 96o+, 85o+, 75o+, 64o+, 54o', [
  ['99', { raise: 40, call: 60 }], ['ATs', { raise: 40, call: 60 }], ['KJs', { raise: 40, call: 60 }],
  ['K9s', { raise: 30, call: 70 }], ['Q9s', { raise: 30, call: 70 }], ['J9s', { raise: 30, call: 70 }],
  ['T3s', { call: 60 }], ['94s', { call: 60 }], ['73s', { call: 60 }], ['63s', { call: 60 }], ['52s', { call: 50 }],
  ['42s', { call: 40 }], ['32s', { call: 40 }], ['K3o', { call: 60 }], ['Q5o', { call: 50 }], ['J6o', { call: 50 }],
  ['T6o', { call: 50 }], ['96o', { call: 50 }], ['85o', { call: 40 }], ['75o', { call: 50 }], ['64o', { call: 40 }],
  ['54o', { call: 50 }]
]);

// ---------------------------------------------------------------------------
// SB vs open: 3-bet or fold
// ---------------------------------------------------------------------------

const SB_VS_UTG = build('QQ+, AKs, AKo, AQs', '', [
  ['JJ', { raise: 70 }], ['TT', { raise: 40 }], ['AJs', { raise: 40 }], ['KQs', { raise: 50 }],
  ['A5s', { raise: 40 }], ['AQo', { raise: 30 }]
]);

const SB_VS_HJ = build('JJ+, AQs+, AKo, KQs', '', [
  ['TT', { raise: 70 }], ['99', { raise: 40 }], ['AJs', { raise: 60 }], ['ATs', { raise: 30 }],
  ['A5s', { raise: 60 }], ['A4s', { raise: 40 }], ['KJs', { raise: 40 }], ['AQo', { raise: 50 }]
]);

const SB_VS_CO = build('TT+, AJs+, KQs, AQo+, A5s', '', [
  ['99', { raise: 70 }], ['88', { raise: 40 }], ['ATs', { raise: 60 }], ['A4s', { raise: 60 }],
  ['KJs', { raise: 60 }], ['KTs', { raise: 40 }], ['QJs', { raise: 50 }], ['JTs', { raise: 40 }],
  ['AJo', { raise: 50 }], ['KQo', { raise: 40 }], ['76s', { raise: 30 }]
]);

const SB_VS_BTN = build('88+, ATs+, KTs+, QTs+, JTs, A5s, A4s, AJo+, KQo', '', [
  ['77', { raise: 70 }], ['66', { raise: 40 }], ['A9s', { raise: 60 }], ['A8s', { raise: 50 }],
  ['A3s', { raise: 50 }], ['K9s', { raise: 50 }], ['T9s', { raise: 50 }], ['98s', { raise: 40 }],
  ['87s', { raise: 30 }], ['ATo', { raise: 50 }], ['KJo', { raise: 50 }]
]);

// ---------------------------------------------------------------------------
// Opener vs 3-bet (raise = 4-bet), by position relative to the 3-bettor
// ---------------------------------------------------------------------------

/** Early opener (UTG/HJ) facing a 3-bet from a player in position. */
const VS3B_EARLY_OOP = build('KK+, AKs', 'QQ, JJ, TT, AQs, AJs, KQs', [
  ['AKo', { raise: 60, call: 40 }], ['A5s', { raise: 40 }], ['A4s', { raise: 25 }],
  ['99', { call: 70 }], ['88', { call: 40 }], ['ATs', { call: 60 }], ['KJs', { call: 60 }],
  ['QJs', { call: 50 }], ['JTs', { call: 50 }], ['T9s', { call: 30 }], ['AQo', { call: 50 }]
]);

/** Late opener (CO/BTN) facing a 3-bet from a player in position (e.g. CO vs BTN). */
const VS3B_LATE_OOP = build('KK+, AKs, AKo', 'QQ, JJ, TT, AQs, AJs, KQs', [
  ['A5s', { raise: 50, call: 20 }], ['A4s', { raise: 40 }], ['99', { call: 60 }], ['88', { call: 40 }],
  ['ATs', { call: 60 }], ['KJs', { call: 70 }], ['KTs', { call: 40 }], ['QJs', { call: 60 }],
  ['JTs', { call: 60 }], ['T9s', { call: 40 }], ['AQo', { call: 60 }], ['AJo', { raise: 20 }]
]);

/** Opener in position facing a 3-bet from the blinds. */
const VS3B_IP = build('KK+, AKs', '88-QQ, AJs, ATs, KQs, KJs, KTs, QJs, QTs, JTs, T9s, 98s, AQo', [
  ['AKo', { raise: 50, call: 50 }], ['AQs', { raise: 30, call: 70 }], ['A5s', { raise: 40, call: 40 }],
  ['A4s', { raise: 30, call: 30 }], ['77', { call: 70 }], ['66', { call: 50 }], ['55', { call: 30 }],
  ['A9s', { call: 50 }], ['K9s', { call: 40 }], ['Q9s', { call: 30 }], ['J9s', { call: 40 }],
  ['87s', { call: 50 }], ['76s', { call: 40 }], ['65s', { call: 30 }], ['AJo', { call: 50 }],
  ['KQo', { call: 50 }], ['A8s', { call: 30 }]
]);

const ORDER: Position[] = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];

export function getBBDefenseMatrix(opener: Position): RangeMatrix {
  return { UTG: BB_VS_UTG, HJ: BB_VS_HJ, CO: BB_VS_CO, BTN: BB_VS_BTN, SB: BB_VS_SB, BB: BB_VS_BTN }[opener];
}

export function getSBDefenseMatrix(opener: Position): RangeMatrix {
  return { UTG: SB_VS_UTG, HJ: SB_VS_HJ, CO: SB_VS_CO, BTN: SB_VS_BTN, SB: SB_VS_BTN, BB: SB_VS_BTN }[opener];
}

/** Opener at heroPos facing a 3-bet from threeBettor (acts after hero preflop). */
export function getVs3BetMatrix(heroPos: Position, threeBettor: Position): RangeMatrix {
  const villainInPosition = threeBettor !== 'SB' && threeBettor !== 'BB' && ORDER.indexOf(threeBettor) > ORDER.indexOf(heroPos);
  if (!villainInPosition) return VS3B_IP;
  return heroPos === 'UTG' || heroPos === 'HJ' ? VS3B_EARLY_OOP : VS3B_LATE_OOP;
}

export type PreflopSituation = 'RFI' | 'VS_OPEN' | 'VS_3BET';

/**
 * RFI: heroPos opens. VS_OPEN: `villain` is the opener. VS_3BET: hero opened, `villain` 3-bet.
 */
export function getPreflopMatrix(situation: PreflopSituation, heroPos: Position, villain?: Position): RangeMatrix {
  if (situation === 'RFI') return RFI_BY_POS[heroPos];
  if (situation === 'VS_3BET') return getVs3BetMatrix(heroPos, villain || 'BB');
  if (heroPos === 'BB') return getBBDefenseMatrix(villain || 'BTN');
  return getSBDefenseMatrix(villain || 'CO');
}

export function getHandFrequency(matrix: RangeMatrix, hand: string): HandFrequency {
  return matrix[hand] || { raise: 0, call: 0, fold: 100 };
}

export const handCombos = (hand: string) => (hand.length === 2 ? 6 : hand.endsWith('s') ? 4 : 12);

export function getRangeStats(range: RangeMatrix): { percentage: number; count: number } {
  let weight = 0;
  for (const h of ALL_HANDS) {
    const f = range[h];
    if (f) weight += handCombos(h) * (f.raise + f.call) / 100;
  }
  return { percentage: Math.round((weight / 1326) * 1000) / 10, count: Math.round(weight) };
}

/** Earliest position whose open range raises the hand ≥50 %, or null if no position opens it. */
export function earliestOpenPosition(hand: string): Position | null {
  for (const p of ['UTG', 'HJ', 'CO', 'BTN', 'SB'] as Position[]) {
    if (getHandFrequency(RFI_BY_POS[p], hand).raise >= 50) return p;
  }
  return null;
}
