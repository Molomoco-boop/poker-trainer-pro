/**
 * Shared preflop / postflop frequencies for 6-max NL cash.
 * Used by the cash table (hero + bots) and by drill continuation (who calls an open).
 */
import { Position, Street, CLOCKWISE_POSITIONS } from '../types/poker';
import { getPreflopMatrix, getHandFrequency, getBBDefenseMatrix, ALL_HANDS, handCombos, HandFrequency } from '../data/preflopRanges';
import { StrengthClass } from './handStrength';

export const r1 = (n: number) => Math.round(n * 10) / 10;
export const fmt = (n: number) => `${r1(n)}`;
export const openSize = (pos: Position) => (pos === 'SB' ? 3 : 2.5);

export function afterPre(pos: Position): Position[] {
  const i = CLOCKWISE_POSITIONS.indexOf(pos);
  return [...CLOCKWISE_POSITIONS.slice(i + 1), ...CLOCKWISE_POSITIONS.slice(0, i)];
}

export interface PreflopCtx {
  pos: Position;
  /** Current bet to match (this street). */
  raiseTo: number;
  /** Already invested on this street. */
  betIn: number;
  /** 0 unopened, 1 vs open, 2 vs 3-bet, 3 vs 4-bet. */
  raises: number;
  /** Position of the last raiser (when raises >= 1). */
  openPos?: Position;
  /** Calls after the last raise, not counting the raiser. */
  callers: number;
  limpers: number;
}

export interface PreflopFreqs { fold: number; call: number; raise: number; limp: number }

const clip = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

function pack(raise: number, call: number, limp = 0): PreflopFreqs {
  raise = clip(raise); call = clip(call); limp = clip(limp);
  const used = raise + call + limp;
  if (used > 100) {
    const s = 100 / used;
    raise = clip(raise * s); call = clip(call * s); limp = clip(100 - raise - call);
  }
  return { raise, call, limp, fold: clip(100 - raise - call - limp) };
}

function scale(f: HandFrequency, raiseMul: number, callMul: number): PreflopFreqs {
  return pack(f.raise * raiseMul, f.call * callMul);
}

/** Cold-call / 3-bet from CO/BTN/HJ vs an earlier open (no dedicated matrix). */
function coldVsOpen(pos: Position, openPos: Position, hand: string, callers: number): PreflopFreqs {
  const bb = getHandFrequency(getBBDefenseMatrix(openPos), hand);
  const late = pos === 'BTN' || pos === 'CO';
  const vsEarly = openPos === 'UTG' || openPos === 'HJ';
  let raiseMul = pos === 'BTN' ? 1.15 : pos === 'CO' ? 1.0 : 0.85;
  let callMul = pos === 'BTN' ? (vsEarly ? 0.85 : 0.55) : pos === 'CO' ? (vsEarly ? 0.45 : 0.25) : 0.22;
  if (callers > 0) {
    // squeeze: more 3-bet, fewer calls
    raiseMul *= late ? 1.45 : 1.25;
    callMul *= 0.4;
  }
  return scale(bb, raiseMul, callMul);
}

export function preflopFreqs(hand: string, ctx: PreflopCtx): PreflopFreqs {
  if (ctx.raises === 0) {
    const f = getHandFrequency(getPreflopMatrix('RFI', ctx.pos === 'BB' ? 'SB' : ctx.pos), hand);
    // Modern 6-max: almost no limp; SB may complete a sliver of the fold range vs limps/folds.
    let limp = 0;
    if (ctx.pos === 'SB' && f.raise < 50) limp = Math.min(12, Math.round(f.fold * 0.08));
    if (ctx.limpers > 0 && ctx.pos !== 'SB' && f.raise < 30 && f.fold > 50) limp = Math.min(8, Math.round(f.fold * 0.05));
    return pack(f.raise, 0, limp);
  }
  if (ctx.raises >= 3) {
    // vs 4-bet+: only premiums continue
    const prem = /^(AA|KK|QQ|AKs)$/.test(hand);
    const qq = hand === 'AKo' || hand === 'JJ';
    if (prem) return pack(70, 30);
    if (qq) return pack(15, 25);
    return pack(0, 0);
  }
  if (ctx.raises === 2) {
    if (ctx.openPos && (ctx.pos !== ctx.openPos)) {
      // flatting a 3-bet cold, or the original caller facing a 3-bet: very tight
      const f = getHandFrequency(getPreflopMatrix('VS_3BET', ctx.openPos, ctx.pos), hand);
      return pack(f.raise * 0.35, f.call * 0.4);
    }
    const f = getHandFrequency(getPreflopMatrix('VS_3BET', ctx.pos, ctx.openPos || 'BB'), hand);
    return pack(f.raise, f.call);
  }
  // vs one open (or open + callers)
  if (ctx.pos === 'BB' || ctx.pos === 'SB') {
    const f = getHandFrequency(getPreflopMatrix('VS_OPEN', ctx.pos, ctx.openPos || 'BTN'), hand);
    if (ctx.callers > 0) return pack(f.raise * (ctx.pos === 'BB' ? 1.6 : 1.4) + 5, f.call * 0.45);
    return pack(f.raise, f.call);
  }
  return coldVsOpen(ctx.pos, ctx.openPos || 'UTG', hand, ctx.callers);
}

