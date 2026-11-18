import { ConceptId, CURRICULUM, HandStep, Position, RatingState } from '../types/poker';
import { getHandFrequency, getPreflopMatrix, ALL_HANDS, handCombos, RangeMatrix } from '../data/preflopRanges';

/** Chance that a random tap is correct (correct options / options). */
export function chanceOf(step: Pick<HandStep, 'options'>): number {
  if (!step.options.length) return 0;
  return step.options.filter(o => o.isCorrect).length / step.options.length;
}

export const LEAK_POSITIONS: Position[] = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
export const LEAK_STREETS = ['preflop', 'flop', 'turn', 'river'] as const;
export const leakKey = (pos: Position, street: string) => `${pos}|${street}`;

/** Concept unlocked after this one: rating ≥1550 over ≥10 answers. */
export const UNLOCK_RATING = 1550;
export const UNLOCK_N = 10;

export function advanceCurriculum(idx: number, ratings: Partial<Record<ConceptId, RatingState>>): number {
  let i = idx;
  while (i < CURRICULUM.length - 1) {
    const r = ratings[CURRICULUM[i]];
    if (r && r.r >= UNLOCK_RATING && r.n >= UNLOCK_N) i++;
    else break;
  }
  return i;
}

export type DailySlot = { kind: 'concept'; concept: ConceptId } | { kind: 'review' } | { kind: 'mixed'; concept: ConceptId };

/**
 * Daily 5-minute session: 4 of today's concept, 3 reviews (weakest concepts when nothing is due),
 * 3 mixed from earlier concepts and math, interleaved.
 */
export function dailyPlan(curriculumIndex: number, ratings: Partial<Record<ConceptId, RatingState>>, rand = Math.random): DailySlot[] {
  const today = CURRICULUM[Math.min(curriculumIndex, CURRICULUM.length - 1)];
  const earlier = CURRICULUM.slice(0, Math.max(1, curriculumIndex));
  const math: ConceptId[] = ['m_mdf', 'm_bluff', 'm_combos', 'm_equity'];
  const pool = [...earlier, ...earlier, ...math].filter(c => c !== today || earlier.length === 1);
  const pickFrom = (arr: ConceptId[]) => arr[Math.floor(rand() * arr.length)];
  const mixed: DailySlot[] = [0, 1, 2].map(() => ({ kind: 'mixed', concept: pickFrom(pool.length ? pool : math) }));
  const c: DailySlot = { kind: 'concept', concept: today };
  const r: DailySlot = { kind: 'review' };
  void ratings;
  return [c, r, mixed[0], c, r, c, mixed[1], r, c, mixed[2]];
}

/** Weakest concepts first (by rating, untouched ones count as 1500). */
export function weakestConcepts(ratings: Partial<Record<ConceptId, RatingState>>, among: ConceptId[]): ConceptId[] {
  return [...among].sort((a, b) => (ratings[a]?.r ?? 1500) - (ratings[b]?.r ?? 1500));
}

/** 12-spot placement: every curriculum concept plus MDF, combos and equity. */
export const PLACEMENT: ConceptId[] = [...CURRICULUM, 'm_mdf', 'm_combos', 'm_equity'];

/** Curriculum position after the placement: first concept missed (results in PLACEMENT order). */
export function placementCurriculum(results: { concept: ConceptId; ok: boolean }[]): number {
  for (let i = 0; i < CURRICULUM.length; i++) {
    const r = results.find(x => x.concept === CURRICULUM[i]);
    if (r && !r.ok) return i;
  }
  return CURRICULUM.length - 1;
}

/** Review interval in decisions for a stage, shortened or stretched by confidence. */
export const REVIEW_INTERVALS = [3, 10, 30];
export function reviewInterval(stage: number, confidence: 'fast' | 'normal' | 'slow'): number {
  const base = REVIEW_INTERVALS[Math.min(stage, REVIEW_INTERVALS.length - 1)];
  if (confidence === 'fast') return Math.round(base * 1.5);
  if (confidence === 'slow') return 3;
  return base;
}

/** Response time → confidence. Postflop gets more time. */
export function confidenceOf(ms: number | undefined, street: string): 'fast' | 'normal' | 'slow' {
  if (ms === undefined) return 'normal';
  if (ms < 3000) return 'fast';
  return ms > (street === 'preflop' ? 8000 : 12000) ? 'slow' : 'normal';
}

/** Minimum decisions between two served reviews. */
export const REVIEW_GAP = 4;

