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
  CLOCKWISE_POSITIONS
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
  earliestOpenPosition
} from '../data/preflopRanges';
import { calculatePotOddsPct, analyzeBoardTexture, isWetBoard, countOutsVsVillain, raiserBoardAdvantage } from './pokerMath';
import { classifyHand, StrengthClass, CLASS_ES } from './handStrength';

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

function evText(n: number): string {
  return `${n > 0 ? '+' : ''}${n.toFixed(2)} BB`;
}

/**
 * Frequency ≥25 % (or the top frequency) = optimal, no EV loss.
 * Rare but played (1-24 %) = mixed (small loss). Never played = error.
 */
export function buildOptions(defs: OptionDef[], potBB: number): DecisionOption[] {
  const max = Math.max(...defs.map(d => d.freq));
  return defs.map(d => {
    const verdict = d.freq >= CORRECT_FREQ || (d.freq === max && max > 0) ? 'optimal' : d.freq > 0 ? 'mixed' : 'error';
    const gap = Math.max(0, max - d.freq) / 100;
    const loss = verdict === 'optimal' ? 0
      : verdict === 'mixed' ? -Math.max(0.05, gap * potBB * 0.25)
      : -Math.max(0.1, gap * potBB * 0.5);
    const ev = Math.round(loss * 100) / 100;
    return {
      id: d.id,
      label: d.label,
      amountBB: d.amountBB,
      isCorrect: verdict === 'optimal',
      verdict,
      evDiff: evText(ev),
      evDiffNum: ev,
      frequencyGTO: d.freq
    };
  });
}

export const ACTION_ES: Record<string, string> = {
  fold: 'Fold', call: 'Pagar', raise: 'Subir', check: 'Check', bet_small: 'Apuesta peq.',
  bet_big: 'Apuesta grande', '3bet': '3-bet', '4bet': '4-bet', jam: 'All-in'
};

/** "Paga." / "Check o apuesta peq." from the correct options, most frequent first. */
function verdictText(defs: OptionDef[]): string {
  const ok = [...defs].sort((a, b) => b.freq - a.freq).filter((d, i) => i === 0 || d.freq >= CORRECT_FREQ);
  const words = ok.map(d => (d.id === 'call' ? 'paga' : d.id === 'fold' ? 'fold' : d.id === 'raise' ? 'sube' : ACTION_ES[d.id].toLowerCase()));
  if (ok.length >= 3) return 'Las tres valen.';
  const s = words.join(' o ');
  return s.charAt(0).toUpperCase() + s.slice(1) + (s.endsWith('.') ? '' : '.');
}