export function samplePreflop(hand: string, ctx: PreflopCtx, rand = Math.random): keyof PreflopFreqs {
  const f = preflopFreqs(hand, ctx);
  const x = rand() * 100;
  if (x < f.raise) return 'raise';
  if (x < f.raise + f.call) return 'call';
  if (x < f.raise + f.call + f.limp) return 'limp';
  return 'fold';
}

/** Population (no known hand): combo-weighted action mix. */
export function populationFreqs(ctx: PreflopCtx): PreflopFreqs {
  let raise = 0, call = 0, limp = 0, w = 0;
  for (const h of ALL_HANDS) {
    const c = handCombos(h);
    const f = preflopFreqs(h, ctx);
    raise += c * f.raise; call += c * f.call; limp += c * f.limp; w += c * 100;
  }
  return pack((raise / w) * 100, (call / w) * 100, (limp / w) * 100);
}

export function samplePopulation(ctx: PreflopCtx, rand = Math.random): keyof PreflopFreqs {
  const f = populationFreqs(ctx);
  const x = rand() * 100;
  if (x < f.raise) return 'raise';
  if (x < f.raise + f.call) return 'call';
  if (x < f.raise + f.call + f.limp) return 'limp';
  return 'fold';
}

export function threeBetSize(openPos: Position, threeBettor: Position, callers: number, open: number): number {
  const oop = threeBettor === 'SB' || threeBettor === 'BB' || CLOCKWISE_POSITIONS.indexOf(threeBettor) < CLOCKWISE_POSITIONS.indexOf(openPos);
  return r1(open * (oop ? 4 : 3.2) + callers * 1.5 + (openPos === 'SB' ? 1 : 0));
}

export interface PostCtx {
  street: Street;
  cls: StrengthClass;
  wet: boolean;
  ip: boolean;
  initiative: boolean;
  nAlive: number;
  toCall: number;
  pot: number;
  spr: number;
}

const mw = (n: number) => (n >= 4 ? 0.4 : n === 3 ? 0.58 : 1);

export function leadFreqs(ctx: PostCtx): { check: number; bet_small: number; bet_big: number } {
  const m = mw(ctx.nAlive);
  const dry = !ctx.wet;
  let small = 0, big = 0;
  switch (ctx.cls) {
    case 'monster': small = 18; big = ctx.street === 'flop' ? 62 : 70; break;
    case 'strong': small = 28; big = 48; break;
    case 'medium': small = 26; big = ctx.initiative && dry ? 32 : 18; break;
    case 'draw': small = 30; big = ctx.ip ? 28 : 16; break;
    case 'weakdraw': small = 22; big = 14; break;
    case 'weak': small = 16; big = 10; break;
    case 'air':
      small = ctx.ip && dry && ctx.nAlive === 2 ? 22 : 8;
      big = ctx.ip && ctx.initiative && ctx.nAlive === 2 ? 16 : 4;
      break;
  }
  if (!ctx.initiative && !ctx.ip) { small *= 0.45; big *= 0.35; } // donk is rare
  if (ctx.spr < 3 && (ctx.cls === 'monster' || ctx.cls === 'strong')) { big += small; small = 0; }
  small = clip(small * m); big = clip(big * m);
  if (small + big > 100) { big = clip(big * 100 / (small + big)); small = clip(100 - big); }
  return { check: clip(100 - small - big), bet_small: small, bet_big: big };
}

export function facingFreqs(ctx: PostCtx): { fold: number; call: number; raise: number } {
  const potOdds = ctx.pot + ctx.toCall > 0 ? (ctx.toCall / (ctx.pot + ctx.toCall)) * 100 : 50;
  const multi = ctx.nAlive >= 3;
  let fold = 0, call = 0, raise = 0;
  switch (ctx.cls) {
    case 'monster': fold = 0; call = 35; raise = 65; break;
    case 'strong': fold = 4; call = 58; raise = 38; break;
    case 'medium': fold = potOdds > 28 ? 40 : 22; call = 100 - fold - 12; raise = 12; break;
    case 'draw':
      fold = potOdds > 35 ? 30 : 12;
      raise = ctx.street === 'river' ? 4 : 22;
      call = 100 - fold - raise;
      break;
    case 'weakdraw':
      fold = potOdds > 30 ? 48 : 28;
      raise = 10;
      call = 100 - fold - raise;
      break;
    case 'weak':
      fold = potOdds > 25 ? 62 : 40;
      raise = 6;
      call = 100 - fold - raise;
      break;
    case 'air':
      raise = ctx.street === 'river' && !multi && ctx.ip ? 8 : 5;
      call = ctx.street === 'river' && !multi ? Math.max(0, 28 - potOdds * 0.4) : (ctx.street === 'flop' ? 6 : 2);
      fold = 100 - raise - call;
      break;
  }
  if (multi) { raise = clip(raise * 0.45); call = clip(call * 0.75); fold = clip(100 - raise - call); }
  return { fold: clip(fold), call: clip(call), raise: clip(100 - clip(fold) - clip(call)) };
}

export function betFrac(street: Street, big: boolean): number {
  if (street === 'flop') return big ? 0.66 : 0.33;
  if (street === 'turn') return big ? 0.75 : 0.5;
  return big ? 1 : 0.6;
}
