import { Card } from '../types/poker';
import { RANK_VALUES, evaluateHand } from './pokerEvaluator';
import { RANKS_ORDER } from '../data/preflopRanges';
import { boardCategory } from './pokerMath';

export type StrengthClass = 'monster' | 'strong' | 'medium' | 'weak' | 'draw' | 'weakdraw' | 'air';

function hasFlushDraw(hero: Card[], board: Card[]): boolean {
  if (board.length >= 5) return false;
  return hero.some(h => [...hero, ...board].filter(c => c.suit === h.suit).length === 4);
}

/** Number of distinct ranks that would complete a straight using at least one hole card. */
function straightDrawRanks(hero: Card[], board: Card[]): number {
  if (board.length >= 5) return 0;
  const all = [...hero, ...board];
  const vals = new Set(all.map(c => RANK_VALUES[c.rank]));
  if (vals.has(14)) vals.add(1);
  const heroVals = new Set(hero.map(c => RANK_VALUES[c.rank]));
  if (heroVals.has(14)) heroVals.add(1);
  const completing = new Set<number>();
  for (let x = 1; x <= 14; x++) {
    if (vals.has(x)) continue;
    const withX = new Set(vals); withX.add(x);
    for (let lo = 1; lo <= 10; lo++) {
      const run = [lo, lo + 1, lo + 2, lo + 3, lo + 4];
      if (run.every(v => withX.has(v)) && run.some(v => heroVals.has(v))) { completing.add(x === 1 ? 14 : x); break; }
    }
  }
  return completing.size;
}

export function classifyHand(hero: [Card, Card], board: Card[]): { cls: StrengthClass; label: string } {
  const ev = evaluateHand([...hero, ...board]);
  const bCat = boardCategory(board);
  const boardVals = [...new Set(board.map(c => RANK_VALUES[c.rank]))].sort((a, b) => b - a);
  const top = boardVals[0];
  const second = boardVals[1] ?? 0;
  const h1 = RANK_VALUES[hero[0].rank];
  const h2 = RANK_VALUES[hero[1].rank];
  const fd = hasFlushDraw(hero, board);
  const sd = straightDrawRanks(hero, board);
  const isDraw = fd || sd >= 2;
  const isWeakDraw = !isDraw && (sd === 1 || (h1 > top && h2 > top && board.length < 5));

  let cls: StrengthClass = 'air';
  if (ev.score > bCat) {
    if (ev.score >= 3) cls = 'monster';
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

  let label = ev.descr;
  if (ev.score <= bCat) {
    if (fd) label = 'Proyecto de color';
    else if (sd >= 2) label = 'Proyecto de escalera';
    else if (sd === 1) label = 'Gutshot';
    else label = ev.score === 0 ? ev.descr : `${ev.descr} (board)`;
  }
  return { cls, label };
}

export function cardsToHandLabel(cards: [Card, Card]): string {
  const i1 = RANKS_ORDER.indexOf(cards[0].rank);
  const i2 = RANKS_ORDER.indexOf(cards[1].rank);
  const [hi, lo] = i1 <= i2 ? [cards[0], cards[1]] : [cards[1], cards[0]];
  if (hi.rank === lo.rank) return `${hi.rank}${lo.rank}`;
  return `${hi.rank}${lo.rank}${hi.suit === lo.suit ? 's' : 'o'}`;
}

