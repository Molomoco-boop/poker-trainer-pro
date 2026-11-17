import { PedagogicalLevel, StakeLevel, STAKE_CONFIG, PEDAGOGICAL_LEVEL_NAMES } from '../types/poker';

export { PEDAGOGICAL_LEVEL_NAMES };

export interface DifficultyAdjustmentResult {
  newLevel: PedagogicalLevel;
  changed: boolean;
  reason?: 'level_up' | 'level_down';
  consecutiveCorrect: number;
}

export function evaluatePedagogicalDifficulty(
  currentLevel: PedagogicalLevel,
  isCorrect: boolean,
  consecutiveCorrect: number,
  recentAnswers: boolean[], // last answers (including this one)
  autoAdjust: boolean
): DifficultyAdjustmentResult {
  if (!autoAdjust) {
    return {
      newLevel: currentLevel,
      changed: false,
      consecutiveCorrect: isCorrect ? consecutiveCorrect + 1 : 0
    };
  }

  const updatedStreak = isCorrect ? consecutiveCorrect + 1 : 0;
  const last5 = [...recentAnswers, isCorrect].slice(-5);
  const errorsInLast5 = last5.filter(ans => !ans).length;

  // Level Up: 5 consecutive correct answers
  if (updatedStreak >= 5 && currentLevel < 4) {
    return {
      newLevel: (currentLevel + 1) as PedagogicalLevel,
      changed: true,
      reason: 'level_up',
      consecutiveCorrect: 0
    };
  }

  // Level Down: 3 errors in last 5 answers
  if (errorsInLast5 >= 3 && currentLevel > 1) {
    return {
      newLevel: (currentLevel - 1) as PedagogicalLevel,
      changed: true,
      reason: 'level_down',
      consecutiveCorrect: 0
    };
  }

  return {
    newLevel: currentLevel,
    changed: false,
    consecutiveCorrect: updatedStreak
  };
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
