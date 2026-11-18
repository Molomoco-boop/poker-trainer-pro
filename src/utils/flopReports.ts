/**
 * Flop texture reports and a short "¿Con qué frecuencia apuesta?" drill,
 * derived from the same leadFreqs / facingFreqs / ranges the cash table uses.
 */
import { Card, Rank, Suit, Position } from '../types/poker';
import { classifyHand } from './handStrength';
import { isConnectedBoard, isWetBoard, calculateSPR } from './pokerMath';
import { preflopFreqs, leadFreqs, facingFreqs, betFrac, r1, PreflopCtx } from './actionModel';
import { ALL_HANDS, handCombos } from '../data/preflopRanges';
import { FLOP_REPORT_TABLE } from '../data/flopReportTable';

export type FlopGroupId = 'ace' | 'kq' | 'midconn' | 'low' | 'paired' | 'mono' | 'twotone' | 'rainbow';

export const FLOP_GROUPS: { id: FlopGroupId; label: string; sub: string; sit: string; learn: string }[] = [
  { id: 'ace', label: 'A alta', sub: 'Sin pareja', sit: 'Flop A-alto', learn: 'Pasa mucho: el as ayuda a los dos' },
  { id: 'kq', label: 'K/Q alta', sub: 'Sin as ni pareja', sit: 'Flop K o Q altos', learn: 'Apuesta más: K y Q golpea a quien subió' },
  { id: 'midconn', label: 'Medio conectado', sub: 'Conectado, del 8 al 10', sit: 'Flop medio conectado', learn: 'Hay muchos proyectos: no apuestes siempre' },
  { id: 'low', label: 'Bajo', sub: 'Nueve o menos', sit: 'Flop bajo', learn: 'Quien subió suele ir por delante' },
  { id: 'paired', label: 'Pareado', sub: 'Hay una pareja en mesa', sit: 'Flop pareado', learn: 'Apuesta más: es difícil encajar dos pares' },
  { id: 'mono', label: 'Un palo', sub: 'Tres del mismo palo', sit: 'Flop de un palo', learn: 'Cuidado con el color: no siempre apuestes' },
  { id: 'twotone', label: 'Dos palos', sub: 'Dos cartas del mismo palo', sit: 'Flop de dos palos', learn: 'Hay color posible: mezcla apuesta y pasa' },
  { id: 'rainbow', label: 'Tres palos', sub: 'Un palo distinto cada carta', sit: 'Flop de tres palos', learn: 'Sin color: puedes apostar más a menudo' }
];

export type ReportSpotId = 'srp_btn_bb' | 'srp_co_bb' | 'threebet';

export const REPORT_SPOTS: { id: ReportSpotId; label: string; sub: string; ip: Position; oop: Position; agg: Position; def: Position; raisedBy: string }[] = [
  { id: 'srp_btn_bb', label: 'BTN sube, BB paga', sub: 'Solo ha habido una subida', ip: 'BTN', oop: 'BB', agg: 'BTN', def: 'BB', raisedBy: 'BTN fue el que subió' },
  { id: 'srp_co_bb', label: 'CO sube, BB paga', sub: 'Solo ha habido una subida', ip: 'CO', oop: 'BB', agg: 'CO', def: 'BB', raisedBy: 'CO fue el que subió' },
  { id: 'threebet', label: 'BB resube (3-bet), BTN paga', sub: 'BB ha resubido y BTN ha pagado', ip: 'BB', oop: 'BTN', agg: 'BB', def: 'BTN', raisedBy: 'BB fue el que resubió' }
];

const RANK_VAL: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, T: 10, J: 11, Q: 12, K: 13, A: 14
};

function suitCount(flop: Card[]): number {
  return new Set(flop.map(c => c.suit)).size;
}

function maxSuit(flop: Card[]): number {
  const m: Record<string, number> = {};
  for (const c of flop) m[c.suit] = (m[c.suit] || 0) + 1;
  return Math.max(...Object.values(m));
}

