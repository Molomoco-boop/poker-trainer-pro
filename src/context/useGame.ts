import { createContext, useContext } from 'react';
import { UserStats, HandStep, StakeLevel, PedagogicalLevel, SpotType } from '../types/poker';

export interface GameContextType {
  stats: UserStats;
  recordStepAnswer: (step: HandStep, selectedOptionId: string, opts?: { daily?: boolean }) => { isCorrect: boolean; levelChanged?: boolean };
  setStake: (stake: StakeLevel) => void;
  setPedagogicalLevel: (lvl: PedagogicalLevel) => void;
  setAutoAdjustDifficulty: (enabled: boolean) => void;
  toggleDisplayUnits: () => void;
  updatePreferences: (newPrefs: Partial<UserStats['preferences']>) => void;
  updateUserProfile: (name: string, email: string) => void;
  resetAllStats: () => void;
  clearMistakes: () => void;
  getTopLeaks: () => Array<{ spotType: SpotType; accuracyPct: number; totalHands: number }>;
}

export const GameContext = createContext<GameContextType | undefined>(undefined);

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within a GameProvider');
  return context;
};
