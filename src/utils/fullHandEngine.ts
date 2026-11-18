import {
  Card,
  Rank,
  Suit,
  Position,
  PlayerState,
  HandStep,
  FullHandScenario,
  SpotType,
  DecisionOption,
  PedagogicalLevel,
  SubcategoryId,
  Street,
  ReviewKey,
  StepAdvance,
  CLOCKWISE_POSITIONS,
  ConceptId,
  Grade,
  DetailRow
} from '../types/poker';
import { RANKS, SUITS, evaluateHand, compareEvaluations } from './pokerEvaluator';
import {
  getPreflopMatrix,
  getHandFrequency,
  ALL_HANDS,
  RangeMatrix,
  HandFrequency,
  getRangeStats,
  handCombos,
  earliestOpenPosition,
  getHandLabel
} from '../data/preflopRanges';
import { calculatePotOddsPct, analyzeBoardTexture, isWetBoard, countOutsVsVillain, raiserBoardAdvantage } from './pokerMath';
import { classifyHand, StrengthClass, CLASS_ES } from './handStrength';
import { levelForRating, pickNearRating } from './rating';
import { samplePopulation, afterPre } from './actionModel';
import { EQUITY_VS_RANDOM } from '../data/equityVsRandom';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Picks a value with the given weights. */
function weighted<T>(items: [T, number][]): T {
  const total = items.reduce((a, [, w]) => a + w, 0);
  let x = Math.random() * total;
  for (const [v, w] of items) { x -= w; if (x <= 0) return v; }
  return items[items.length - 1][0];
}

const r1 = (n: number) => Math.round(n * 10) / 10;
const fmt = (n: number) => `${r1(n)}`;
const pctR = (n: number) => Math.round(n);

/** "1 de cada 5 manos" for a 19 % range, etc. */
export function oneInN(pct: number): string {
  if (pct <= 0) return 'casi nunca';
  if (pct >= 95) return 'casi todas las manos';
  const n = Math.max(2, Math.round(100 / pct));
  return `1 de cada ${n} manos`;
}

