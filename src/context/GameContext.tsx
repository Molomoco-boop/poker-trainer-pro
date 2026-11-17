import React, { useState, useEffect } from 'react';
import { GameContext } from './useGame';
import {
  UserStats,
  HandStep,
  StakeLevel,
  PedagogicalLevel,
  SpotType,
  SessionHandResult,
  CLOCKWISE_POSITIONS
} from '../types/poker';
import { playSuccessSound, playErrorSound, playLevelUpSound, triggerHaptic } from '../utils/audio';
import { evaluatePedagogicalDifficulty } from '../utils/difficultyEngine';

const STORAGE_KEY = 'poker_trainer_pro_v5';
const SCHEMA_VERSION = 2;

const todayKey = () => new Date().toLocaleDateString('sv-SE');

const DEFAULT_CATEGORY_STATS: Record<SpotType, { total: number; correct: number }> = {
  RFI_OPEN: { total: 0, correct: 0 },
  BB_DEFENSE: { total: 0, correct: 0 },
  SB_VS_OPEN: { total: 0, correct: 0 },
  '3BET_POT': { total: 0, correct: 0 },
  CBET_FLOP: { total: 0, correct: 0 },
  FACING_CBET: { total: 0, correct: 0 },
  TURN_RIVER_DECISION: { total: 0, correct: 0 },
  POT_ODDS_DRILL: { total: 0, correct: 0 }
};

const DEFAULT_STATS: UserStats = {
  username: 'Jugador',
  email: '',
  stake: 'NL10',
  pedagogicalLevel: 2, // Nivel 2 - Estándar
  autoAdjustDifficulty: true,
  consecutiveCorrect: 0,
  recentAnswers: [],
  totalHandsPlayed: 0,
  totalCorrectDecisions: 0,
  totalDecisions: 0,
  totalEvAccumulatedBB: 0,
  dailyDrillCount: 0,
  dailyDrillDate: '',
  schemaVersion: SCHEMA_VERSION,
  sessionHands: [],
  preferences: {
    volume: 80,
    soundEnabled: true,
    hapticsEnabled: true,
    animationSpeed: 'normal',
    dailyReminder: true,
    displayUnits: 'bb',
    deckColorMode: '4color',
    showHandStrength: true,
    trainingPositions: [...CLOCKWISE_POSITIONS]
  },
  categoryStats: { ...DEFAULT_CATEGORY_STATS },
  mistakeQueue: []
};



