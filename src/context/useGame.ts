import { createContext, useContext } from 'react';
import { UserStats, HandStep, StakeLevel, Grade } from '../types/poker';

export interface AnswerResult {
  isCorrect: boolean;
  grade: Grade;
  /** Rating change (rounded). */
  delta: number;
  rating: number;
  confidence: 'fast' | 'normal' | 'slow';
}

export interface GameContextType {
  stats: UserStats;
  recordStepAnswer: (step: HandStep, selectedOptionId: string, opts?: { daily?: boolean; ms?: number; rated?: boolean }) => AnswerResult;
  markDoubt: (step: HandStep) => void;
  finishPlacement: (curriculumIndex: number) => void;
  recordSprint: (score: number) => void;
  recordRange: (task: string, score: number) => void;
  setStake: (stake: StakeLevel) => void;
  toggleDisplayUnits: () => void;
  updatePreferences: (newPrefs: Partial<UserStats['preferences']>) => void;
  updateUserProfile: (name: string, email: string) => void;
  resetAllStats: () => void;
  clearMistakes: () => void;
}

export const GameContext = createContext<GameContextType | undefined>(undefined);

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within a GameProvider');
  return context;
};