/** "Pagar 60 % · Fold 40 %: ambas valen" when two or more actions are correct, else null. */
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
  /** Builds what happens after a correct option. */
  let onAnswer: (id: string, heroCards: [Card, Card], board: Card[]) => StepAdvance = () => ({ next: null });

  const foldAllBefore = (until: Position, except: Position[] = []) => {
    CLOCKWISE_POSITIONS.forEach(p => {
      if (actsBefore(p, until) && !except.includes(p) && p !== heroPos) folded.push(p);
    });
  };
  const toPost = (line: PreflopLine, heroCards: [Card, Card], board: Card[]): StepAdvance =>
    ({ next: firstPostflopDecision(line, heroCards, board, level) });

  if (spot === 'RFI_OPEN') {
    matrix = getPreflopMatrix('RFI', heroPos);
    foldAllBefore(heroPos);
    const open = heroPos === 'SB' ? 3 : 2.5;
    hand = force.hand || sampleHand(matrix, level, mustContinue ? (_h, f) => f.raise >= 50 : undefined);
    const f = getHandFrequency(matrix, hand);
    defs = [
      { id: 'fold', label: 'FOLD', freq: f.fold },
      { id: 'raise', label: `RAISE ${fmt(open)} BB`, amountBB: open, freq: f.raise }
    ];
    context = `Acción en ti (${heroPos})`;
    ticker = folded.length ? `Foldean ${folded.join(', ')}` : 'Primero en hablar';
    const pct = getRangeStats(matrix).percentage;
    const early = earliestOpenPosition(hand);
    const extra = f.raise <= 0 && early ? ` (se abre desde ${early})` : '';
    why = `${heroPos} abre el ${pctR(pct)} %: ${hand} ${openWord(f)}${extra}.`;
    trivial = f.fold >= 100 && !early;
    onAnswer = (id, heroCards, board) => {
      if (id !== 'raise') return { next: null };
      const defender: Position = heroPos === 'SB' ? 'BB' : Math.random() < 0.85 ? 'BB' : 'SB';
      // blinds fold to the open sometimes
      if (Math.random() < 0.15) return { next: null, note: 'Foldean las ciegas: ganas el bote' };
      const invested: Partial<Record<Position, number>> = { [heroPos]: open, [defender]: open };
      if (defender !== 'SB' && heroPos !== 'SB') invested.SB = 0.5;
      if (defender !== 'BB') invested.BB = 1;
      return toPost({ heroPos, villainPos: defender, heroAggressor: true, invested, spot }, heroCards, board);
    };
    villainPos = 'BB';
  } else if (spot === 'BB_DEFENSE') {
    villainPos = force.villainPos || pick(['UTG', 'HJ', 'CO', 'BTN', 'BTN', 'SB'] as Position[]);
    matrix = getPreflopMatrix('VS_OPEN', 'BB', villainPos);
    const open = villainPos === 'SB' ? 3 : 2.5;
    CLOCKWISE_POSITIONS.forEach(p => { if (p !== villainPos && p !== 'BB') folded.push(p); });
    bets[villainPos] = open;
    const threeBet = villainPos === 'SB' ? 9 : 11;
    hand = force.hand || sampleHand(matrix, level, mustContinue ? (_h, f) => f.call >= 50 : undefined);
    const f = getHandFrequency(matrix, hand);
    defs = [
      { id: 'fold', label: 'FOLD', freq: f.fold },
      { id: 'call', label: `CALL ${fmt(open - 1)} BB`, amountBB: r1(open - 1), freq: f.call },
      { id: '3bet', label: `3-BET ${fmt(threeBet)} BB`, amountBB: threeBet, freq: f.raise }
    ];
    context = `${villainPos} abre a ${fmt(open)} BB`;
    ticker = villainPos === 'SB' ? 'Foldean hasta SB' : `${villainPos} abre · resto foldea`;
    const pot = sum(bets);
    const call = r1(open - 1);
    const need = calculatePotOddsPct(call, pot);
    why = `Bote ${fmt(pot)} BB, pagas ${fmt(call)} → necesitas ${pctR(need)} %. BB defiende el ${pctR(getRangeStats(matrix).percentage)} % vs ${villainPos}: ${hand} ${defendWord(f, '3-bet')}.`;
    onAnswer = (id, heroCards, board) => {
      const v = villainPos;
      if (id === 'call') {
        const invested: Partial<Record<Position, number>> = { [v]: open, BB: open };
        if (v !== 'SB') invested.SB = 0.5;
        return toPost({ heroPos: 'BB', villainPos: v, heroAggressor: false, invested, spot }, heroCards, board);
      }
      if (id === '3bet') {
        if (Math.random() < 0.45) return { next: null, note: `${v} foldea al 3-bet` };
        const invested: Partial<Record<Position, number>> = { [v]: threeBet, BB: threeBet };
        if (v !== 'SB') invested.SB = 0.5;
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
      { id: 'fold', label: 'FOLD', freq: f.fold },
      { id: 'call', label: 'CALL 2 BB', amountBB: 2, freq: f.call },
      { id: '3bet', label: '3-BET 11 BB', amountBB: 11, freq: f.raise }
    ];
    context = `${villainPos} abre a 2.5 BB`;
    ticker = `${villainPos} abre · acción en SB`;
    why = `SB vs ${villainPos}: 3-bet o fold, sin call (3-bet el ${pctR(getRangeStats(matrix).percentage)} %). ${hand} ${defendWord(f, '3-bet')}.`;
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
      { id: 'fold', label: 'FOLD', freq: f.fold },
      { id: 'call', label: `CALL ${fmt(threeBet - 2.5)} BB`, amountBB: r1(threeBet - 2.5), freq: f.call },
      { id: '4bet', label: '4-BET 22 BB', amountBB: 22, freq: f.raise }
    ];
    context = `${villainPos} 3-bet a ${fmt(threeBet)} BB`;
    ticker = `Abres 2.5 · ${villainPos} 3-bet`;
    const pot = sum(bets);
    const call = r1(threeBet - 2.5);
    const ip = isPlayerInPosition(heroPos, villainPos);
    const share = rangeShare(matrix, h => getHandFrequency(rfi, h).raise / 100);
    why = `Bote ${fmt(pot)} BB, pagas ${fmt(call)} → necesitas ${pctR(calculatePotOddsPct(call, pot))} %. ${ip ? 'Con posición' : 'Sin posición'} sigues con el ${share} % de tu open: ${hand} ${defendWord(f, '4-bet')}.`;
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
  const options = buildOptions(defs, potNow);
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
    review: { kind: 'pre', spot, heroPos, villainPos: spot === 'RFI_OPEN' ? undefined : villainPos, hand },
    trivial,
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
  if (st.initiative === 'villain') {
    if (street === 'flop') return 0.6 + 0.15 * advForVillain;
    return street === 'turn' ? 0.55 : 0.45;
  }
  if (st.initiative === 'hero') return 0.1; // donk into the aggressor
  return 0.4; // probe after a checked street
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
    onAnswer: (id: string) => StepAdvance;
  }
): HandStep {
  const pot = r1(info.potStart + sum(streetBets));
  const options = buildOptions(defs, pot);
  const folded = CLOCKWISE_POSITIONS.filter(p => p !== info.heroPos && p !== info.villainPos);
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
    review: {
      kind: 'post', spot: st.line.spot, heroPos: info.heroPos, villainPos: info.villainPos,
      street: info.street, cls: info.hc.cls, decision: extra.decision
    },
    advance: (id: string) => {
      if (!options.find(o => o.id === id)?.isCorrect) return { next: null };
      return extra.onAnswer(id);
    }
  };
}