function paired(flop: Card[]): boolean {
  const r = flop.map(c => c.rank);
  return r[0] === r[1] || r[0] === r[2] || r[1] === r[2];
}

function top(flop: Card[]): number {
  return Math.max(...flop.map(c => RANK_VAL[c.rank]));
}

export function flopGroups(flop: Card[]): FlopGroupId[] {
  if (flop.length < 3) return [];
  const f = flop.slice(0, 3);
  const groups: FlopGroupId[] = [];
  const p = paired(f);
  const t = top(f);
  if (p) groups.push('paired');
  else if (t === 14) groups.push('ace');
  else if (t >= 12) groups.push('kq');
  else if (t >= 8 && isConnectedBoard(f)) groups.push('midconn');
  else groups.push('low');
  const suits = suitCount(f);
  if (maxSuit(f) >= 3) groups.push('mono');
  else if (suits === 2) groups.push('twotone');
  else groups.push('rainbow');
  return groups;
}

export function flopInGroup(flop: Card[], id: FlopGroupId): boolean {
  return flopGroups(flop).includes(id);
}

const SUITS: Suit[] = ['s', 'h', 'd', 'c'];
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];

function card(rank: Rank, suit: Suit): Card { return { rank, suit }; }

function keyOf(c: Card): string { return c.rank + c.suit; }

function cardsFor(hand: string, exclude: Card[]): [Card, Card] {
  const r1c = hand[0] as Rank;
  const r2c = hand[1] as Rank;
  const suited = hand.endsWith('s');
  const pair = r1c === r2c;
  const free = (r: Rank, s: Suit) => !exclude.some(e => e.rank === r && e.suit === s);
  for (const s1 of SUITS) {
    if (suited && !pair) {
      if (free(r1c, s1) && free(r2c, s1)) return [{ rank: r1c, suit: s1 }, { rank: r2c, suit: s1 }];
      continue;
    }
    for (const s2 of SUITS) {
      if (s1 === s2 && !pair && !suited) continue;
      if (pair && s1 === s2) continue;
      if (free(r1c, s1) && free(r2c, s2)) return [{ rank: r1c, suit: s1 }, { rank: r2c, suit: s2 }];
    }
  }
  return [{ rank: r1c, suit: 's' }, { rank: r2c, suit: suited ? 's' : 'h' }];
}

/** A compact, deterministic pool of flops covering every group. */
export function sampleFlops(maxPer = 14): Record<FlopGroupId, Card[][]> {
  const out: Record<FlopGroupId, Card[][]> = {
    ace: [], kq: [], midconn: [], low: [], paired: [], mono: [], twotone: [], rainbow: []
  };
  const suitPats: [Suit, Suit, Suit][] = [
    ['s', 'h', 'd'], ['s', 's', 'h'], ['s', 's', 's'], ['h', 'd', 'c'],
    ['c', 'c', 's'], ['d', 'd', 'd'], ['h', 'h', 'c'], ['s', 'd', 'c']
  ];
  for (let i = 0; i < RANKS.length; i++) {
    for (let j = 0; j < RANKS.length; j++) {
      for (let k = 0; k < RANKS.length; k++) {
        if (i === 0 && j === 0 && k === 0) continue;
        // stride to keep the pool modest but diverse
        if ((i * 17 + j * 9 + k * 5) % 3 !== 0) continue;
        for (const pat of suitPats) {
          const flop = [card(RANKS[i], pat[0]), card(RANKS[j], pat[1]), card(RANKS[k], pat[2])];
          const keys = flop.map(keyOf);
          if (new Set(keys).size < 3) continue;
          for (const g of flopGroups(flop)) {
            if (out[g].length < maxPer) out[g].push(flop);
          }
        }
      }
    }
  }
  return out;
}

interface WeightedHand { hand: string; w: number }

