import {
  Card,
  Rank,
  Suit,
  Position,
  PlayerState,
  HandStep,
  FullHandScenario,
  SpotType,
  DecisionOption,
  PedagogicalLevel,
  SubcategoryId,
  Street,
  CLOCKWISE_POSITIONS
} from '../types/poker';
import { RANKS, SUITS, evaluateHand, compareEvaluations, HAND_NAMES_ES } from './pokerEvaluator';
import {
  getPreflopMatrix,
  getHandFrequency,
  ALL_HANDS,
  RangeMatrix,
  HandFrequency
} from '../data/preflopRanges';
import { calculatePotOddsPct, analyzeBoardTexture, isWetBoard, countOutsVsVillain } from './pokerMath';
import { classifyHand, StrengthClass } from './handStrength';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const r1 = (n: number) => Math.round(n * 10) / 10;
const fmt = (n: number) => `${r1(n)}`;
const uid = (p: string) => `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

function randomCard(exclude: Card[] = []): Card {
  let c: Card;
  do {
    c = { rank: pick(RANKS), suit: pick(SUITS) };
  } while (exclude.some(e => e.rank === c.rank && e.suit === c.suit));
  return c;
}

export function randomCards(n: number, exclude: Card[] = []): Card[] {
  const result: Card[] = [];
  const ex = [...exclude];
  for (let i = 0; i < n; i++) {
    const card = randomCard(ex);
    result.push(card);
    ex.push(card);
  }
  return result;
}

/** "KJo" / "87s" / "AA" -> two concrete cards (avoiding `exclude`). */
export function handLabelToCards(handLabel: string, exclude: Card[] = []): [Card, Card] {
  const r1c = handLabel[0] as Rank;
  const r2c = handLabel[1] as Rank;
  const suited = handLabel.endsWith('s');
  const free = (r: Rank, s: Suit) => !exclude.some(e => e.rank === r && e.suit === s);
  for (let i = 0; i < 50; i++) {
    const shuffled = [...SUITS].sort(() => Math.random() - 0.5);
    const s1 = shuffled[0];
    const s2 = suited ? s1 : shuffled[1];
    if (free(r1c, s1) && free(r2c, s2)) return [{ rank: r1c, suit: s1 }, { rank: r2c, suit: s2 }];
  }
  return [{ rank: r1c, suit: 's' }, { rank: r2c, suit: suited ? 's' : 'h' }];
}

const POSTFLOP_ORDER: Position[] = ['SB', 'BB', 'UTG', 'HJ', 'CO', 'BTN'];

/** True when p1 acts after p2 postflop. */
export function isPlayerInPosition(p1: Position, p2: Position): boolean {
  return POSTFLOP_ORDER.indexOf(p1) > POSTFLOP_ORDER.indexOf(p2);
}

/** Preflop: true if `a` acts before `b`. */
const actsBefore = (a: Position, b: Position) => CLOCKWISE_POSITIONS.indexOf(a) < CLOCKWISE_POSITIONS.indexOf(b);

/**
 * Six seats rotated clockwise with Hero at seat 0.
 * prior = chips put in on earlier streets, street = chips in front of each player now.
 */
export function buildRotated6MaxPlayers(
  heroPos: Position,
  street: Partial<Record<Position, number>>,
  folded: Position[],
  heroCards?: [Card, Card],
  prior: Partial<Record<Position, number>> = {},
  shownCards: Partial<Record<Position, [Card, Card]>> = {}
): PlayerState[] {
  const heroIndex = CLOCKWISE_POSITIONS.indexOf(heroPos);
  const players: PlayerState[] = [];
  for (let i = 0; i < 6; i++) {
    const pos = CLOCKWISE_POSITIONS[(heroIndex + i) % 6];
    const isHero = i === 0;
    const bet = street[pos] || 0;
    const before = prior[pos] || 0;
    players.push({
      id: `seat_${i}_${pos.toLowerCase()}`,
      position: pos,
      isHero,
      isDealer: pos === 'BTN',
      stack: r1(100 - before - bet),
      currentBet: bet,
      totalInvestedHand: r1(before + bet),
      status: isHero ? 'hero' : folded.includes(pos) ? 'folded' : 'active',
      cards: isHero ? heroCards : shownCards[pos]
    });
  }
  return players;
}

const sum = (m: Partial<Record<Position, number>>) => r1(Object.values(m).reduce((a, b) => a + (b || 0), 0));

// ---------------------------------------------------------------------------
// Options & verdicts
// ---------------------------------------------------------------------------

interface OptionDef { id: string; label: string; amountBB?: number; freq: number }

function evText(n: number): string {
  return `${n > 0 ? '+' : ''}${n.toFixed(2)} BB`;
}

/** Highest frequency = optimal; any other frequency > 0 = mixed; 0 = error. */
export function buildOptions(defs: OptionDef[], potBB: number): DecisionOption[] {
  const max = Math.max(...defs.map(d => d.freq));
  return defs.map(d => {
    const verdict = d.freq === max && max > 0 ? 'optimal' : d.freq > 0 ? 'mixed' : 'error';
    const loss = verdict === 'optimal' ? 0
      : verdict === 'mixed' ? -Math.max(0.05, ((max - d.freq) / 100) * potBB * 0.1)
      : -Math.max(0.25, potBB * 0.15);
    const ev = Math.round(loss * 100) / 100;
    return {
      id: d.id,
      label: d.label,
      amountBB: d.amountBB,
      isCorrect: verdict === 'optimal',
      verdict,
      evDiff: evText(ev),
      evDiffNum: ev,
      frequencyGTO: d.freq
    };
  });
}


// ---------------------------------------------------------------------------
// Hand sampling
// ---------------------------------------------------------------------------

const TRASH = new Set(['72o', '83o', '94o', 'T2o', 'J3o', 'Q2o', '62o', '84o', '93o', 'J4o', 'T3o', '52o']);

function isBorderline(f: HandFrequency): boolean {
  return Math.max(f.raise, f.call, f.fold) < 100;
}

/** Level 1 = mostly clear hands; level 4 = almost only mixed/borderline hands. */
function sampleHand(matrix: RangeMatrix, level: PedagogicalLevel, mustContinue?: (f: HandFrequency) => boolean): string {
  const borderlineW = [1, 3, 6, 12][level - 1];
  const pool: { h: string; w: number }[] = [];
  for (const h of ALL_HANDS) {
    const f = getHandFrequency(matrix, h);
    if (mustContinue && !mustContinue(f)) continue;
    let w: number;
    if (isBorderline(f)) w = borderlineW;
    else if (f.fold < 100) w = level >= 4 ? 0.3 : 1.5;
    else w = TRASH.has(h) ? (level === 1 ? 1 : 0.2) : (level >= 4 ? 0.1 : 0.4);
    pool.push({ h, w });
  }
  const total = pool.reduce((a, p) => a + p.w, 0);
  let x = Math.random() * total;
  for (const p of pool) { x -= p.w; if (x <= 0) return p.h; }
  return pool[pool.length - 1].h;
}

// ---------------------------------------------------------------------------
// Postflop decision tables
// ---------------------------------------------------------------------------

/** Frequencies [fold, call, raise] when facing a bet. */
function facingBetFreq(cls: StrengthClass, betFrac: number, street: Street): [number, number, number] {
  const big = betFrac > 0.45;
  const river = street === 'river';
  switch (cls) {
    case 'monster': return [0, 40, 60];
    case 'strong': return [0, 85, 15];
    case 'medium': return big ? (river ? [40, 60, 0] : [35, 60, 5]) : [10, 85, 5];
    case 'weak': return big ? [75, 25, 0] : [40, 55, 5];
    case 'draw': return river ? [95, 0, 5] : big ? [20, 70, 10] : [0, 70, 30];
    case 'weakdraw': return river ? [95, 0, 5] : big ? [80, 15, 5] : [35, 60, 5];
    default: return river || big ? [90, 0, 10] : [75, 10, 15];
  }
}

/** Frequencies [check, betSmall, betBig] for the player with the initiative. */
function aggressorFreq(cls: StrengthClass, wet: boolean, street: Street): [number, number, number] {
  if (street === 'river') {
    switch (cls) {
      case 'monster': return [5, 25, 70];
      case 'strong': return [35, 45, 20];
      case 'medium': return [80, 20, 0];
      case 'weak': return [90, 10, 0];
      default: return [65, 0, 35];
    }
  }
  if (street === 'turn') {
    switch (cls) {
      case 'monster': return [10, 20, 70];
      case 'strong': return [25, 25, 50];
      case 'medium': return [65, 30, 5];
      case 'weak': return [85, 15, 0];
      case 'draw': return [30, 10, 60];
      case 'weakdraw': return [60, 10, 30];
      default: return [75, 0, 25];
    }
  }
  switch (cls) {
    case 'monster': return [15, 25, 60];
    case 'strong': return wet ? [20, 30, 50] : [25, 65, 10];
    case 'medium': return wet ? [60, 35, 5] : [30, 65, 5];
    case 'weak': return wet ? [80, 20, 0] : [45, 55, 0];
    case 'draw': return [25, 25, 50];
    case 'weakdraw': return wet ? [50, 40, 10] : [30, 65, 5];
    default: return wet ? [75, 15, 10] : [40, 55, 5];
  }
}

const STREET_ES: Record<Street, string> = { preflop: 'Preflop', flop: 'Flop', turn: 'Turn', river: 'River' };

// ---------------------------------------------------------------------------
// Full hand scenario
// ---------------------------------------------------------------------------

export interface ScenarioOptions {
  positions?: Position[];
}

const SPOTS_BY_LEVEL: Record<PedagogicalLevel, SpotType[]> = {
  1: ['RFI_OPEN', 'BB_DEFENSE'],
  2: ['RFI_OPEN', 'BB_DEFENSE', 'SB_VS_OPEN', 'CBET_FLOP', 'FACING_CBET'],
  3: ['RFI_OPEN', 'BB_DEFENSE', 'SB_VS_OPEN', '3BET_POT', 'CBET_FLOP', 'FACING_CBET', 'TURN_RIVER_DECISION'],
  4: ['RFI_OPEN', 'BB_DEFENSE', 'SB_VS_OPEN', '3BET_POT', 'CBET_FLOP', 'FACING_CBET', 'TURN_RIVER_DECISION']
};

/** Hero positions that can play each spot. */
const SPOT_HERO_POSITIONS: Record<string, Position[]> = {
  RFI_OPEN: ['UTG', 'HJ', 'CO', 'BTN', 'SB'],
  BB_DEFENSE: ['BB'],
  SB_VS_OPEN: ['SB'],
  '3BET_POT': ['UTG', 'HJ', 'CO', 'BTN'],
  CBET_FLOP: ['UTG', 'HJ', 'CO', 'BTN', 'SB'],
  FACING_CBET: ['BB'],
  TURN_RIVER_DECISION: ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB']
};

interface PreflopLine {
  heroPos: Position;
  villainPos: Position;
  heroAggressor: boolean;
  /** Chips each player has in after preflop if the continuing action is taken. */
  invested: Partial<Record<Position, number>>;
}

export function generateFullHandScenario(
  level: PedagogicalLevel = 2,
  forcedSpot?: SpotType,
  opts: ScenarioOptions = {}
): FullHandScenario {
  const allowed = opts.positions && opts.positions.length ? opts.positions : CLOCKWISE_POSITIONS;
  let pool = SPOTS_BY_LEVEL[level].filter(s => SPOT_HERO_POSITIONS[s].some(p => allowed.includes(p)));
  if (!pool.length) pool = SPOTS_BY_LEVEL[level];
  let spot: SpotType = forcedSpot && forcedSpot !== 'POT_ODDS_DRILL' ? forcedSpot : pick(pool);
  let heroChoices = SPOT_HERO_POSITIONS[spot].filter(p => allowed.includes(p));
  if (!heroChoices.length) heroChoices = SPOT_HERO_POSITIONS[spot];
  let heroPos = pick(heroChoices);
  // postflop-focused spots start from a preflop line where hero continues
  const wantsPostflop = spot === 'CBET_FLOP' || spot === 'FACING_CBET' || spot === 'TURN_RIVER_DECISION';
  let preSpot: SpotType = spot;
  if (wantsPostflop) {
    if (heroPos === 'BB') preSpot = 'BB_DEFENSE';
    else if (spot === 'CBET_FLOP' || heroPos === 'SB') preSpot = heroPos === 'SB' && Math.random() < 0.5 ? 'SB_VS_OPEN' : 'RFI_OPEN';
    else preSpot = Math.random() < 0.7 ? 'RFI_OPEN' : '3BET_POT';
  }
  if (preSpot === 'SB_VS_OPEN') heroPos = 'SB';
  if (preSpot === 'BB_DEFENSE') heroPos = 'BB';
  if (preSpot === '3BET_POT' && heroPos === 'SB') { heroPos = 'BTN'; }

  const steps: HandStep[] = [];
  const pre = buildPreflopStep(preSpot, heroPos, level, wantsPostflop);
  steps.push(pre.step);
  if (pre.line) {
    steps.push(...buildPostflopSteps(pre.line, pre.heroCards, pre.board));
  }
  spot = preSpot;
  return {
    id: uid('hand'),
    title: `${pre.line?.heroPos || heroPos} vs ${pre.line?.villainPos || ''}`.trim(),
    pedagogicalLevel: level,
    spotType: spot,
    steps
  };
}

function buildPreflopStep(
  spot: SpotType,
  heroPos: Position,
  level: PedagogicalLevel,
  mustContinue: boolean
): { step: HandStep; line?: PreflopLine; heroCards: [Card, Card]; board: Card[] } {
  const bets: Partial<Record<Position, number>> = { SB: 0.5, BB: 1 };
  const folded: Position[] = [];
  let villainPos: Position = 'BB';
  let matrix: RangeMatrix;
  let defs: OptionDef[] = [];
  let context = '';
  let ticker = '';
  let continueId: string | undefined;
  let heroAggressor = false;
  let invested: Partial<Record<Position, number>> = {};

  const foldAllBefore = (until: Position, except: Position[] = []) => {
    CLOCKWISE_POSITIONS.forEach(p => {
      if (actsBefore(p, until) && !except.includes(p) && p !== heroPos) folded.push(p);
    });
  };

  if (spot === 'RFI_OPEN') {
    matrix = getPreflopMatrix('RFI', heroPos);
    foldAllBefore(heroPos);
    villainPos = 'BB';
    const open = heroPos === 'SB' ? 3 : 2.5;
    const heroIn = heroPos === 'SB' ? 0.5 : 0;
    const hand = sampleHand(matrix, level, mustContinue ? f => f.raise >= 50 : undefined);
    const f = getHandFrequency(matrix, hand);
    defs = [
      { id: 'fold', label: 'FOLD', freq: f.fold },
      { id: 'limp', label: `LIMP ${fmt(1 - heroIn)} BB`, amountBB: r1(1 - heroIn), freq: 0 },
      { id: 'raise', label: `RAISE ${fmt(open)} BB`, amountBB: open, freq: f.raise }
    ];
    context = `Acción en ti (${heroPos})`;
    ticker = folded.length ? `Foldean ${folded.join(', ')}` : 'Primero en hablar';
    continueId = 'raise';
    heroAggressor = true;
    invested = { [heroPos]: open, BB: open };
    if (heroPos !== 'SB') invested.SB = 0.5;
    return finish(hand);
  }

  if (spot === 'BB_DEFENSE') {
    villainPos = pick(['UTG', 'HJ', 'CO', 'BTN', 'BTN', 'SB'] as Position[]);
    matrix = getPreflopMatrix('VS_OPEN', 'BB', villainPos);
    const open = villainPos === 'SB' ? 3 : 2.5;
    CLOCKWISE_POSITIONS.forEach(p => { if (p !== villainPos && p !== 'BB') folded.push(p); });
    bets[villainPos] = open;
    const threeBet = villainPos === 'SB' ? 9 : 11;
    const hand = sampleHand(matrix, level, mustContinue ? f => f.call >= f.raise && f.call >= f.fold : undefined);
    const f = getHandFrequency(matrix, hand);
    defs = [
      { id: 'fold', label: 'FOLD', freq: f.fold },
      { id: 'call', label: `CALL ${fmt(open - 1)} BB`, amountBB: r1(open - 1), freq: f.call },
      { id: '3bet', label: `3-BET ${fmt(threeBet)} BB`, amountBB: threeBet, freq: f.raise }
    ];
    context = `${villainPos} abre a ${fmt(open)} BB`;
    ticker = villainPos === 'SB' ? 'Foldean hasta SB' : `${villainPos} abre · resto foldea`;
    continueId = 'call';
    invested = { [villainPos]: open, BB: open };
    if (villainPos !== 'SB') invested.SB = 0.5;
    return finish(hand);
  }

  if (spot === 'SB_VS_OPEN') {
    villainPos = pick(['UTG', 'HJ', 'CO', 'BTN', 'BTN'] as Position[]);
    matrix = getPreflopMatrix('VS_OPEN', 'SB', villainPos);
    foldAllBefore('SB', [villainPos]);
    bets[villainPos] = 2.5;
    const hand = sampleHand(matrix, level, mustContinue ? f => f.raise >= 50 : undefined);
    const f = getHandFrequency(matrix, hand);
    defs = [
      { id: 'fold', label: 'FOLD', freq: f.fold },
      { id: 'call', label: 'CALL 2 BB', amountBB: 2, freq: f.call },
      { id: '3bet', label: '3-BET 11 BB', amountBB: 11, freq: f.raise }
    ];
    context = `${villainPos} abre a 2.5 BB`;
    ticker = `${villainPos} abre · acción en SB`;
    continueId = '3bet';
    heroAggressor = true;
    invested = { SB: 11, [villainPos]: 11, BB: 1 };
    // BB folds to the 3-bet
    return finish(hand);
  }

  // 3BET_POT: hero opens, a later player 3-bets
  const laterPlayers = CLOCKWISE_POSITIONS.filter(p => actsBefore(heroPos, p));
  villainPos = pick(laterPlayers);
  matrix = getPreflopMatrix('VS_3BET', heroPos);
  foldAllBefore(heroPos);
  CLOCKWISE_POSITIONS.forEach(p => { if (actsBefore(heroPos, p) && p !== villainPos) folded.push(p); });
  const threeBet = villainPos === 'SB' || villainPos === 'BB' ? 10 : 7.5;
  bets[heroPos] = 2.5;
  bets[villainPos] = threeBet;
  const hand = sampleHand(matrix, level, mustContinue ? f => f.call >= f.raise && f.call >= f.fold : undefined);
  const f = getHandFrequency(matrix, hand);
  defs = [
    { id: 'fold', label: 'FOLD', freq: f.fold },
    { id: 'call', label: `CALL ${fmt(threeBet - 2.5)} BB`, amountBB: r1(threeBet - 2.5), freq: f.call },
    { id: '4bet', label: '4-BET 22 BB', amountBB: 22, freq: f.raise }
  ];
  context = `${villainPos} 3-bet a ${fmt(threeBet)} BB`;
  ticker = `Abres 2.5 · ${villainPos} 3-bet`;
  continueId = 'call';
  invested = { [heroPos]: threeBet, [villainPos]: threeBet };
  if (villainPos !== 'SB' && heroPos !== 'SB') invested.SB = 0.5;
  if (villainPos !== 'BB') invested.BB = 1;
  return finish(hand);

  function finish(hand: string) {
    const heroCards = handLabelToCards(hand);
    const board = randomCards(5, heroCards);
    const potNow = sum(bets);
    const options = buildOptions(defs, potNow);
    const facing = Math.max(...Object.entries(bets).filter(([p]) => p !== heroPos).map(([, v]) => v || 0));
    const heroIn = bets[heroPos] || 0;
    const toCall = r1(facing - heroIn);
    const continues = !!options.find(o => o.id === continueId)?.isCorrect;
    const step: HandStep = {
      id: uid('pre'),
      street: 'preflop',
      pot: potNow,
      communityCards: [],
      players: buildRotated6MaxPlayers(heroPos, bets, folded, heroCards),
      heroPosition: heroPos,
      spotType: spot,
      relativePosition: isPlayerInPosition(heroPos, villainPos) ? 'IP' : 'OOP',
      actionTicker: ticker,
      contextNotice: context,
      prompt: 'Tu jugada',
      questionType: 'action',
      options,
      hint: {
        relativePosition: isPlayerInPosition(heroPos, villainPos) ? 'IP' : 'OOP',
        potOddsPct: spot === 'RFI_OPEN' ? 0 : calculatePotOddsPct(toCall, potNow),
        boardTexture: 'Preflop'
      },
      handStrengthName: hand,
      continueWith: continues ? continueId : undefined
    };
    const line: PreflopLine | undefined = continues
      ? { heroPos, villainPos, heroAggressor, invested }
      : undefined;
    return { step, line, heroCards, board };
  }
}

function buildPostflopSteps(line: PreflopLine, heroCards: [Card, Card], board: Card[]): HandStep[] {
  const { heroPos, villainPos } = line;
  const heroIP = isPlayerInPosition(heroPos, villainPos);
  const folded = CLOCKWISE_POSITIONS.filter(p => p !== heroPos && p !== villainPos);
  const prior: Partial<Record<Position, number>> = { ...line.invested };
  let heroHasInitiative = line.heroAggressor;
  const steps: HandStep[] = [];
  const streets: Street[] = ['flop', 'turn', 'river'];
  const wet = isWetBoard(board);

  let streetIdx = 0;
  let heroCheckedOOP = false;
  while (streetIdx < streets.length) {
    const street = streets[streetIdx];
    const cards = board.slice(0, street === 'flop' ? 3 : street === 'turn' ? 4 : 5);
    const potStart = sum(prior);
    const heroStack = r1(100 - (prior[heroPos] || 0));
    const villainStack = r1(100 - (prior[villainPos] || 0));
    const eff = Math.min(heroStack, villainStack);
    const { cls, label } = classifyHand(heroCards, cards);
    const texture = analyzeBoardTexture(cards);
    const streetBets: Partial<Record<Position, number>> = {};
    let defs: OptionDef[];
    let context: string;
    let continueId: string | undefined;
    let spotType: SpotType = street === 'flop' ? 'CBET_FLOP' : 'TURN_RIVER_DECISION';
    let potOdds = 0;
    const sizeSmall = r1(Math.min(eff, potStart * 0.33));
    const sizeBig = r1(Math.min(eff, potStart * 0.75));

    if (heroHasInitiative) {
      const [chk, sm, bg] = aggressorFreq(cls, wet, street);
      defs = [
        { id: 'check', label: 'CHECK', freq: chk },
        { id: 'bet_small', label: `BET ${fmt(sizeSmall)} BB`, amountBB: sizeSmall, freq: sizeSmall === sizeBig ? 0 : sm },
        { id: 'bet_big', label: sizeBig >= eff ? `ALL-IN ${fmt(sizeBig)} BB` : `BET ${fmt(sizeBig)} BB`, amountBB: sizeBig, freq: sizeSmall === sizeBig ? sm + bg : bg }
      ];
      context = heroIP ? `${STREET_ES[street]} · ${villainPos} pasa` : `${STREET_ES[street]} · hablas primero`;
    } else {
      const frac = street === 'flop' ? 0.33 : street === 'turn' ? 0.66 : 0.75;
      const bet = r1(Math.min(eff, Math.max(1, potStart * frac)));
      streetBets[villainPos] = bet;
      const raiseTo = r1(Math.min(eff, bet * 3));
      const [fo, ca, ra] = facingBetFreq(cls, frac, street);
      const allInCall = bet >= eff;
      defs = [
        { id: 'fold', label: 'FOLD', freq: fo },
        { id: 'call', label: `CALL ${fmt(bet)} BB`, amountBB: bet, freq: allInCall ? ca + ra : ca },
        ...(allInCall ? [] : [{ id: 'raise', label: raiseTo >= eff ? `ALL-IN ${fmt(raiseTo)} BB` : `RAISE ${fmt(raiseTo)} BB`, amountBB: raiseTo, freq: ra }])
      ];
      potOdds = calculatePotOddsPct(bet, potStart + bet);
      context = heroIP
        ? `${STREET_ES[street]} · ${villainPos} apuesta ${fmt(bet)} BB`
        : `${STREET_ES[street]} · pasas, ${villainPos} apuesta ${fmt(bet)} BB`;
      if (heroCheckedOOP) context = `${STREET_ES[street]} · pasas, ${villainPos} apuesta ${fmt(bet)} BB`;
      spotType = street === 'flop' ? 'FACING_CBET' : 'TURN_RIVER_DECISION';
    }

    const options = buildOptions(defs, potStart);
    const optimal = options.filter(o => o.isCorrect).map(o => o.id);
    const preferred = ['call', 'bet_big', 'bet_small', 'check'].find(id => optimal.includes(id));
    // OOP check hands the action to the villain on the same street, so it continues even on the river
    if (preferred && (street !== 'river' || (preferred === 'check' && !heroIP))) continueId = preferred;
    const potNow = r1(potStart + sum(streetBets));
    steps.push({
      id: uid(street),
      street,
      pot: potNow,
      communityCards: cards,
      players: buildRotated6MaxPlayers(heroPos, streetBets, folded, heroCards, prior),
      heroPosition: heroPos,
      spotType,
      relativePosition: heroIP ? 'IP' : 'OOP',
      actionTicker: `Bote ${fmt(potStart)} BB · ${texture}`,
      contextNotice: context,
      prompt: 'Tu jugada',
      questionType: 'action',
      options,
      hint: { relativePosition: heroIP ? 'IP' : 'OOP', potOddsPct: potOdds, boardTexture: texture },
      handStrengthName: label,
      continueWith: continueId
    });

    if (!continueId) break;
    // apply the continuing action
    const chosen = options.find(o => o.id === continueId)!;
    if (continueId === 'call') {
      const amt = chosen.amountBB || 0;
      prior[heroPos] = r1((prior[heroPos] || 0) + amt);
      prior[villainPos] = r1((prior[villainPos] || 0) + (streetBets[villainPos] || 0));
    } else if (continueId === 'bet_small' || continueId === 'bet_big') {
      const amt = chosen.amountBB || 0;
      prior[heroPos] = r1((prior[heroPos] || 0) + amt);
      prior[villainPos] = r1((prior[villainPos] || 0) + amt); // villain calls
      heroHasInitiative = true;
    } else if (continueId === 'check') {
      heroHasInitiative = false;
      if (!heroIP) {
        // hero checks first: the villain bets on this same street
        heroCheckedOOP = true;
        continue;
      }
    }
    heroCheckedOOP = false;
    if (Math.min(100 - (prior[heroPos] || 0), 100 - (prior[villainPos] || 0)) <= 0) {
      steps[steps.length - 1].continueWith = undefined;
      break;
    }
    streetIdx++;
  }
  return steps;
}

// ---------------------------------------------------------------------------
// Drills (Math & Fundamentals)
// ---------------------------------------------------------------------------

function drillPlayers(heroCards: [Card, Card], villainPos: Position, bet = 0, prior = 0, shown?: [Card, Card], extra: Position[] = []): PlayerState[] {
  const active = [villainPos, ...extra];
  const folded = CLOCKWISE_POSITIONS.filter(p => p !== 'BB' && !active.includes(p));
  return buildRotated6MaxPlayers('BB', bet ? { [villainPos]: bet } : {}, folded, heroCards,
    prior ? { BB: prior, [villainPos]: prior } : {}, shown ? { [villainPos]: shown } : {});
}

function numericOptions(correct: number, distractors: number[], suffix: string, decimals = 0, allowNegative = false): DecisionOption[] {
  const valid = (d: number) => allowNegative || d >= 0;
  const fmtN = (n: number) => `${n.toFixed(decimals)}${suffix}`;
  const seen = new Set<string>([fmtN(correct)]);
  const values = [correct];
  for (const d of distractors) {
    const k = fmtN(d);
    if (!seen.has(k) && valid(d)) { seen.add(k); values.push(d); }
    if (values.length === 3) break;
  }
  let bump = 1;
  while (values.length < 3) {
    const d = correct + Math.ceil(bump / 2) * (decimals ? 1 : 2) * (bump % 2 ? 1 : -1);
    const k = fmtN(d);
    if (!seen.has(k) && valid(d)) { seen.add(k); values.push(d); }
    bump++;
  }
  values.sort((a, b) => a - b);
  return values.map(v => {
    const ok = fmtN(v) === fmtN(correct);
    return {
      id: fmtN(v),
      label: fmtN(v),
      isCorrect: ok,
      verdict: ok ? 'optimal' : 'error',
      evDiff: ok ? '0.00 BB' : '-1.00 BB',
      evDiffNum: ok ? 0 : -1,
      frequencyGTO: ok ? 100 : 0
    } as DecisionOption;
  });
}

const BET_FRACTIONS = [0.25, 0.33, 0.5, 0.66, 0.75, 1, 1.25, 1.5];

export function generatePotOddsDrill(_level: PedagogicalLevel = 2): HandStep {
  void _level;
  const pot = pick([4, 6, 8, 10, 12, 15, 20, 24, 30, 40, 50, 60, 80, 100]);
  const bet = r1(pot * pick(BET_FRACTIONS));
  const pct = (bet / (pot + 2 * bet)) * 100;
  const heroCards = randomCards(2) as [Card, Card];
  const board = randomCards(pick([3, 4, 5]), heroCards);
  const villain = pick(['UTG', 'HJ', 'CO', 'BTN', 'SB'] as Position[]);
  return {
    id: uid('pot_odds'),
    street: board.length === 3 ? 'flop' : board.length === 4 ? 'turn' : 'river',
    pot: r1(pot + bet),
    communityCards: board,
    players: drillPlayers(heroCards, villain, bet, pot / 2),
    heroPosition: 'BB',
    spotType: 'POT_ODDS_DRILL',
    relativePosition: 'OOP',
    actionTicker: `Bote ${fmt(pot)} BB · ${villain} apuesta ${fmt(bet)} BB`,
    contextNotice: `${villain} apuesta ${fmt(bet)} en ${fmt(pot)}`,
    prompt: '¿Equity mínima para pagar?',
    questionType: 'pot_odds',
    options: numericOptions(pct, [(bet / (pot + bet)) * 100, (bet / pot) * 100 / 2, pct + 8, pct - 6], ' %'),
    hint: { relativePosition: 'OOP', potOddsPct: 0, boardTexture: 'Pago / bote final' }
  };
}

export function generateEvDrill(_level: PedagogicalLevel = 2): HandStep {
  void _level;
  const pot = pick([10, 12, 16, 20, 24, 30, 40]);
  const bet = r1(pot * pick([0.33, 0.5, 0.75, 1]));
  const eq = pick([15, 20, 25, 30, 35, 40, 45]);
  const e = eq / 100;
  const ev = e * (pot + bet) - (1 - e) * bet;
  const heroCards = randomCards(2) as [Card, Card];
  const board = randomCards(4, heroCards);
  const villain = pick(['CO', 'BTN', 'HJ'] as Position[]);
  return {
    id: uid('ev'),
    street: 'turn',
    pot: r1(pot + bet),
    communityCards: board,
    players: drillPlayers(heroCards, villain, bet, pot / 2),
    heroPosition: 'BB',
    spotType: 'POT_ODDS_DRILL',
    relativePosition: 'OOP',
    actionTicker: `Bote ${fmt(pot)} BB · apuesta ${fmt(bet)} BB · equity ${eq}%`,
    contextNotice: `Equity ${eq}% · pagas ${fmt(bet)}`,
    prompt: 'EV del call (BB)',
    questionType: 'ev',
    options: numericOptions(ev, [e * pot - (1 - e) * bet, e * (pot + 2 * bet) - bet, ev + 2.5, ev - 2], ' BB', 1, true),
    hint: { relativePosition: 'OOP', potOddsPct: calculatePotOddsPct(bet, pot + bet), boardTexture: 'EV = eq·(bote+apuesta) − (1−eq)·apuesta' }
  };
}

export function generateOutsDrill(_level: PedagogicalLevel = 2): HandStep {
  void _level;
  for (let tries = 0; tries < 500; tries++) {
    const cards = randomCards(7);
    const hero: [Card, Card] = [cards[0], cards[1]];
    const villain: [Card, Card] = [cards[2], cards[3]];
    const flop = cards.slice(4, 7);
    if (compareEvaluations(evaluateHand([...hero, ...flop]), evaluateHand([...villain, ...flop])) >= 0) continue;
    const outs = countOutsVsVillain(hero, villain, flop).length;
    if (outs < 2 || outs > 15) continue;
    const pos = pick(['CO', 'BTN', 'HJ'] as Position[]);
    const vEval = evaluateHand([...villain, ...flop]);
    return {
      id: uid('outs'),
      street: 'flop',
      pot: 12,
      communityCards: flop,
      players: drillPlayers(hero, pos, 0, 6, villain),
      heroPosition: 'BB',
      spotType: 'POT_ODDS_DRILL',
      relativePosition: 'OOP',
      actionTicker: `All-in en flop · ${pos} lleva ${vEval.descr}`,
      contextNotice: `Vas por detrás de ${pos}`,
      prompt: '¿Cuántos outs para ir por delante en el turn?',
      questionType: 'outs',
      options: numericOptions(outs, [outs + pick([2, 3, 4]), outs - pick([1, 2, 3]), outs + 6], ''),
      hint: { relativePosition: 'OOP', potOddsPct: 0, boardTexture: 'Cuenta solo cartas que te ponen por delante' },
      handStrengthName: evaluateHand([...hero, ...flop]).descr
    };
  }
  return generateOutsDrill();
}

export function generateHandRankingDrill(_level: PedagogicalLevel = 2): HandStep {
  void _level;
  const cards = randomCards(7);
  const hero: [Card, Card] = [cards[0], cards[1]];
  const board = cards.slice(2);
  const ev = evaluateHand([...hero, ...board]);
  const near = [ev.score - 1, ev.score + 1, ev.score - 2, ev.score + 2].filter(s => s >= 0 && s <= 9);
  const ids = [ev.score, ...near.slice(0, 2)].sort((a, b) => a - b);
  const options: DecisionOption[] = ids.map(s => ({
    id: `rank_${s}`,
    label: HAND_NAMES_ES[s].toUpperCase(),
    isCorrect: s === ev.score,
    verdict: s === ev.score ? 'optimal' : 'error',
    evDiff: s === ev.score ? '0.00 BB' : '-1.00 BB',
    evDiffNum: s === ev.score ? 0 : -1,
    frequencyGTO: s === ev.score ? 100 : 0
  }));
  return {
    id: uid('ranking'),
    street: 'river',
    pot: 10,
    communityCards: board,
    players: buildRotated6MaxPlayers('BB', {}, CLOCKWISE_POSITIONS.filter(p => p !== 'BB'), hero),
    heroPosition: 'BB',
    spotType: 'POT_ODDS_DRILL',
    relativePosition: 'OOP',
    actionTicker: 'River',
    contextNotice: 'Mejor jugada de 5 cartas',
    prompt: '¿Qué jugada tienes?',
    questionType: 'hand_ranking',
    options,
    hint: { relativePosition: 'OOP', potOddsPct: 0, boardTexture: analyzeBoardTexture(board) },
    handStrengthName: ev.descr
  };
}

export function generateBestHandDrill(_level: PedagogicalLevel = 2): HandStep {
  void _level;
  for (;;) {
    const deck = randomCards(11);
    const board = deck.slice(0, 5);
    const heroCards: [Card, Card] = [deck[5], deck[6]];
    const leftCards: [Card, Card] = [deck[7], deck[8]];
    const rightCards: [Card, Card] = [deck[9], deck[10]];
    const evals = {
      HJ: evaluateHand([...board, ...leftCards]),
      HERO: evaluateHand([...board, ...heroCards]),
      BTN: evaluateHand([...board, ...rightCards])
    };
    const entries = Object.entries(evals);
    const best = entries.reduce((a, b) => (compareEvaluations(b[1], a[1]) > 0 ? b : a));
    if (entries.filter(e => compareEvaluations(e[1], best[1]) === 0).length > 1) continue; // no split pots
    const winner = best[0];
    const players = buildRotated6MaxPlayers('BB', {}, ['UTG', 'CO', 'SB'], heroCards, {}, { HJ: leftCards, BTN: rightCards });
    const mk = (id: string, label: string): DecisionOption => ({
      id,
      label,
      isCorrect: winner === id,
      verdict: winner === id ? 'optimal' : 'error',
      evDiff: winner === id ? '0.00 BB' : '-1.00 BB',
      evDiffNum: winner === id ? 0 : -1,
      frequencyGTO: winner === id ? 100 : 0
    });
    return {
      id: uid('best'),
      street: 'river',
      pot: 24,
      communityCards: board,
      players,
      heroPosition: 'BB',
      spotType: 'POT_ODDS_DRILL',
      relativePosition: 'OOP',
      actionTicker: 'Showdown · 3 jugadores',
      contextNotice: 'Showdown',
      prompt: '¿Quién gana?',
      questionType: 'best_hand',
      options: [mk('HJ', 'HJ'), mk('HERO', 'TÚ'), mk('BTN', 'BTN')],
      hint: { relativePosition: 'OOP', potOddsPct: 0, boardTexture: analyzeBoardTexture(board) },
      handStrengthName: evals.HERO.descr
    };
  }
}

/** Single decision for a subcategory drill. */
export function generateSimulatorDrill(sub: SubcategoryId, level: PedagogicalLevel = 2, opts: ScenarioOptions = {}): HandStep {
  if (sub === 'odds') return generatePotOddsDrill(level);
  if (sub === 'equity') return generateOutsDrill(level);
  if (sub === 'ev') return generateEvDrill(level);
  if (sub === 'hand_ranking') return generateHandRankingDrill(level);
  if (sub === 'best_hand') return generateBestHandDrill(level);
  if (sub === 'preflop') {
    const s = generateFullHandScenario(level, undefined, opts);
    return { ...s.steps[0], continueWith: undefined };
  }
  for (let i = 0; i < 50; i++) {
    const s = generateFullHandScenario(level, pick(['CBET_FLOP', 'FACING_CBET', 'TURN_RIVER_DECISION'] as SpotType[]), opts);
    const post = s.steps.slice(1);
    if (post.length) return { ...pick(post), continueWith: undefined };
  }
  return generateFullHandScenario(level, 'FACING_CBET', opts).steps[0];
}
