import {
  UserStats,
  HandStep,
  SpotType,
  SessionHandResult,
  MistakeRecord,
  ReviewKey,
  ConceptId,
  Grade,
  CLOCKWISE_POSITIONS
} from '../types/poker';
import { START, updateRating, GRADE_SCORE } from '../utils/rating';
import { chanceOf, leakKey, advanceCurriculum, confidenceOf, reviewInterval, REVIEW_INTERVALS } from '../utils/sessionPlanner';
import type { AnswerResult } from './useGame';

export const STORAGE_KEY = 'poker_trainer_pro_v5';
export const SCHEMA_VERSION = 4;

export const sameKey = (a: ReviewKey, b: ReviewKey) =>
  a.kind === b.kind && a.spot === b.spot && a.heroPos === b.heroPos && a.villainPos === b.villainPos &&
  a.hand === b.hand && a.street === b.street && a.cls === b.cls && a.decision === b.decision && a.concept === b.concept;

const STREET_LABEL: Record<string, string> = { flop: 'Flop', turn: 'Turn', river: 'River' };

export function keyLabel(k: ReviewKey): string {
  if (k.kind !== 'pre' && k.kind !== 'post') return 'Cálculo';
  const vs = k.villainPos ? ` vs ${k.villainPos}` : '';
  if (k.kind === 'pre') return `${k.heroPos}${vs} · ${k.hand}`;
  return `${k.heroPos}${vs} · ${STREET_LABEL[k.street || 'flop']}`;
}

const todayKey = () => new Date().toLocaleDateString('sv-SE');
const yesterdayKey = () => new Date(Date.now() - 86400000).toLocaleDateString('sv-SE');

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

