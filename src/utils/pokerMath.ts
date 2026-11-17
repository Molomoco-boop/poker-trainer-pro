import { Card, Rank, Suit } from '../types/poker';
import { RANKS, SUITS, evaluateHand } from './pokerEvaluator';

export function calculatePotOddsPct(callAmountBB: number, potBeforeCallBB: number): number {
  if (callAmountBB <= 0) return 0;
  const finalPot = potBeforeCallBB + callAmountBB;
  return Math.round((callAmountBB / finalPot) * 1000) / 10;
}

export function calculateSPR(effectiveStackBB: number, currentPotBB: number): number {
  if (currentPotBB <= 0) return 99;
  return Math.round((effectiveStackBB / currentPotBB) * 10) / 10;
}

export interface DrawDetectionResult {
  drawLabels: string[];
  cleanOuts: Card[];
  totalCleanOutsCount: number;
  equityTurnPct: number;
  equityRiverPct: number;
}

export function detectCleanOuts(heroCards: [Card, Card], board: Card[]): DrawDetectionResult {
  if (board.length < 3 || heroCards.length < 2) {
    return {
      drawLabels: [],
      cleanOuts: [],
      totalCleanOutsCount: 0,
      equityTurnPct: 0,
      equityRiverPct: 0
    };
  }

  const allKnown = [...heroCards, ...board];
  const currentBest = evaluateHand(allKnown);
  const drawLabels: string[] = [];

  // Generate all remaining 52-card deck cards
  const remainingDeck: Card[] = [];
  for (const s of SUITS) {
    for (const r of RANKS) {
      if (!allKnown.some(c => c.rank === r && c.suit === s)) {
        remainingDeck.push({ rank: r, suit: s });
      }
    }
  }

  // Check Flush Draw
  const suitCounts: Record<Suit, number> = { s: 0, h: 0, d: 0, c: 0 };
  allKnown.forEach(c => suitCounts[c.suit]++);
  let flushSuit: Suit | null = null;
  for (const s of SUITS) {
    if (suitCounts[s] === 4) {
      flushSuit = s;
      drawLabels.push('Proyecto de Color (9 outs)');
      break;
    }
  }

  // Find all cards in remaining deck that strictly improve the hand above current rank
  const improvingCards: Card[] = [];

  for (const candidate of remainingDeck) {
    const trialHand = evaluateHand([...allKnown, candidate]);
    if (trialHand.score > currentBest.score) {
      improvingCards.push(candidate);
    }
  }

  // Deduplicate and categorize
  // Check for straight draws
  const rankIndices = Array.from(new Set(allKnown.map(c => RANKS.indexOf(c.rank)))).sort((a, b) => a - b);
  let hasOESD = false;
  let hasGutshot = false;

  // Simple heuristic for label naming
  const straightImprovers = improvingCards.filter(c => {
    const trial = evaluateHand([...allKnown, c]);
    return trial.name.includes('Escalera');
  });

  if (straightImprovers.length >= 8) {
    hasOESD = true;
    drawLabels.push('Escalera Abierta / OESD (8 outs)');
  } else if (straightImprovers.length >= 4) {
    hasGutshot = true;
    drawLabels.push('Escalera Interna / Gutshot (4 outs)');
  }

  // Check Overcards
  const boardMaxRankIdx = Math.max(...board.map(c => RANKS.indexOf(c.rank)));
  const heroOvercards = heroCards.filter(c => RANKS.indexOf(c.rank) > boardMaxRankIdx);
  if (heroOvercards.length > 0 && currentBest.score < 2000000) {
    // Only highlight overcards if not already paired on board
    drawLabels.push(`Overcards (${heroOvercards.length * 3} outs)`);
  }

  // Unique clean improving cards
  const uniqueCleanOuts = improvingCards.filter((card, index, self) =>
    index === self.findIndex(c => c.rank === card.rank && c.suit === card.suit)
  );

  const totalCount = uniqueCleanOuts.length;
  const equityTurnPct = Math.min(100, Math.round(totalCount * 2));
  const equityRiverPct = Math.min(100, Math.round(totalCount * 4));

  return {
    drawLabels,
    cleanOuts: uniqueCleanOuts,
    totalCleanOutsCount: totalCount,
    equityTurnPct,
    equityRiverPct
  };
}

export function analyzeBoardTexture(board: Card[]): string {
  if (board.length < 3) return 'Preflop';
  
  const suits = board.map(c => c.suit);
  const suitCounts = suits.reduce((acc, s) => ({ ...acc, [s]: (acc[s] || 0) + 1 }), {} as Record<string, number>);
  const maxSuitCount = Math.max(...Object.values(suitCounts));
  const isMonotone = maxSuitCount >= 3;
  const isTwoTone = maxSuitCount === 2;
  const isRainbow = maxSuitCount === 1;

  const ranks = board.map(c => RANKS.indexOf(c.rank)).sort((a, b) => a - b);
  const rankCounts = ranks.reduce((acc, r) => ({ ...acc, [r]: (acc[r] || 0) + 1 }), {} as Record<number, number>);
  const isPaired = Object.values(rankCounts).some(c => c >= 2);

  let connectedness = 'Desconectado (Seco)';
  let maxGap = 0;
  for (let i = 0; i < ranks.length - 1; i++) {
    const diff = Math.abs(ranks[i + 1] - ranks[i]);
    if (diff === 1 || diff === 2) maxGap++;
  }
  if (maxGap >= 2) connectedness = 'Coordinado / Húmedo';

  if (isPaired) {
    return `Board Pareado · ${isTwoTone ? 'Dos Palos' : isRainbow ? 'Rainbow' : 'Monocolor'}`;
  }
  if (isMonotone) {
    return 'Board Monocolor (3 cartas del mismo palo) · Muy Dinámico';
  }
  if (connectedness.includes('Coordinado')) {
    return `Board Coordinado / Húmedo · ${isTwoTone ? 'Dos Palos (Flush draw activo)' : 'Rainbow'}`;
  }
  return `Board Seco · ${isRainbow ? 'Rainbow' : 'Dos Palos'} (Baja interacción)`;
}
