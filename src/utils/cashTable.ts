/**
 * 6-max NL cash table: full hands, bots at every seat, stacks persist, button moves clockwise.
 * Hero is always seat 0 (bottom centre). D is always on BTN.
 */
import {
  Card, Position, PlayerState, HandStep, DecisionOption, Street, ConceptId, DetailRow, CLOCKWISE_POSITIONS
} from '../types/poker';
import { createDeck, shuffleDeck, evaluateHand, compareEvaluations, HAND_NAMES_ES } from './pokerEvaluator';
import { classifyHand, CLASS_ES } from './handStrength';
import { cardsToHandLabel } from './handStrength';
import { calculatePotOddsPct, analyzeBoardTexture, isWetBoard } from './pokerMath';
import { buildOptions, spotDifficulty } from './fullHandEngine';
import {
  r1, fmt, openSize, preflopFreqs, threeBetSize,
  leadFreqs, facingFreqs, betFrac, PreflopCtx, PostCtx
} from './actionModel';
import {
  BotProfile, assignProfiles, profilePre, profileLead, profileFacing,
  exploitPre, exploitLead, exploitFacing, vsLabel, blend
} from './botProfiles';

const FROM_BTN: Position[] = ['BTN', 'SB', 'BB', 'UTG', 'HJ', 'CO'];
export const posOf = (seat: number, buttonSeat: number): Position => FROM_BTN[(seat - buttonSeat + 6) % 6];
export const seatOf = (pos: Position, buttonSeat: number): number => (buttonSeat + FROM_BTN.indexOf(pos)) % 6;

const PRE_ORDER: Position[] = CLOCKWISE_POSITIONS;
const POST_ORDER: Position[] = ['SB', 'BB', 'UTG', 'HJ', 'CO', 'BTN'];

interface Seat {
  seat: number;
  stack: number;       // remaining, not including streetBet
  cards: [Card, Card];
  streetBet: number;
  invested: number;    // whole hand including streetBet
  folded: boolean;
  streetLine: string | null; // last action this street ("Check", "Call 2.5", ...)
  profile: BotProfile;
}

export interface CashTable {
  stacks: number[];     // 6 seats, hero = 0
  buttonSeat: number;
  handNo: number;
  startHero: number;
}

export interface CashAward {
  text: string;
  winners: number[];
  pot: number;
  delta: number;        // hero BB this hand
}

export interface CashRun {
  table: CashTable;
  seats: Seat[];
  buttonSeat: number;
  board: Card[];        // 0-5 revealed as streets go
  deck: Card[];
  street: Street;
  // last aggressor this street (seat) / street closed
  lastAggressor: number | null;
  initiative: number | null; // seat that bet last previous street
  toAct: number | null;
  pending: number[];          // seats still to act in the current betting round
  awaitingHero: boolean;
  step: HandStep | null;
  award: CashAward | null;
  ticker: string;
  streetActs: { seat: number; pos: Position; kind: string; amount?: number }[];
  profiles: BotProfile[];
  log: { street: Street; pos: Position; id: string; text: string }[];
}