function rangeOf(kind: 'rfi' | 'defend' | 'threebet', pos: Position, openPos?: Position): WeightedHand[] {
  const rows: WeightedHand[] = [];
  for (const hand of ALL_HANDS) {
    let ctx: PreflopCtx;
    if (kind === 'rfi') ctx = { pos, raiseTo: 0, betIn: 0, raises: 0, callers: 0, limpers: 0 };
    else if (kind === 'defend') ctx = { pos, raiseTo: 2.5, betIn: pos === 'BB' ? 1 : 0.5, raises: 1, openPos: openPos || 'BTN', callers: 0, limpers: 0 };
    else ctx = { pos, raiseTo: 9, betIn: pos === 'BTN' ? 2.5 : 1, raises: 2, openPos: 'BTN', callers: 0, limpers: 0 };
    const f = preflopFreqs(hand, ctx);
    const share = kind === 'rfi' || kind === 'threebet' ? f.raise : (f.call + f.raise);
    const w = (share / 100) * handCombos(hand);
    if (w > 0.15) rows.push({ hand, w });
  }
  return rows;
}

export interface SpotReport {
  spot: ReportSpotId;
  cbet: number;
  small: number;
  big: number;
  pref: 'bet_small' | 'bet_big';
  prefFrac: number;
  prefSize: number;
  pot: number;
  defFold: number;
  defCall: number;
  defRaise: number;
  nFlops: number;
}

function spotSetup(id: ReportSpotId): {
  pot: number; spr: number; ip: boolean; agg: WeightedHand[]; def: WeightedHand[];
} {
  if (id === 'srp_btn_bb') {
    const pot = 6.5;
    return { pot, spr: calculateSPR(97.5, pot), ip: true, agg: rangeOf('rfi', 'BTN'), def: rangeOf('defend', 'BB', 'BTN') };
  }
  if (id === 'srp_co_bb') {
    const pot = 6.5;
    return { pot, spr: calculateSPR(97.5, pot), ip: true, agg: rangeOf('rfi', 'CO'), def: rangeOf('defend', 'BB', 'CO') };
  }
  const pot = 19.5;
  return { pot, spr: calculateSPR(91, pot), ip: true, agg: rangeOf('threebet', 'BB'), def: rangeOf('rfi', 'BTN') };
}

function avgLead(hands: WeightedHand[], flop: Card[], pot: number, spr: number, ip: boolean) {
  let small = 0, big = 0, w = 0;
  const wet = isWetBoard(flop);
  for (const h of hands) {
    const cards = cardsFor(h.hand, flop);
    const cls = classifyHand(cards, flop).cls;
    const f = leadFreqs({ street: 'flop', cls, wet, ip, initiative: true, nAlive: 2, toCall: 0, pot, spr });
    small += f.bet_small * h.w;
    big += f.bet_big * h.w;
    w += h.w;
  }
  if (!w) return { small: 0, big: 0, check: 100 };
  small = small / w; big = big / w;
  return { small, big, check: Math.max(0, 100 - small - big) };
}

function avgFace(hands: WeightedHand[], flop: Card[], pot: number, toCall: number, spr: number) {
  let fold = 0, call = 0, raise = 0, w = 0;
  const wet = isWetBoard(flop);
  for (const h of hands) {
    const cards = cardsFor(h.hand, flop);
    const cls = classifyHand(cards, flop).cls;
    const f = facingFreqs({ street: 'flop', cls, wet, ip: false, initiative: false, nAlive: 2, toCall, pot, spr });
    fold += f.fold * h.w; call += f.call * h.w; raise += f.raise * h.w; w += h.w;
  }
  if (!w) return { fold: 100, call: 0, raise: 0 };
  return { fold: fold / w, call: call / w, raise: raise / w };
}

const REPORT_CACHE = new Map<string, SpotReport>();