// ---------------------------------------------------------------------------
// Sprint "¿Abre?"
// ---------------------------------------------------------------------------

export const SPRINT_SECONDS = 60;
export const SPRINT_LIVES = 3;
export const SPRINT_POSITIONS: Position[] = ['UTG', 'HJ', 'CO', 'BTN', 'SB'];

export interface SprintHand { pos: Position; hand: string; raise: number }

/** Mostly hands near the edge of the range: random tapping fails fast. */
export function sprintHand(rand = Math.random): SprintHand {
  const pos = SPRINT_POSITIONS[Math.floor(rand() * SPRINT_POSITIONS.length)];
  const m = getPreflopMatrix('RFI', pos);
  const edge = rand() < 0.7;
  const pool = ALL_HANDS.filter(h => {
    if (!edge) return true;
    const f = getHandFrequency(m, h);
    return isEdge(m, h) || (f.raise > 0 && f.raise < 100);
  });
  const hand = pool[Math.floor(rand() * pool.length)];
  return { pos, hand, raise: getHandFrequency(m, hand).raise };
}

function isEdge(m: RangeMatrix, h: string): boolean {
  const ORDER = 'AKQJT98765432';
  const a = ORDER.indexOf(h[0]);
  const b = ORDER.indexOf(h[1]);
  const [r, c] = h.length === 2 ? [a, a] : h.endsWith('s') ? [a, b] : [b, a];
  const inRange = (x: string) => getHandFrequency(m, x).raise >= 50;
  const me = inRange(h);
  for (const [dr, dc] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
    const rr = r + dr, cc = c + dc;
    if (rr < 0 || cc < 0 || rr > 12 || cc > 12) continue;
    const lab = rr === cc ? ORDER[rr] + ORDER[cc] : rr < cc ? ORDER[rr] + ORDER[cc] + 's' : ORDER[cc] + ORDER[rr] + 'o';
    if (inRange(lab) !== me) return true;
  }
  return false;
}

/** Mixed hands (1-99 % raise) accept both answers. */
export function sprintCorrect(h: SprintHand, opens: boolean): boolean {
  if (h.raise > 0 && h.raise < 100) return true;
  return opens === h.raise >= 100;
}

// ---------------------------------------------------------------------------
// Range builder
// ---------------------------------------------------------------------------

export interface RangeTask { id: string; label: string; matrix: () => RangeMatrix; use: 'raise' | 'defend' }

export const RANGE_TASKS: RangeTask[] = [
  { id: 'rfi_UTG', label: 'UTG sube', matrix: () => getPreflopMatrix('RFI', 'UTG'), use: 'raise' },
  { id: 'rfi_HJ', label: 'HJ sube', matrix: () => getPreflopMatrix('RFI', 'HJ'), use: 'raise' },
  { id: 'rfi_CO', label: 'CO sube', matrix: () => getPreflopMatrix('RFI', 'CO'), use: 'raise' },
  { id: 'rfi_BTN', label: 'BTN sube', matrix: () => getPreflopMatrix('RFI', 'BTN'), use: 'raise' },
  { id: 'rfi_SB', label: 'SB sube', matrix: () => getPreflopMatrix('RFI', 'SB'), use: 'raise' },
  { id: 'bb_BTN', label: 'BB si BTN sube', matrix: () => getPreflopMatrix('VS_OPEN', 'BB', 'BTN'), use: 'defend' }
];

export function targetWeight(task: RangeTask, m: RangeMatrix, h: string): number {
  const f = getHandFrequency(m, h);
  return (task.use === 'raise' ? f.raise : f.raise + f.call) / 100;
}

export interface RangeResult { score: number; missing: string[]; extra: string[] }

/** Weighted Jaccard: Σmin(u,t)·combos / Σmax(u,t)·combos. Mixed hands count by frequency. */
export function rangeScore(task: RangeTask, painted: Set<string>): RangeResult {
  const m = task.matrix();
  let inter = 0;
  let union = 0;
  const missing: string[] = [];
  const extra: string[] = [];
  for (const h of ALL_HANDS) {
    const t = targetWeight(task, m, h);
    const u = painted.has(h) ? 1 : 0;
    const c = handCombos(h);
    inter += Math.min(u, t) * c;
    union += Math.max(u, t) * c;
    if (!u && t >= 0.5) missing.push(h);
    if (u && t < 0.5) extra.push(h);
  }
  return { score: union ? Math.round((inter / union) * 100) : 100, missing, extra };
}