const uid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 8)}`;

export function newCashTable(): CashTable {
  return { stacks: [100, 100, 100, 100, 100, 100], buttonSeat: 0, handNo: 0, startHero: 100 };
}

function reload(stacks: number[]): number[] {
  return stacks.map(s => (s < 20 ? 100 : r1(s)));
}

function deal(table: CashTable): { seats: Seat[]; board: Card[]; deck: Card[] } {
  const stacks = reload(table.stacks);
  const deck = shuffleDeck(createDeck());
  const seats: Seat[] = [];
  for (let i = 0; i < 6; i++) {
    const c1 = deck.pop()!, c2 = deck.pop()!;
    seats.push({ seat: i, stack: stacks[i], cards: [c1, c2], streetBet: 0, invested: 0, folded: false, streetLine: null, profile: 'regular' });
  }
  const board = [deck.pop()!, deck.pop()!, deck.pop()!, deck.pop()!, deck.pop()!];
  return { seats, board, deck };
}

function post(s: Seat, amt: number) {
  const put = r1(Math.min(s.stack, amt));
  s.stack = r1(s.stack - put);
  s.streetBet = r1(s.streetBet + put);
  s.invested = r1(s.invested + put);
}

function live(seats: Seat[]): Seat[] { return seats.filter(s => !s.folded); }
function order(street: Street): Position[] { return street === 'preflop' ? PRE_ORDER : POST_ORDER; }

function potOf(seats: Seat[]): number { return r1(seats.reduce((a, s) => a + s.invested, 0)); }

function facing(seats: Seat[], seat: number): number {
  return r1(Math.max(0, Math.max(...seats.map(s => s.streetBet)) - seats[seat].streetBet));
}

function preCtx(run: CashRun, seat: number): PreflopCtx {
  const pos = posOf(seat, run.buttonSeat);
  const s = run.seats[seat];
  const max = Math.max(...run.seats.map(x => x.streetBet));
  const raises = run.seats.filter(x => x.streetBet > 1.01).length > 1
    ? (max >= 16 ? 3 : max > openSize('UTG') + 0.2 ? 2 : 1)
    : (max > 1.01 ? 1 : 0);
  const raiser = [...run.seats].reverse().find(x => !x.folded && x.streetBet === max && x.streetBet > 1.01);
  const openPos = raiser ? posOf(raiser.seat, run.buttonSeat) : undefined;
  const callers = raises >= 1
    ? run.seats.filter(x => !x.folded && x.streetBet === max && x.seat !== raiser?.seat).length
    : 0;
  const limpers = raises === 0 ? run.seats.filter(x => !x.folded && x.streetBet === 1 && posOf(x.seat, run.buttonSeat) !== 'BB').length : 0;
  return { pos, raiseTo: max, betIn: s.streetBet, raises, openPos, callers, limpers };
}

function postCtx(run: CashRun, seat: number, toCall: number): PostCtx {
  const street = run.street;
  const cards = run.board.slice(0, street === 'flop' ? 3 : street === 'turn' ? 4 : 5);
  const hc = classifyHand(run.seats[seat].cards, cards);
  const nAlive = live(run.seats).length;
  const pot = potOf(run.seats);
  const spr = pot > 0 ? r1((run.seats[seat].stack) / pot) : 99;
  const last = live(run.seats).filter(s => !s.folded).map(s => s.seat);
  // IP if we act last among remaining (BTN closest to last in postflop order)
  const seq = POST_ORDER;
  const seatsIn = last.map(i => ({ i, p: posOf(i, run.buttonSeat) }));
  const lastPos = [...seq].reverse().find(p => seatsIn.some(x => x.p === p))!;
  const ip = posOf(seat, run.buttonSeat) === lastPos;
  return {
    street, cls: hc.cls, wet: isWetBoard(cards), ip,
    initiative: run.initiative === seat || run.lastAggressor === seat,
    nAlive, toCall, pot, spr
  };
}

function conceptOf(run: CashRun, seat: number, toCall: number): ConceptId {
  const pos = posOf(seat, run.buttonSeat);
  if (run.street === 'preflop') {
    const ctx = preCtx(run, seat);
    if (ctx.raises === 0) return pos === 'UTG' || pos === 'HJ' ? 'rfi_early' : 'rfi_late';
    if (ctx.raises >= 2) return 'vs3b';
    return pos === 'BB' ? 'bb_def' : 'sb_3b';
  }
  if (run.street === 'turn') return 'turn';
  if (run.street === 'river') return 'river';
  return toCall > 0 ? 'flop_def' : 'cbet';
}

function playerStates(run: CashRun, show: boolean): PlayerState[] {
  return run.seats.map(s => {
    const pos = posOf(s.seat, run.buttonSeat);
    return {
      id: `seat_${s.seat}_${pos.toLowerCase()}`,
      position: pos,
      isHero: s.seat === 0,
      isDealer: pos === 'BTN',
      stack: s.stack,
      currentBet: s.streetBet,
      totalInvestedHand: s.invested,
      status: s.folded ? 'folded' : s.seat === 0 ? 'hero' : 'active',
      cards: s.seat === 0 || (show && !s.folded) ? s.cards : undefined,
      streetAction: s.streetLine || undefined,
      profile: s.seat === 0 ? undefined : s.profile
    };
  });
}

function buildDual(
  gto: { id: string; label: string; amountBB?: number; freq: number }[],
  exploit: { id: string; label: string; amountBB?: number; freq: number }[] | null,
  label: string | null
): DecisionOption[] {
  const src = exploit || gto;
  return buildOptions(src).map(o => {
    const g = gto.find(d => d.id === o.id);
    const e = exploit?.find(d => d.id === o.id);
    return {
      ...o,
      frequencyGTO: g?.freq ?? o.frequencyGTO,
      frequencyExploit: exploit ? (e?.freq ?? 0) : undefined,
      exploitLabel: exploit && label ? label : undefined
    };
  });
}

function optionsForHero(
  run: CashRun,
  seat: number,
  defs: { id: string; label: string; amountBB?: number; freq: number }[],
  toCall: number
): DecisionOption[] {
  if (seat !== 0) return buildOptions(defs);
  const villains = live(run.seats).filter(s => s.seat !== 0);
  const facingAgg = toCall > 0 && run.lastAggressor != null ? [run.seats[run.lastAggressor].profile] : null;
  const profiles = (facingAgg || villains.map(s => s.profile)).filter(Boolean) as BotProfile[];
  const label = vsLabel(profiles);
  if (!label) return buildOptions(defs);
  let exploit: { id: string; label: string; amountBB?: number; freq: number }[];
  if (run.street === 'preflop') {
    const gto = {
      fold: defs.find(d => d.id === 'fold')?.freq ?? 0,
      call: defs.find(d => d.id === 'call')?.freq ?? 0,
      raise: defs.find(d => d.id === 'raise' || d.id === '3bet' || d.id === '4bet')?.freq ?? 0,
      limp: defs.find(d => d.id === 'limp')?.freq ?? 0
    };
    const ex = blend(profiles.map(p => exploitPre(gto, p, preCtx(run, seat))));
    exploit = defs.map(d => ({
      ...d,
      freq: d.id === 'fold' ? ex.fold : d.id === 'call' ? ex.call : d.id === 'limp' ? ex.limp : ex.raise
    }));
  } else {
    const ctx = postCtx(run, seat, toCall);
    if (toCall <= 0) {
      const gto = { check: defs.find(d => d.id === 'check')?.freq ?? 0, bet_small: defs.find(d => d.id === 'bet_small')?.freq ?? 0, bet_big: defs.find(d => d.id === 'bet_big')?.freq ?? 0 };
      const ex = blend(profiles.map(p => exploitLead(gto, p, ctx.cls, ctx.street)));
      exploit = defs.map(d => ({
        ...d,
        freq: d.id === 'check' ? ex.check : d.id === 'bet_small' ? ex.bet_small : d.id === 'bet_big' ? ex.bet_big : 0
      }));
    } else {
      const gto = { fold: defs.find(d => d.id === 'fold')?.freq ?? 0, call: defs.find(d => d.id === 'call')?.freq ?? 0, raise: defs.find(d => d.id === 'raise')?.freq ?? 0 };
      const ex = blend(profiles.map(p => exploitFacing(gto, p, ctx.street)));
      exploit = defs.map(d => ({
        ...d,
        freq: d.id === 'fold' ? ex.fold : d.id === 'call' ? ex.call : d.id === 'raise' ? ex.raise : 0
      }));
    }
  }
  return buildDual(defs, exploit, label);
}

function optionsFor(run: CashRun, seat: number): { defs: { id: string; label: string; amountBB?: number; freq: number }[]; toCall: number } {
  const s = run.seats[seat];
  const toCall = facing(run.seats, seat);
  if (run.street === 'preflop') {
    const ctx = preCtx(run, seat);
    const f = preflopFreqs(cardsToHandLabel(s.cards), ctx);
    const raiseTo = ctx.raises === 0
      ? openSize(ctx.pos)
      : ctx.raises === 1
        ? threeBetSize(ctx.openPos || 'UTG', ctx.pos, ctx.callers, ctx.raiseTo)
        : r1(Math.min(s.stack + s.streetBet, ctx.raiseTo * 2.2 + 4));
    const raiseAmt = r1(Math.min(s.stack, Math.max(toCall + 0.5, raiseTo - s.streetBet)));
    const limpAmt = r1(Math.min(s.stack, Math.max(0, 1 - s.streetBet)));
    const callAmt = r1(Math.min(s.stack, toCall));
    if (ctx.raises === 0) {
      return { toCall, defs: [
        { id: 'fold', label: 'FOLD', freq: f.fold },
        { id: 'limp', label: ctx.pos === 'SB' ? `COMPLETAR ${fmt(limpAmt)} BB` : `LIMP ${fmt(limpAmt)} BB`, amountBB: limpAmt, freq: f.limp },
        { id: 'raise', label: `RAISE ${fmt(raiseTo)} BB`, amountBB: raiseAmt, freq: f.raise }
      ] };
    }
    const raiseId = ctx.raises === 1 ? '3bet' : '4bet';
    const raiseLab = ctx.raises === 1 ? '3-BET' : '4-BET';
    const defs = [
      { id: 'fold', label: 'FOLD', freq: f.fold },
      { id: 'call', label: callAmt >= s.stack ? `CALL ${fmt(callAmt)} BB` : `CALL ${fmt(callAmt)} BB`, amountBB: callAmt, freq: f.call },
      { id: raiseId, label: raiseAmt >= s.stack ? `ALL-IN ${fmt(s.stack + s.streetBet)} BB` : `${raiseLab} ${fmt(raiseTo)} BB`, amountBB: raiseAmt, freq: f.raise }
    ];
    if (s.stack <= toCall + 0.05) {
      // no raise left
      return { toCall, defs: [
        { id: 'fold', label: 'FOLD', freq: f.fold + f.raise },
        { id: 'call', label: `CALL ${fmt(callAmt)} BB`, amountBB: callAmt, freq: f.call }
      ] };
    }
    return { toCall, defs };
  }
  const ctx = postCtx(run, seat, toCall);
  if (toCall <= 0) {
    const f = leadFreqs(ctx);
    const sm = r1(Math.min(s.stack, Math.max(0.5, potOf(run.seats) * betFrac(run.street, false))));
    const bg = r1(Math.min(s.stack, Math.max(sm + 0.5, potOf(run.seats) * betFrac(run.street, true))));
    return { toCall, defs: [
      { id: 'check', label: 'CHECK', freq: f.check },
      { id: 'bet_small', label: `BET ${fmt(sm)} BB`, amountBB: sm, freq: f.bet_small },
      { id: 'bet_big', label: `BET ${fmt(bg)} BB`, amountBB: bg, freq: f.bet_big }
    ] };
  }
  const f = facingFreqs(ctx);
  const callAmt = r1(Math.min(s.stack, toCall));
  const raiseTo = r1(Math.min(s.stack + s.streetBet, Math.max(toCall * 2 + s.streetBet, potOf(run.seats) * 0.7 + toCall + s.streetBet)));
  const raiseAmt = r1(Math.min(s.stack, raiseTo - s.streetBet));
  if (s.stack <= toCall + 0.05) {
    return { toCall, defs: [
      { id: 'fold', label: 'FOLD', freq: f.fold + f.raise },
      { id: 'call', label: `CALL ${fmt(callAmt)} BB`, amountBB: callAmt, freq: f.call }
    ] };
  }
  return { toCall, defs: [
    { id: 'fold', label: 'FOLD', freq: f.fold },
    { id: 'call', label: `CALL ${fmt(callAmt)} BB`, amountBB: callAmt, freq: f.call },
    { id: 'raise', label: raiseAmt >= s.stack ? `ALL-IN ${fmt(s.stack + s.streetBet)} BB` : `RAISE ${fmt(raiseTo)} BB`, amountBB: raiseAmt, freq: f.raise }
  ] };
}

function whyFor(run: CashRun, seat: number, defs: { id: string; freq: number; amountBB?: number }[], toCall: number): { why: string; detail: DetailRow[] } {
  const s = run.seats[seat];
  const pot = potOf(run.seats);
  const n = live(run.seats).length;
  const mw = n >= 4 ? '4-way' : n === 3 ? '3-way' : 'HU';
  if (run.street === 'preflop') {
    const hand = cardsToHandLabel(s.cards);
    const pay = defs.find(d => d.id === 'call' || d.id === 'limp');
    const need = pay && toCall > 0 ? `${Math.round(calculatePotOddsPct(toCall, pot))} %` : '';
    const why = toCall > 0 && need
      ? `Bote ${fmt(pot)} BB, pagas ${fmt(toCall)} → necesitas ${need}. ${hand} · ${mw}.`
      : `${posOf(seat, run.buttonSeat)} · ${hand} · ${mw}.`;
    const plan = defs.slice().sort((a, b) => b.freq - a.freq)[0];
    return {
      why,
      detail: [
        toCall > 0 && need
          ? { k: 'odds', label: 'Pot odds', value: `pagas ${fmt(toCall)} · necesitas ${need}` }
          : { k: 'range', label: 'Mesa', value: mw },
        { k: 'hand', label: 'Tu mano', value: hand },
        { k: 'plan', label: 'Plan', value: plan.id === 'fold' ? 'Fold: no llega' : plan.id === 'call' || plan.id === 'limp' ? 'Pagar: precio o jugabilidad' : 'Subir: valor o presión' }
      ]
    };
  }
  const cards = run.board.slice(0, run.street === 'flop' ? 3 : run.street === 'turn' ? 4 : 5);
  const hc = classifyHand(s.cards, cards);
  const texture = analyzeBoardTexture(cards);
  const call = defs.find(d => d.id === 'call');
  const need = call && toCall > 0 ? Math.round(calculatePotOddsPct(toCall, pot)) : 0;
  const why = toCall > 0
    ? `Bote ${fmt(pot)} BB, pagas ${fmt(toCall)} → necesitas ${need} %. ${CLASS_ES[hc.cls]} · ${mw}.`
    : `${texture} · ${CLASS_ES[hc.cls]} · ${mw}.`;
  return {
    why,
    detail: [
      toCall > 0
        ? { k: 'odds', label: 'Pot odds', value: `pagas ${fmt(toCall)} · necesitas ${need} %` }
        : { k: 'board', label: 'Board', value: `${texture} · ${mw}` },
      { k: 'hand', label: 'Tu mano', value: CLASS_ES[hc.cls] },
      { k: 'plan', label: 'Plan', value: hc.cls === 'monster' || hc.cls === 'strong' ? 'Valor' : hc.cls === 'draw' || hc.cls === 'weakdraw' ? 'Proyecto' : toCall > 0 ? 'Sin fuerza: foldea o farolea poco' : 'Sin fuerza: pasa o farolea poco' }
    ]
  };
}

function makeStep(run: CashRun, seat: number, ticker: string): HandStep {
  const { defs, toCall } = optionsFor(run, seat);
  const options: DecisionOption[] = optionsForHero(run, seat, defs, toCall);
  const pot = potOf(run.seats);
  const { why, detail } = whyFor(run, seat, defs, toCall);
  const pos = posOf(seat, run.buttonSeat);
  const cards = run.street === 'preflop' ? [] : run.board.slice(0, run.street === 'flop' ? 3 : run.street === 'turn' ? 4 : 5);
  const concept = conceptOf(run, seat, toCall);
  const ctxNotice = heroContextNotice(run, pos, toCall);
  const streetTicker = tickerForStreet((ticker || run.ticker || '').split(' · ').filter(Boolean), run.street);
  return {
    id: uid(run.street),
    street: run.street,
    pot,
    communityCards: cards,
    players: playerStates(run, false),
    heroPosition: pos,
    spotType: run.street === 'preflop' ? (toCall > 0 ? (preCtx(run, seat).raises >= 2 ? '3BET_POT' : pos === 'BB' ? 'BB_DEFENSE' : pos === 'SB' ? 'SB_VS_OPEN' : 'RFI_OPEN') : 'RFI_OPEN')
      : run.street === 'flop' ? (toCall > 0 ? 'FACING_CBET' : 'CBET_FLOP') : 'TURN_RIVER_DECISION',
    relativePosition: postRelative(run, seat),
    actionTicker: streetTicker,
    contextNotice: ctxNotice,
    prompt: 'Tu jugada',
    questionType: 'action',
    options,
    hint: {
      relativePosition: postRelative(run, seat),
      potOddsPct: toCall > 0 ? calculatePotOddsPct(toCall, pot) : 0,
      boardTexture: cards.length >= 3 ? analyzeBoardTexture(cards) : 'preflop',
      spr: pot > 0 ? r1(run.seats[seat].stack / pot) : 99
    },
    why,
    detail,
    concept,
    difficulty: spotDifficulty(concept, defs, false, (live(run.seats).length - 2) * 40),
    review: { kind: run.street === 'preflop' ? 'pre' : 'post', spot: 'RFI_OPEN', heroPos: pos, street: run.street, decision: toCall > 0 ? 'facing' : 'lead', hand: cardsToHandLabel(run.seats[seat].cards), concept }
  };
}

function joinPos(pos: Position[]): string {
  if (pos.length <= 1) return pos[0] || '';
  if (pos.length === 2) return `${pos[0]} y ${pos[1]}`;
  return `${pos.slice(0, -1).join(', ')} y ${pos[pos.length - 1]}`;
}

function tickerForStreet(ticks: string[], street: Street): string {
  const mark = street === 'flop' ? 'Flop' : street === 'turn' ? 'Turn' : street === 'river' ? 'River' : null;
  if (!mark) return ticks.join(' · ') || 'Ciegas';
  const i = ticks.lastIndexOf(mark);
  return (i >= 0 ? ticks.slice(i) : [mark, ...ticks]).join(' · ');
}

function heroContextNotice(run: CashRun, pos: Position, toCall: number): string {
  const streetName = run.street === 'preflop' ? 'Preflop' : run.street === 'flop' ? 'Flop' : run.street === 'turn' ? 'Turn' : 'River';
  const prior = run.streetActs;
  if (!prior.length) {
    return run.street === 'preflop' ? `Acción en ti (${pos})` : `${streetName} · hablas primero`;
  }
  const lastAgg = [...prior].reverse().find(a => a.kind === 'bet' || a.kind === 'raise' || a.kind === 'limp');
  if (toCall > 0 && lastAgg) {
    if (lastAgg.kind === 'limp') {
      const limpers = prior.filter(a => a.kind === 'limp').map(a => a.pos);
      const names = joinPos(limpers);
      return `${names} ${limpers.length > 1 ? 'limpean' : 'limpea'} · te toca`;
    }
    const verb = lastAgg.kind === 'bet' ? 'apuesta' : 'sube a';
    const amt = lastAgg.amount != null ? ` ${fmt(lastAgg.amount)}` : '';
    return `${lastAgg.pos} ${verb}${amt} · te toca`;
  }
  const passers = prior.filter(a => a.kind === 'check').map(a => a.pos);
  const onlyPassive = prior.every(a => a.kind === 'check' || a.kind === 'fold');
  if (passers.length && onlyPassive) {
    return `${joinPos(passers)} ${passers.length > 1 ? 'pasan' : 'pasa'} · hablas tú`;
  }
  const folders = prior.filter(a => a.kind === 'fold').map(a => a.pos);
  if (folders.length && prior.every(a => a.kind === 'fold')) {
    return `${joinPos(folders)} ${folders.length > 1 ? 'foldean' : 'foldea'} · hablas tú`;
  }
  return run.street === 'preflop' ? `Acción en ti (${pos})` : `${streetName} · hablas tú`;
}


function postRelative(run: CashRun, seat: number): 'IP' | 'OOP' {
  if (run.street === 'preflop') {
    const pos = posOf(seat, run.buttonSeat);
    return pos === 'BTN' || pos === 'CO' ? 'IP' : 'OOP';
  }
  return postCtx(run, seat, 0).ip ? 'IP' : 'OOP';
}


function fillPending(run: CashRun, afterSeat: number | null): void {
  const seq = order(run.street);
  const startPos = afterSeat === null ? seq[0] : posOf((afterSeat + 1) % 6, run.buttonSeat);
  const start = seq.indexOf(startPos);
  const pending: number[] = [];
  const n = afterSeat === null ? 6 : 5; // after a bet, everyone else acts — not the raiser
  for (let i = 0; i < n; i++) {
    const pos = seq[(start + i) % 6];
    const s = run.seats[seatOf(pos, run.buttonSeat)];
    if (s.folded || s.stack <= 0) continue;
    if (afterSeat !== null && s.seat === afterSeat) continue;
    pending.push(s.seat);
  }
  run.pending = pending;
}

function noteAction(run: CashRun, seat: number, kind: string, label: string, amount?: number) {
  run.seats[seat].streetLine = label;
  run.streetActs.push({ seat, pos: posOf(seat, run.buttonSeat), kind, amount });
}

function applyAction(run: CashRun, seat: number, id: string, defs: { id: string; amountBB?: number }[]): string {
  const s = run.seats[seat];
  const pos = posOf(seat, run.buttonSeat);
  const def = defs.find(d => d.id === id) || defs[0];
  const emit = (text: string) => {
    run.log.push({ street: run.street, pos, id, text });
    return text;
  };
  if (id === 'fold') {
    s.folded = true;
    noteAction(run, seat, 'fold', 'Fold');
    return emit(`${pos} fold`);
  }
  if (id === 'check') {
    noteAction(run, seat, 'check', 'Check');
    return emit(`${pos} check`);
  }
  const amt = def.amountBB || 0;
  post(s, amt);
  if (id === 'call' || id === 'limp') {
    const label = id === 'limp' && pos === 'SB' ? `Completar ${fmt(amt)}` : id === 'limp' ? `Limp ${fmt(amt)}` : `Call ${fmt(amt)}`;
    noteAction(run, seat, id, label, amt);
    return emit(`${pos} ${id === 'limp' ? 'limp' : 'call'} ${fmt(amt)}`);
  }
  run.lastAggressor = seat;
  const kind = (id === 'bet_small' || id === 'bet_big') ? 'bet' : 'raise';
  const label = kind === 'bet' ? `Bet ${fmt(s.streetBet)}`
    : id === '3bet' ? `3-bet ${fmt(s.streetBet)}`
    : id === '4bet' ? `4-bet ${fmt(s.streetBet)}`
    : `Raise ${fmt(s.streetBet)}`;
  noteAction(run, seat, kind, label, s.streetBet);
  return emit(`${pos} ${kind === 'bet' ? 'bet' : (id === '3bet' ? '3-bet' : id === '4bet' ? '4-bet' : 'raise')} ${fmt(s.streetBet)}`);
}

function closeStreet(run: CashRun) {
  for (const s of run.seats) { s.streetBet = 0; s.streetLine = null; }
  run.streetActs = [];
  run.lastAggressor = null;
}

function goNextStreet(run: CashRun): boolean {
  if (run.street === 'river') return false;
  closeStreet(run);
  if (run.street === 'preflop') { run.street = 'flop'; run.initiative = lastInvestor(run); return true; }
  if (run.street === 'flop') { run.street = 'turn'; return true; }
  if (run.street === 'turn') { run.street = 'river'; return true; }
  return false;
}

function lastInvestor(run: CashRun): number | null {
  const alive = live(run.seats);
  if (!alive.length) return null;
  return alive.sort((a, b) => b.invested - a.invested)[0].seat;
}

function showdown(run: CashRun): CashAward {
  const pot = potOf(run.seats);
  const board = run.board;
  // Simple side pots: group by invested.
  const levels = [...new Set(run.seats.filter(s => s.invested > 0).map(s => s.invested))].sort((a, b) => a - b);
  const won = [0, 0, 0, 0, 0, 0];
  let prev = 0;
  for (const cap of levels) {
    const layer = r1((cap - prev) * run.seats.filter(s => s.invested >= cap - 0.001).length);
    const eligible = run.seats.filter(s => !s.folded && s.invested >= cap - 0.001);
    prev = cap;
    if (!eligible.length || layer <= 0) continue;
    let best = eligible[0];
    let bestEv = evaluateHand([...best.cards, ...board]);
    const winners = [best];
    for (const s of eligible.slice(1)) {
      const ev = evaluateHand([...s.cards, ...board]);
      const c = compareEvaluations(ev, bestEv);
      if (c > 0) { best = s; bestEv = ev; winners.length = 0; winners.push(s); }
      else if (c === 0) winners.push(s);
    }
    const share = r1(layer / winners.length);
    winners.forEach(w => { won[w.seat] = r1(won[w.seat] + share); });
  }
  // leftover chips from rounding go to first winner
  const distributed = r1(won.reduce((a, b) => a + b, 0));
  if (pot - distributed > 0.05) {
    const w = won.findIndex((v, i) => v > 0 && !run.seats[i].folded);
    if (w >= 0) won[w] = r1(won[w] + pot - distributed);
  }
  won.forEach((v, i) => { if (v) run.seats[i].stack = r1(run.seats[i].stack + v); });
  const winners = won.map((v, i) => v > 0 ? i : -1).filter(i => i >= 0);
  const names = winners.map(i => {
    const ev = evaluateHand([...run.seats[i].cards, ...board]);
    return `${posOf(i, run.buttonSeat)} ${HAND_NAMES_ES[ev.score]}`;
  });
  const heroWon = r1(won[0] - run.seats[0].invested);
  const text = winners.length
    ? (winners.length > 1 ? `Empate · ${names.join(' / ')} · ${fmt(pot)} BB` : `${names[0]} · ${fmt(pot)} BB`)
    : `Bote ${fmt(pot)} BB`;
  return { text, winners, pot, delta: heroWon };
}

function foldWin(run: CashRun): CashAward {
  const w = live(run.seats)[0];
  const pot = potOf(run.seats);
  w.stack = r1(w.stack + pot);
  const delta = w.seat === 0 ? r1(pot - run.seats[0].invested) : r1(-run.seats[0].invested);
  const text = `${posOf(w.seat, run.buttonSeat)} gana ${fmt(pot)} BB`;
  return { text, winners: [w.seat], pot, delta };
}

function finish(run: CashRun, award: CashAward) {
  run.award = award;
  run.awaitingHero = false;
  run.toAct = null;
  run.step = {
    ...makeStep({ ...run, street: run.street === 'preflop' && run.board.length ? 'flop' : run.street } as CashRun, 0, award.text),
    street: run.street === 'preflop' && award.winners.length ? 'preflop' : (run.street === 'preflop' ? 'flop' : run.street),
    communityCards: run.street === 'preflop' && live(run.seats).length > 1 ? [] : run.board.slice(0, run.street === 'flop' || run.street === 'preflop' ? 3 : run.street === 'turn' ? 4 : 5),
    players: playerStates(run, live(run.seats).length > 1),
    options: [],
    prompt: '',
    contextNotice: live(run.seats).length > 1 ? 'Cartas arriba' : '',
    actionTicker: run.ticker,
    why: award.text,
    detail: []
  };
  const showedBoard = run.street !== 'preflop' || live(run.seats).length > 1;
  const foldWinOnly = live(run.seats).length === 1;
  if (foldWinOnly) {
    run.step.communityCards = run.street === 'preflop' ? [] : run.board.slice(0, run.street === 'flop' ? 3 : run.street === 'turn' ? 4 : 5);
  } else if (showedBoard) {
    run.step.communityCards = run.board;
  } else {
    run.step.communityCards = [];
  }
  run.table = commit(run);
}

function commit(run: CashRun): CashTable {
  return {
    stacks: run.seats.map(s => s.stack),
    buttonSeat: (run.buttonSeat + 1) % 6,
    handNo: run.table.handNo + 1,
    startHero: run.table.startHero
  };
}

function actBot(run: CashRun, seat: number): string {
  const { defs } = optionsFor(run, seat);
  const hand = cardsToHandLabel(run.seats[seat].cards);
  const prof = run.seats[seat].profile || 'regular';
  let id: string;
  if (run.street === 'preflop') {
    const gto = preflopFreqs(hand, preCtx(run, seat));
    const f = profilePre(gto, prof);
    const x = Math.random() * 100;
    const act = x < f.raise ? 'raise' : x < f.raise + f.call ? 'call' : x < f.raise + f.call + f.limp ? 'limp' : 'fold';
    if (act === 'raise') id = defs.find(d => d.id === 'raise' || d.id === '3bet' || d.id === '4bet')?.id || 'fold';
    else if (act === 'call' || act === 'limp') id = defs.find(d => d.id === act || d.id === 'call' || d.id === 'check')?.id || 'fold';
    else id = defs.find(d => d.id === 'fold' || d.id === 'check')?.id || 'fold';
  } else {
    const toCall = facing(run.seats, seat);
    const ctx = postCtx(run, seat, toCall);
    const x = Math.random() * 100;
    if (toCall <= 0) {
      const f = profileLead(leadFreqs(ctx), prof, ctx.cls, ctx.street);
      id = x < f.bet_big ? 'bet_big' : x < f.bet_big + f.bet_small ? 'bet_small' : 'check';
    } else {
      const f = profileFacing(facingFreqs(ctx), prof, ctx.street);
      id = x < f.raise ? 'raise' : x < f.raise + f.call ? 'call' : 'fold';
    }
    if (!defs.some(d => d.id === id)) id = defs[0].id;
  }
  return applyAction(run, seat, id, defs);
}

/** Run bots until hero must act or the hand ends. */
function autoUntilHero(run: CashRun, ticks: string[]): void {
  for (let guard = 0; guard < 64; guard++) {
    if (live(run.seats).length <= 1) { finish(run, foldWin(run)); run.ticker = ticks.join(' · '); if (run.step) run.step.actionTicker = tickerForStreet((run.ticker || "").split(" · ").filter(Boolean), run.street); return; }
    const withChips = live(run.seats).filter(s => s.stack > 0);
    const maxBet = Math.max(...run.seats.map(s => s.streetBet));
    const needCall = withChips.some(s => s.streetBet < maxBet - 0.01);
    if (withChips.length <= 1 && !needCall) {
      while (goNextStreet(run)) { /* run out */ }
      run.street = 'river';
      finish(run, showdown(run));
      run.ticker = ticks.join(' · ');
      if (run.step) run.step.actionTicker = tickerForStreet((run.ticker || "").split(" · ").filter(Boolean), run.street);
      return;
    }
    if (run.pending.length === 0) {
      if (!goNextStreet(run)) { finish(run, showdown(run)); run.ticker = ticks.join(' · '); if (run.step) run.step.actionTicker = tickerForStreet((run.ticker || "").split(" · ").filter(Boolean), run.street); return; }
      ticks.push(run.street === 'flop' ? 'Flop' : run.street === 'turn' ? 'Turn' : 'River');
      fillPending(run, null);
      continue;
    }
    const seat = run.pending[0];
    const s = run.seats[seat];
    if (s.folded || (s.stack <= 0 && facing(run.seats, seat) <= 0)) {
      run.pending.shift();
      continue;
    }
    if (seat === 0) {
      run.awaitingHero = true;
      run.toAct = 0;
      run.ticker = ticks.join(' · ');
      run.step = makeStep(run, 0, run.ticker || `Acción en ti (${posOf(0, run.buttonSeat)})`);
      return;
    }
    const before = run.lastAggressor;
    const line = actBot(run, seat);
    ticks.push(line);
    run.pending.shift();
    if (run.lastAggressor !== before && run.lastAggressor === seat) {
      // bet/raise: everyone else with chips must act again
      fillPending(run, seat);
    }
  }
  finish(run, live(run.seats).length <= 1 ? foldWin(run) : showdown(run));
  run.ticker = ticks.join(' · ');
  if (run.step) run.step.actionTicker = tickerForStreet((run.ticker || "").split(" · ").filter(Boolean), run.street);
}

export function startHand(table: CashTable, profiles?: BotProfile[]): CashRun {
  const { seats, board, deck } = deal(table);
  const profs = profiles && profiles.length === 6 ? profiles : assignProfiles('regular');
  seats.forEach((s, i) => { s.profile = i === 0 ? 'regular' : profs[i]; });
  const buttonSeat = table.buttonSeat;
  const sb = seats[seatOf('SB', buttonSeat)];
  const bb = seats[seatOf('BB', buttonSeat)];
  post(sb, Math.min(0.5, sb.stack));
  post(bb, Math.min(1, bb.stack));
  const run: CashRun = {
    table, seats, buttonSeat, board, deck,
    street: 'preflop',
    lastAggressor: null,
    initiative: null,
    toAct: null,
    pending: [],
    awaitingHero: false,
    step: null,
    award: null,
    ticker: '',
    streetActs: [],
    profiles: profs,
    log: []
  };
  fillPending(run, null);
  autoUntilHero(run, ['Ciegas']);
  return run;
}

export function applyHeroAction(run: CashRun, optionId: string): CashRun {
  if (!run.awaitingHero || run.seats[0].folded) return run;
  const { defs } = optionsFor(run, 0);
  const id = defs.some(d => d.id === optionId) ? optionId : defs[0].id;
  const before = run.lastAggressor;
  const line = applyAction(run, 0, id, defs);
  const ticks = (run.ticker ? run.ticker.split(' · ').filter(Boolean) : []).concat(line);
  run.awaitingHero = false;
  run.pending.shift();
  if (run.lastAggressor !== before && run.lastAggressor === 0) fillPending(run, 0);
  autoUntilHero(run, ticks);
  return run;
}

export function heroDelta(table: CashTable): number {
  return r1(table.stacks[0] - (table.startHero || 100));
}