const uid = (p: string) => `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

function randomCard(exclude: Card[] = []): Card {
  let c: Card;
  do {
    c = { rank: pick(RANKS), suit: pick(SUITS) };
  } while (exclude.some(e => e.rank === c.rank && e.suit === c.suit));
  return c;
}

export function randomCards(n: number, exclude: Card[] = []): Card[] {
  const result: Card[] = [];
  const ex = [...exclude];
  for (let i = 0; i < n; i++) {
    const card = randomCard(ex);
    result.push(card);
    ex.push(card);
  }
  return result;
}

/** "KJo" / "87s" / "AA" -> two concrete cards (avoiding `exclude`). */
export function handLabelToCards(handLabel: string, exclude: Card[] = []): [Card, Card] {
  const r1c = handLabel[0] as Rank;
  const r2c = handLabel[1] as Rank;
  const suited = handLabel.endsWith('s');
  const free = (r: Rank, s: Suit) => !exclude.some(e => e.rank === r && e.suit === s);
  for (let i = 0; i < 50; i++) {
    const shuffled = [...SUITS].sort(() => Math.random() - 0.5);
    const s1 = shuffled[0];
    const s2 = suited ? s1 : shuffled[1];
    if (free(r1c, s1) && free(r2c, s2)) return [{ rank: r1c, suit: s1 }, { rank: r2c, suit: s2 }];
  }
  return [{ rank: r1c, suit: 's' }, { rank: r2c, suit: suited ? 's' : 'h' }];
}

const POSTFLOP_ORDER: Position[] = ['SB', 'BB', 'UTG', 'HJ', 'CO', 'BTN'];

/** True when p1 acts after p2 postflop. */
export function isPlayerInPosition(p1: Position, p2: Position): boolean {
  return POSTFLOP_ORDER.indexOf(p1) > POSTFLOP_ORDER.indexOf(p2);
}

/** Preflop: true if `a` acts before `b`. */
const actsBefore = (a: Position, b: Position) => CLOCKWISE_POSITIONS.indexOf(a) < CLOCKWISE_POSITIONS.indexOf(b);

/**
 * Six seats rotated clockwise with Hero at seat 0.
 * prior = chips put in on earlier streets, street = chips in front of each player now.
 */
export function buildRotated6MaxPlayers(
  heroPos: Position,
  street: Partial<Record<Position, number>>,
  folded: Position[],
  heroCards?: [Card, Card],
  prior: Partial<Record<Position, number>> = {},
  shownCards: Partial<Record<Position, [Card, Card]>> = {}
): PlayerState[] {
  const heroIndex = CLOCKWISE_POSITIONS.indexOf(heroPos);
  const players: PlayerState[] = [];
  for (let i = 0; i < 6; i++) {
    const pos = CLOCKWISE_POSITIONS[(heroIndex + i) % 6];
    const isHero = i === 0;
    const bet = street[pos] || 0;
    const before = prior[pos] || 0;
    players.push({
      id: `seat_${i}_${pos.toLowerCase()}`,
      position: pos,
      isHero,
      isDealer: pos === 'BTN',
      stack: r1(100 - before - bet),
      currentBet: bet,
      totalInvestedHand: r1(before + bet),
      status: isHero ? 'hero' : folded.includes(pos) ? 'folded' : 'active',
      cards: isHero ? heroCards : shownCards[pos]
    });
  }
  return players;
}

const sum = (m: Partial<Record<Position, number>>) => r1(Object.values(m).reduce((a, b) => a + (b || 0), 0));

// ---------------------------------------------------------------------------
// Options & verdicts
// ---------------------------------------------------------------------------

interface OptionDef { id: string; label: string; amountBB?: number; freq: number }

/** Any action played at least this often is a correct answer. */
export const CORRECT_FREQ = 25;

/**
 * Honest grades, no invented EV:
 * top frequency = Mejor, any other action ≥25 % = Válida, 1-24 % = Imprecisa,
 * never played = Error, or Grave when `severe` lists it (an obvious mistake).
 */
export function buildOptions(defs: OptionDef[], severe: string[] = []): DecisionOption[] {
  const max = Math.max(...defs.map(d => d.freq));
  return defs.map(d => {
    let grade: Grade;
    if (d.freq === max && max > 0) grade = 'best';
    else if (d.freq >= CORRECT_FREQ) grade = 'valid';
    else if (d.freq > 0) grade = 'imprecise';
    else grade = severe.includes(d.id) ? 'blunder' : 'error';
    const verdict = grade === 'best' || grade === 'valid' ? 'optimal' : grade === 'imprecise' ? 'mixed' : 'error';
    return {
      id: d.id,
      label: d.label,
      amountBB: d.amountBB,
      isCorrect: verdict === 'optimal',
      verdict,
      grade,
      frequencyGTO: d.freq
    };
  });
}

/** Base rating of each concept (Lichess-like puzzle rating of an average spot). */
export const CONCEPT_BASE: Record<ConceptId, number> = {
  rfi_early: 1250, rfi_late: 1300, bb_def: 1400, sb_3b: 1400, vs3b: 1550,
  cbet: 1450, flop_def: 1500, turn: 1600, river: 1650,
  m_odds: 1250, m_outs: 1350, m_ev: 1450, m_mdf: 1350, m_bluff: 1450, m_combos: 1500, m_equity: 1600
};

/**
 * Spot rating: concept base + closeness to the frontier.
 * A minority action at 1-24 % is the trap (+8 per point, up to +200);
 * two valid actions are easier to hit; `obvious` spots (deep inside a region) are much easier.
 */
export function spotDifficulty(concept: ConceptId, defs: { freq: number }[], obvious: boolean, extra = 0): number {
  const sorted = defs.map(d => d.freq).sort((a, b) => b - a);
  const second = sorted[1] || 0;
  let d = CONCEPT_BASE[concept] + extra;
  if (second > 0 && second < CORRECT_FREQ) d += second * 8;
  else if (second >= CORRECT_FREQ) d += 40;
  else if (obvious) d -= 170;
  else d += 60;
  return Math.max(900, Math.min(2100, Math.round(d)));
}

export const ACTION_ES: Record<string, string> = {
  fold: 'Tirar', call: 'Pagar', raise: 'Subir', check: 'Pasar', bet_small: 'Apuesta peq.',
  bet_big: 'Apuesta grande', '3bet': 'Resubir', '4bet': 'Resubir', jam: 'All-in', limp: 'Completar'
};

/** "Paga." / "Check o apuesta peq." from the correct options, most frequent first. */
function verdictText(defs: OptionDef[]): string {
  const ok = [...defs].sort((a, b) => b.freq - a.freq).filter((d, i) => i === 0 || d.freq >= CORRECT_FREQ);
  const words = ok.map(d => (d.id === 'call' ? 'paga' : d.id === 'fold' ? 'tira' : d.id === 'raise' ? 'sube' : ACTION_ES[d.id].toLowerCase()));
  if (ok.length >= 3) return 'Las tres valen.';
  const s = words.join(' o ');
  return s.charAt(0).toUpperCase() + s.slice(1) + (s.endsWith('.') ? '' : '.');
}

/** "Pagar 60 % · Tirar 40 %: ambas valen" when two or more actions are correct, else null. */
export function mixedLine(options: DecisionOption[]): string | null {
  const ok = options.filter(o => o.frequencyGTO >= CORRECT_FREQ).sort((a, b) => b.frequencyGTO - a.frequencyGTO);
  if (ok.length < 2) return null;
  const parts = ok.map(o => `${ACTION_ES[o.id] || o.label} ${o.frequencyGTO} %`);
  return `${parts.join(' · ')}: ${ok.length === 2 ? 'ambas valen' : 'las tres valen'}`;
}

// ---------------------------------------------------------------------------
// Hand sampling
// ---------------------------------------------------------------------------

const TRASH = new Set(['72o', '83o', '94o', 'T2o', 'J3o', 'Q2o', '62o', '84o', '93o', 'J4o', 'T3o', '52o']);

function isBorderline(f: HandFrequency): boolean {
  return Math.max(f.raise, f.call, f.fold) < 100;
}

/** Level 1 = mostly clear hands; level 4 = almost only mixed/borderline hands. */
function sampleHand(matrix: RangeMatrix, level: PedagogicalLevel, filter?: (h: string, f: HandFrequency) => boolean): string {
  const borderlineW = [1, 3, 6, 12][level - 1];
  const pool: { h: string; w: number }[] = [];
  for (const h of ALL_HANDS) {
    const f = getHandFrequency(matrix, h);
    if (filter && !filter(h, f)) continue;
    let w: number;
    if (isBorderline(f)) w = borderlineW;
    else if (f.fold < 100) w = level >= 4 ? 0.3 : 1.5;
    else w = TRASH.has(h) ? (level === 1 ? 0.6 : 0.1) : (level >= 4 ? 0.1 : 0.4);
    pool.push({ h, w });
  }
  if (!pool.length) return pick(ALL_HANDS);
  return weighted(pool.map(p => [p.h, p.w] as [string, number]));
}

// ---------------------------------------------------------------------------
// Postflop decision tables
// ---------------------------------------------------------------------------

type Triple = [number, number, number];

/** Rounds to 5 and makes the triple add up to 100. */
function norm(t: Triple): Triple {
  const c = t.map(v => Math.max(0, v));
  const s = c[0] + c[1] + c[2] || 1;
  const r = c.map(v => Math.round((v / s) * 20) * 5) as Triple;
  const diff = 100 - (r[0] + r[1] + r[2]);
  const iMax = r.indexOf(Math.max(...r));
  r[iMax] += diff;
  return r;
}

interface FacingCtx {
  cls: StrengthClass;
  betFrac: number;
  street: Street;
  need: number;
  /** Equity of hitting on the next card (draws). */
  drawEq: number;
  outs: number;
  lowSpr: boolean;
  vsRaise: boolean;
}

/** Frequencies [fold, call, raise] when facing a bet or a raise. */
function facingFreq(c: FacingCtx): Triple {
  const big = c.betFrac > 0.6;
  const river = c.street === 'river';
  switch (c.cls) {
    case 'monster': return c.lowSpr ? [0, 20, 80] : [0, 40, 60];
    case 'strong':
      if (c.vsRaise) return [10, 75, 15];
      return c.lowSpr ? [0, 40, 60] : [0, 80, 20];
    case 'medium':
      if (c.vsRaise) return [55, 45, 0];
      return big ? (river ? [45, 55, 0] : [30, 65, 5]) : [10, 85, 5];
    case 'weak':
      if (c.vsRaise) return [90, 10, 0];
      return big ? [80, 20, 0] : c.betFrac >= 0.45 ? [60, 40, 0] : [35, 60, 5];
    case 'draw':
    case 'weakdraw': {
      if (river) return [95, 0, 5];
      const implied = c.drawEq + (c.lowSpr ? 0 : c.cls === 'draw' ? 6 : 3);
      if (implied >= c.need) {
        if (c.cls === 'draw') return c.outs >= 12 && !c.vsRaise ? [0, 45, 55] : [5, 70, 25];
        return [20, 70, 10];
      }
      if (implied >= c.need - 5) return [50, 45, 5];
      return [85, 10, 5];
    }
    default: return river || big || c.vsRaise ? [90, 0, 10] : [75, 10, 15];
  }
}

/** Frequencies [check, betSmall, betBig] for hero's lead (c-bet, barrel or probe). */
function leadFreq(cls: StrengthClass, wet: boolean, street: Street): Triple {
  if (street === 'river') {
    switch (cls) {
      case 'monster': return [5, 25, 70];
      case 'strong': return [35, 45, 20];
      case 'medium': return [80, 20, 0];
      case 'weak': return [90, 10, 0];
      default: return [65, 0, 35];
    }
  }
  if (street === 'turn') {
    switch (cls) {
      case 'monster': return [10, 20, 70];
      case 'strong': return [25, 25, 50];
      case 'medium': return [65, 30, 5];
      case 'weak': return [85, 15, 0];
      case 'draw': return [30, 10, 60];
      case 'weakdraw': return [60, 10, 30];
      default: return [75, 0, 25];
    }
  }
  switch (cls) {
    case 'monster': return [15, 25, 60];
    case 'strong': return wet ? [20, 30, 50] : [25, 65, 10];
    case 'medium': return wet ? [60, 35, 5] : [30, 65, 5];
    case 'weak': return wet ? [80, 20, 0] : [45, 55, 0];
    case 'draw': return [25, 25, 50];
    case 'weakdraw': return wet ? [50, 40, 10] : [30, 65, 5];
    default: return wet ? [75, 15, 10] : [40, 55, 5];
  }
}

interface LeadCtx {
  cls: StrengthClass;
  street: Street;
  wet: boolean;
  /** Board advantage for hero: +1 hero's range hits more, -1 villain's does. */
  adv: number;
  ip: boolean;
  lowSpr: boolean;
  /** Hero bets without being the last aggressor (probe/donk). */
  probe: boolean;
}

function adjustedLeadFreq(c: LeadCtx): Triple {
  let [chk, sm, bg] = leadFreq(c.cls, c.wet, c.street);
  const bluffish = c.cls === 'air' || c.cls === 'weak' || c.cls === 'medium' || c.cls === 'weakdraw';
  if (c.lowSpr && (c.cls === 'strong' || c.cls === 'monster')) return [10, 0, 90];
  if (c.street === 'flop' && !c.probe && bluffish) {
    if (c.adv > 0) { const m = Math.min(20, chk); chk -= m; sm += m; }
    if (c.adv < 0) { const m = Math.min(20, sm); sm -= m; chk += m; const b = Math.min(10, bg); bg -= b; chk += b; }
  }
  if (!c.ip && c.cls !== 'monster') { const m = Math.min(10, sm); sm -= m; chk += m; }
  if (c.probe && c.cls !== 'monster' && c.cls !== 'strong') {
    const s2 = Math.round(sm * 0.6); const b2 = Math.round(bg * 0.6);
    chk += sm - s2 + bg - b2; sm = s2; bg = b2;
  }
  return norm([chk, sm, bg]);
}

// ---------------------------------------------------------------------------
// Full hand scenario
// ---------------------------------------------------------------------------

export interface ScenarioOptions {
  positions?: Position[];
}

const SPOTS_BY_LEVEL: Record<PedagogicalLevel, SpotType[]> = {
  1: ['RFI_OPEN', 'BB_DEFENSE'],
  2: ['RFI_OPEN', 'BB_DEFENSE', 'SB_VS_OPEN', 'CBET_FLOP', 'FACING_CBET'],
  3: ['RFI_OPEN', 'BB_DEFENSE', 'SB_VS_OPEN', '3BET_POT', 'CBET_FLOP', 'FACING_CBET', 'TURN_RIVER_DECISION'],
  4: ['RFI_OPEN', 'BB_DEFENSE', 'SB_VS_OPEN', '3BET_POT', 'CBET_FLOP', 'FACING_CBET', 'TURN_RIVER_DECISION']
};

/** Hero positions that can play each spot. */
const SPOT_HERO_POSITIONS: Record<string, Position[]> = {
  RFI_OPEN: ['UTG', 'HJ', 'CO', 'BTN', 'SB'],
  BB_DEFENSE: ['BB'],
  SB_VS_OPEN: ['SB'],
  '3BET_POT': ['UTG', 'HJ', 'CO', 'BTN'],
  CBET_FLOP: ['UTG', 'HJ', 'CO', 'BTN', 'SB'],
  FACING_CBET: ['BB'],
  TURN_RIVER_DECISION: ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB']
};

interface PreflopLine {
  heroPos: Position;
  villainPos: Position;
  /** Extra players still in the pot (multiway). */
  others?: Position[];
  heroAggressor: boolean;
  /** Chips each player has in after preflop. */
  invested: Partial<Record<Position, number>>;
  /** Preflop spot the hand started from (for review keys). */
  spot: SpotType;
}

interface PreflopForce { villainPos?: Position; hand?: string }

export function generateFullHandScenario(
  level: PedagogicalLevel = 2,
  forcedSpot?: SpotType,
  opts: ScenarioOptions = {},
  force: PreflopForce = {}
): FullHandScenario {
  const allowed = opts.positions && opts.positions.length ? opts.positions : CLOCKWISE_POSITIONS;
  let pool = SPOTS_BY_LEVEL[level].filter(s => SPOT_HERO_POSITIONS[s].some(p => allowed.includes(p)));
  if (!pool.length) pool = SPOTS_BY_LEVEL[level];
  const spot: SpotType = forcedSpot && forcedSpot !== 'POT_ODDS_DRILL' ? forcedSpot : pick(pool);
  let heroChoices = SPOT_HERO_POSITIONS[spot].filter(p => allowed.includes(p));
  if (!heroChoices.length) heroChoices = SPOT_HERO_POSITIONS[spot];
  let heroPos = pick(heroChoices);
  // postflop-focused spots start from a preflop line where hero continues
  const wantsPostflop = spot === 'CBET_FLOP' || spot === 'FACING_CBET' || spot === 'TURN_RIVER_DECISION';
  let preSpot: SpotType = spot;
  if (wantsPostflop) {
    if (heroPos === 'BB') preSpot = 'BB_DEFENSE';
    else if (spot === 'CBET_FLOP' || heroPos === 'SB') preSpot = heroPos === 'SB' && Math.random() < 0.5 ? 'SB_VS_OPEN' : 'RFI_OPEN';
    else preSpot = Math.random() < 0.7 ? 'RFI_OPEN' : '3BET_POT';
  }
  if (preSpot === 'SB_VS_OPEN') heroPos = 'SB';
  if (preSpot === 'BB_DEFENSE') heroPos = 'BB';
  if (preSpot === '3BET_POT' && heroPos === 'SB') heroPos = 'BTN';

  const step = buildPreflopStep(preSpot, heroPos, level, wantsPostflop, force);
  return {
    id: uid('hand'),
    title: step.contextNotice,
    pedagogicalLevel: level,
    spotType: preSpot,
    steps: [step]
  };
}

/** Plays a hand by following step.advance with `choose` (default: a random correct option). */
export function walkHand(first: HandStep, choose?: (s: HandStep) => string | null, max = 12): { steps: HandStep[]; note?: string } {
  const steps: HandStep[] = [first];
  let cur: HandStep | null = first;
  let note: string | undefined;
  while (cur && steps.length <= max) {
    const id = choose ? choose(cur) : pick(cur.options.filter(o => o.isCorrect)).id;
    if (!id || !cur.advance) break;
    const res: StepAdvance = cur.advance(id);
    note = res.note;
    cur = res.next;
    if (cur) steps.push(cur);
  }
  return { steps, note };
}

function rangeShare(matrix: RangeMatrix, hands: (h: string) => number): number {
  let w = 0;
  let total = 0;
  for (const h of ALL_HANDS) {
    const base = hands(h);
    if (!base) continue;
    const f = getHandFrequency(matrix, h);
    total += handCombos(h) * base;
    w += handCombos(h) * base * (f.raise + f.call) / 100;
  }
  return total ? Math.round((w / total) * 100) : 0;
}

/** Row/col of a hand label in the 13×13 matrix. */
export function handCell(h: string): [number, number] {
  const ORDER = 'AKQJT98765432';
  const a = ORDER.indexOf(h[0]);
  const b = ORDER.indexOf(h[1]);
  if (h.length === 2) return [a, a];
  return h.endsWith('s') ? [a, b] : [b, a];
}

function dominant(f: HandFrequency): 'raise' | 'call' | 'fold' {
  if (f.raise >= f.call && f.raise >= f.fold) return 'raise';
  return f.call >= f.fold ? 'call' : 'fold';
}

/** True when the hand and its 8 neighbours all play the same pure action (far from the frontier). */
function isInterior(matrix: RangeMatrix, hand: string, onlyFrom?: RangeMatrix): boolean {
  const f = getHandFrequency(matrix, hand);
  const dom = dominant(f);
  if (Math.max(f.raise, f.call, f.fold) < 100) return false;
  const [r, c] = handCell(hand);
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    const rr = r + dr, cc = c + dc;
    if ((!dr && !dc) || rr < 0 || cc < 0 || rr > 12 || cc > 12) continue;
    const h = getHandLabel(rr, cc);
    if (onlyFrom && getHandFrequency(onlyFrom, h).raise < 50) continue;
    const g = getHandFrequency(matrix, h);
    if (dominant(g) !== dom || Math.max(g.raise, g.call, g.fold) < 100) return false;
  }
  return true;
}

/**
 * A hand near `hand` (≤2 cells away in the matrix) with the same best action and a similar
 * frequency: the concept, not the exact hand. Falls back to `hand`.
 */
export function neighbourHand(matrix: RangeMatrix, hand: string, onlyFrom?: RangeMatrix): string {
  const f = getHandFrequency(matrix, hand);
  const dom = dominant(f);
  const top = Math.max(f.raise, f.call, f.fold);
  const [r, c] = handCell(hand);
  for (const radius of [1, 2]) {
    const pool: string[] = [];
    for (let dr = -radius; dr <= radius; dr++) for (let dc = -radius; dc <= radius; dc++) {
      const rr = r + dr, cc = c + dc;
      if ((!dr && !dc) || rr < 0 || cc < 0 || rr > 12 || cc > 12) continue;
      const h = getHandLabel(rr, cc);
      if (onlyFrom && getHandFrequency(onlyFrom, h).raise < 50) continue;
      const g = getHandFrequency(matrix, h);
      if (dominant(g) !== dom) continue;
      if (Math.abs(Math.max(g.raise, g.call, g.fold) - top) > 15) continue;
      pool.push(h);
    }
    if (pool.length) return pick(pool);
  }
  return hand;
}

/** "entra" / "queda fuera" / "sube 60 %" for an open. */
function openWord(f: HandFrequency): string {
  if (f.raise >= 100) return 'entra';
  if (f.raise <= 0) return 'queda fuera';
  return `es frontera (sube ${f.raise} %)`;
}

/** Text for defending frequencies: "paga", "hace 3-bet", "foldea", "paga 60 % / 3-bet 40 %". */
function defendWord(f: HandFrequency, raiseName: string): string {
  const parts: [string, number][] = ([['paga', f.call], [raiseName, f.raise], ['foldea', f.fold]] as [string, number][])
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);
  if (parts.length === 1) return parts[0][0];
  return parts.map(([n, v]) => `${n} ${v} %`).join(' / ');
}

const PREMIUM = new Set(['AA', 'KK', 'QQ', 'JJ', 'AKs', 'AKo', 'AQs']);
const PREMIUM_4B = new Set(['AA', 'KK', 'QQ', 'AKs', 'AKo']);
const LATE: Position[] = ['CO', 'BTN', 'SB'];

/** "bloquea AA/AK" for Ax / suited Kx that are not value hands, else null. */
function preBlocker(hand: string): string | null {
  if (PREMIUM.has(hand) || hand[0] === hand[1]) return null;
  if (hand[0] === 'A') return 'bloquea AA/AK';
  if (hand[0] === 'K' && hand.endsWith('s')) return 'bloquea KK/AK';
  return null;
}

/** Plan row for a preflop spot: the reason behind the most frequent action, no percentages. */
function prePlan(spot: SpotType, heroPos: Position, hand: string, f: HandFrequency, early: Position | null): string {
  const top = dominant(f);
  const border = Math.max(f.raise, f.call, f.fold) < 75;
  if (spot === 'RFI_OPEN') {
    if (top === 'raise') {
      if (PREMIUM.has(hand)) return 'Valor: abre y construye bote';
      if (border) return 'Frontera: abrir o fold, ambas cerca';
      return LATE.includes(heroPos) ? 'Robo: las ciegas foldean mucho' : 'Abre: aguanta a 5 jugadores detrás';
    }
    if (early) return `Fold: demasiados detrás; ábrela desde ${early}`;
    return 'Fold: jugaría dominada';
  }
  const value = spot === '3BET_POT' ? PREMIUM_4B.has(hand) : PREMIUM.has(hand);
  if (top === 'raise') {
    if (value) return 'Valor: te pagan peores';
    const blk = preBlocker(hand);
    if (blk) return `Farol con bloqueador: ${blk}`;
    return 'Presión: fold equity y jugabilidad';
  }
  if (top === 'call') {
    if (spot === 'BB_DEFENSE') return 'Pagar: buen precio, ya tienes 1 BB dentro';
    if (spot === '3BET_POT' && isPlayerInPosition(heroPos, 'BB')) return 'Pagar: posición y jugabilidad';
    return 'Pagar: demasiado buena para foldear, poca para subir';
  }
  if (spot === 'SB_VS_OPEN') return 'Fold: desde SB no hay call, y no llega a 3-bet';
  return 'Fold: dominada por su rango';
}

const oddsRow = (call: number, pot: number): DetailRow => ({ k: 'odds', label: 'Para pagar', value: `pagas ${fmt(call)} · necesitas ${pctR(calculatePotOddsPct(call, pot))} %` });

function buildPreflopStep(
  spot: SpotType,
  heroPos: Position,
  level: PedagogicalLevel,
  mustContinue: boolean,
  force: PreflopForce = {}
): HandStep {
  const bets: Partial<Record<Position, number>> = { SB: 0.5, BB: 1 };
  const folded: Position[] = [];
  let villainPos: Position = 'BB';
  let matrix: RangeMatrix;
  let defs: OptionDef[] = [];
  let context = '';
  let ticker = '';
  let why = '';
  let hand = '';
  let trivial = false;
  let detail: DetailRow[] = [];
  /** Builds what happens after a correct option. */
  let onAnswer: (id: string, heroCards: [Card, Card], board: Card[]) => StepAdvance = () => ({ next: null });

  const foldAllBefore = (until: Position, except: Position[] = []) => {
    CLOCKWISE_POSITIONS.forEach(p => {
      if (actsBefore(p, until) && !except.includes(p) && p !== heroPos) folded.push(p);
    });
  };
  const toPost = (line: PreflopLine, heroCards: [Card, Card], board: Card[]): StepAdvance =>
    ({ next: firstPostflopDecision(line, heroCards, board, level) });

  const settleOpen = (heroPos: Position, open: number, heroCards: [Card, Card], board: Card[], spot: SpotType): StepAdvance => {
    const invested: Partial<Record<Position, number>> = { [heroPos]: open, SB: heroPos === 'SB' ? open : 0.5, BB: heroPos === 'BB' ? open : 1 };
    const others: Position[] = [];
    let callers = 0;
    for (const p of afterPre(heroPos)) {
      const act = samplePopulation({ pos: p, raiseTo: open, betIn: p === 'SB' ? 0.5 : p === 'BB' ? 1 : 0, raises: 1, openPos: heroPos, callers, limpers: 0 });
      if (act === 'raise') return { next: null, note: `${p} 3-betea` };
      if (act === 'call' || act === 'limp') { invested[p] = open; others.push(p); callers++; }
    }
    if (!others.length) return { next: null, note: 'Foldean: ganas el bote' };
    const villainPos = others[others.length - 1];
    const rest = others.filter(p => p !== villainPos);
    return toPost({ heroPos, villainPos, others: rest, heroAggressor: true, invested, spot }, heroCards, board);
  };


  if (spot === 'RFI_OPEN') {
    matrix = getPreflopMatrix('RFI', heroPos);
    foldAllBefore(heroPos);
    const open = heroPos === 'SB' ? 3 : 2.5;
    hand = force.hand || sampleHand(matrix, level, mustContinue ? (_h, f) => f.raise >= 50 : undefined);
    const f = getHandFrequency(matrix, hand);
    // limping is never part of this strategy (SB is raise-or-fold too): always an error
    const limp = heroPos === 'SB' ? 0.5 : 1;
    defs = [
      { id: 'fold', label: 'TIRAR', freq: f.fold },
      { id: 'limp', label: heroPos === 'SB' ? 'COMPLETAR 0.5 BB' : 'COMPLETAR 1 BB', amountBB: limp, freq: 0 },
      { id: 'raise', label: `SUBIR ${fmt(open)} BB`, amountBB: open, freq: f.raise }
    ];
    context = `Acción en ti (${heroPos})`;
    ticker = folded.length ? `Foldean ${folded.join(', ')}` : 'Primero en hablar';
    const pct = getRangeStats(matrix).percentage;
    const early = earliestOpenPosition(hand);
    const extra = f.raise <= 0 && early ? ` (se abre desde ${early})` : '';
    why = `${heroPos} sube con ${oneInN(pct)} (${pctR(pct)} %): ${hand} ${openWord(f)}${extra}.`;
    detail = [
      { k: 'range', label: 'Rango', value: `${heroPos} sube con ${oneInN(pct)} (${pctR(pct)} %) · nunca completa` },
      { k: 'hand', label: 'Tu mano', value: `${hand} · ${f.raise >= 100 ? 'dentro' : f.raise <= 0 ? 'fuera' : 'frontera'}` },
      { k: 'plan', label: 'Plan', value: prePlan(spot, heroPos, hand, f, early) }
    ];
    trivial = f.fold >= 100 && !early;
    onAnswer = (id, heroCards, board) => {
      if (id !== 'raise') return { next: null };
      return settleOpen(heroPos, open, heroCards, board, spot);
    };
    villainPos = 'BB';
  } else if (spot === 'BB_DEFENSE') {
    villainPos = force.villainPos || pick(['UTG', 'HJ', 'CO', 'BTN', 'BTN', 'SB'] as Position[]);
    matrix = getPreflopMatrix('VS_OPEN', 'BB', villainPos);
    const open = villainPos === 'SB' ? 3 : 2.5;
    let caller: Position | undefined;
    if (!force.villainPos && villainPos !== 'SB' && Math.random() < 0.34) {
      const between = CLOCKWISE_POSITIONS.filter(p => actsBefore(villainPos, p) && actsBefore(p, 'BB'));
      if (between.length) caller = pick(between);
    }
    CLOCKWISE_POSITIONS.forEach(p => { if (p !== villainPos && p !== 'BB' && p !== caller) folded.push(p); });
    bets[villainPos] = open;
    if (caller) bets[caller] = open;
    const threeBet = r1((villainPos === 'SB' ? 9 : 11) + (caller ? 3 : 0));
    hand = force.hand || sampleHand(matrix, level, mustContinue ? (_h, f) => f.call >= 50 : undefined);
    const f = getHandFrequency(matrix, hand);
    defs = [
      { id: 'fold', label: 'TIRAR', freq: f.fold },
      { id: 'call', label: `PAGAR ${fmt(open - 1)} BB`, amountBB: r1(open - 1), freq: f.call },
      { id: '3bet', label: `RESUBIR ${fmt(threeBet)} BB`, amountBB: threeBet, freq: f.raise }
    ];
    context = caller ? `${villainPos} abre · ${caller} paga` : `${villainPos} abre a ${fmt(open)} BB`;
    ticker = caller ? `${villainPos} abre · ${caller} paga · acción en BB` : villainPos === 'SB' ? 'Foldean hasta SB' : `${villainPos} abre · resto foldea`;
    const pot = sum(bets);
    const call = r1(open - 1);
    const need = calculatePotOddsPct(call, pot);
    why = `Bote ${fmt(pot)} BB, pagas ${fmt(call)} → necesitas ${pctR(need)} %. BB defiende el ${pctR(getRangeStats(matrix).percentage)} % vs ${villainPos}: ${hand} ${defendWord(f, '3-bet')}.`;
    detail = [
      oddsRow(call, pot),
      { k: 'hand', label: 'Tu mano', value: `${hand} · ${preBlocker(hand) || `BB defiende el ${pctR(getRangeStats(matrix).percentage)} %`}` },
      { k: 'plan', label: 'Plan', value: prePlan(spot, 'BB', hand, f, null) }
    ];
    onAnswer = (id, heroCards, board) => {
      const v = villainPos;
      const extras = caller ? { others: [caller] as Position[] } : {};
      if (id === 'call') {
        const invested: Partial<Record<Position, number>> = { [v]: open, BB: open };
        if (v !== 'SB') invested.SB = 0.5;
        if (caller) invested[caller] = open;
        return toPost({ heroPos: 'BB', villainPos: v, heroAggressor: false, invested, spot, ...extras }, heroCards, board);
      }
      if (id === '3bet') {
        if (Math.random() < 0.5) return { next: null, note: caller ? `${v} y ${caller} foldean al 3-bet` : `${v} foldea al 3-bet` };
        const invested: Partial<Record<Position, number>> = { [v]: threeBet, BB: threeBet };
        if (v !== 'SB') invested.SB = 0.5;
        if (caller) invested[caller] = open; // caller already in for the open, folds to squeeze often; if they stay it would be more — keep dead money
        return toPost({ heroPos: 'BB', villainPos: v, heroAggressor: true, invested, spot }, heroCards, board);
      }
      return { next: null };
    };
  } else if (spot === 'SB_VS_OPEN') {
    villainPos = force.villainPos || pick(['UTG', 'HJ', 'CO', 'BTN', 'BTN'] as Position[]);
    matrix = getPreflopMatrix('VS_OPEN', 'SB', villainPos);
    foldAllBefore('SB', [villainPos]);
    bets[villainPos] = 2.5;
    hand = force.hand || sampleHand(matrix, level, mustContinue ? (_h, f) => f.raise >= 50 : undefined);
    const f = getHandFrequency(matrix, hand);
    defs = [
      { id: 'fold', label: 'TIRAR', freq: f.fold },
      { id: 'call', label: 'PAGAR 2 BB', amountBB: 2, freq: f.call },
      { id: '3bet', label: 'RESUBIR 11 BB', amountBB: 11, freq: f.raise }
    ];
    context = `${villainPos} abre a 2.5 BB`;
    ticker = `${villainPos} abre · acción en SB`;
    why = `SB vs ${villainPos}: 3-bet o fold, sin call (3-bet el ${pctR(getRangeStats(matrix).percentage)} %). ${hand} ${defendWord(f, '3-bet')}.`;
    detail = [
      { k: 'range', label: 'Rango', value: `SB resube con ${oneInN(getRangeStats(matrix).percentage)} (${pctR(getRangeStats(matrix).percentage)} %) · casi nunca paga` },
      { k: 'hand', label: 'Tu mano', value: `${hand}${preBlocker(hand) ? ` · ${preBlocker(hand)}` : ''}` },
      { k: 'plan', label: 'Plan', value: prePlan(spot, 'SB', hand, f, null) }
    ];
    onAnswer = (id, heroCards, board) => {
      if (id !== '3bet') return { next: null };
      if (Math.random() < 0.5) return { next: null, note: `${villainPos} foldea al 3-bet` };
      return toPost({ heroPos: 'SB', villainPos, heroAggressor: true, invested: { SB: 11, [villainPos]: 11, BB: 1 }, spot }, heroCards, board);
    };
  } else {
    // 3BET_POT: hero opens, a later player 3-bets
    const laterPlayers = CLOCKWISE_POSITIONS.filter(p => actsBefore(heroPos, p));
    villainPos = force.villainPos && laterPlayers.includes(force.villainPos) ? force.villainPos : pick(laterPlayers);
    matrix = getPreflopMatrix('VS_3BET', heroPos, villainPos);
    const rfi = getPreflopMatrix('RFI', heroPos);
    foldAllBefore(heroPos);
    CLOCKWISE_POSITIONS.forEach(p => { if (actsBefore(heroPos, p) && p !== villainPos) folded.push(p); });
    const threeBet = villainPos === 'SB' || villainPos === 'BB' ? 10 : 7.5;
    bets[heroPos] = 2.5;
    bets[villainPos] = threeBet;
    // hero only holds hands he opened
    hand = force.hand || sampleHand(matrix, level, (h, f) => getHandFrequency(rfi, h).raise >= 50 && (!mustContinue || f.call >= 50));
    const f = getHandFrequency(matrix, hand);
    defs = [
      { id: 'fold', label: 'TIRAR', freq: f.fold },
      { id: 'call', label: `PAGAR ${fmt(threeBet - 2.5)} BB`, amountBB: r1(threeBet - 2.5), freq: f.call },
      { id: '4bet', label: 'RESUBIR 22 BB', amountBB: 22, freq: f.raise }
    ];
    context = `${villainPos} 3-bet a ${fmt(threeBet)} BB`;
    ticker = `Abres 2.5 · ${villainPos} 3-bet`;
    const pot = sum(bets);
    const call = r1(threeBet - 2.5);
    const ip = isPlayerInPosition(heroPos, villainPos);
    const share = rangeShare(matrix, h => getHandFrequency(rfi, h).raise / 100);
    why = `Bote ${fmt(pot)} BB, pagas ${fmt(call)} → necesitas ${pctR(calculatePotOddsPct(call, pot))} %. ${ip ? 'Con posición' : 'Sin posición'} sigues con el ${share} % de tu open: ${hand} ${defendWord(f, '4-bet')}.`;
    detail = [
      oddsRow(call, pot),
      { k: 'hand', label: 'Tu mano', value: `${hand} · ${preBlocker(hand) || `${ip ? 'con' : 'sin'} posición sigues con el ${share} %`}` },
      { k: 'plan', label: 'Plan', value: prePlan(spot, heroPos, hand, f, null) }
    ];
    onAnswer = (id, heroCards, board) => {
      const invested = (amt: number): Partial<Record<Position, number>> => {
        const m: Partial<Record<Position, number>> = { [heroPos]: amt, [villainPos]: amt };
        if (villainPos !== 'SB' && heroPos !== 'SB') m.SB = 0.5;
        if (villainPos !== 'BB') m.BB = 1;
        return m;
      };
      if (id === 'call') return toPost({ heroPos, villainPos, heroAggressor: false, invested: invested(threeBet), spot }, heroCards, board);
      if (id === '4bet') {
        if (Math.random() < 0.55) return { next: null, note: `${villainPos} foldea al 4-bet` };
        return toPost({ heroPos, villainPos, heroAggressor: true, invested: invested(22), spot }, heroCards, board);
      }
      return { next: null };
    };
  }

  const heroCards = handLabelToCards(hand);
  const board = randomCards(5, heroCards);
  const potNow = sum(bets);
  const obvious = isInterior(matrix, hand, spot === '3BET_POT' ? getPreflopMatrix('RFI', heroPos) : undefined);
  const fNow = getHandFrequency(matrix, hand);
  const severe = obvious && Math.max(fNow.raise, fNow.call, fNow.fold) >= 100 ? defs.filter(d => d.freq === 0 && d.id !== 'limp').map(d => d.id) : [];
  const options = buildOptions(defs, severe);
  const concept: ConceptId = spot === 'RFI_OPEN' ? (heroPos === 'UTG' || heroPos === 'HJ' ? 'rfi_early' : 'rfi_late')
    : spot === 'BB_DEFENSE' ? 'bb_def' : spot === 'SB_VS_OPEN' ? 'sb_3b' : 'vs3b';
  const facing = Math.max(...Object.entries(bets).filter(([p]) => p !== heroPos).map(([, v]) => v || 0));
  const toCall = r1(facing - (bets[heroPos] || 0));
  const rel = isPlayerInPosition(heroPos, villainPos) ? 'IP' : 'OOP';
  const step: HandStep = {
    id: uid('pre'),
    street: 'preflop',
    pot: potNow,
    communityCards: [],
    players: buildRotated6MaxPlayers(heroPos, bets, folded, heroCards),
    heroPosition: heroPos,
    spotType: spot,
    relativePosition: rel,
    actionTicker: ticker,
    contextNotice: context,
    prompt: 'Tu jugada',
    questionType: 'action',
    options,
    hint: {
      relativePosition: rel,
      potOddsPct: spot === 'RFI_OPEN' ? 0 : calculatePotOddsPct(toCall, potNow),
      boardTexture: 'Preflop'
    },
    why,
    detail,
    review: { kind: 'pre', spot, heroPos, villainPos: spot === 'RFI_OPEN' ? undefined : villainPos, hand },
    trivial: trivial || (obvious && fNow.fold >= 100),
    concept,
    difficulty: spotDifficulty(concept, defs, obvious),
    advance: (id: string) => {
      if (!options.find(o => o.id === id)?.isCorrect) return { next: null };
      return onAnswer(id, heroCards, board);
    }
  };
  return step;
}

// ---------------------------------------------------------------------------
// Postflop state machine
// ---------------------------------------------------------------------------

const STREETS: Street[] = ['flop', 'turn', 'river'];

interface PostState {
  line: PreflopLine;
  heroCards: [Card, Card];
  board: Card[];
  level: PedagogicalLevel;
  prior: Partial<Record<Position, number>>;
  streetIdx: number;
  /** Who bet last on the previous street: has the initiative now. */
  initiative: 'hero' | 'villain' | null;
}

function villainBetFrac(street: Street, probe: boolean): number {
  if (probe) return weighted([[0.33, 0.6], [0.5, 0.4]]);
  if (street === 'flop') return weighted([[0.33, 0.6], [0.5, 0.2], [0.75, 0.2]]);
  if (street === 'turn') return weighted([[0.5, 0.4], [0.75, 0.6]]);
  return weighted([[0.5, 0.3], [0.75, 0.5], [1, 0.2]]);
}

/** Villain's bet probability when he can act first or after hero checks. */
function villainBetProb(st: PostState, street: Street): number {
  const advForVillain = st.line.heroAggressor ? -raiserBoardAdvantage(st.board) : raiserBoardAdvantage(st.board);
  const n = 2 + (st.line.others?.length || 0);
  const cut = n >= 4 ? 0.45 : n === 3 ? 0.65 : 1;
  if (st.initiative === 'villain') {
    if (street === 'flop') return (0.6 + 0.15 * advForVillain) * cut;
    return (street === 'turn' ? 0.55 : 0.45) * cut;
  }
  if (st.initiative === 'hero') return 0.1 * (n === 2 ? 1 : 0.5); // donk into the aggressor
  return 0.4 * cut; // probe after a checked street
}

function streetCards(board: Card[], street: Street): Card[] {
  return board.slice(0, street === 'flop' ? 3 : street === 'turn' ? 4 : 5);
}

function nextStreet(st: PostState, initiative: 'hero' | 'villain' | null, streetBets: Partial<Record<Position, number>>): StepAdvance {
  const prior = { ...st.prior };
  for (const [p, v] of Object.entries(streetBets)) prior[p as Position] = r1((prior[p as Position] || 0) + (v || 0));
  if (st.streetIdx >= 2) return { next: null, note: 'Showdown' };
  return { next: streetDecision({ ...st, prior, streetIdx: st.streetIdx + 1, initiative }) };
}

function firstPostflopDecision(line: PreflopLine, heroCards: [Card, Card], board: Card[], level: PedagogicalLevel): HandStep | null {
  return streetDecision({ line, heroCards, board, level, prior: { ...line.invested }, streetIdx: 0, initiative: line.heroAggressor ? 'hero' : 'villain' });
}

/** Generates the first hero decision on the current street (villain may act first). Returns null if none. */
function streetDecision(st: PostState): HandStep | null {
  const { heroPos, villainPos } = st.line;
  const street = STREETS[st.streetIdx];
  const heroIP = isPlayerInPosition(heroPos, villainPos);
  if (heroIP) {
    const villainBets = Math.random() < villainBetProb(st, street);
    if (villainBets) return facingStep(st, villainBetFrac(street, st.initiative !== 'villain'));
    return leadStep(st, true);
  }
  return leadStep(st, false);
}

function baseInfo(st: PostState) {
  const street = STREETS[st.streetIdx];
  const cards = streetCards(st.board, street);
  const { heroPos, villainPos } = st.line;
  const potStart = sum(st.prior);
  const eff = Math.min(r1(100 - (st.prior[heroPos] || 0)), r1(100 - (st.prior[villainPos] || 0)));
  const hc = classifyHand(st.heroCards, cards);
  const spr = potStart > 0 ? r1(eff / potStart) : 99;
  const adv = (st.line.heroAggressor ? 1 : -1) * raiserBoardAdvantage(st.board);
  return { street, cards, heroPos, villainPos, potStart, eff, hc, spr, adv, texture: analyzeBoardTexture(cards), wet: isWetBoard(cards) };
}

function makeStep(
  st: PostState,
  info: ReturnType<typeof baseInfo>,
  streetBets: Partial<Record<Position, number>>,
  defs: OptionDef[],
  extra: {
    context: string; ticker: string; why: string; decision: 'lead' | 'facing' | 'raise'; toCall: number;
    plan: string;
    onAnswer: (id: string) => StepAdvance;
  }
): HandStep {
  const pot = r1(info.potStart + sum(streetBets));
  const c = info.hc.cls;
  const top = Math.max(...defs.map(d => d.freq));
  const severe: string[] = [];
  if ((c === 'monster' || c === 'strong') && extra.decision !== 'lead') severe.push('fold');
  if (extra.decision !== 'lead' && c === 'air' && info.street === 'river') severe.push('call');
  if (c === 'air' && extra.decision !== 'lead') severe.push('raise', 'jam');
  const options = buildOptions(defs, severe);
  const concept: ConceptId = info.street === 'turn' ? 'turn' : info.street === 'river' ? 'river'
    : extra.decision === 'lead' && st.initiative === 'hero' ? 'cbet' : 'flop_def';
  const obvious = top >= 90 && (c === 'monster' || (c === 'air' && extra.decision !== 'lead'));
  const bonus = (info.hc.threat ? 80 : 0) + (c === 'draw' || c === 'weakdraw' ? 50 : 0) + (extra.decision === 'raise' ? 60 : 0);
  const alive = new Set<Position>([info.heroPos, info.villainPos, ...(st.line.others || [])]);
  const folded = CLOCKWISE_POSITIONS.filter(p => !alive.has(p));
  const rel = isPlayerInPosition(info.heroPos, info.villainPos) ? 'IP' : 'OOP';
  return {
    id: uid(info.street),
    street: info.street,
    pot,
    communityCards: info.cards,
    players: buildRotated6MaxPlayers(info.heroPos, streetBets, folded, st.heroCards, st.prior),
    heroPosition: info.heroPos,
    spotType: info.street === 'flop' ? (extra.decision === 'lead' ? 'CBET_FLOP' : 'FACING_CBET') : 'TURN_RIVER_DECISION',
    relativePosition: rel,
    actionTicker: extra.ticker,
    contextNotice: extra.context,
    prompt: 'Tu jugada',
    questionType: 'action',
    options,
    hint: {
      relativePosition: rel,
      potOddsPct: extra.toCall > 0 ? calculatePotOddsPct(extra.toCall, pot) : 0,
      boardTexture: info.texture,
      spr: info.spr
    },
    why: extra.why,
    detail: [
      extra.toCall > 0 ? oddsRow(extra.toCall, pot) : { k: 'board', label: 'Mesa', value: `${info.texture} · pilas ${fmt(info.spr)} veces el bote` },
      { k: 'hand', label: 'Tu mano', value: handLine(info, st) },
      { k: 'plan', label: 'Plan', value: extra.plan.replace(/\.$/, '') }
    ],
    review: {
      kind: 'post', spot: st.line.spot, heroPos: info.heroPos, villainPos: info.villainPos,
      street: info.street, cls: info.hc.cls, decision: extra.decision, concept
    },
    concept,
    difficulty: spotDifficulty(concept, defs, obvious, bonus),
    advance: (id: string) => {
      if (!options.find(o => o.id === id)?.isCorrect) return { next: null };
      return extra.onAnswer(id);
    }
  };
}

/** "Top pair · color posible" / "Proyecto · 9 outs" / "Aire · tu A♥ quita el color máximo". */
function handLine(info: ReturnType<typeof baseInfo>, st: PostState): string {
  const c = info.hc.cls;
  const d = info.hc.draws;
  const parts = [CLASS_ES[c]];
  if (d.totalCleanOutsCount > 0 && info.street !== 'river') parts.push(`${(d.drawLabels[0] || 'mejoras').toLowerCase()} · ${d.totalCleanOutsCount} outs`);
  if (info.hc.threat) parts.push(`${THREAT_ES[info.hc.threat].toLowerCase()} posible`);
  if (c === 'air' && parts.length === 1) {
    const blk = blockerNote(st.heroCards, info.cards);
    if (blk) parts.push(blk);
  }
  return parts.join(' · ');
}

function drawSentence(info: ReturnType<typeof baseInfo>): string {
  const d = info.hc.draws;
  const name = d.drawLabels[0] || 'Mejoras';
  if (info.street === 'flop') return `${name}: ${d.totalCleanOutsCount} outs ≈ ${pctR(d.equityTurnPct)} % por carta (${pctR(d.equityRiverPct)} % al river).`;
  return `${name}: ${d.totalCleanOutsCount} outs ≈ ${pctR(d.equityTurnPct)} % al river.`;
}

// ---------------------------------------------------------------------------
// Reasons: why the action is right (value, protection, blocker bluff, pot control)
// ---------------------------------------------------------------------------

const SUIT_SYM: Record<string, string> = { s: '♠', h: '♥', d: '♦', c: '♣' };
const recentWhys: string[] = [];

/** Call when a step is shown: its reason is avoided in the next explanations. */
export function rememberWhy(why: string) {
  recentWhys.push(why);
  if (recentWhys.length > 6) recentWhys.shift();
}

/** Picks a variant that was not shown in the last few explanations. */
function say(variants: string[]): string {
  const fresh = variants.filter(v => !recentWhys.some(w => w.includes(v)));
  return pick(fresh.length ? fresh : variants);
}

const RANK_ORDER = 'AKQJT98765432';
const sortedRanks = (cards: Card[]) => [...new Set(cards.map(c => c.rank))].sort((a, b) => RANK_ORDER.indexOf(a) - RANK_ORDER.indexOf(b));

/** "tu A♥ quita el color máximo" when hero holds the nut-flush card of a suit with 2+ on board. */
function blockerNote(hero: [Card, Card], board: Card[]): string | null {
  const counts: Record<string, number> = {};
  board.forEach(c => { counts[c.suit] = (counts[c.suit] || 0) + 1; });
  for (const [suit, n] of Object.entries(counts)) {
    if (n < 2) continue;
    const onBoard = new Set(board.filter(c => c.suit === suit).map(c => c.rank));
    const nut = [...RANK_ORDER].find(r => !onBoard.has(r as Rank));
    const h = hero.find(c => c.suit === suit && c.rank === nut);
    if (h) return `tu ${h.rank}${SUIT_SYM[suit]} quita el color máximo`;
  }
  const top = sortedRanks(board)[0];
  const hb = hero.find(c => c.rank === 'A' && top !== 'A');
  if (hb && board.length >= 4) return `tu A bloquea Ax, su mejor pago`;
  return null;
}

const THREAT_ES: Record<string, string> = { escalera: 'Escalera', color: 'Color', full: 'Full' };

function leadReason(info: ReturnType<typeof baseInfo>, st: PostState, topId: string, villainChecked: boolean): string {
  const c = info.hc.cls;
  const d = info.hc.draws;
  const ranks = sortedRanks(info.cards);
  const [b1, b2] = [ranks[0], ranks[1] || ranks[0]];
  const v = info.villainPos;
  const threat = info.hc.threat ? THREAT_ES[info.hc.threat] : null;
  const clsName = CLASS_ES[c].toLowerCase();
  const betting = topId !== 'check';
  const riverMiss = info.street === 'river' && (c === 'draw' || c === 'weakdraw' || c === 'air');
  if (info.spr < 3 && (c === 'strong' || c === 'monster') && betting) return `SPR ${fmt(info.spr)}: valor, todo al centro.`;
  if (betting) {
    if (c === 'monster' || c === 'strong') {
      if (threat) return say([`Valor aunque haya ${threat.toLowerCase()} posible: pagan ${b2}x y proyectos.`, `${threat} posible, pero ganas a casi todo lo que paga.`]);
      if (info.wet) return say([`Valor y protección: ${info.texture.toLowerCase()}, cobra ya.`, `Valor y protección: cada carta gratis le da outs.`]);
      return say([`Valor: en board seco paga ${b1}x peor.`, `Valor: ${v} paga con ${b2}x y pares bajos.`, `Valor: te pagan peores ${b1}x.`]);
    }
    if (c === 'medium') return say([`Valor fino: peores ${b2}x pagan.`, `Valor fino y protección: ${clsName}.`]);
    if ((c === 'draw' || c === 'weakdraw') && !riverMiss) return say([`Semifarol: ${d.totalCleanOutsCount} outs y fold equity.`, `Semifarol: ${(d.drawLabels[0] || 'proyecto').toLowerCase()}, ganas si foldea o si ligas.`]);
    const blk = blockerNote(st.heroCards, info.cards);
    if (blk) return `Farol con bloqueador: ${blk}.`;
    if (info.adv > 0) return say([`Farol: ${b1} alta favorece tu rango.`, `Farol de rango: ${v} tiene pocas manos fuertes aquí.`]);
    if (villainChecked) return say([`Farol: ${v} pasa y su rango está capado.`, `${v} muestra debilidad: farol barato.`]);
    return say([`Farol: tu rango tiene más manos fuertes aquí.`, `Farol: sin showdown, solo ganas apostando.`]);
  }
  if (riverMiss) return say(['Proyecto fallado: sin showdown, check.', 'Proyecto fallado y sin bloqueadores: check.']);
  if (c === 'monster' || c === 'strong') {
    if (threat) return say([`${threat} posible: check, no hinches el bote.`, `Control del bote: ${threat.toLowerCase()} posible.`]);
    return say([`Check para atrapar: deja que ${v} apueste.`, `Check: ${v} farolea más si pasas.`]);
  }
  if (c === 'medium' || c === 'weak') return say([`Control del bote: ${clsName} gana a faroles, no a valor.`, `Control del bote: llega barato al showdown.`, `Showdown value: apostar solo te paga mejor.`, `Control del bote: con ${clsName} no hay peores que paguen.`]);
  if (c === 'draw' || c === 'weakdraw') return say([`Realiza equity: ${d.totalCleanOutsCount} outs gratis.`, `${d.drawLabels[0] || 'Proyecto'}: carta gratis si pasas.`]);
  return say(['Sin equity ni bloqueadores: check.', 'Nada que proteger ni bloquear: check.', `Sin pareja ni proyecto en ${ranks.join('')}: check.`, `Aire y ${v} no foldea mejor: check.`]);
}

function facingReason(info: ReturnType<typeof baseInfo>, st: PostState, topId: string, betFrac: number): string {
  const c = info.hc.cls;
  const d = info.hc.draws;
  const ranks = sortedRanks(info.cards);
  const b2 = ranks[1] || ranks[0];
  const v = info.villainPos;
  const threat = info.hc.threat ? THREAT_ES[info.hc.threat] : null;
  const clsName = CLASS_ES[c].toLowerCase();
  const riverMiss = info.street === 'river' && (c === 'draw' || c === 'weakdraw' || c === 'air');
  if (topId === 'fold') {
    if (riverMiss) return say(['Proyecto fallado: solo ganas si foldea.', 'Proyecto fallado: no ganas a nada.']);
    if (threat) return say([`${threat} posible: tu ${clsName} ya no basta.`, `Con ${threat.toLowerCase()} posible, ${clsName} es poco.`]);
    if (c === 'draw' || c === 'weakdraw') return drawSentence(info);
    return say(['Solo ganas a sus faroles y no bastan.', 'Sin outs ni showdown: fold.', `${CLASS_ES[c]}: no aguanta ${pctR(betFrac * 100)} % del bote.`]);
  }
  if (topId === 'call') {
    if (c === 'draw' || c === 'weakdraw') return drawSentence(info);
    if (threat) return say([`${threat} posible: paga, no subas.`, `Paga: con ${threat.toLowerCase()} posible, subir solo te paga mejor.`]);
    if (c === 'monster') return say([`Paga y deja que ${v} siga apostando.`, 'Slowplay: subir echa sus faroles.']);
    if (c === 'air' || riverMiss) return say(['Bluff-catcher: su rango tiene muchos faroles.', 'Paga: bloqueas parte de su valor.']);
    return say([`Bluff-catcher: ${clsName} gana a sus faroles.`, 'Paga: mucho para foldear, poco para subir.', `${CLASS_ES[c]}: suficiente vs ${pctR(betFrac * 100)} % del bote.`]);
  }
  if (c === 'draw' || c === 'weakdraw') return say([`Semifarol: ${d.totalCleanOutsCount} outs y fold equity.`, `Sube: ${(d.drawLabels[0] || 'proyecto').toLowerCase()} + fold equity.`]);
  if (c === 'air') {
    const blk = blockerNote(st.heroCards, info.cards);
    return blk ? `Farol con bloqueador: ${blk}.` : 'Farol: sin showdown, solo ganas subiendo.';
  }
  return say([`Sube por valor: ${b2}x y proyectos pagan.`, `Valor y protección: ${clsName} gana a su rango.`]);
}

/** Hero acts first on the street, or villain checked to hero. */
function leadStep(st: PostState, villainChecked: boolean): HandStep {
  const info = baseInfo(st);
  const ip = isPlayerInPosition(info.heroPos, info.villainPos);
  const probe = st.initiative !== 'hero';
  const lowSpr = info.spr < 3;
  const [chk, sm, bg] = adjustedLeadFreq({ cls: info.hc.cls, street: info.street, wet: info.wet, adv: info.adv, ip, lowSpr, probe });
  const sizeBig = r1(Math.min(info.eff, info.potStart * 0.75));
  // always a real small size below the big one (short stacks: half the stack, then all-in)
  const sizeSmall = r1(Math.max(0.5, Math.min(info.potStart * 0.33, info.eff * 0.5)));
  const same = sizeSmall >= sizeBig;
  const defs: OptionDef[] = [
    { id: 'check', label: 'PASAR', freq: chk },
    { id: 'bet_small', label: `APOSTAR ${fmt(sizeSmall)} BB`, amountBB: sizeSmall, freq: same ? 0 : sm },
    { id: 'bet_big', label: sizeBig >= info.eff ? `ALL-IN ${fmt(sizeBig)} BB` : `APOSTAR ${fmt(sizeBig)} BB`, amountBB: sizeBig, freq: same ? sm + bg : bg }
  ];

  const topId = [...defs].sort((a, b) => b.freq - a.freq)[0].id;
  const plan = leadReason(info, st, topId, villainChecked);
  const why = `${plan} → ${verdictText(defs)}`;

  const context = villainChecked ? `${info.villainPos} pasa` : probe ? `${info.street === 'flop' ? 'Flop' : info.street === 'turn' ? 'Turn' : 'River'} · hablas primero` : (info.street === 'flop' ? 'Tienes la iniciativa' : `${info.street === 'turn' ? 'Turn' : 'River'} · tienes la iniciativa`);
  const ticker = villainChecked ? `${info.villainPos} pasa · bote ${fmt(info.potStart)} BB` : `Bote ${fmt(info.potStart)} BB · hablas tú`;

  return makeStep(st, info, {}, defs, {
    context, ticker, why, plan, decision: 'lead', toCall: 0,
    onAnswer: (id) => {
      if (id === 'check') {
        if (villainChecked) return nextStreet(st, null, {});
        // hero OOP checks: villain decides
        const betP = st.initiative === 'villain' ? villainBetProb(st, info.street) : st.initiative === 'hero' ? 0.6 : 0.45;
        if (Math.random() < betP) return { next: facingStep(st, villainBetFrac(info.street, st.initiative !== 'villain'), true) };
        if (info.street === 'river') return { next: null, note: `${info.villainPos} pasa: showdown` };
        return nextStreet(st, null, {});
      }
      const amt = id === 'bet_small' ? sizeSmall : sizeBig;
      const allIn = amt >= info.eff;
      const r = Math.random();
      const foldP = amt > info.potStart * 0.5 ? 0.3 : 0.2;
      if (r < foldP) return { next: null, note: `${info.villainPos} foldea: ganas ${fmt(info.potStart)} BB` };
      // villain raises only when it leaves hero room to re-raise all-in (3 options)
      if (!allIn && amt <= info.eff * 0.3 && r < foldP + (info.street === 'river' ? 0.08 : 0.13)) {
        return { next: raiseStep(st, amt) };
      }
      if (allIn) return { next: null, note: `${info.villainPos} paga el all-in` };
      return nextStreet(st, 'hero', { [info.heroPos]: amt, [info.villainPos]: amt });
    }
  });
}

/** Villain bets (first to act or after hero's check). */
function facingStep(st: PostState, frac: number, heroChecked = false): HandStep {
  const info = baseInfo(st);
  // never a bet that puts hero all-in: hero always has fold / call / raise
  const bet = r1(Math.min(info.eff * 0.6, Math.max(1, info.potStart * frac)));
  const streetBets = { [info.villainPos]: bet };
  const pot = r1(info.potStart + bet);
  const need = calculatePotOddsPct(bet, pot);
  const lowSpr = info.spr < 3;
  const d = info.hc.draws;
  const [fo, ca, ra] = facingFreq({
    cls: info.hc.cls, betFrac: frac, street: info.street, need, drawEq: d.equityTurnPct,
    outs: d.totalCleanOutsCount, lowSpr, vsRaise: false
  });
  const raiseTo = r1(Math.min(info.eff, bet * 3));
  const allInCall = bet >= info.eff;
  const defs: OptionDef[] = [
    { id: 'fold', label: 'TIRAR', freq: fo },
    { id: 'call', label: `PAGAR ${fmt(bet)} BB`, amountBB: bet, freq: allInCall ? ca + ra : ca },
  ];
  if (!allInCall) defs.push({ id: 'raise', label: raiseTo >= info.eff ? `ALL-IN ${fmt(raiseTo)} BB` : `SUBIR ${fmt(raiseTo)} BB`, amountBB: raiseTo, freq: ra });
  const pctBet = pctR(frac * 100);
  const topId = [...defs].sort((a, b) => b.freq - a.freq)[0].id;
  const plan = facingReason(info, st, topId, frac);
  const why = `Bote ${fmt(pot)} BB, pagas ${fmt(bet)} → necesitas ${pctR(need)} %. ${plan} → ${verdictText(defs)}`;
  const context = heroChecked ? `Pasas · ${info.villainPos} apuesta ${fmt(bet)} BB` : `${info.villainPos} apuesta ${fmt(bet)} BB`;
  const ticker = `${info.villainPos} apuesta ${pctBet} % del bote`;
  return makeStep(st, info, streetBets, defs, {
    context, ticker, why, plan, decision: 'facing', toCall: bet,
    onAnswer: (id) => {
      if (id === 'call') {
        if (allInCall) return { next: null, note: 'All-in pagado' };
        return nextStreet(st, 'villain', { [info.heroPos]: bet, [info.villainPos]: bet });
      }
      if (id === 'raise') {
        if (raiseTo >= info.eff) return { next: null, note: Math.random() < 0.5 ? `${info.villainPos} foldea` : `${info.villainPos} paga el all-in` };
        if (Math.random() < 0.45) return { next: null, note: `${info.villainPos} foldea: ganas ${fmt(pot)} BB` };
        return nextStreet(st, 'hero', { [info.heroPos]: raiseTo, [info.villainPos]: raiseTo });
      }
      return { next: null };
    }
  });
}

/** Hero bet `heroBet` and villain raises (check-raise when villain is OOP). */
function raiseStep(st: PostState, heroBet: number): HandStep {
  const info = baseInfo(st);
  const raiseTo = r1(Math.min(info.eff * 0.75, heroBet * 3));
  const toCall = r1(raiseTo - heroBet);
  const streetBets = { [info.heroPos]: heroBet, [info.villainPos]: raiseTo };
  const pot = r1(info.potStart + heroBet + raiseTo);
  const need = calculatePotOddsPct(toCall, pot);
  const d = info.hc.draws;
  const [fo, ca, ra] = facingFreq({
    cls: info.hc.cls, betFrac: raiseTo / info.potStart, street: info.street, need, drawEq: d.equityTurnPct,
    outs: d.totalCleanOutsCount, lowSpr: info.spr < 3, vsRaise: true
  });
  const allInCall = raiseTo >= info.eff;
  const defs: OptionDef[] = [
    { id: 'fold', label: 'TIRAR', freq: fo },
    { id: 'call', label: `PAGAR ${fmt(toCall)} BB`, amountBB: toCall, freq: allInCall ? ca + ra : ca }
  ];
  if (!allInCall) defs.push({ id: 'jam', label: `ALL-IN ${fmt(info.eff)} BB`, amountBB: info.eff, freq: ra });
  const ip = isPlayerInPosition(info.heroPos, info.villainPos);
  const topId = [...defs].sort((a, b) => b.freq - a.freq)[0].id;
  const plan = facingReason(info, st, topId === 'jam' ? 'raise' : topId, toCall / Math.max(1, info.potStart));
  const why = `Bote ${fmt(pot)} BB, pagas ${fmt(toCall)} → necesitas ${pctR(need)} %. ${plan} → ${verdictText(defs)}`;
  return makeStep(st, info, streetBets, defs, {
    context: `${info.villainPos} ${ip ? 'sube' : 'hace check-raise'} a ${fmt(raiseTo)} BB`,
    ticker: `Apuestas ${fmt(heroBet)} · ${info.villainPos} sube`,
    why, plan, decision: 'raise', toCall,
    onAnswer: (id) => {
      if (id === 'call') {
        if (allInCall) return { next: null, note: 'All-in pagado' };
        return nextStreet(st, 'villain', { [info.heroPos]: raiseTo, [info.villainPos]: raiseTo });
      }
      if (id === 'jam') return { next: null, note: Math.random() < 0.4 ? `${info.villainPos} foldea` : `${info.villainPos} paga el all-in` };
      return { next: null };
    }
  });
}

// ---------------------------------------------------------------------------
// Math drills
// ---------------------------------------------------------------------------

function drillPlayers(heroCards: [Card, Card], villainPos: Position, bet = 0, prior = 0, shown?: [Card, Card], extra: Position[] = []): PlayerState[] {
  const active = [villainPos, ...extra];
  const folded = CLOCKWISE_POSITIONS.filter(p => p !== 'BB' && !active.includes(p));
  return buildRotated6MaxPlayers('BB', bet ? { [villainPos]: bet } : {}, folded, heroCards,
    prior ? { BB: prior, [villainPos]: prior } : {}, shown ? { [villainPos]: shown } : {});
}

export function numericOptions(correct: number, distractors: number[], suffix: string, decimals = 0, allowNegative = false): DecisionOption[] {
  const valid = (d: number) => allowNegative || d >= 0;
  const fmtN = (n: number) => `${n.toFixed(decimals)}${suffix}`;
  const seen = new Set<string>([fmtN(correct)]);
  const values = [correct];
  for (const d of distractors) {
    const k = fmtN(d);
    if (!seen.has(k) && valid(d)) { seen.add(k); values.push(d); }
    if (values.length === 3) break;
  }
  let bump = 1;
  while (values.length < 3) {
    const d = correct + Math.ceil(bump / 2) * (decimals ? 1 : 2) * (bump % 2 ? 1 : -1);
    const k = fmtN(d);
    if (!seen.has(k) && valid(d)) { seen.add(k); values.push(d); }
    bump++;
  }
  values.sort((a, b) => a - b);
  return values.map(v => {
    const ok = fmtN(v) === fmtN(correct);
    return {
      id: fmtN(v),
      label: fmtN(v),
      isCorrect: ok,
      verdict: ok ? 'optimal' : 'error',
      grade: ok ? 'best' : 'error',
      frequencyGTO: ok ? 100 : 0
    } as DecisionOption;
  });
}

const BET_FRACTIONS = [0.25, 0.33, 0.5, 0.66, 0.75, 1, 1.25, 1.5];
const drillKey = (concept: ConceptId): ReviewKey => ({ kind: 'math', spot: 'POT_ODDS_DRILL', heroPos: 'BB', concept });
/** Round fractions are easy, odd ones (66 %, 125 %) are harder. */
const fracBonus = (f: number) => ([0.5, 1].includes(f) ? -60 : [0.33, 0.75].includes(f) ? 0 : 60);
const streetOf = (n: number): Street => (n === 3 ? 'flop' : n === 4 ? 'turn' : 'river');

function drillBase(id: string, heroCards: [Card, Card], board: Card[], villain: Position, concept: ConceptId, difficulty: number) {
  return {
    id: uid(id),
    street: streetOf(board.length),
    communityCards: board,
    heroPosition: 'BB' as Position,
    spotType: 'POT_ODDS_DRILL' as SpotType,
    relativePosition: 'OOP' as const,
    review: drillKey(concept),
    concept,
    difficulty: Math.round(difficulty),
    players: drillPlayers(heroCards, villain)
  };
}

export function generatePotOddsDrill(): HandStep {
  const pot = pick([4, 6, 8, 10, 12, 15, 20, 24, 30, 40, 50, 60, 80, 100]);
  const frac = pick(BET_FRACTIONS);
  const bet = r1(pot * frac);
  const pct = (bet / (pot + 2 * bet)) * 100;
  const heroCards = randomCards(2) as [Card, Card];
  const board = randomCards(pick([3, 4, 5]), heroCards);
  const villain = pick(['UTG', 'HJ', 'CO', 'BTN', 'SB'] as Position[]);
  return {
    ...drillBase('pot_odds', heroCards, board, villain, 'm_odds', CONCEPT_BASE.m_odds + fracBonus(frac)),
    pot: r1(pot + bet),
    players: drillPlayers(heroCards, villain, bet, pot / 2),
    actionTicker: `Bote ${fmt(pot)} BB · ${villain} apuesta ${fmt(bet)} BB`,
    contextNotice: `${villain} apuesta ${fmt(bet)} en un bote de ${fmt(pot)}`,
    prompt: '¿Qué % de veces tienes que ganar para que pagar salga a cuenta?',
    questionType: 'pot_odds',
    options: numericOptions(pct, [(bet / (pot + bet)) * 100, pct + pick([4, 5, 6]), pct - pick([3, 4, 5])], ' %'),
    hint: { relativePosition: 'OOP', potOddsPct: 0, boardTexture: 'Pago / bote final' },
    why: `${fmt(bet)} / (${fmt(pot)} + ${fmt(bet)} + ${fmt(bet)}) = ${pctR(pct)} %`
  };
}

export function generateEvDrill(): HandStep {
  const pot = pick([10, 12, 16, 20, 24, 30, 40]);
  const frac = pick([0.33, 0.5, 0.75, 1]);
  const bet = r1(pot * frac);
  const eq = pick([15, 20, 25, 30, 35, 40, 45]);
  const e = eq / 100;
  const ev = e * (pot + bet) - (1 - e) * bet;
  const heroCards = randomCards(2) as [Card, Card];
  const board = randomCards(4, heroCards);
  const villain = pick(['CO', 'BTN', 'HJ'] as Position[]);
  const sign = (n: number) => (n < 0 ? `−${Math.abs(n).toFixed(1)}` : `+${n.toFixed(1)}`);
  return {
    ...drillBase('ev', heroCards, board, villain, 'm_ev', CONCEPT_BASE.m_ev + fracBonus(frac)),
    pot: r1(pot + bet),
    players: drillPlayers(heroCards, villain, bet, pot / 2),
    actionTicker: `Bote ${fmt(pot)} BB · apuesta ${fmt(bet)} BB · ganas el ${eq} %`,
    contextNotice: `Ganas el ${eq} % · pagas ${fmt(bet)} en un bote de ${fmt(pot)}`,
    prompt: 'Si pagas, ¿cuánto ganas o pierdes de media (en BB)?',
    questionType: 'ev',
    options: numericOptions(ev, [e * pot - (1 - e) * bet, e * (pot + 2 * bet) - bet, ev + 1.5, ev - 1.5], ' BB', 1, true),
    hint: { relativePosition: 'OOP', potOddsPct: calculatePotOddsPct(bet, pot + bet), boardTexture: 'EV = eq·(bote+apuesta) − (1−eq)·apuesta' },
    why: `${e.toFixed(2)} × ${fmt(pot + bet)} − ${(1 - e).toFixed(2)} × ${fmt(bet)} = ${sign(ev)} BB`
  };
}

export function generateOutsDrill(): HandStep {
  for (let tries = 0; tries < 500; tries++) {
    const cards = randomCards(7);
    const hero: [Card, Card] = [cards[0], cards[1]];
    const villain: [Card, Card] = [cards[2], cards[3]];
    const flop = cards.slice(4, 7);
    if (compareEvaluations(evaluateHand([...hero, ...flop]), evaluateHand([...villain, ...flop])) >= 0) continue;
    const outCards = countOutsVsVillain(hero, villain, flop);
    const outs = outCards.length;
    if (outs < 2 || outs > 15) continue;
    const pos = pick(['CO', 'BTN', 'HJ'] as Position[]);
    const byRank = new Map<string, number>();
    outCards.forEach(c => byRank.set(c.rank, (byRank.get(c.rank) || 0) + 1));
    const groups = [...byRank.entries()]
      .sort((a, b) => RANKS.indexOf(b[0] as Rank) - RANKS.indexOf(a[0] as Rank))
      .map(([r, n]) => `${r}×${n}`);
    return {
      ...drillBase('outs', hero, flop, pos, 'm_outs', CONCEPT_BASE.m_outs + groups.length * 25),
      pot: 12,
      players: drillPlayers(hero, pos, 0, 6, villain),
      actionTicker: `All-in en flop · ${pos} muestra`,
      contextNotice: `Vas por detrás de ${pos}`,
      prompt: '¿Cuántos outs para ir por delante en el turn?',
      questionType: 'outs',
      options: numericOptions(outs, [outs + pick([1, 2, 3]), outs - pick([1, 2]), outs + 4], ''),
      hint: { relativePosition: 'OOP', potOddsPct: 0, boardTexture: 'Cuenta solo cartas que te ponen por delante' },
      why: `${groups.join(' + ')} = ${outs} outs`
    };
  }
  return generateOutsDrill();
}

/** Minimum defence frequency: P / (P + X). */
export function generateMdfDrill(): HandStep {
  const pot = pick([6, 8, 10, 12, 16, 20, 24, 30, 40]);
  const frac = pick(BET_FRACTIONS);
  const bet = r1(pot * frac);
  const mdf = (pot / (pot + bet)) * 100;
  const heroCards = randomCards(2) as [Card, Card];
  const board = randomCards(5, heroCards);
  const villain = pick(['CO', 'BTN', 'HJ', 'UTG'] as Position[]);
  return {
    ...drillBase('mdf', heroCards, board, villain, 'm_mdf', CONCEPT_BASE.m_mdf + fracBonus(frac)),
    pot: r1(pot + bet),
    players: drillPlayers(heroCards, villain, bet, pot / 2),
    actionTicker: `River · ${villain} apuesta ${fmt(bet)} en ${fmt(pot)}`,
    contextNotice: `${villain} apuesta ${fmt(bet)} en ${fmt(pot)}`,
    prompt: '¿Qué % de tus manos tienes que pagar o subir para que farolear no le salga gratis?',
    questionType: 'mdf',
    options: numericOptions(mdf, [((pot + bet) / (pot + 2 * bet)) * 100, mdf + pick([5, 6, 7]), mdf - pick([5, 6, 7]), (pot / (pot + 2 * bet)) * 100], ' %'),
    hint: { relativePosition: 'OOP', potOddsPct: 0, boardTexture: 'Bote / (bote + apuesta)' },
    why: `Tienes que defender ${pctR(mdf)} %: ${fmt(pot)} / (${fmt(pot)} + ${fmt(bet)})`
  };
}

/** Bluff share that makes a river call break even: X / (P + 2X). */
export function generateBluffDrill(): HandStep {
  const pot = pick([8, 10, 12, 16, 20, 24, 30, 40]);
  const frac = pick(BET_FRACTIONS);
  const bet = r1(pot * frac);
  const b = (bet / (pot + 2 * bet)) * 100;
  const heroCards = randomCards(2) as [Card, Card];
  const board = randomCards(5, heroCards);
  const heroPos = pick(['CO', 'BTN', 'HJ'] as Position[]);
  const folded = CLOCKWISE_POSITIONS.filter(p => p !== heroPos && p !== 'BB');
  return {
    ...drillBase('bluff', heroCards, board, 'BB', 'm_bluff', CONCEPT_BASE.m_bluff + fracBonus(frac)),
    heroPosition: heroPos,
    relativePosition: 'IP',
    pot: r1(pot + bet),
    players: buildRotated6MaxPlayers(heroPos, { [heroPos]: bet }, folded, heroCards, { [heroPos]: pot / 2, BB: pot / 2 }),
    actionTicker: `River · apuestas ${fmt(bet)} en ${fmt(pot)}`,
    contextNotice: `Apuestas ${fmt(bet)} en un bote de ${fmt(pot)}`,
    prompt: `Apuestas ${fmt(bet)} en un bote de ${fmt(pot)}. ¿Qué % de tus apuestas pueden ser farol para que a BB le dé igual pagar?`,
    questionType: 'bluff',
    options: numericOptions(b, [(bet / (pot + bet)) * 100, b + pick([5, 6, 7]), b - pick([4, 5, 6])], ' %'),
    hint: { relativePosition: 'IP', potOddsPct: 0, boardTexture: 'Apuesta / (bote + 2·apuesta)' },
    why: `${fmt(bet)} / (${fmt(pot)} + 2×${fmt(bet)}) = ${pctR(b)} % faroles`
  };
}

const C2 = (k: number) => (k * (k - 1)) / 2;

/** Combos of a hand class after blockers (hero cards + board). */
export function countCombos(label: string, dead: Card[]): number {
  const left = (r: string) => 4 - dead.filter(c => c.rank === r).length;
  if (label.length === 2 && label[0] === label[1]) return C2(left(label[0]));
  return left(label[0]) * left(label[1]);
}

export function generateCombosDrill(): HandStep {
  for (let t = 0; t < 200; t++) {
    const heroCards = randomCards(2) as [Card, Card];
    const board = randomCards(pick([3, 4]), heroCards);
    const dead = [...heroCards, ...board];
    const known = sortedRanks(dead);
    const roll = Math.random();
    let label: string;
    if (roll < 0.35) {
      const r = pick(sortedRanks(board));
      label = r + r;
    } else if (roll < 0.55) {
      label = pick(['A', 'K', 'Q', 'J', 'T']).repeat(2);
    } else {
      const a = pick(known);
      const others = [...RANK_ORDER].filter(r => r !== a);
      const b = pick(others);
      label = RANK_ORDER.indexOf(a) < RANK_ORDER.indexOf(b) ? a + b : b + a;
    }
    const n = countCombos(label, dead);
    if (n <= 0) continue;
    const pair = label[0] === label[1];
    const left = (r: string) => 4 - dead.filter(c => c.rank === r).length;
    const blocked = pair ? left(label[0]) < 4 : left(label[0]) < 4 || left(label[1]) < 4;
    if (!blocked && Math.random() < 0.7) continue;
    const full = pair ? 6 : 16;
    const why = pair
      ? `${label[0]}: 4−${4 - left(label[0])} = ${left(label[0])} → ${left(label[0])}×${left(label[0]) - 1}/2 = ${n} combo${n === 1 ? '' : 's'}`
      : `${label[0]}: ${left(label[0])} · ${label[1]}: ${left(label[1])} → ${left(label[0])}×${left(label[1])} = ${n} combo${n === 1 ? '' : 's'}`;
    const villain = pick(['CO', 'BTN', 'HJ'] as Position[]);
    return {
      ...drillBase('combos', heroCards, board, villain, 'm_combos', CONCEPT_BASE.m_combos + (pair ? 0 : 50)),
      pot: 12,
      players: drillPlayers(heroCards, villain, 0, 6),
      actionTicker: `Bloqueadores: tus cartas y el board`,
      contextNotice: `Combinaciones de ${label} que quedan`,
      prompt: `¿Cuántas combinaciones de ${label} quedan (sin tus cartas ni la mesa)?`,
      questionType: 'combos',
      options: numericOptions(n, [full, n + (pair ? 1 : 2), n - (pair ? 1 : 3), n + 4], ''),
      hint: { relativePosition: 'OOP', potOddsPct: 0, boardTexture: 'Cartas que quedan × cartas que quedan' },
      why
    };
  }
  return generateCombosDrill();
}

/** Weighted range from a matrix (weight = raise/call frequency × combos). */
function rangeOf(matrix: RangeMatrix, use: 'open' | 'call' | 'all'): { h: string; w: number }[] {
  return ALL_HANDS.map(h => {
    const f = getHandFrequency(matrix, h);
    const w = use === 'open' ? f.raise : use === 'call' ? f.call : f.raise + f.call;
    return { h, w: (w / 100) * handCombos(h) };
  }).filter(x => x.w > 0);
}

const FULL_DECK: Card[] = RANKS.flatMap(r => SUITS.map(s => ({ rank: r, suit: s } as Card)));

/** Monte Carlo equity of `hero` vs a weighted range on `board` (0-5 cards). */
export function equityVsRange(hero: [Card, Card], board: Card[], range: { h: string; w: number }[], iters = 2500): number {
  const dead = [...hero, ...board];
  const isDead = (c: Card, extra: Card[]) => dead.some(d => d.rank === c.rank && d.suit === c.suit) || extra.some(d => d.rank === c.rank && d.suit === c.suit);
  const total = range.reduce((a, x) => a + x.w, 0);
  let win = 0;
  let n = 0;
  for (let i = 0; i < iters; i++) {
    let x = Math.random() * total;
    let label = range[range.length - 1].h;
    for (const r of range) { x -= r.w; if (x <= 0) { label = r.h; break; } }
    const v = handLabelToCards(label, dead);
    if (isDead(v[0], []) || isDead(v[1], [])) continue;
    const used = [v[0], v[1]];
    const rest: Card[] = [];
    const deck = FULL_DECK.filter(c => !isDead(c, used));
    for (let k = board.length; k < 5; k++) {
      const j = Math.floor(Math.random() * deck.length);
      rest.push(deck[j]);
      deck.splice(j, 1);
    }
    const full = [...board, ...rest];
    const cmp = compareEvaluations(evaluateHand([...hero, ...full]), evaluateHand([...v, ...full]));
    win += cmp > 0 ? 1 : cmp === 0 ? 0.5 : 0;
    n++;
  }
  return n ? (win / n) * 100 : 50;
}

export function generateEquityDrill(): HandStep {
  const villain = pick(['UTG', 'HJ', 'CO', 'BTN'] as Position[]);
  const rfi = getPreflopMatrix('RFI', villain);
  const defend = getPreflopMatrix('VS_OPEN', 'BB', villain);
  const range = rangeOf(rfi, 'open');
  const flop = Math.random() < 0.5;
  const pool = ALL_HANDS.filter(h => getHandFrequency(defend, h).call >= 50);
  const hand = pick(pool.length ? pool : ALL_HANDS);
  const heroCards = handLabelToCards(hand);
  const board = flop ? randomCards(3, heroCards) : [];
  const eq = Math.round(equityVsRange(heroCards, board, range, 2500));
  const off = pick([[-12, -6], [-6, 6], [6, 12]]);
  const pctOpen = pctR(getRangeStats(rfi).percentage);
  const vsRandom = (EQUITY_VS_RANDOM as Record<string, number>)[hand];
  const why = flop
    ? `${hand} vs la subida de ${villain} (${pctOpen} %) en este flop: ganas el ${eq} %`
    : `${hand} vs la subida de ${villain} (${pctOpen} %): ganas el ${eq} % · vs una mano al azar ${pctR(vsRandom)} %`;
  return {
    ...drillBase('equity', heroCards, board, villain, 'm_equity', CONCEPT_BASE.m_equity + (flop ? 60 : 0)),
    street: flop ? 'flop' : 'preflop',
    pot: flop ? 5.5 : 3.5,
    players: flop ? drillPlayers(heroCards, villain, 0, 2.5) : buildRotated6MaxPlayers('BB', { SB: 0, BB: 1, [villain]: 2.5 },
      CLOCKWISE_POSITIONS.filter(p => p !== 'BB' && p !== villain), heroCards),
    actionTicker: flop ? `Pagas la subida de ${villain} · flop` : `${villain} sube con ${oneInN(Number(pctOpen))} (${pctOpen} %)`,
    contextNotice: `Tu % de ganar contra las manos con las que ${villain} sube`,
    prompt: '¿Con qué % ganas contra las manos con las que sube?',
    questionType: 'equity',
    options: numericOptions(eq, [eq + off[0], eq + off[1]], ' %'),
    hint: { relativePosition: 'OOP', potOddsPct: 0, boardTexture: flop ? analyzeBoardTexture(board) : 'Preflop' },
    why
  };
}

export const MATH_GENERATORS: Partial<Record<ConceptId, () => HandStep>> = {
  m_odds: generatePotOddsDrill,
  m_outs: generateOutsDrill,
  m_ev: generateEvDrill,
  m_mdf: generateMdfDrill,
  m_bluff: generateBluffDrill,
  m_combos: generateCombosDrill,
  m_equity: generateEquityDrill
};

/** Single decision for a subcategory drill (legacy modes). */
export function generateSimulatorDrill(sub: SubcategoryId, level: PedagogicalLevel = 2, opts: ScenarioOptions = {}): HandStep {
  if (sub === 'odds') return pick([generatePotOddsDrill, generateMdfDrill, generateBluffDrill])();
  if (sub === 'equity') return pick([generateOutsDrill, generateCombosDrill, generateEquityDrill])();
  if (sub === 'ev') return generateEvDrill();
  if (sub === 'preflop') {
    const s = generateFullHandScenario(level, undefined, opts);
    return { ...s.steps[0], advance: undefined };
  }
  for (let i = 0; i < 50; i++) {
    const s = generateFullHandScenario(level, pick(['CBET_FLOP', 'FACING_CBET', 'TURN_RIVER_DECISION'] as SpotType[]), opts);
    const post = walkHand(s.steps[0]).steps.slice(1);
    if (post.length) return { ...pick(post), advance: undefined };
  }
  return { ...generateFullHandScenario(level, 'FACING_CBET', opts).steps[0], advance: undefined };
}

// ---------------------------------------------------------------------------
// Concept / leak / rating-driven generators
// ---------------------------------------------------------------------------

const POSTFLOP_CONCEPTS: ConceptId[] = ['cbet', 'flop_def', 'turn', 'river'];

/** Preflop spot that leads to postflop play from this seat. */
function preSpotForPos(pos: Position, wantPost: boolean): SpotType {
  if (pos === 'BB') return 'BB_DEFENSE';
  if (pos === 'SB') return Math.random() < 0.5 ? 'SB_VS_OPEN' : 'RFI_OPEN';
  if (pos === 'BTN') return Math.random() < (wantPost ? 0.75 : 0.7) ? 'RFI_OPEN' : '3BET_POT';
  return Math.random() < 0.7 ? 'RFI_OPEN' : '3BET_POT';
}

/** Plays hands until a hero decision matches `want`; returns it as a single step. */
function findPostflop(want: (s: HandStep) => boolean, pos: () => Position, level: PedagogicalLevel): HandStep | null {
  for (let i = 0; i < 120; i++) {
    const p = pos();
    const pre = buildPreflopStep(preSpotForPos(p, true), p, level, true);
    const steps = walkHand(pre).steps.slice(1).filter(want);
    if (steps.length) return { ...pick(steps), advance: undefined };
  }
  return null;
}

const ALL_POS = () => pick(CLOCKWISE_POSITIONS);

function conceptOnce(concept: ConceptId, level: PedagogicalLevel): HandStep {
  const gen = MATH_GENERATORS[concept];
  if (gen) return gen();
  switch (concept) {
    case 'rfi_early': return { ...buildPreflopStep('RFI_OPEN', pick(['UTG', 'HJ'] as Position[]), level, false), advance: undefined };
    case 'rfi_late': return { ...buildPreflopStep('RFI_OPEN', pick(['CO', 'BTN', 'SB'] as Position[]), level, false), advance: undefined };
    case 'bb_def': return { ...buildPreflopStep('BB_DEFENSE', 'BB', level, false), advance: undefined };
    case 'sb_3b': return { ...buildPreflopStep('SB_VS_OPEN', 'SB', level, false), advance: undefined };
    case 'vs3b': return { ...buildPreflopStep('3BET_POT', pick(['UTG', 'HJ', 'CO', 'BTN'] as Position[]), level, false), advance: undefined };
    default: {
      const pos = concept === 'cbet' ? () => pick(['UTG', 'HJ', 'CO', 'BTN', 'SB'] as Position[])
        : concept === 'flop_def' ? () => pick(['BB', 'BB', 'CO', 'BTN'] as Position[]) : ALL_POS;
      return findPostflop(s => s.concept === concept, pos, level)
        || { ...buildPreflopStep('RFI_OPEN', 'BTN', level, false), advance: undefined };
    }
  }
}

/** A single decision of `concept` close to `rating` (best of a few candidates). */
export function generateConceptStep(concept: ConceptId, rating = 1500, k = 4): HandStep {
  const level = levelForRating(rating);
  const n = MATH_GENERATORS[concept] ? 3 : POSTFLOP_CONCEPTS.includes(concept) ? 2 : k;
  const cands = Array.from({ length: n }, () => conceptOnce(concept, level));
  const s = pickNearRating(cands, rating);
  rememberWhy(s.why);
  return s;
}

export type LeakStreet = 'preflop' | 'flop' | 'turn' | 'river';

/** A decision for one cell of the leak map (seat × street). */
export function generateLeakStep(pos: Position, street: LeakStreet, rating = 1500): HandStep {
  const level = levelForRating(rating);
  if (street === 'preflop') {
    const cands = Array.from({ length: 4 }, () => ({ ...buildPreflopStep(preSpotForPos(pos, false), pos, level, false), advance: undefined }));
    return pickNearRating(cands, rating);
  }
  return findPostflop(s => s.street === street && s.heroPosition === pos, () => pos, level)
    || generateConceptStep(street === 'flop' ? 'cbet' : street, rating);
}

/** Full hand (with continuation) whose first decision is close to `rating`. */
export function generateRatedHand(rating = 1500, opts: ScenarioOptions = {}, k = 5): FullHandScenario {
  const level = levelForRating(rating);
  const cands = Array.from({ length: k }, () => generateFullHandScenario(level, undefined, opts));
  const best = pickNearRating(cands.map(c => ({ c, difficulty: c.steps[0].difficulty })), rating);
  return best.c;
}

/** Concept of a review key (also for old saved keys). */
export function conceptOfKey(key: ReviewKey): ConceptId {
  if (key.concept) return key.concept;
  if (key.kind === 'odds') return 'm_odds';
  if (key.kind === 'equity') return 'm_outs';
  if (key.kind === 'ev') return 'm_ev';
  if (key.kind === 'pre') {
    if (key.spot === 'RFI_OPEN') return key.heroPos === 'UTG' || key.heroPos === 'HJ' ? 'rfi_early' : 'rfi_late';
    return key.spot === 'BB_DEFENSE' ? 'bb_def' : key.spot === 'SB_VS_OPEN' ? 'sb_3b' : 'vs3b';
  }
  return key.street === 'turn' ? 'turn' : key.street === 'river' ? 'river' : key.decision === 'lead' ? 'cbet' : 'flop_def';
}

function preMatrices(key: ReviewKey): { m: RangeMatrix; only?: RangeMatrix } {
  if (key.spot === 'RFI_OPEN') return { m: getPreflopMatrix('RFI', key.heroPos) };
  if (key.spot === 'BB_DEFENSE') return { m: getPreflopMatrix('VS_OPEN', 'BB', key.villainPos) };
  if (key.spot === 'SB_VS_OPEN') return { m: getPreflopMatrix('VS_OPEN', 'SB', key.villainPos) };
  return { m: getPreflopMatrix('VS_3BET', key.heroPos, key.villainPos), only: getPreflopMatrix('RFI', key.heroPos) };
}

/**
 * Review of a mistake by concept, not by exact hand.
 * Preflop: a neighbour hand (≤2 cells) that plays like the missed one, same positions.
 * Postflop: same positions, street, decision type and strength class when possible.
 */
export function generateSimilarStep(key: ReviewKey, level: PedagogicalLevel = 2): HandStep {
  if (key.kind !== 'pre' && key.kind !== 'post') {
    const gen = MATH_GENERATORS[conceptOfKey(key)] || generatePotOddsDrill;
    return gen();
  }
  if (key.kind === 'pre') {
    const { m, only } = preMatrices(key);
    const hand = key.hand ? neighbourHand(m, key.hand, only) : undefined;
    return { ...buildPreflopStep(key.spot, key.heroPos, level, false, { villainPos: key.villainPos, hand }), advance: undefined };
  }
  let fallback: HandStep | null = null;
  let loose: HandStep | null = null;
  for (let i = 0; i < 300; i++) {
    const pre = buildPreflopStep(key.spot, key.heroPos, level, true, { villainPos: key.villainPos });
    const post = walkHand(pre).steps.slice(1);
    for (const s of post) {
      const k = s.review;
      if (k.street !== key.street || k.decision !== key.decision) { loose = loose || s; continue; }
      if (k.cls === key.cls) return { ...s, advance: undefined };
      fallback = fallback || s;
    }
    if (fallback && i > 150) break;
  }
  const s = fallback || loose;
  if (s) return { ...s, advance: undefined };
  return generateSimulatorDrill('postflop', level, { positions: [key.heroPos] });
}
