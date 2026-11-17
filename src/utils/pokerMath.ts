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

export interface DrawDetectionResult {
  drawLabels: string[];
  cleanOuts: Card[];
  totalCleanOutsCount: number;
  equityTurnPct: number;
  equityRiverPct: number;
}

/**
 * Outs = unseen cards that improve hero to a stronger category that uses a hole card
 * (cards that only improve the board, e.g. pairing it, are not counted).
 */
export function detectCleanOuts(heroCards: [Card, Card], board: Card[]): DrawDetectionResult {
  const empty = { drawLabels: [], cleanOuts: [], totalCleanOutsCount: 0, equityTurnPct: 0, equityRiverPct: 0 };
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
    const pairsBoard = board.some(b => b.rank === c.rank) && !heroCards.some(h => h.rank === c.rank);
    if (pairsBoard && trial.score < 6) continue; // board pair helps both players
    if (trial.score === 1 && current.score === 0) {
      // pairing a hole card only counts as an out if it is above every board card
      const boardMax = Math.max(...board.map(b => RANK_VALUES[b.rank]));
      if (RANK_VALUES[c.rank] < boardMax) continue;
      pairOuts++;
    } else if (trial.score === 5 || trial.score === 8) flushOuts++;
    else if (trial.score === 4) straightOuts++;
    outs.push(c);
  }

  const labels: string[] = [];
  if (flushOuts >= 7) labels.push(`Proyecto de color (${flushOuts})`);
  if (straightOuts >= 6) labels.push(`Escalera abierta (${straightOuts})`);
  else if (straightOuts > 0) labels.push(`Gutshot (${straightOuts})`);
  if (pairOuts > 0) labels.push(`Overcards (${pairOuts})`);

  const unseen = 52 - known.length;
  return {
    drawLabels: labels,
    cleanOuts: outs,
    totalCleanOutsCount: outs.length,
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

export function isWetBoard(board: Card[]): boolean {
  const flop = board.slice(0, 3);
  const suitCounts: Record<string, number> = {};
  flop.forEach(c => { suitCounts[c.suit] = (suitCounts[c.suit] || 0) + 1; });
  const maxSuit = Math.max(...Object.values(suitCounts));
  const vals = [...new Set(flop.map(c => RANK_VALUES[c.rank]))].sort((a, b) => a - b);
  const span = vals[vals.length - 1] - vals[0];
  const connected = vals.length === 3 && span <= 4;
  return maxSuit >= 3 || (maxSuit === 2 && connected) || (connected && vals[0] >= 6);
}

export function analyzeBoardTexture(board: Card[]): string {
  if (board.length < 3) return 'Preflop';
  const suitCounts: Record<Suit, number> = { s: 0, h: 0, d: 0, c: 0 };
  board.forEach(c => { suitCounts[c.suit]++; });
  const maxSuit = Math.max(...Object.values(suitCounts));
  const paired = boardCategory(board) >= 1;
  const suitTxt = maxSuit >= 3 ? 'monocolor' : maxSuit === 2 ? 'dos palos' : 'rainbow';
  if (paired) return `Pareado · ${suitTxt}`;
  return `${isWetBoard(board) ? 'Húmedo' : 'Seco'} · ${suitTxt}`;
}