function drawSentence(info: ReturnType<typeof baseInfo>): string {
  const d = info.hc.draws;
  const name = d.drawLabels[0] || 'Mejoras';
  if (info.street === 'flop') return `${name}: ${d.totalCleanOutsCount} outs ≈ ${pctR(d.equityTurnPct)} % por carta (${pctR(d.equityRiverPct)} % al river).`;
  return `${name}: ${d.totalCleanOutsCount} outs ≈ ${pctR(d.equityTurnPct)} % al river.`;
}

function classSentence(info: ReturnType<typeof baseInfo>, missedRiver = false): string {
  const c = info.hc.cls;
  if ((c === 'draw' || c === 'weakdraw') && info.street !== 'river') return drawSentence(info);
  if (missedRiver || ((c === 'draw' || c === 'weakdraw' || c === 'air') && info.street === 'river')) return 'Proyecto fallado: solo ganas si foldea.';
  return `${CLASS_ES[c]}.`;
}

/** Hero acts first on the street, or villain checked to hero. */
function leadStep(st: PostState, villainChecked: boolean): HandStep {
  const info = baseInfo(st);
  const ip = isPlayerInPosition(info.heroPos, info.villainPos);
  const probe = st.initiative !== 'hero';
  const lowSpr = info.spr < 3;
  const [chk, sm, bg] = adjustedLeadFreq({ cls: info.hc.cls, street: info.street, wet: info.wet, adv: info.adv, ip, lowSpr, probe });
  const sizeSmall = r1(Math.min(info.eff, info.potStart * 0.33));
  const sizeBig = r1(Math.min(info.eff, info.potStart * 0.75));
  const same = sizeSmall === sizeBig;
  const defs: OptionDef[] = [
    { id: 'check', label: 'CHECK', freq: chk },
    { id: 'bet_small', label: `BET ${fmt(sizeSmall)} BB`, amountBB: sizeSmall, freq: same ? 0 : sm },
    { id: 'bet_big', label: sizeBig >= info.eff ? `ALL-IN ${fmt(sizeBig)} BB` : `BET ${fmt(sizeBig)} BB`, amountBB: sizeBig, freq: same ? sm + bg : bg }
  ];

  let ctxPart: string;
  if (lowSpr && (info.hc.cls === 'strong' || info.hc.cls === 'monster')) ctxPart = `SPR ${fmt(info.spr)}: mano fuerte, al centro.`;
  else if (probe) ctxPart = st.initiative === 'villain' ? `Iniciativa de ${info.villainPos}: solo valor y proyectos.` : 'Sin iniciativa: valor y proyectos.';
  else if (info.street === 'flop' && info.adv > 0) ctxPart = 'Board alto y seco: ventaja de rango para ti.';
  else if (info.street === 'flop' && info.adv < 0) ctxPart = 'Board bajo y conectado: ventaja de quien paga.';
  else ctxPart = `${info.texture}.`;
  const why = `${ctxPart} ${classSentence(info)} → ${verdictText(defs)}`;

  const context = villainChecked ? `${info.villainPos} pasa` : probe ? `${info.street === 'flop' ? 'Flop' : info.street === 'turn' ? 'Turn' : 'River'} · hablas primero` : (info.street === 'flop' ? 'Tienes la iniciativa' : `${info.street === 'turn' ? 'Turn' : 'River'} · tienes la iniciativa`);
  const ticker = villainChecked ? `${info.villainPos} pasa · bote ${fmt(info.potStart)} BB` : `Bote ${fmt(info.potStart)} BB · hablas tú`;

  return makeStep(st, info, {}, defs, {
    context, ticker, why, decision: 'lead', toCall: 0,
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
      if (!allIn && r < foldP + (info.street === 'river' ? 0.08 : 0.13)) {
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
  const bet = r1(Math.min(info.eff, Math.max(1, info.potStart * frac)));
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
    { id: 'fold', label: 'FOLD', freq: fo },
    { id: 'call', label: `CALL ${fmt(bet)} BB`, amountBB: bet, freq: allInCall ? ca + ra : ca },
  ];
  if (!allInCall) defs.push({ id: 'raise', label: raiseTo >= info.eff ? `ALL-IN ${fmt(raiseTo)} BB` : `RAISE ${fmt(raiseTo)} BB`, amountBB: raiseTo, freq: ra });
  const pctBet = pctR(frac * 100);
  const why = `Bote ${fmt(pot)} BB, pagas ${fmt(bet)} → necesitas ${pctR(need)} %. ${classSentence(info)} → ${verdictText(defs)}`;
  const context = heroChecked ? `Pasas · ${info.villainPos} apuesta ${fmt(bet)} BB` : `${info.villainPos} apuesta ${fmt(bet)} BB`;
  const ticker = `${info.villainPos} apuesta ${pctBet} % del bote`;
  return makeStep(st, info, streetBets, defs, {
    context, ticker, why, decision: 'facing', toCall: bet,
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
  const raiseTo = r1(Math.min(info.eff, heroBet * 3));
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
    { id: 'fold', label: 'FOLD', freq: fo },
    { id: 'call', label: `CALL ${fmt(toCall)} BB`, amountBB: toCall, freq: allInCall ? ca + ra : ca }
  ];
  if (!allInCall) defs.push({ id: 'jam', label: `ALL-IN ${fmt(info.eff)} BB`, amountBB: info.eff, freq: ra });
  const ip = isPlayerInPosition(info.heroPos, info.villainPos);
  const why = `Bote ${fmt(pot)} BB, pagas ${fmt(toCall)} → necesitas ${pctR(need)} %. ${classSentence(info)} → ${verdictText(defs)}`;
  return makeStep(st, info, streetBets, defs, {
    context: `${info.villainPos} ${ip ? 'sube' : 'hace check-raise'} a ${fmt(raiseTo)} BB`,
    ticker: `Apuestas ${fmt(heroBet)} · ${info.villainPos} sube`,
    why, decision: 'raise', toCall,
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

function numericOptions(correct: number, distractors: number[], suffix: string, decimals = 0, allowNegative = false): DecisionOption[] {
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
      evDiff: ok ? '0.00 BB' : '-1.00 BB',
      evDiffNum: ok ? 0 : -1,
      frequencyGTO: ok ? 100 : 0
    } as DecisionOption;
  });
}

const BET_FRACTIONS = [0.25, 0.33, 0.5, 0.66, 0.75, 1, 1.25, 1.5];
const drillKey = (kind: 'odds' | 'equity' | 'ev'): ReviewKey => ({ kind, spot: 'POT_ODDS_DRILL', heroPos: 'BB' });

export function generatePotOddsDrill(_level: PedagogicalLevel = 2): HandStep {
  void _level;
  const pot = pick([4, 6, 8, 10, 12, 15, 20, 24, 30, 40, 50, 60, 80, 100]);
  const bet = r1(pot * pick(BET_FRACTIONS));
  const pct = (bet / (pot + 2 * bet)) * 100;
  const heroCards = randomCards(2) as [Card, Card];
  const board = randomCards(pick([3, 4, 5]), heroCards);
  const villain = pick(['UTG', 'HJ', 'CO', 'BTN', 'SB'] as Position[]);
  return {
    id: uid('pot_odds'),
    street: board.length === 3 ? 'flop' : board.length === 4 ? 'turn' : 'river',
    pot: r1(pot + bet),
    communityCards: board,
    players: drillPlayers(heroCards, villain, bet, pot / 2),
    heroPosition: 'BB',
    spotType: 'POT_ODDS_DRILL',
    relativePosition: 'OOP',
    actionTicker: `Bote ${fmt(pot)} BB · ${villain} apuesta ${fmt(bet)} BB`,
    contextNotice: `${villain} apuesta ${fmt(bet)} en ${fmt(pot)}`,
    prompt: '¿Equity mínima para pagar?',
    questionType: 'pot_odds',
    options: numericOptions(pct, [(bet / (pot + bet)) * 100, (bet / pot) * 100 / 2, pct + 8, pct - 6], ' %'),
    hint: { relativePosition: 'OOP', potOddsPct: 0, boardTexture: 'Pago / bote final' },
    why: `${fmt(bet)} / (${fmt(pot)} + ${fmt(bet)} + ${fmt(bet)}) = ${pctR(pct)} %`,
    review: drillKey('odds')
  };
}

export function generateEvDrill(_level: PedagogicalLevel = 2): HandStep {
  void _level;
  const pot = pick([10, 12, 16, 20, 24, 30, 40]);
  const bet = r1(pot * pick([0.33, 0.5, 0.75, 1]));
  const eq = pick([15, 20, 25, 30, 35, 40, 45]);
  const e = eq / 100;
  const ev = e * (pot + bet) - (1 - e) * bet;
  const heroCards = randomCards(2) as [Card, Card];
  const board = randomCards(4, heroCards);
  const villain = pick(['CO', 'BTN', 'HJ'] as Position[]);
  const sign = (n: number) => (n < 0 ? `−${Math.abs(n).toFixed(1)}` : `+${n.toFixed(1)}`);
  return {
    id: uid('ev'),
    street: 'turn',
    pot: r1(pot + bet),
    communityCards: board,
    players: drillPlayers(heroCards, villain, bet, pot / 2),
    heroPosition: 'BB',
    spotType: 'POT_ODDS_DRILL',
    relativePosition: 'OOP',
    actionTicker: `Bote ${fmt(pot)} BB · apuesta ${fmt(bet)} BB · equity ${eq}%`,
    contextNotice: `Equity ${eq}% · pagas ${fmt(bet)}`,
    prompt: 'EV del call (BB)',
    questionType: 'ev',
    options: numericOptions(ev, [e * pot - (1 - e) * bet, e * (pot + 2 * bet) - bet, ev + 2.5, ev - 2], ' BB', 1, true),
    hint: { relativePosition: 'OOP', potOddsPct: calculatePotOddsPct(bet, pot + bet), boardTexture: 'EV = eq·(bote+apuesta) − (1−eq)·apuesta' },
    why: `${e.toFixed(2)} × ${fmt(pot + bet)} − ${(1 - e).toFixed(2)} × ${fmt(bet)} = ${sign(ev)} BB`,
    review: drillKey('ev')
  };
}

export function generateOutsDrill(_level: PedagogicalLevel = 2): HandStep {
  void _level;
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
      id: uid('outs'),
      street: 'flop',
      pot: 12,
      communityCards: flop,
      players: drillPlayers(hero, pos, 0, 6, villain),
      heroPosition: 'BB',
      spotType: 'POT_ODDS_DRILL',
      relativePosition: 'OOP',
      actionTicker: `All-in en flop · ${pos} muestra`,
      contextNotice: `Vas por detrás de ${pos}`,
      prompt: '¿Cuántos outs para ir por delante en el turn?',
      questionType: 'outs',
      options: numericOptions(outs, [outs + pick([2, 3, 4]), outs - pick([1, 2, 3]), outs + 6], ''),
      hint: { relativePosition: 'OOP', potOddsPct: 0, boardTexture: 'Cuenta solo cartas que te ponen por delante' },
      why: `${groups.join(' + ')} = ${outs} outs`,
      review: drillKey('equity')
    };
  }
  return generateOutsDrill();
}

/** Single decision for a subcategory drill. */
export function generateSimulatorDrill(sub: SubcategoryId, level: PedagogicalLevel = 2, opts: ScenarioOptions = {}): HandStep {
  if (sub === 'odds') return generatePotOddsDrill(level);
  if (sub === 'equity') return generateOutsDrill(level);
  if (sub === 'ev') return generateEvDrill(level);
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

/**
 * A spot like `key` with new cards. Preflop: same spot, positions and hand (new suits).
 * Postflop: same positions, street, decision type and strength class when possible.
 */
export function generateSimilarStep(key: ReviewKey, level: PedagogicalLevel = 2): HandStep {
  if (key.kind === 'odds') return generatePotOddsDrill(level);
  if (key.kind === 'equity') return generateOutsDrill(level);
  if (key.kind === 'ev') return generateEvDrill(level);
  if (key.kind === 'pre') {
    const step = buildPreflopStep(key.spot, key.heroPos, level, false, { villainPos: key.villainPos, hand: key.hand });
    return step;
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
