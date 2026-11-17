import { Card } from '../types/poker';
import { RANK_VALUES, evaluateHand, compareEvaluations } from './pokerEvaluator';
import { RANKS_ORDER } from '../data/preflopRanges';
import { boardCategory, detectCleanOuts, DrawDetectionResult } from './pokerMath';

export type StrengthClass = 'monster' | 'strong' | 'medium' | 'weak' | 'draw' | 'weakdraw' | 'air';

export const CLASS_ES: Record<StrengthClass, string> = {
  monster: 'Mano muy fuerte',
  strong: 'Mano fuerte',
  medium: 'Mano media',
  weak: 'Mano débil',
  draw: 'Proyecto',
  weakdraw: 'Proyecto débil',
  air: 'Sin mano ni proyecto'
};

export interface HandClass {
  cls: StrengthClass;
  draws: DrawDetectionResult;
  /** True when the hero's best hand is only the board. */
  playsBoard: boolean;
}

/**
 * Strength class for decision tables. Draws come from detectCleanOuts, so straights or
 * flushes that only the board makes are never counted as hero draws.
 */
export function classifyHand(hero: [Card, Card], board: Card[]): HandClass {
  const ev = evaluateHand([...hero, ...board]);
  const draws = detectCleanOuts(hero, board);
  const outs = draws.totalCleanOutsCount;
  const bCat = boardCategory(board);
  const boardEv = board.length >= 5 ? evaluateHand(board) : null;
  // kicker-only improvements do not count; with a straight or better on board compare full hands
  const playsBoard = boardEv && bCat >= 4 ? compareEvaluations(ev, boardEv) <= 0 : ev.score <= bCat;
  const boardVals = [...new Set(board.map(c => RANK_VALUES[c.rank]))].sort((a, b) => b - a);
  const top = boardVals[0];
  const second = boardVals[1] ?? 0;
  const h1 = RANK_VALUES[hero[0].rank];
  const h2 = RANK_VALUES[hero[1].rank];
  const isDraw = outs >= 8;
  const isWeakDraw = !isDraw && outs >= 4;

  let cls: StrengthClass = 'air';
  if (!playsBoard) {
    if (ev.score >= 4 && bCat >= 4) cls = 'strong'; // beats a straight/flush on the board
    else if (ev.score >= 3) cls = 'monster';
    else if (ev.score === 2 && bCat === 0) cls = 'monster';
    else {
      // one pair made with a hole card (or pocket pair)
      if (h1 === h2) {
        cls = h1 > top ? 'strong' : h1 > second ? 'medium' : 'weak';
      } else {
        const paired = [h1, h2].find(v => boardVals.includes(v)) ?? 0;
        const kicker = paired === h1 ? h2 : h1;
        if (paired === top) cls = kicker >= 10 ? 'strong' : 'medium';
        else if (paired === second) cls = 'medium';
        else cls = 'weak';
      }
      if (isDraw && (cls === 'weak' || cls === 'medium')) cls = cls === 'weak' ? 'medium' : 'strong';
    }
  } else if (isDraw) cls = 'draw';
  else if (isWeakDraw) cls = 'weakdraw';

  return { cls, draws, playsBoard };
}

export function cardsToHandLabel(cards: [Card, Card]): string {
  const i1 = RANKS_ORDER.indexOf(cards[0].rank);
  const i2 = RANKS_ORDER.indexOf(cards[1].rank);
  const [hi, lo] = i1 <= i2 ? [cards[0], cards[1]] : [cards[1], cards[0]];
  if (hi.rank === lo.rank) return `${hi.rank}${lo.rank}`;
  return `${hi.rank}${lo.rank}${hi.suit === lo.suit ? 's' : 'o'}`;
}