export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [stats, setStats] = useState<UserStats>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.schemaVersion !== SCHEMA_VERSION) {
          // step format changed: drop stored steps, keep totals and preferences
          parsed.mistakeQueue = [];
          parsed.sessionHands = [];
          parsed.schemaVersion = SCHEMA_VERSION;
          delete parsed.opponentProfile;
          delete parsed.xp;
          delete parsed.streakDays;
          if (parsed.email === 'miguelmuletginer@gmail.com') parsed.email = '';
        }
        if (parsed.dailyDrillDate !== todayKey()) {
          parsed.dailyDrillCount = 0;
          parsed.dailyDrillDate = todayKey();
        }
        return {
          ...DEFAULT_STATS,
          ...parsed,
          categoryStats: { ...DEFAULT_CATEGORY_STATS, ...(parsed.categoryStats || {}) },
          preferences: { ...DEFAULT_STATS.preferences, ...(parsed.preferences || {}) }
        };
      }
    } catch {
      // fallback
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
      preferences: {
        ...prev.preferences,
        displayUnits: prev.preferences.displayUnits === 'bb' ? 'units' : 'bb'
      }
    }));
  };

  const recordStepAnswer = (step: HandStep, selectedOptionId: string, opts: { daily?: boolean } = {}) => {
    const selectedOption = step.options.find(o => o.id === selectedOptionId);
    const isCorrect = !!selectedOption?.isCorrect;
    const evDiffNum = selectedOption?.evDiffNum || 0;
    const verdict = selectedOption?.verdict || (isCorrect ? 'optimal' : 'error');

    // Sound & Haptics
    if (stats.preferences.soundEnabled) {
      if (isCorrect) {
        playSuccessSound(stats.preferences.volume);
      } else {
        playErrorSound(stats.preferences.volume);
      }
    }

    if (stats.preferences.hapticsEnabled) {
      if (verdict === 'optimal') {
        triggerHaptic('optimal', true);
      } else if (verdict === 'error') {
        triggerHaptic('error', true);
      } else {
        triggerHaptic('tap', true);
      }
    }

    // Difficulty adjustment
    const diffResult = evaluatePedagogicalDifficulty(
      stats.pedagogicalLevel,
      isCorrect,
      stats.consecutiveCorrect,
      stats.recentAnswers,
      stats.autoAdjustDifficulty
    );

    if (diffResult.changed && diffResult.reason === 'level_up' && stats.preferences.soundEnabled) {
      playLevelUpSound(stats.preferences.volume);
    }

    setStats(prev => {
      // Update Category Stats
      const spot = step.spotType;
      const prevCat = prev.categoryStats[spot] || { total: 0, correct: 0 };
      const updatedCatStats = {
        ...prev.categoryStats,
        [spot]: {
          total: prevCat.total + 1,
          correct: prevCat.correct + (isCorrect ? 1 : 0)
        }
      };

      // Update Mistake Queue
      let updatedQueue = [...(prev.mistakeQueue || [])];

      if (step.isReviewOfMistake) {
        // Find mistake in queue
        const mistakeIndex = updatedQueue.findIndex(m => m.step.id === step.id);
        if (mistakeIndex >= 0) {
          if (isCorrect) {
            updatedQueue[mistakeIndex].consecutiveSuccesses++;
            if (updatedQueue[mistakeIndex].consecutiveSuccesses >= 3) {
              // Mastered! Remove from queue
              updatedQueue.splice(mistakeIndex, 1);
            }
          } else {
            updatedQueue[mistakeIndex].consecutiveSuccesses = 0;
            updatedQueue[mistakeIndex].repetitionCount++;
          }
        }
      } else if (!isCorrect && verdict === 'error') {
        const correctOpt = step.options.find(o => o.isCorrect);
        updatedQueue.unshift({
          id: `mistake_${Date.now()}`,
          timestamp: Date.now(),
          step,
          failedAtHandIndex: prev.totalHandsPlayed,
          repetitionCount: 0,
          consecutiveSuccesses: 0,
          userAnswerId: selectedOptionId,
          userAnswerLabel: selectedOption?.label || selectedOptionId,
          correctAnswerLabel: correctOpt?.label || 'Jugada Óptima',
          evLostBB: Math.abs(evDiffNum)
        });
        if (updatedQueue.length > 50) updatedQueue.pop();
      }

      // Update Session Hands (capped at last 20 for memory)
      const correctOpt = step.options.find(o => o.isCorrect);
      const sessionEntry: SessionHandResult = {
        id: `sess_${Date.now()}`,
        handName: step.handStrengthName || step.contextNotice,
        position: step.heroPosition,
        street: step.street,
        verdict,
        evDiffNum,
        userAnswer: selectedOption?.label || selectedOptionId,
        correctAnswer: correctOpt?.label || 'Óptima'
      };

      const updatedSession = [sessionEntry, ...prev.sessionHands].slice(0, 30);
      const updatedRecentAnswers = [...prev.recentAnswers, isCorrect].slice(-5);

      return {
        ...prev,
        pedagogicalLevel: diffResult.newLevel,
        consecutiveCorrect: diffResult.consecutiveCorrect,
        recentAnswers: updatedRecentAnswers,
        totalHandsPlayed: prev.totalHandsPlayed + 1,
        totalCorrectDecisions: prev.totalCorrectDecisions + (isCorrect ? 1 : 0),
        totalDecisions: prev.totalDecisions + 1,
        totalEvAccumulatedBB: Math.round((prev.totalEvAccumulatedBB + evDiffNum) * 100) / 100,
        dailyDrillCount: opts.daily
          ? Math.min(10, (prev.dailyDrillDate === todayKey() ? prev.dailyDrillCount : 0) + 1)
          : (prev.dailyDrillDate === todayKey() ? prev.dailyDrillCount : 0),
        dailyDrillDate: todayKey(),
        categoryStats: updatedCatStats,
        mistakeQueue: updatedQueue,
        sessionHands: updatedSession
      };
    });

    return { isCorrect, levelChanged: diffResult.changed };
  };

  const setStake = (stake: StakeLevel) => {
    setStats(prev => ({ ...prev, stake }));
  };

  const setPedagogicalLevel = (lvl: PedagogicalLevel) => {
    setStats(prev => ({ ...prev, pedagogicalLevel: lvl }));
  };

  const setAutoAdjustDifficulty = (enabled: boolean) => {
    setStats(prev => ({ ...prev, autoAdjustDifficulty: enabled }));
  };

  const updatePreferences = (newPrefs: Partial<UserStats['preferences']>) => {
    setStats(prev => ({
      ...prev,
      preferences: { ...prev.preferences, ...newPrefs }
    }));
  };

  const updateUserProfile = (name: string, email: string) => {
    setStats(prev => ({
      ...prev,
      username: name,
      email: email
    }));
  };

  const resetAllStats = () => {
    setStats({
      ...DEFAULT_STATS,
      stake: stats.stake,
      preferences: stats.preferences
    });
  };

  const clearMistakes = () => {
    setStats(prev => ({ ...prev, mistakeQueue: [] }));
  };

  const getTopLeaks = () => {
    const list = Object.entries(stats.categoryStats || {}) as [SpotType, { total: number; correct: number }][];
    const withHands = list.filter(([, data]) => data.total >= 2);
    if (withHands.length === 0) return [];
    withHands.sort((a, b) => (a[1].correct / a[1].total) - (b[1].correct / b[1].total));
    return withHands.slice(0, 2).map(([spot, data]) => ({
      spotType: spot,
      accuracyPct: Math.round((data.correct / data.total) * 100),
      totalHands: data.total
    }));
  };

  return (
    <GameContext.Provider
      value={{
        stats,
        recordStepAnswer,
        setStake,
        setPedagogicalLevel,
        setAutoAdjustDifficulty,
        toggleDisplayUnits,
        updatePreferences,
        updateUserProfile,
        resetAllStats,
        clearMistakes,
        getTopLeaks
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

