import { Card } from '../types/poker';
import { RANK_VALUES, evaluateHand, compareEvaluations } from './pokerEvaluator';
import { RANKS_ORDER } from '../data/preflopRanges';
import { boardCategory, detectCleanOuts, DrawDetectionResult, boardHasFourToHand, isConnectedBoard } from './pokerMath';

export type StrengthClass = 'monster' | 'strong' | 'medium' | 'weak' | 'draw' | 'weakdraw' | 'air';

export const CLASS_ES: Record<StrengthClass, string> = {
  monster: 'Monster',
  strong: 'Strong',
  medium: 'Medium',
  weak: 'Weak',
  draw: 'Draw',
  weakdraw: 'Weak draw',
  air: 'Air'
};

export interface HandClass {
  cls: StrengthClass;
  draws: DrawDetectionResult;
  /** True when the hero's best hand is only the board. */
  playsBoard: boolean;
  /** Board danger that lowered the class: "escalera", "color" or "full". */
  threat: string | null;
}

const ORDER: StrengthClass[] = ['weak', 'medium', 'strong', 'monster'];

function maxSuitCount(board: Card[]): number {
  const c: Record<string, number> = {};
  board.forEach(x => { c[x.suit] = (c[x.suit] || 0) + 1; });
  return Math.max(0, ...Object.values(c));
}

/** Straight top cards (5..14) that two unknown cards could make with this board. */
function straightTopsPossible(board: Card[]): number[] {
  const vals = new Set(board.map(c => RANK_VALUES[c.rank]));
  if (vals.has(14)) vals.add(1);
  const tops: number[] = [];
  for (let top = 5; top <= 14; top++) {
    let have = 0;
    for (let v = top - 4; v <= top; v++) if (vals.has(v)) have++;
    if (have >= 3) tops.push(top);
  }
  return tops;
}

/**
 * Steps down made hands that are not the nuts on dangerous boards:
 * straight or flush possible, four to a straight/flush, paired board under a straight/flush.
 */
function boardDowngrade(hero: [Card, Card], board: Card[], score: number, tiebreak: number[]): { steps: number; threat: string | null } {
  if (board.length < 3) return { steps: 0, threat: null };
  let steps = 0;
  let threat: string | null = null;
  const suitMax = maxSuitCount(board);
  const straightTwo = isConnectedBoard(board);
  const four = boardHasFourToHand(board);
  const paired = new Set(board.map(c => c.rank)).size < board.length;
  if (score < 4 && straightTwo) { steps++; threat = 'escalera'; }
  if (score < 4 && four && suitMax < 4) steps++;
  if (score < 5 && suitMax >= 3) { steps++; threat = threat || 'color'; }
  if (score < 5 && suitMax >= 4) steps++;
  if (score === 4) {
    const higher = straightTopsPossible(board).some(t => t > tiebreak[0]);
    if (higher) { steps++; threat = 'escalera'; }
    if (suitMax >= 3) { steps++; threat = 'color'; }
  }
  if (score === 5 && suitMax >= 3) {
    const suit = Object.entries(board.reduce<Record<string, number>>((a, c) => { a[c.suit] = (a[c.suit] || 0) + 1; return a; }, {}))
      .sort((a, b) => b[1] - a[1])[0][0];
    const known = new Set([...board, ...hero].filter(c => c.suit === suit).map(c => RANK_VALUES[c.rank]));
    let nut = 14;
    while (known.has(nut) && !hero.some(h => h.suit === suit && RANK_VALUES[h.rank] === nut)) nut--;
    const heroHasNut = hero.some(h => h.suit === suit && RANK_VALUES[h.rank] === nut);
    const heroTop = Math.max(0, ...hero.filter(h => h.suit === suit).map(h => RANK_VALUES[h.rank]));
    if (!heroHasNut && (suitMax >= 4 || heroTop < 12)) { steps++; threat = 'color'; }
  }
  if ((score === 4 || score === 5) && paired) { steps++; threat = 'full'; }
  return { steps: Math.min(2, steps), threat: steps ? threat : null };
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

  let threat: string | null = null;
  const idx = ORDER.indexOf(cls);
  if (idx >= 0 && !playsBoard) {
    const d = boardDowngrade(hero, board, ev.score, ev.tiebreakers);
    // a straight or flush that already lost a class (it beats a board straight) keeps "strong"
    if (d.steps && !(ev.score >= 4 && cls === 'strong' && d.steps === 1)) {
      cls = ORDER[Math.max(0, idx - d.steps)];
      threat = d.threat;
    }
  }
  return { cls, draws, playsBoard, threat };
}

export function cardsToHandLabel(cards: [Card, Card]): string {
  const i1 = RANKS_ORDER.indexOf(cards[0].rank);
  const i2 = RANKS_ORDER.indexOf(cards[1].rank);
  const [hi, lo] = i1 <= i2 ? [cards[0], cards[1]] : [cards[1], cards[0]];
  if (hi.rank === lo.rank) return `${hi.rank}${lo.rank}`;
  return `${hi.rank}${lo.rank}${hi.suit === lo.suit ? 's' : 'o'}`;
}
