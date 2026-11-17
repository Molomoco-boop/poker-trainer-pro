import { StakeLevel, STAKE_CONFIG } from '../types/poker';

/** Converts BB to euros for the chosen stake. */
export function convertBBToEUR(amountBB: number, stake: StakeLevel): number {
  const cfg = STAKE_CONFIG[stake] || STAKE_CONFIG.NL10;
  return Math.round(amountBB * cfg.bbInEuros * 100) / 100;
}
