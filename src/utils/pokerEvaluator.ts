import { Card, Rank, Suit } from '../types/poker';

export const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
export const SUITS: Suit[] = ['s', 'h', 'd', 'c'];

export const RANK_VALUES: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
  'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

export const HAND_NAMES_ES = [
  'High card',
  'Pair',
  'Two pair',
  'Three of a kind',
  'Straight',
  'Flush',
  'Full house',
  'Quads',
  'Straight flush',
  'Royal flush'
];

export interface HandEvaluation {
  score: number; // 0 (High card) to 9 (Royal Flush)
  name: string;
  tiebreakers: number[];
  descr: string;
}

export function cardToString(c: Card): string {
  const suitSymbols: Record<Suit, string> = { s: '♠', h: '♥', d: '♦', c: '♣' };
  return `${c.rank}${suitSymbols[c.suit]}`;
}

// Evaluate best 5-card combination from 5, 6, or 7 cards
export function evaluateHand(cards: Card[]): HandEvaluation {
  if (cards.length < 5) {
    return { score: 0, name: 'Incomplete', tiebreakers: [], descr: 'Fewer than 5 cards' };
  }

  // Generate all 5-card subsets if > 5 cards
  const subsets5 = getSubsets(cards, 5);
  let bestEval: HandEvaluation | null = null;

  for (const subset of subsets5) {
    const current = eval5Cards(subset);
    if (!bestEval || compareEvaluations(current, bestEval) > 0) {
      bestEval = current;
    }
  }

  return bestEval!;
}

function getSubsets<T>(array: T[], size: number): T[][] {
  if (size === 0) return [[]];
  if (array.length < size) return [];
  const [head, ...tail] = array;
  const withHead = getSubsets(tail, size - 1).map(sub => [head, ...sub]);
  const withoutHead = getSubsets(tail, size);
  return [...withHead, ...withoutHead];
}

function eval5Cards(cards: Card[]): HandEvaluation {
  const sorted = [...cards].sort((a, b) => RANK_VALUES[b.rank] - RANK_VALUES[a.rank]);
  const values = sorted.map(c => RANK_VALUES[c.rank]);
  const suits = sorted.map(c => c.suit);

  const isFlush = suits.every(s => s === suits[0]);

  // Check straight
  let isStraight = false;
  let straightHigh = 0;

  // Normal straight check
  if (
    values[0] - values[1] === 1 &&
    values[1] - values[2] === 1 &&
    values[2] - values[3] === 1 &&
    values[3] - values[4] === 1
  ) {
    isStraight = true;
    straightHigh = values[0];
  } else if (values[0] === 14 && values[1] === 5 && values[2] === 4 && values[3] === 3 && values[4] === 2) {
    // Wheel: A-2-3-4-5
    isStraight = true;
    straightHigh = 5;
  }

  // Count frequencies
  const counts: Record<number, number> = {};
  values.forEach(v => counts[v] = (counts[v] || 0) + 1);

  const countEntries = Object.entries(counts)
    .map(([val, cnt]) => ({ val: Number(val), count: cnt }))
    .sort((a, b) => b.count - a.count || b.val - a.val);

  // 9: Royal Flush / 8: Straight Flush
  if (isFlush && isStraight) {
    if (straightHigh === 14 && values.includes(10)) {
      return { score: 9, name: HAND_NAMES_ES[9], tiebreakers: [14], descr: 'Royal flush' };
    }
    return { score: 8, name: HAND_NAMES_ES[8], tiebreakers: [straightHigh], descr: `Straight flush to the ${rankLabelSingle(straightHigh)}` };
  }

  // 7: Four of a Kind (Póker)
  if (countEntries[0].count === 4) {
    return {
      score: 7,
      name: HAND_NAMES_ES[7],
      tiebreakers: [countEntries[0].val, countEntries[1].val],
      descr: `Quads, ${rankLabel(countEntries[0].val)}`
    };
  }

  // 6: Full House
  if (countEntries[0].count === 3 && countEntries[1].count === 2) {
    return {
      score: 6,
      name: HAND_NAMES_ES[6],
      tiebreakers: [countEntries[0].val, countEntries[1].val],
      descr: `Full house, ${rankLabel(countEntries[0].val)} full of ${rankLabel(countEntries[1].val)}`
    };
  }

  // 5: Flush (Color)
  if (isFlush) {
    return {
      score: 5,
      name: HAND_NAMES_ES[5],
      tiebreakers: values,
      descr: `Flush, ${rankLabelSingle(values[0])} high`
    };
  }

  // 4: Straight (Escalera)
  if (isStraight) {
    return {
      score: 4,
      name: HAND_NAMES_ES[4],
      tiebreakers: [straightHigh],
      descr: `Straight to the ${rankLabelSingle(straightHigh)}`
    };
  }

  // 3: Three of a Kind (Trío)
  if (countEntries[0].count === 3) {
    return {
      score: 3,
      name: HAND_NAMES_ES[3],
      tiebreakers: [countEntries[0].val, countEntries[1].val, countEntries[2].val],
      descr: `Three of a kind, ${rankLabel(countEntries[0].val)}`
    };
  }

  // 2: Two Pair (Doble Pareja)
  if (countEntries[0].count === 2 && countEntries[1].count === 2) {
    return {
      score: 2,
      name: HAND_NAMES_ES[2],
      tiebreakers: [countEntries[0].val, countEntries[1].val, countEntries[2].val],
      descr: `Two pair, ${rankLabel(countEntries[0].val)} and ${rankLabel(countEntries[1].val)}`
    };
  }

  // 1: One Pair (Pareja)
  if (countEntries[0].count === 2) {
    return {
      score: 1,
      name: HAND_NAMES_ES[1],
      tiebreakers: [countEntries[0].val, countEntries[1].val, countEntries[2].val, countEntries[3].val],
      descr: `Pair of ${rankLabel(countEntries[0].val)}`
    };
  }

  // 0: High Card
  return {
    score: 0,
    name: HAND_NAMES_ES[0],
    tiebreakers: values,
    descr: `${rankLabelSingle(values[0])} high`
  };
}

export function compareEvaluations(a: HandEvaluation, b: HandEvaluation): number {
  if (a.score !== b.score) return a.score - b.score;
  for (let i = 0; i < Math.max(a.tiebreakers.length, b.tiebreakers.length); i++) {
    const valA = a.tiebreakers[i] || 0;
    const valB = b.tiebreakers[i] || 0;
    if (valA !== valB) return valA - valB;
  }
  return 0; // split pot
}

function rankLabelSingle(val: number): string {
  const map: Record<number, string> = { 14: 'Ace', 13: 'King', 12: 'Queen', 11: 'Jack', 10: '10' };
  return map[val] || `${val}`;
}

function rankLabel(val: number): string {
  const map: Record<number, string> = {
    14: 'Aces', 13: 'Kings', 12: 'Queens', 11: 'Jacks', 10: 'Tens',
    9: 'Nines', 8: 'Eights', 7: 'Sevens', 6: 'Sixes', 5: 'Fives',
    4: 'Fours', 3: 'Threes', 2: 'Twos'
  };
  return map[val] || `${val}`;
}

// Create a standard clean 52-card deck
export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit });
    }
  }
  return deck;
}

export function shuffleDeck(deck: Card[]): Card[] {
  const copy = [...deck];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
