/**
 * Opponent profiles for "Jugar partidas" and the inverse (exploitative) hero freqs.
 * Regular ≈ GTO. The others leak in a known direction; hero grades vs the leak.
 */
import { Street } from '../types/poker';
import { PreflopCtx, PreflopFreqs, r1 } from './actionModel';
import { StrengthClass } from './handStrength';

export type BotProfile = 'regular' | 'recreativo' | 'nit' | 'maniac';
export type TableMode = BotProfile | 'mixto';

export const PROFILE_ES: Record<BotProfile, string> = {
  regular: 'Regular',
  recreativo: 'Recreativo',
  nit: 'Nit',
  maniac: 'Maníaco'
};
export const PROFILE_SHORT: Record<BotProfile, string> = {
  regular: 'Reg',
  recreativo: 'Rec',
  nit: 'Nit',
  maniac: 'Man'
};
export const MODE_ES: Record<TableMode, string> = {
  regular: 'Regular',
  recreativo: 'Recreativo',
  nit: 'Nit',
  maniac: 'Maníaco',
  mixto: 'Mixto'
};
export const MODE_SUB: Record<TableMode, string> = {
  regular: 'Cerca del GTO',
  recreativo: 'Paga de más, pasivo',
  nit: 'Muy tight, foldea',
  maniac: 'Sobrebluffea',
  mixto: 'Un perfil distinto en cada asiento'
};
export const ALL_PROFILES: BotProfile[] = ['regular', 'recreativo', 'nit', 'maniac'];
export const ALL_MODES: TableMode[] = ['regular', 'recreativo', 'nit', 'maniac', 'mixto'];

const clip = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

function packPre(raise: number, call: number, limp = 0): PreflopFreqs {
  raise = clip(raise); call = clip(call); limp = clip(limp);
  const used = raise + call + limp;
  if (used > 100) {
    const s = 100 / used;
    raise = clip(raise * s); call = clip(call * s); limp = clip(100 - raise - call);
  }
  return { raise, call, limp, fold: clip(100 - raise - call - limp) };
}

function packLead(_check: number, small: number, big: number) {
  small = clip(small); big = clip(big);
  if (small + big > 100) { big = clip(big * 100 / (small + big)); small = clip(100 - big); }
  return { check: clip(100 - small - big), bet_small: small, bet_big: big };
}

function packFace(fold: number, call: number, raise: number) {
  fold = clip(fold); call = clip(call); raise = clip(raise);
  const used = fold + call + raise;
  if (used !== 100 && used > 0) {
    const s = 100 / used;
    fold = clip(fold * s); call = clip(call * s); raise = clip(100 - fold - call);
  }
  return { fold, call, raise };
}

export function assignProfiles(mode: TableMode, rand = Math.random): BotProfile[] {
  const hero: BotProfile = 'regular';
  if (mode !== 'mixto') return [hero, mode, mode, mode, mode, mode];
  const out: BotProfile[] = [hero];
  for (let i = 1; i < 6; i++) out.push(ALL_PROFILES[Math.floor(rand() * ALL_PROFILES.length)]);
  if (new Set(out.slice(1)).size === 1) {
    out[1] = ALL_PROFILES.find(p => p !== out[2]) || 'nit';
  }
  return out;
}

/** How this profile plays (bot sampling). */
export function profilePre(f: PreflopFreqs, p: BotProfile): PreflopFreqs {
  if (p === 'regular') return f;
  if (p === 'recreativo') return packPre(f.raise * 0.7, f.call * 1.85 + 10, Math.max(f.limp * 2.4, 12));
  if (p === 'nit') return packPre(f.raise * 0.62, f.call * 0.5, f.limp * 0.25);
  return packPre(f.raise * 1.65 + 8, f.call * 0.75, f.limp * 0.4);
}

export function profileLead(
  f: { check: number; bet_small: number; bet_big: number },
  p: BotProfile,
  cls: StrengthClass,
  street: Street
): { check: number; bet_small: number; bet_big: number } {
  if (p === 'regular') return f;
  const air = cls === 'air' || cls === 'weak' || cls === 'weakdraw';
  const value = cls === 'monster' || cls === 'strong';
  if (p === 'recreativo') {
    // Passive, rarely bluffs river.
    const river = street === 'river';
    const bluffCut = river ? 0.12 : 0.45;
    const small = air ? f.bet_small * bluffCut : f.bet_small * (value ? 1.05 : 0.8);
    const big = air ? f.bet_big * bluffCut : f.bet_big * (value ? 0.9 : 0.7);
    return packLead(0, small, big);
  }
  if (p === 'nit') {
    const small = air ? f.bet_small * 0.35 : f.bet_small * 0.8;
    const big = air ? f.bet_big * 0.25 : f.bet_big * 0.85;
    return packLead(0, small, big);
  }
  // maniac: overbluffs, bets too often
  const small = air ? f.bet_small * 1.8 + 8 : f.bet_small * 1.15;
  const big = air ? f.bet_big * 1.9 + 6 : f.bet_big * 1.1;
  return packLead(0, small, big);
}

