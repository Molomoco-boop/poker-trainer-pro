/**
 * Last ~100 full cash hands, stored in LocalStorage, for "Revisión de partidas".
 */
import { Card, Grade, Position, Street, DecisionOption, PlayerState } from '../types/poker';
import { BotProfile } from './botProfiles';

export const HISTORY_KEY = 'ptp_hand_history_v1';
export const HISTORY_MAX = 100;

export interface ReviewAction {
  street: Street;
  pos: Position;
  id: string;
  text: string;
}

export interface ReviewDecision {
  street: Street;
  stepId: string;
  pot: number;
  board: Card[];
  ticker: string;
  notice: string;
  selectedId: string;
  grade: Grade;
  doubted: boolean;
  why: string;
  options: DecisionOption[];
  players: PlayerState[];
}

export interface ReviewHand {
  id: string;
  ts: number;
  handNo: number;
  heroPos: Position;
  heroCards: [Card, Card];
  board: Card[];
  actions: ReviewAction[];
  decisions: ReviewDecision[];
  awardText: string;
  delta: number;
  profiles: BotProfile[];
  stacksAfter: number[];
}

function safeParse(raw: string | null): ReviewHand[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function loadHands(): ReviewHand[] {
  try { return safeParse(localStorage.getItem(HISTORY_KEY)); }
  catch { return []; }
}

export function saveHands(hands: ReviewHand[]): ReviewHand[] {
  const next = hands.slice(0, HISTORY_MAX);
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch { /* quota */ }
  return next;
}

export function pushHand(hand: ReviewHand, existing = loadHands()): ReviewHand[] {
  return saveHands([hand, ...existing.filter(h => h.id !== hand.id)]);
}

export function isErrorOrDoubt(h: ReviewHand): boolean {
  return h.decisions.some(d => d.doubted || d.grade === 'error' || d.grade === 'blunder' || d.grade === 'imprecise');
}

export function worstGrade(h: ReviewHand): Grade | null {
  const order: Grade[] = ['blunder', 'error', 'imprecise', 'valid', 'best'];
  let worst: Grade | null = null;
  let idx = 99;
  for (const d of h.decisions) {
    const i = order.indexOf(d.grade);
    if (i >= 0 && i < idx) { idx = i; worst = d.grade; }
  }
  return worst;
}

export function newHandId(): string {
  return `h_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}
