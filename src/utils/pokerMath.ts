import { Card, Suit } from '../types/poker';
import { RANKS, SUITS, RANK_VALUES, evaluateHand, compareEvaluations } from './pokerEvaluator';

export function calculatePotOddsPct(callAmountBB: number, potBeforeCallBB: number): number {
  if (callAmountBB <= 0) return 0;
  const finalPot = potBeforeCallBB + callAmountBB;
  return Math.round((callAmountBB / finalPot) * 1000) / 10;
}

export function calculateSPR(effectiveStackBB: number, currentPotBB: number): number {
  if (currentPotBB <= 0) return 99;
  return Math.round((effectiveStackBB / currentPotBB) * 10) / 10;
}

/** Exact equity of hitting one of `outs` clean outs with `cardsToCome` cards from `unseen` cards. */
export function hitProbabilityPct(outs: number, unseen: number, cardsToCome: 1 | 2): number {
  if (outs <= 0) return 0;
  if (cardsToCome === 1) return Math.round((outs / unseen) * 1000) / 10;
  const miss = ((unseen - outs) * (unseen - outs - 1)) / (unseen * (unseen - 1));
  return Math.round((1 - miss) * 1000) / 10;
}

export function remainingDeck(known: Card[]): Card[] {
  const out: Card[] = [];
  for (const s of SUITS) for (const r of RANKS) {
    if (!known.some(c => c.rank === r && c.suit === s)) out.push({ rank: r, suit: s });
  }
  return out;
}

/** Category of the board alone (pairs/trips on a 3-4 card board, full eval on 5). */
export function boardCategory(board: Card[]): number {
  if (board.length >= 5) return evaluateHand(board).score;
  const counts: Record<string, number> = {};
  board.forEach(c => { counts[c.rank] = (counts[c.rank] || 0) + 1; });
  const v = Object.values(counts).sort((a, b) => b - a);
  if (v[0] === 4) return 7;
  if (v[0] === 3) return 3;
  if (v[0] === 2 && v[1] === 2) return 2;
  if (v[0] === 2) return 1;
  return 0;
}

/** True when one more card can give the board alone a straight or a flush (4 to a straight / 4 of a suit). */
export function boardHasFourToHand(board: Card[]): boolean {
  const suits: Record<string, number> = {};
  board.forEach(c => { suits[c.suit] = (suits[c.suit] || 0) + 1; });
  if (Math.max(...Object.values(suits)) >= 4) return true;
  const vals = new Set(board.map(c => RANK_VALUES[c.rank]));
  if (vals.has(14)) vals.add(1);
  for (let lo = 1; lo <= 10; lo++) {
    let n = 0;
    for (let v = lo; v < lo + 5; v++) if (vals.has(v)) n++;
    if (n >= 4) return true;
  }
  return false;
}

export interface DrawDetectionResult {
  drawLabels: string[];
  cleanOuts: Card[];
  totalCleanOutsCount: number;
  flushOuts: number;
  straightOuts: number;
  pairOuts: number;
  equityTurnPct: number;
  equityRiverPct: number;
}

/**
 * Outs = unseen cards that improve hero to a stronger hand that the board alone does not make.
 * Cards that only improve the board (pair it, complete a straight/flush on it) are not counted, and
 * pairing a hole card is not an out when the board already threatens a straight or a flush.
 */
