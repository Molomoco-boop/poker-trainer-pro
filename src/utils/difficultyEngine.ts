import { PedagogicalLevel, StakeLevel, STAKE_CONFIG, PEDAGOGICAL_LEVEL_NAMES } from '../types/poker';

export { PEDAGOGICAL_LEVEL_NAMES };

export interface DifficultyAdjustmentResult {
  newLevel: PedagogicalLevel;
  changed: boolean;
  reason?: 'level_up' | 'level_down';
}

/** Answers kept for the level decision. */
export const LEVEL_WINDOW = 20;

/**
 * Level up: ≥80 % correct over the last 20 counted answers.
 * Level down: <50 % over the last 10. `recent` already includes the current answer.
 */
export function evaluatePedagogicalDifficulty(
  currentLevel: PedagogicalLevel,
  recent: boolean[],
  autoAdjust: boolean
): DifficultyAdjustmentResult {
  if (!autoAdjust) return { newLevel: currentLevel, changed: false };
  const last = recent.slice(-LEVEL_WINDOW);
  if (last.length >= LEVEL_WINDOW && currentLevel < 4) {
    const pct = last.filter(Boolean).length / last.length;
    if (pct >= 0.8) return { newLevel: (currentLevel + 1) as PedagogicalLevel, changed: true, reason: 'level_up' };
  }
  const last10 = recent.slice(-10);
  if (last10.length >= 10 && currentLevel > 1 && last10.filter(Boolean).length / 10 < 0.5) {
    return { newLevel: (currentLevel - 1) as PedagogicalLevel, changed: true, reason: 'level_down' };
  }
  return { newLevel: currentLevel, changed: false };
}

// Convert BB to EUR for current stake
export function convertBBToEUR(amountBB: number, stake: StakeLevel): number {
  const cfg = STAKE_CONFIG[stake] || STAKE_CONFIG.NL10;
  return Math.round(amountBB * cfg.bbInEuros * 100) / 100;
}

export function formatStakeAmount(amountBB: number, stake: StakeLevel, displayUnits: 'bb' | 'units'): string {
  if (displayUnits === 'bb') {
    return `${amountBB} BB`;
  }
  const eur = convertBBToEUR(amountBB, stake);
  return `${eur.toFixed(2)} €`;
}
