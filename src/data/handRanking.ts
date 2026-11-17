import { Position } from '../types/poker';
import { ALL_HANDS, earliestOpenPosition, handCombos } from './preflopRanges';
import { EQUITY_VS_RANDOM } from './equityVsRandom';

export interface RankedHand {
  hand: string;
  /** 1 = best. */
  rank: number;
  /** Equity vs a random hand, %. */
  equity: number;
  /** Earliest position that opens it, null = never opened. */
  openFrom: Position | null;
  combos: number;
}

const TIER_ORDER: (Position | null)[] = ['UTG', 'HJ', 'CO', 'BTN', 'SB', null];

/** All 169 hands: first by earliest open position in the app's ranges, then by equity vs a random hand. */
export const HAND_RANKING: RankedHand[] = ALL_HANDS
  .map(hand => ({ hand, equity: EQUITY_VS_RANDOM[hand] ?? 0, openFrom: earliestOpenPosition(hand), combos: handCombos(hand), rank: 0 }))
  .sort((a, b) => TIER_ORDER.indexOf(a.openFrom) - TIER_ORDER.indexOf(b.openFrom) || b.equity - a.equity)
  .map((h, i) => ({ ...h, rank: i + 1 }));

export const HAND_RANK_BY_LABEL: Record<string, RankedHand> = Object.fromEntries(HAND_RANKING.map(h => [h.hand, h]));