export function detectCleanOuts(heroCards: [Card, Card], board: Card[]): DrawDetectionResult {
  const empty = { drawLabels: [], cleanOuts: [], totalCleanOutsCount: 0, flushOuts: 0, straightOuts: 0, pairOuts: 0, equityTurnPct: 0, equityRiverPct: 0 };
  if (board.length < 3 || board.length > 4 || heroCards.length < 2) return empty;

  const known = [...heroCards, ...board];
  const current = evaluateHand(known);
  const deck = remainingDeck(known);
  const outs: Card[] = [];
  let flushOuts = 0;
  let straightOuts = 0;
  let pairOuts = 0;

  for (const c of deck) {
    const newBoard = [...board, c];
    const trial = evaluateHand([...heroCards, ...newBoard]);
    if (trial.score <= current.score) continue;
    if (trial.score <= boardCategory(newBoard)) continue; // board improved, not hero
    if (newBoard.length === 5 && compareEvaluations(trial, evaluateHand(newBoard)) <= 0) continue; // plays the board
    const pairsBoard = board.some(b => b.rank === c.rank) && !heroCards.some(h => h.rank === c.rank);
    // a board pair helps both players: it only counts as a flush/straight out on an unpaired board
    if (pairsBoard && (trial.score < 4 || boardCategory(board) >= 1)) continue;
    if (trial.score <= 2 && boardHasFourToHand(newBoard)) continue; // a pair is no good on a straight/flush board
    // on a paired board, "two pair" from pairing a hole card is like a plain pair: same rule
    const boardPairOnly = boardCategory(board) === 1 && current.score === 1 && trial.score === 2;
    if ((trial.score === 1 && current.score === 0) || boardPairOnly) {
      // pairing a hole card only counts as an out if it is above every board card
      const boardMax = Math.max(...board.map(b => RANK_VALUES[b.rank]));
      if (RANK_VALUES[c.rank] < boardMax) continue;
      pairOuts++;
    } else if (trial.score === 5 || trial.score === 8) flushOuts++;
    else if (trial.score === 4) straightOuts++;
    outs.push(c);
  }

  const labels: string[] = [];
  if (flushOuts >= 7) labels.push('Flush draw');
  if (straightOuts >= 6) labels.push('Open-ended');
  else if (straightOuts > 0) labels.push('Gutshot');
  if (pairOuts > 0 && !labels.length) labels.push('Overcards');

  const unseen = 52 - known.length;
  return {
    drawLabels: labels,
    cleanOuts: outs,
    totalCleanOutsCount: outs.length,
    flushOuts,
    straightOuts,
    pairOuts,
    equityTurnPct: hitProbabilityPct(outs.length, unseen, 1),
    equityRiverPct: board.length === 3 ? hitProbabilityPct(outs.length, unseen, 2) : hitProbabilityPct(outs.length, unseen, 1)
  };
}

/** Cards that make hero strictly beat villain on the next card (ties excluded). */
export function countOutsVsVillain(hero: [Card, Card], villain: [Card, Card], board: Card[]): Card[] {
  const deck = remainingDeck([...hero, ...villain, ...board]);
  return deck.filter(c => {
    const b = [...board, c];
    return compareEvaluations(evaluateHand([...hero, ...b]), evaluateHand([...villain, ...b])) > 0;
  });
}

function suitInfo(board: Card[]) {
  const counts: Record<Suit, number> = { s: 0, h: 0, d: 0, c: 0 };
  board.forEach(c => { counts[c.suit]++; });
  return Math.max(...Object.values(counts));
}

/** Three distinct ranks inside a 5-rank window → a straight is possible / likely. */
export function isConnectedBoard(board: Card[]): boolean {
  const vals = new Set(board.map(c => RANK_VALUES[c.rank]));
  if (vals.has(14)) vals.add(1);
  for (let lo = 1; lo <= 10; lo++) {
    let n = 0;
    for (let v = lo; v < lo + 5; v++) if (vals.has(v)) n++;
    if (n >= 3) return true;
  }
  return false;
}

/** Wet = flush possible/drawing or connected, on the current board. */
export function isWetBoard(board: Card[]): boolean {
  const maxSuit = suitInfo(board);
  if (maxSuit >= 3) return true;
  if (board.length < 5 && maxSuit === 2 && isConnectedBoard(board)) return true;
  return isConnectedBoard(board);
}

/** Range advantage for the preflop raiser: +1 high dry board, -1 low connected board, 0 otherwise. */
export function raiserBoardAdvantage(board: Card[]): -1 | 0 | 1 {
  const flop = board.slice(0, 3);
  const top = Math.max(...flop.map(c => RANK_VALUES[c.rank]));
  const connected = isConnectedBoard(flop);
  if (top >= 12 && !(connected && suitInfo(flop) >= 2)) return 1;
  if (top <= 9 && connected) return -1;
  return 0;
}

/** Short texture: "High · dry · rainbow", "Low · connected · flush draw", "Paired · flush possible". */
export function analyzeBoardTexture(board: Card[]): string {
  if (board.length < 3) return 'Preflop';
  const maxSuit = suitInfo(board);
  const paired = boardCategory(board) >= 1;
  const top = Math.max(...board.map(c => RANK_VALUES[c.rank]));
  const parts: string[] = [];
  if (paired) parts.push('Paired');
  else parts.push(top >= 12 ? 'High' : top <= 9 ? 'Low' : 'Mid');
  const connected = isConnectedBoard(board);
  if (maxSuit >= 3) {
    if (connected) parts.push('connected');
    parts.push('flush possible');
  } else {
    parts.push(connected ? 'connected' : 'dry');
    if (board.length < 5) parts.push(maxSuit === 2 ? 'flush draw' : 'rainbow');
    else parts.push('no flush');
  }
  return parts.join(' · ');
}
