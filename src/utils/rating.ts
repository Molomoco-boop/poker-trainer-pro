import { Grade, PedagogicalLevel, RatingState } from '../types/poker';

/** Glicko-1, as in Lichess puzzles: each answer is a game against the spot. */
const Q = Math.log(10) / 400;
export const START: RatingState = { r: 1500, rd: 300, n: 0 };
/** Largest change from one answer (provisional ratings move fast, but not wildly). */
export const MAX_STEP = 100;
export const MIN_RD = 60;
/** Spots have a fixed, fairly certain rating. */
export const SPOT_RD = 80;

const g = (rd: number) => 1 / Math.sqrt(1 + (3 * Q * Q * rd * rd) / (Math.PI * Math.PI));

/** Expected score of a player rated r against a spot rated rj. */
export function expectedScore(r: number, rj: number, rdj = SPOT_RD): number {
  return 1 / (1 + Math.pow(10, (-g(rdj) * (r - rj)) / 400));
}

/** Score of an answer for the rating: best/valid win, imprecise is a near loss. */
export const GRADE_SCORE: Record<Grade, number> = { best: 1, valid: 1, imprecise: 0.3, error: 0, blunder: 0 };

/**
 * One Glicko-1 update. Returns the new state; rd never drops below MIN_RD.
 * `chance` = probability of a right answer by guessing (correct options / options):
 * the expected score becomes c + (1 − c)·E, so random tapping keeps losing rating.
 */
export function updateRating(p: RatingState, spot: number, score: number, chance = 0, spotRd = SPOT_RD): RatingState {
  const c = Math.min(0.6, Math.max(0, chance));
  const gj = g(spotRd);
  const base = expectedScore(p.r, spot, spotRd);
  const e = c + (1 - c) * base;
  const d2 = 1 / (Q * Q * gj * gj * e * (1 - e));
  const denom = 1 / (p.rd * p.rd) + 1 / d2;
  const raw = (Q / denom) * gj * (score - e) * (1 - c * 0.5);
  const r = p.r + Math.max(-MAX_STEP, Math.min(MAX_STEP, raw));
  const rd = Math.max(MIN_RD, Math.sqrt(1 / denom));
  return { r: Math.round(r * 10) / 10, rd: Math.round(rd * 10) / 10, n: p.n + 1 };
}

/** Spot pool used by the generator for a rating. */
export function levelForRating(r: number): PedagogicalLevel {
  if (r < 1350) return 1;
  if (r < 1500) return 2;
  if (r < 1700) return 3;
  return 4;
}

/** Accuracy above chance: 0 = random clicking, 100 = perfect. */
export function aboveChance(ok: number, n: number, chance: number): number | null {
  if (n < 1) return null;
  const acc = ok / n;
  const c = chance / n;
  if (c >= 1) return null;
  return Math.max(0, Math.round(((acc - c) / (1 - c)) * 100));
}

/** Picks from candidates the one whose difficulty is closest to rating + noise (σ≈120). */
export function pickNearRating<T extends { difficulty: number }>(cands: T[], rating: number): T {
  const target = rating + (Math.random() + Math.random() + Math.random() - 1.5) * 200;
  return cands.reduce((a, b) => (Math.abs(b.difficulty - target) < Math.abs(a.difficulty - target) ? b : a));
}