export function profileFacing(
  f: { fold: number; call: number; raise: number },
  p: BotProfile,
  street: Street
): { fold: number; call: number; raise: number } {
  if (p === 'regular') return f;
  if (p === 'recreativo') {
    // Calls too much, rarely raises (passive). Even more sticky on flop, still calls river too often.
    const callBoost = street === 'river' ? 1.35 : 1.7;
    return packFace(f.fold * 0.55, f.call * callBoost + 10, f.raise * 0.45);
  }
  if (p === 'nit') return packFace(f.fold * 1.45 + 8, f.call * 0.55, f.raise * 0.5);
  // maniac: overbluffs, folds too little
  return packFace(f.fold * 0.5, f.call * 1.1, f.raise * 1.7 + 8);
}

/**
 * How hero should deviate vs this villain. Inverse of the leak.
 * Vs recreativo: fewer bluffs, more value, fold more to their (value-heavy) bets.
 * Vs nit: steal/bluff more, fold more to their bets.
 * Vs maniac: bluff less, call down lighter.
 */
export function exploitPre(f: PreflopFreqs, vs: BotProfile, ctx: PreflopCtx): PreflopFreqs {
  if (vs === 'regular') return f;
  if (vs === 'recreativo') {
    // Isolate limpers, value-raise more, bluff-raise less (they call too much).
    const valueBias = f.raise >= 20 ? 1.25 : 0.85;
    return packPre(f.raise * valueBias + (ctx.limpers > 0 ? 12 : 0), f.call * 0.85, f.limp * 0.3);
  }
  if (vs === 'nit') {
    // Steal wider; fold more to their 3-bets (value-heavy).
    if (ctx.raises >= 1) return packPre(f.raise * 0.75, f.call * 0.7, 0);
    return packPre(f.raise * 1.35 + 8, f.call * 0.8, f.limp * 0.5);
  }
  // maniac: call more, 3-bet value, don't fold as much
  if (ctx.raises >= 1) return packPre(f.raise * 1.1, f.call * 1.45 + 8, 0);
  return packPre(f.raise * 0.95, f.call * 1.2, f.limp * 0.5);
}

export function exploitLead(
  f: { check: number; bet_small: number; bet_big: number },
  vs: BotProfile,
  cls: StrengthClass,
  street: Street
): { check: number; bet_small: number; bet_big: number } {
  if (vs === 'regular') return f;
  const air = cls === 'air' || cls === 'weak' || cls === 'weakdraw';
  const value = cls === 'monster' || cls === 'strong' || cls === 'medium';
  if (vs === 'recreativo') {
    const cut = street === 'river' ? 0.15 : 0.4;
    const small = air ? f.bet_small * cut : f.bet_small * (value ? 1.1 : 0.7);
    const big = air ? f.bet_big * cut : f.bet_big * (value ? 1.2 : 0.7);
    return packLead(0, small, big);
  }
  if (vs === 'nit') {
    const small = air ? f.bet_small * 1.7 + 8 : f.bet_small * 1.15;
    const big = air ? f.bet_big * 1.5 + 4 : f.bet_big * 1.05;
    return packLead(0, small, big);
  }
  const cut = 0.4;
  const small = air ? f.bet_small * cut : f.bet_small * 1.05;
  const big = air ? f.bet_big * cut : f.bet_big * 1.15;
  return packLead(0, small, big);
}

export function exploitFacing(
  f: { fold: number; call: number; raise: number },
  vs: BotProfile,
  street: Street
): { fold: number; call: number; raise: number } {
  if (vs === 'regular') return f;
  if (vs === 'recreativo') {
    // They bet for value and rarely bluff river → fold more, bluff-raise less.
    const foldMul = street === 'river' ? 1.4 : 1.2;
    return packFace(f.fold * foldMul + 6, f.call * 0.8, f.raise * 0.55);
  }
  if (vs === 'nit') {
    return packFace(f.fold * 1.35 + 8, f.call * 0.65, f.raise * 0.6);
  }
  // maniac overbluffs → call down, fold less, raise-bluff less
  return packFace(f.fold * 0.55, f.call * 1.5 + 8, f.raise * 0.75);
}

export function vsLabel(profiles: BotProfile[]): string | null {
  const uniq = [...new Set(profiles.filter(p => p !== 'regular'))];
  if (!uniq.length) return null;
  if (uniq.length === 1) return `Vs ${PROFILE_ES[uniq[0]].toLowerCase()}`;
  return 'Vs mixto';
}

export function blend<T extends object>(packs: T[]): T {
  const keys = Object.keys(packs[0] as object) as (keyof T)[];
  const out = { ...packs[0] };
  for (const k of keys) {
    if (typeof packs[0][k] !== 'number') continue;
    const n = packs.reduce((a, p) => a + (p[k] as number), 0) / packs.length;
    (out as Record<string, number>)[k as string] = clip(n);
  }
  return out;
}

export const MODE_KEY = 'ptp_table_mode';

export function loadTableMode(): TableMode {
  try {
    const v = localStorage.getItem(MODE_KEY);
    if (v && ALL_MODES.includes(v as TableMode)) return v as TableMode;
  } catch { /* ignore */ }
  return 'regular';
}

export function saveTableMode(mode: TableMode) {
  try { localStorage.setItem(MODE_KEY, mode); } catch { /* ignore */ }
}

export function shortTag(p?: BotProfile | null): string | null {
  if (!p || p === 'regular') return null;
  return PROFILE_SHORT[p];
}

export { r1 };