export const DEFAULT_STATS: UserStats = {
  username: 'Jugador',
  email: '',
  stake: 'NL10',
  rating: { ...START },
  conceptRatings: {},
  ratingHistory: [],
  consecutiveCorrect: 0,
  bestStreak: 0,
  totalHandsPlayed: 0,
  totalCorrectDecisions: 0,
  totalDecisions: 0,
  totalChance: 0,
  leakStats: {},
  placementDone: false,
  curriculumIndex: 0,
  sprintBest: 0,
  rangeBest: {},
  dayStreak: 0,
  lastActiveDay: '',
  todayDecisions: 0,
  lastReviewAt: -99,
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

const LEVEL_TO_RATING: Record<number, number> = { 1: 1300, 2: 1450, 3: 1600, 4: 1750 };

/** Upgrades any saved data (v3 levels and EV) to v4 ratings. Pure, exported for tests. */
// oxlint-disable-next-line no-explicit-any
export function migrateStats(parsed: any): UserStats {
  if (!parsed || typeof parsed !== 'object') return DEFAULT_STATS;
  const p = { ...parsed };
  if ((p.schemaVersion || 0) < 3) {
    p.mistakeQueue = [];
    p.sessionHands = [];
  }
  if ((p.schemaVersion || 0) < 4) {
    const played = p.totalDecisions || 0;
    p.rating = { r: LEVEL_TO_RATING[p.pedagogicalLevel] || 1500, rd: played > 0 ? 250 : 350, n: 0 };
    p.placementDone = played >= 30;
    p.totalChance = Math.round(played * 0.45);
    p.curriculumIndex = Math.max(0, Math.min(8, ((p.pedagogicalLevel || 1) - 1) * 2));
    p.sessionHands = [];
    p.mistakeQueue = (p.mistakeQueue || []).map((m: MistakeRecord & { evLostBB?: number }) => {
      const rest = { ...m };
      delete rest.evLostBB;
      return rest;
    });
    for (const k of ['pedagogicalLevel', 'autoAdjustDifficulty', 'recentAnswers', 'totalEvAccumulatedBB', 'opponentProfile', 'xp', 'streakDays']) delete p[k];
    if (p.preferences) delete p.preferences.showHandStrength;
    p.schemaVersion = SCHEMA_VERSION;
  }
  if (p.dailyDrillDate !== todayKey()) {
    p.dailyDrillCount = 0;
    p.dailyDrillDate = todayKey();
  }
  if (p.lastActiveDay !== todayKey()) p.todayDecisions = 0;
  return {
    ...DEFAULT_STATS,
    ...p,
    categoryStats: { ...DEFAULT_CATEGORY_STATS, ...(p.categoryStats || {}) },
    preferences: { ...DEFAULT_STATS.preferences, ...(p.preferences || {}) }
  };
}

export interface RecordOpts { daily?: boolean; ms?: number; rated?: boolean }

/** Pure state update for one answer. Exported for tests. */
export function applyAnswer(prev: UserStats, step: HandStep, optId: string, opts: RecordOpts = {}): { next: UserStats; result: AnswerResult } {
  const opt = step.options.find(o => o.id === optId);
  const isCorrect = !!opt?.isCorrect;
  const grade: Grade = opt?.grade || (isCorrect ? 'best' : 'error');
  const verdict = opt?.verdict || (isCorrect ? 'optimal' : 'error');
  const rated = opts.rated !== false;
  const score = GRADE_SCORE[grade];
  const confidence = confidenceOf(opts.ms, step.street);

  const chance = chanceOf(step);
  const rating = rated ? updateRating(prev.rating, step.difficulty, score, chance) : prev.rating;
  const delta = Math.round(rating.r) - Math.round(prev.rating.r);
  const concept: ConceptId = step.concept;
  const conceptRatings = { ...prev.conceptRatings };
  if (rated && concept) conceptRatings[concept] = updateRating(conceptRatings[concept] || { ...START, rd: 250 }, step.difficulty, score, chance);

  const leakStats = { ...prev.leakStats };
  if (step.questionType === 'action') {
    const k = leakKey(step.heroPosition, step.street);
    const cur = leakStats[k] || { n: 0, ok: 0, chance: 0 };
    leakStats[k] = { n: cur.n + 1, ok: cur.ok + (isCorrect ? 1 : 0), chance: Math.round((cur.chance + chance) * 100) / 100 };
  }

  const spot = step.spotType;
  const prevCat = prev.categoryStats[spot] || { total: 0, correct: 0 };

  // Spaced repetition by concept
  const now = prev.totalHandsPlayed + 1;
  let queue: MistakeRecord[] = [...(prev.mistakeQueue || [])];
  const correctOpt = step.options.find(o => o.grade === 'best') || [...step.options].sort((a, b) => (b.frequencyExploit ?? b.frequencyGTO) - (a.frequencyExploit ?? a.frequencyGTO))[0];
  const reviewed = step.reviewOf ? queue.find(m => m.id === step.reviewOf) : undefined;
  const base = {
    userAnswerId: optId,
    userAnswerLabel: opt?.label || optId,
    correctAnswerLabel: correctOpt?.label || ''
  };
  if (reviewed) {
    if (isCorrect) {
      const stage = confidence === 'slow' ? reviewed.stage : reviewed.stage + 1;
      queue = stage >= REVIEW_INTERVALS.length
        ? queue.filter(m => m.id !== reviewed.id)
        : queue.map(m => (m.id === reviewed.id ? { ...m, stage, dueAt: now + reviewInterval(stage, confidence) } : m));
    } else {
      queue = queue.map(m => (m.id === reviewed.id ? { ...m, ...base, stage: 0, dueAt: now + REVIEW_INTERVALS[0], repetitionCount: m.repetitionCount + 1 } : m));
    }
  } else {
    const misclick = grade === 'blunder' && opts.ms !== undefined && opts.ms < 1500;
    const wantsReview = (verdict === 'error' && !step.trivial && !misclick) || (isCorrect && confidence === 'slow' && !step.trivial);
    if (wantsReview) {
      const existing = queue.find(m => sameKey(m.key, step.review));
      const rec: MistakeRecord = {
        id: existing?.id || `mistake_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        timestamp: Date.now(),
        key: step.review,
        stage: 0,
        dueAt: now + REVIEW_INTERVALS[0],
        failedAtHandIndex: prev.totalHandsPlayed,
        repetitionCount: existing ? existing.repetitionCount + 1 : 0,
        label: keyLabel(step.review),
        ...base
      };
      queue = [rec, ...queue.filter(m => m.id !== rec.id)].slice(0, 50);
    }
  }

  const sessionEntry: SessionHandResult = {
    id: `sess_${Date.now()}`,
    handName: step.contextNotice,
    position: step.heroPosition,
    street: step.street,
    verdict,
    grade,
    ratingDelta: delta,
    userAnswer: opt?.label || optId,
    correctAnswer: correctOpt?.label || ''
  };

  const today = todayKey();
  const newDay = prev.lastActiveDay !== today;
  const dayStreak = newDay ? (prev.lastActiveDay === yesterdayKey() ? prev.dayStreak + 1 : 1) : prev.dayStreak;
  const streak = isCorrect ? prev.consecutiveCorrect + 1 : 0;

  const next: UserStats = {
    ...prev,
    rating,
    conceptRatings,
    ratingHistory: rated ? [...prev.ratingHistory, Math.round(rating.r)].slice(-200) : prev.ratingHistory,
    curriculumIndex: advanceCurriculum(prev.curriculumIndex, conceptRatings),
    consecutiveCorrect: streak,
    bestStreak: Math.max(prev.bestStreak, streak),
    totalHandsPlayed: now,
    totalCorrectDecisions: prev.totalCorrectDecisions + (isCorrect ? 1 : 0),
    totalDecisions: prev.totalDecisions + 1,
    totalChance: Math.round((prev.totalChance + chance) * 100) / 100,
    leakStats,
    dayStreak,
    lastActiveDay: today,
    todayDecisions: (newDay ? 0 : prev.todayDecisions) + 1,
    lastReviewAt: step.isReviewOfMistake ? now : prev.lastReviewAt,
    dailyDrillCount: opts.daily
      ? Math.min(10, (prev.dailyDrillDate === today ? prev.dailyDrillCount : 0) + 1)
      : (prev.dailyDrillDate === today ? prev.dailyDrillCount : 0),
    dailyDrillDate: today,
    categoryStats: { ...prev.categoryStats, [spot]: { total: prevCat.total + 1, correct: prevCat.correct + (isCorrect ? 1 : 0) } },
    mistakeQueue: queue,
    sessionHands: [sessionEntry, ...prev.sessionHands].slice(0, 30)
  };
  return { next, result: { isCorrect, grade, delta, rating: Math.round(rating.r), confidence } };
}

