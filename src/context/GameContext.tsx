import React, { useState, useEffect, useCallback } from 'react';
import { UserStats, HandStep, StakeLevel, MistakeRecord } from '../types/poker';
import { playSuccessSound, playErrorSound, triggerHaptic } from '../utils/audio';
import { GameContext, AnswerResult } from './useGame';
import { STORAGE_KEY, DEFAULT_STATS, migrateStats, applyAnswer, sameKey, keyLabel, RecordOpts } from './statsLogic';

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [stats, setStats] = useState<UserStats>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return migrateStats(JSON.parse(saved));
    } catch {
      // corrupted data: start fresh
    }
    return DEFAULT_STATS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
    } catch (e) {
      console.error('Error saving stats to localStorage', e);
    }
  }, [stats]);

  const toggleDisplayUnits = () => {
    setStats(prev => ({
      ...prev,
      preferences: { ...prev.preferences, displayUnits: prev.preferences.displayUnits === 'bb' ? 'units' : 'bb' }
    }));
  };

  const recordStepAnswer = (step: HandStep, optId: string, opts: RecordOpts = {}): AnswerResult => {
    const { next, result } = applyAnswer(stats, step, optId, opts);
    const { soundEnabled, volume, hapticsEnabled } = stats.preferences;
    if (soundEnabled) (result.isCorrect ? playSuccessSound : playErrorSound)(volume);
    if (hapticsEnabled) triggerHaptic(result.isCorrect ? 'optimal' : result.grade === 'imprecise' ? 'tap' : 'error', true);
    setStats(next);
    return result;
  };

  /** "Dudé": the spot comes back 3 decisions later even if it was right. */
  const markDoubt = (step: HandStep) => {
    setStats(prev => {
      const now = prev.totalHandsPlayed;
      const existing = prev.mistakeQueue.find(m => sameKey(m.key, step.review));
      if (existing) {
        return { ...prev, mistakeQueue: prev.mistakeQueue.map(m => (m.id === existing.id ? { ...m, stage: 0, dueAt: now + 3 } : m)) };
      }
      const correctOpt = [...step.options].sort((a, b) => b.frequencyGTO - a.frequencyGTO)[0];
      const rec: MistakeRecord = {
        id: `doubt_${Date.now()}`,
        timestamp: Date.now(),
        key: step.review,
        stage: 0,
        dueAt: now + 3,
        failedAtHandIndex: now,
        repetitionCount: 0,
        label: keyLabel(step.review),
        userAnswerId: '',
        userAnswerLabel: 'Doubt',
        correctAnswerLabel: correctOpt?.label || ''
      };
      return { ...prev, mistakeQueue: [rec, ...prev.mistakeQueue].slice(0, 50) };
    });
  };

  const finishPlacement = useCallback((curriculumIndex: number) => {
    setStats(prev => ({ ...prev, placementDone: true, curriculumIndex: Math.max(prev.curriculumIndex, curriculumIndex) }));
  }, []);

  const recordSprint = useCallback((score: number) => {
    setStats(prev => ({ ...prev, sprintBest: Math.max(prev.sprintBest, score) }));
  }, []);

  const recordRange = useCallback((task: string, score: number) => {
    setStats(prev => ({ ...prev, rangeBest: { ...prev.rangeBest, [task]: Math.max(prev.rangeBest[task] || 0, score) } }));
  }, []);

  const setStake = (stake: StakeLevel) => setStats(prev => ({ ...prev, stake }));

  const updatePreferences = (newPrefs: Partial<UserStats['preferences']>) => {
    setStats(prev => ({ ...prev, preferences: { ...prev.preferences, ...newPrefs } }));
  };

  const updateUserProfile = (name: string, email: string) => setStats(prev => ({ ...prev, username: name, email }));

  const resetAllStats = () => setStats({ ...DEFAULT_STATS, stake: stats.stake, preferences: stats.preferences });

  const clearMistakes = () => setStats(prev => ({ ...prev, mistakeQueue: [] }));

  return (
    <GameContext.Provider
      value={{
        stats,
        recordStepAnswer,
        markDoubt,
        finishPlacement,
        recordSprint,
        recordRange,
        setStake,
        toggleDisplayUnits,
        updatePreferences,
        updateUserProfile,
        resetAllStats,
        clearMistakes
      }}
    >
      {children}
    </GameContext.Provider>
  );
};