/** Heavy engine pass. Used only by scripts/precompute-flop-reports.ts. */
export function computeReportFor(group: FlopGroupId, spot: ReportSpotId, pool = sampleFlops(14)): SpotReport {
  const ck = group + ':' + spot;
  const hit = REPORT_CACHE.get(ck);
  if (hit) return hit;
  const setup = spotSetup(spot);
  const flops = pool[group];
  let small = 0, big = 0, dF = 0, dC = 0, dR = 0, n = 0;
  for (const flop of flops) {
    const lead = avgLead(setup.agg, flop, setup.pot, setup.spr, setup.ip);
    const cbet = (lead.small + lead.big) / 100;
    const prefFrac = lead.big >= lead.small ? betFrac('flop', true) : betFrac('flop', false);
    const toCall = r1(setup.pot * prefFrac);
    const face = avgFace(setup.def, flop, setup.pot, toCall, setup.spr);
    small += lead.small; big += lead.big;
    dF += face.fold; dC += face.call; dR += face.raise;
    n++;
    void cbet;
  }
  if (!n) n = 1;
  small = Math.round(small / n); big = Math.round(big / n);
  const cbet = Math.max(0, Math.min(100, small + big));
  const pref: 'bet_small' | 'bet_big' = big >= small ? 'bet_big' : 'bet_small';
  const prefFrac = betFrac('flop', pref === 'bet_big');
  const rep: SpotReport = {
    spot,
    cbet,
    small,
    big,
    pref,
    prefFrac,
    prefSize: r1(setup.pot * prefFrac),
    pot: setup.pot,
    defFold: Math.round(dF / n),
    defCall: Math.round(dC / n),
    defRaise: Math.round(dR / n),
    nFlops: flops.length
  };
  REPORT_CACHE.set(ck, rep);
  return rep;
}

export function computeAllReports(group: FlopGroupId, pool = sampleFlops(14)): SpotReport[] {
  return REPORT_SPOTS.map(s => computeReportFor(group, s.id, pool));
}

/** Instant: reads the precomputed table shipped with the app. */
export function reportFor(group: FlopGroupId, spot: ReportSpotId): SpotReport {
  const row = FLOP_REPORT_TABLE[group].reports.find(r => r.spot === spot);
  if (row) return row as SpotReport;
  return computeReportFor(group, spot);
}

export function allReports(group: FlopGroupId): SpotReport[] {
  return FLOP_REPORT_TABLE[group].reports as SpotReport[];
}

export function exampleFlop(group: FlopGroupId): Card[] {
  return FLOP_REPORT_TABLE[group].flop as Card[];
}

export function formatFlop(flop: Card[]): string {
  return flop.map(c => c.rank + (c.suit === 's' ? '♠' : c.suit === 'h' ? '♥' : c.suit === 'd' ? '♦' : '♣')).join(' ');
}

export interface FlopDrill {
  group: FlopGroupId;
  spot: ReportSpotId;
  flop: Card[];
  question: string;
  answer: number;
  options: number[];
}

/** Three-option quiz: c-bet frequency of the aggressor for this texture and spot. */
export function makeFlopDrill(): FlopDrill {
  const gi = Math.floor(Math.random() * FLOP_GROUPS.length);
  const si = Math.floor(Math.random() * REPORT_SPOTS.length);
  const group = FLOP_GROUPS[gi].id;
  const spot = REPORT_SPOTS[si];
  const rep = reportFor(group, spot.id);
  const answer = rep.cbet;
  const off = [12, 18, 25, 32].sort(() => Math.random() - 0.5);
  const opts = new Set<number>([answer]);
  for (const d of off) {
    if (opts.size >= 3) break;
    const a = Math.max(8, Math.min(92, answer + d * (opts.size % 2 === 0 ? 1 : -1)));
    if (Math.abs(a - answer) >= 8) opts.add(a);
  }
  while (opts.size < 3) opts.add(Math.max(8, Math.min(92, answer + 10 * opts.size)));
  const options = [...opts].sort((a, b) => a - b);
  return {
    group,
    spot: spot.id,
    flop: exampleFlop(group),
    question: `${FLOP_GROUPS[gi].sit} · ${spot.label}. ${spot.raisedBy}. ¿De cada 100 veces, en cuántas apuesta ${spot.agg} en este flop?`,
    answer,
    options
  };
}
