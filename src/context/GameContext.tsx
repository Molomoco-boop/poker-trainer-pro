import React, { useState, useEffect, useCallback } from 'react';
import {
  UserStats,
  HandStep,
  StakeLevel,
  PedagogicalLevel,
  SpotType,
  SessionHandResult,
  MistakeRecord,
  ReviewKey,
  CLOCKWISE_POSITIONS
} from '../types/poker';
import { playSuccessSound, playErrorSound, playLevelUpSound, triggerHaptic } from '../utils/audio';
import { evaluatePedagogicalDifficulty, LEVEL_WINDOW } from '../utils/difficultyEngine';
import { GameContext, LevelNotice } from './useGame';

const STORAGE_KEY = 'poker_trainer_pro_v5';
const SCHEMA_VERSION = 3;

/** Review intervals in decisions for stages 0, 1, 2. */
const REVIEW_INTERVALS = [3, 10, 30];

const sameKey = (a: ReviewKey, b: ReviewKey) =>
  a.kind === b.kind && a.spot === b.spot && a.heroPos === b.heroPos && a.villainPos === b.villainPos &&
  a.hand === b.hand && a.street === b.street && a.cls === b.cls && a.decision === b.decision;

const STREET_LABEL: Record<string, string> = { flop: 'Flop', turn: 'Turn', river: 'River' };

function keyLabel(k: ReviewKey): string {
  if (k.kind === 'odds') return 'Pot odds';
  if (k.kind === 'equity') return 'Outs';
  if (k.kind === 'ev') return 'EV';
  const vs = k.villainPos ? ` vs ${k.villainPos}` : '';
  if (k.kind === 'pre') return `${k.heroPos}${vs} · ${k.hand}`;
  return `${k.heroPos}${vs} · ${STREET_LABEL[k.street || 'flop']}`;
}

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
    trainingPositions: [...CLOCKWISE_POSITIONS]
  },
  categoryStats: { ...DEFAULT_CATEGORY_STATS },
  mistakeQueue: []
};



export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [levelNotice, setLevelNotice] = useState<LevelNotice | null>(null);
  const clearLevelNotice = useCallback(() => setLevelNotice(null), []);
  const [stats, setStats] = useState<UserStats>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.schemaVersion !== SCHEMA_VERSION) {
          // step format changed: drop stored steps, keep totals and preferences
          parsed.mistakeQueue = [];
          parsed.sessionHands = [];
          parsed.recentAnswers = [];
          if (parsed.preferences) delete parsed.preferences.showHandStrength;
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

    // Level: last 20 counted answers (easy correct folds do not count)
    const counts = !(step.trivial && isCorrect);
    const recent = counts ? [...stats.recentAnswers, isCorrect].slice(-LEVEL_WINDOW) : stats.recentAnswers;
    const diffResult = evaluatePedagogicalDifficulty(stats.pedagogicalLevel, recent, stats.autoAdjustDifficulty);
    if (diffResult.changed) {
      setLevelNotice({ level: diffResult.newLevel, up: diffResult.reason === 'level_up' });
      if (diffResult.reason === 'level_up' && stats.preferences.soundEnabled) playLevelUpSound(stats.preferences.volume);
    }

    setStats(prev => {
      const spot = step.spotType;
      const prevCat = prev.categoryStats[spot] || { total: 0, correct: 0 };
      const updatedCatStats = {
        ...prev.categoryStats,
        [spot]: { total: prevCat.total + 1, correct: prevCat.correct + (isCorrect ? 1 : 0) }
      };

      // Spaced repetition: errors come back 3, 10 and 30 decisions later
      const now = prev.totalHandsPlayed + 1;
      let queue: MistakeRecord[] = [...(prev.mistakeQueue || [])];
      const correctOpt = [...step.options].sort((a, b) => b.frequencyGTO - a.frequencyGTO)[0];
      const reviewed = step.reviewOf ? queue.find(m => m.id === step.reviewOf) : undefined;
      if (reviewed) {
        if (isCorrect) {
          const stage = reviewed.stage + 1;
          queue = stage >= REVIEW_INTERVALS.length
            ? queue.filter(m => m.id !== reviewed.id)
            : queue.map(m => (m.id === reviewed.id ? { ...m, stage, dueAt: now + REVIEW_INTERVALS[stage] } : m));
        } else {
          queue = queue.map(m => (m.id === reviewed.id
            ? { ...m, stage: 0, dueAt: now + REVIEW_INTERVALS[0], repetitionCount: m.repetitionCount + 1, userAnswerId: selectedOptionId, userAnswerLabel: selectedOption?.label || selectedOptionId, correctAnswerLabel: correctOpt?.label || '', evLostBB: Math.abs(evDiffNum) }
            : m));
        }
      } else if (verdict === 'error') {
        const existing = queue.find(m => sameKey(m.key, step.review));
        const rec: MistakeRecord = {
          id: existing?.id || `mistake_${Date.now()}`,
          timestamp: Date.now(),
          key: step.review,
          stage: 0,
          dueAt: now + REVIEW_INTERVALS[0],
          failedAtHandIndex: prev.totalHandsPlayed,
          repetitionCount: existing ? existing.repetitionCount + 1 : 0,
          label: keyLabel(step.review),
          userAnswerId: selectedOptionId,
          userAnswerLabel: selectedOption?.label || selectedOptionId,
          correctAnswerLabel: correctOpt?.label || '',
          evLostBB: Math.abs(evDiffNum)
        };
        queue = [rec, ...queue.filter(m => m.id !== rec.id)].slice(0, 50);
      }

      const sessionEntry: SessionHandResult = {
        id: `sess_${Date.now()}`,
        handName: step.contextNotice,
        position: step.heroPosition,
        street: step.street,
        verdict,
        evDiffNum,
        userAnswer: selectedOption?.label || selectedOptionId,
        correctAnswer: correctOpt?.label || 'Óptima'
      };

      return {
        ...prev,
        pedagogicalLevel: diffResult.newLevel,
        consecutiveCorrect: isCorrect ? prev.consecutiveCorrect + 1 : 0,
        recentAnswers: diffResult.changed ? [] : recent,
        totalHandsPlayed: now,
        totalCorrectDecisions: prev.totalCorrectDecisions + (isCorrect ? 1 : 0),
        totalDecisions: prev.totalDecisions + 1,
        totalEvAccumulatedBB: Math.round((prev.totalEvAccumulatedBB + evDiffNum) * 100) / 100,
        dailyDrillCount: opts.daily
          ? Math.min(10, (prev.dailyDrillDate === todayKey() ? prev.dailyDrillCount : 0) + 1)
          : (prev.dailyDrillDate === todayKey() ? prev.dailyDrillCount : 0),
        dailyDrillDate: todayKey(),
        categoryStats: updatedCatStats,
        mistakeQueue: queue,
        sessionHands: [sessionEntry, ...prev.sessionHands].slice(0, 30)
      };
    });

    return { isCorrect, levelChanged: diffResult.changed };
  };

  const setStake = (stake: StakeLevel) => {
    setStats(prev => ({ ...prev, stake }));
  };

  const setPedagogicalLevel = (lvl: PedagogicalLevel) => {
    setStats(prev => ({ ...prev, pedagogicalLevel: lvl, recentAnswers: [] }));
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
        getTopLeaks,
        levelNotice,
        clearLevelNotice
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

