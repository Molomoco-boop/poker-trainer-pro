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
  UserStats,
  SubcategoryId,
  CLOCKWISE_POSITIONS
} from '../types/poker';
import { RANKS, SUITS, evaluateHand, compareEvaluations } from './pokerEvaluator';
import {
  getHandFrequency,
  BORDERLINE_HANDS_PER_POS,
  RANKS_ORDER
} from '../data/preflopRanges';
import { calculatePotOddsPct, calculateSPR, analyzeBoardTexture } from './pokerMath';

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomCard(exclude: Card[] = []): Card {
  let c: Card;
  do {
    c = { rank: pick(RANKS), suit: pick(SUITS) };
  } while (exclude.some(e => e.rank === c.rank && e.suit === c.suit));
  return c;
}

function randomCards(n: number, exclude: Card[] = []): Card[] {
  const result: Card[] = [];
  const currentExclude = [...exclude];
  for (let i = 0; i < n; i++) {
    const card = randomCard(currentExclude);
    result.push(card);
    currentExclude.push(card);
  }
  return result;
}

// Convert hand label e.g. "KJo" or "87s" or "AA" into two Card objects
export function handLabelToCards(handLabel: string, exclude: Card[] = []): [Card, Card] {
  const r1 = handLabel[0] as Rank;
  const r2 = handLabel[1] as Rank;
  const isSuited = handLabel.endsWith('s');
  const isPair = r1 === r2;

  const availableSuits: Suit[] = ['s', 'h', 'd', 'c'];
  const shuffledSuits = [...availableSuits].sort(() => Math.random() - 0.5);

  if (isPair) {
    const s1 = shuffledSuits[0];
    const s2 = shuffledSuits[1];
    return [{ rank: r1, suit: s1 }, { rank: r2, suit: s2 }];
  }

  if (isSuited) {
    const s = shuffledSuits[0];
    return [{ rank: r1, suit: s }, { rank: r2, suit: s }];
  }

  // Offsuit
  const s1 = shuffledSuits[0];
  const s2 = shuffledSuits[1];
  return [{ rank: r1, suit: s1 }, { rank: r2, suit: s2 }];
}

// Check relative position: is p1 IP vs p2 postflop?
// Clockwise order from dealer: SB, BB, UTG, HJ, CO, BTN acts last.
export function isPlayerInPosition(p1: Position, p2: Position): boolean {
  if (p1 === 'BTN') return true;
  if (p2 === 'BTN') return false;
  if (p1 === 'BB' && p2 === 'SB') return true;
  if (p2 === 'BB' && p1 === 'SB') return false;

  const order: Position[] = ['SB', 'BB', 'UTG', 'HJ', 'CO', 'BTN'];
  return order.indexOf(p1) > order.indexOf(p2);
}

// Create 6-max players rotated clockwise starting with Hero at Seat 0
export function buildRotated6MaxPlayers(
  heroPos: Position,
  bets: Partial<Record<Position, number>>,
  foldedPositions: Position[],
  heroCards?: [Card, Card]
): PlayerState[] {
  const heroIndex = CLOCKWISE_POSITIONS.indexOf(heroPos);

  const players: PlayerState[] = [];

  for (let i = 0; i < 6; i++) {
    const pos = CLOCKWISE_POSITIONS[(heroIndex + i) % 6];
    const isHero = i === 0;
    const isDealer = pos === 'BTN';
    const bet = bets[pos] || 0;
    const hasFolded = foldedPositions.includes(pos);

    players.push({
      id: `seat_${i}_${pos.toLowerCase()}`,
      position: pos,
      isHero,
      isDealer,
      stack: Math.round((100 - bet) * 10) / 10,
      currentBet: bet,
      totalInvestedHand: bet,
      status: isHero ? 'hero' : hasFolded ? 'folded' : 'active',
      cards: isHero ? heroCards : undefined
    });
  }

  return players;
}

// 80% Borderline Hand selection
export function sampleHandForHero(heroPos: Position): string {
  const isBorderline = Math.random() < 0.80;
  const borderlines = BORDERLINE_HANDS_PER_POS[heroPos] || ['ATo', 'KJo', 'QTs', '87s', '55'];

  if (isBorderline && borderlines.length > 0) {
    return pick(borderlines);
  }

  // 20% Premiums or Garbage
  const premiums = ['AA', 'KK', 'QQ', 'AKs', 'AKo', 'AQs'];
  const garbage = ['72o', '83o', '94o', 'T2o', 'J3o', 'Q2o'];
  return Math.random() < 0.6 ? pick(premiums) : pick(garbage);
}

// Generate complete realistic hand scenario
export function generateFullHandScenario(
  pedagogicalLevel: PedagogicalLevel = 2,
  forcedSpotType?: SpotType
): FullHandScenario {
  // Determine Spot Type
  const candidateSpots: SpotType[] = [
    'RFI_OPEN',
    'BB_DEFENSE',
    'SB_VS_OPEN',
    '3BET_POT',
    'CBET_FLOP',
    'FACING_CBET',
    'TURN_RIVER_DECISION'
  ];

  const spotType: SpotType = forcedSpotType || pick(candidateSpots);

  // Setup positions according to spot
  let heroPos: Position = 'BTN';
  let villainPos: Position = 'BB';

  if (spotType === 'RFI_OPEN') {
    heroPos = pick(['CO', 'BTN', 'SB', 'UTG', 'HJ']);
    villainPos = heroPos === 'BTN' ? 'BB' : (heroPos === 'SB' ? 'BB' : 'BTN');
  } else if (spotType === 'BB_DEFENSE') {
    heroPos = 'BB';
    villainPos = pick(['BTN', 'CO', 'SB']);
  } else if (spotType === 'SB_VS_OPEN') {
    heroPos = 'SB';
    villainPos = pick(['CO', 'BTN', 'UTG']);
  } else if (spotType === '3BET_POT') {
    heroPos = pick(['BTN', 'CO', 'BB']);
    villainPos = heroPos === 'BB' ? 'BTN' : 'SB';
  } else {
    // Postflop spots
    heroPos = pick(['BTN', 'CO', 'BB']);
    villainPos = heroPos === 'BB' ? 'BTN' : 'BB';
  }

  // Hero Hole Cards (80% borderline)
  const handLabel = sampleHandForHero(heroPos);
  const heroCards = handLabelToCards(handLabel);

  // Generate Deck & Community Cards excluding hero cards
  const deck = randomCards(10, heroCards);
  const flop: Card[] = [deck[0], deck[1], deck[2]];
  const turnCard: Card = deck[3];
  const riverCard: Card = deck[4];

  // ==========================================
  // STREET 1: PREFLOP
  // ==========================================
  let preflopPot = 1.5;
  const preflopBets: Partial<Record<Position, number>> = { SB: 0.5, BB: 1.0 };
  const preflopFolded: Position[] = [];

  // Determine folded positions before Hero's action
  const posOrder = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
  const heroOrderIdx = posOrder.indexOf(heroPos);

  posOrder.forEach((p, idx) => {
    if (idx < heroOrderIdx && p !== villainPos && p !== heroPos) {
      preflopFolded.push(p as Position);
    }
  });

  let preflopPrompt = '¿Cuál es tu jugada?';
  let preflopContext = `Acción en ti (${heroPos})`;
  let preflopTicker = `Preflop: Ciegas 0.5 / 1.0 BB`;
  let preflopOptions: DecisionOption[] = [];
  let relPos: 'IP' | 'OOP' = isPlayerInPosition(heroPos, villainPos) ? 'IP' : 'OOP';

  const freq = getHandFrequency(
    spotType === 'RFI_OPEN' ? 'RFI' : (heroPos === 'BB' ? 'BB_DEFENSE' : 'VS_OPEN'),
    heroPos,
    handLabel
  );

  if (spotType === 'RFI_OPEN') {
    preflopPot = 1.5;
    preflopBets[heroPos] = 0;
    preflopContext = `Acción en ti (${heroPos}) · Bote: 1.5 BB`;
    preflopTicker = `Preflop: La mesa foldea hasta ${heroPos}`;

    const isRaiseOptimal = freq.raise >= 50;
    const isMixed = freq.raise > 0 && freq.raise < 50;
    const isFoldOptimal = freq.raise === 0;

    preflopOptions = [
      {
        id: 'fold',
        label: 'FOLD',
        isCorrect: isFoldOptimal,
        verdict: isFoldOptimal ? 'optimal' : 'error',
        evDiff: isFoldOptimal ? '+0.00 BB' : '-0.75 BB',
        evDiffNum: isFoldOptimal ? 0 : -0.75,
        frequencyGTO: freq.fold
      },
      {
        id: 'raise',
        label: 'RAISE 2.5 BB',
        amountBB: 2.5,
        isCorrect: isRaiseOptimal || isMixed,
        verdict: isRaiseOptimal ? 'optimal' : isMixed ? 'mixed' : 'error',
        evDiff: isRaiseOptimal ? '+0.85 BB' : isMixed ? '+0.15 BB' : '-0.95 BB',
        evDiffNum: isRaiseOptimal ? 0.85 : isMixed ? 0.15 : -0.95,
        frequencyGTO: freq.raise
      },
      {
        id: 'limp',
        label: 'LIMP 1.0 BB',
        amountBB: 1.0,
        isCorrect: false,
        verdict: 'error',
        evDiff: '-0.95 BB',
        evDiffNum: -0.95,
        frequencyGTO: 0
      }
    ];
  } else if (spotType === 'SB_VS_OPEN') {
    const openSize = 2.5;
    preflopBets[villainPos] = openSize;
    preflopPot = 1.0 + 0.5 + openSize; // BB (1.0) + SB (0.5) + CO Open (2.5) = 4.0 BB
    preflopContext = `${villainPos} abre a ${openSize} BB · Estás en SB`;
    preflopTicker = `Preflop: ${villainPos} abre a 2.5 BB, acción en Hero (SB)`;
    relPos = 'OOP';

    // Strict SB rule: 3-Bet or Fold. Weak offsuit like Q5o -> only FOLD is correct (0.00 BB), Call is penalized (-0.65 BB)
    const is3Bet = freq.raise >= 50;
    const isFold = freq.fold >= 65 || handLabel === 'Q5o' || handLabel === 'K5o' || handLabel === '83o';

    preflopOptions = [
      {
        id: 'fold',
        label: 'FOLD',
        isCorrect: isFold,
        verdict: isFold ? 'optimal' : 'error',
        evDiff: isFold ? '+0.00 BB' : '-0.45 BB',
        evDiffNum: isFold ? 0 : -0.45,
        frequencyGTO: freq.fold
      },
      {
        id: 'call',
        label: `CALL ${(openSize - 0.5).toFixed(1)} BB`, // Hero in SB already put 0.5 BB!
        amountBB: openSize - 0.5,
        isCorrect: false,
        verdict: 'error',
        evDiff: '-0.65 BB',
        evDiffNum: -0.65,
        frequencyGTO: freq.call
      },
      {
        id: '3bet',
        label: '3-BET 9.0 BB',
        amountBB: 9.0,
        isCorrect: is3Bet,
        verdict: is3Bet ? 'optimal' : isFold ? 'error' : 'mixed',
        evDiff: is3Bet ? '+0.70 BB' : '-0.65 BB',
        evDiffNum: is3Bet ? 0.70 : -0.65,
        frequencyGTO: freq.raise
      }
    ];
  } else {
    // BB_DEFENSE or facing open
    const openSize = 2.5;
    preflopBets[villainPos] = openSize;
    preflopPot = 0.5 + 1.0 + openSize; // 4.0 BB
    preflopContext = `${villainPos} abre a ${openSize} BB · Estás en BB`;
    preflopTicker = `Preflop: ${villainPos} abre a 2.5 BB, SB foldea, acción en BB`;
    preflopFolded.push('SB');

    // Call cost is openSize - 1.0 BB (Hero already has 1.0 BB in BB!)
    const callCostBB = openSize - 1.0; // 1.5 BB

    const isCall = freq.call >= 40;
    const is3Bet = freq.raise >= 40;
    const isFold = freq.fold >= 60;

    preflopOptions = [
      {
        id: 'fold',
        label: 'FOLD',
        isCorrect: isFold,
        verdict: isFold ? 'optimal' : 'error',
        evDiff: isFold ? '+0.00 BB' : '-0.35 BB',
        evDiffNum: isFold ? 0 : -0.35,
        frequencyGTO: freq.fold
      },
      {
        id: 'call',
        label: `CALL ${callCostBB.toFixed(1)} BB`, // Exact: CALL 1.5 BB!
        amountBB: callCostBB,
        isCorrect: isCall,
        verdict: isCall ? 'optimal' : 'mixed',
        evDiff: isCall ? '+0.60 BB' : '+0.10 BB',
        evDiffNum: isCall ? 0.60 : 0.10,
        frequencyGTO: freq.call
      },
      {
        id: '3bet',
        label: '3-BET 9.0 BB',
        amountBB: 9.0,
        isCorrect: is3Bet,
        verdict: is3Bet ? 'optimal' : 'mixed',
        evDiff: is3Bet ? '+0.80 BB' : '-0.20 BB',
        evDiffNum: is3Bet ? 0.80 : -0.20,
        frequencyGTO: freq.raise
      }
    ];
  }

  const preflopPlayers = buildRotated6MaxPlayers(heroPos, preflopBets, preflopFolded, heroCards);

  const step1: HandStep = {
    id: `step_preflop_${Date.now()}`,
    street: 'preflop',
    pot: preflopPot,
    communityCards: [],
    players: preflopPlayers,
    heroPosition: heroPos,
    spotType,
    relativePosition: relPos,
    actionTicker: preflopTicker,
    contextNotice: preflopContext,
    prompt: preflopPrompt,
    questionType: 'action',
    options: preflopOptions,
    gtoFrequencies: freq,
    tacticalExplanation: {
      headline: spotType === 'RFI_OPEN'
        ? (freq.raise >= 50 ? 'Open-Raise Rentable (+EV)' : 'Fold Estándar')
        : (spotType === 'SB_VS_OPEN' ? 'Estrategia SB: 3-Bet o Fold' : 'Defensa de BB con Pot Odds'),
      positionAndRange: spotType === 'SB_VS_OPEN'
        ? `Desde SB juegas fuera de posición (OOP) toda la mano contra ${villainPos}. Pagar (Call) es un leak grave con manos como ${handLabel}.`
        : `Desde ${heroPos}, ${handLabel} tiene ${freq.raise}% de frecuencia GTO de apertura. Juegas ${relPos === 'IP' ? 'con posición (IP)' : 'fuera de posición (OOP)'}.`,
      math: {
        payBB: spotType === 'BB_DEFENSE' ? 1.5 : (spotType === 'SB_VS_OPEN' ? 2.0 : 2.5),
        finalPotBB: preflopPot + 1.5,
        potOddsPct: calculatePotOddsPct(1.5, preflopPot),
        estimatedEquityPct: 35
      },
      gameplan: spotType === 'RFI_OPEN'
        ? 'Nunca limpees en 6-max: la iniciativa y la fold equity son críticas para ganar botes sin showdown.'
        : 'Mantén un rango de 3-bet polarizado y defiende manos con jugabilidad postflop.'
    },
    hint: {
      relativePosition: relPos,
      potOddsPct: calculatePotOddsPct(1.5, preflopPot),
      boardTexture: 'Preflop'
    },
    handStrengthName: `Mano inicial: ${handLabel}`
  };

  // ==========================================
  // STREET 2: FLOP (Clean bets from preflop!)
  // ==========================================
  const flopPot = 6.0;
  // All preflop bets are collected into pot; visible bets on Flop start fresh!
  const flopBets: Partial<Record<Position, number>> = { [villainPos]: 2.0 };
  const flopFolded: Position[] = ['UTG', 'HJ', 'CO', 'SB', 'BB'].filter(p => p !== heroPos && p !== villainPos) as Position[];

  const flopPlayers = buildRotated6MaxPlayers(heroPos, flopBets, flopFolded, heroCards);
  const heroFlopHand = evaluateHand([...heroCards, ...flop]);
  const boardTexture = analyzeBoardTexture(flop);
  const flopRelPos = isPlayerInPosition(heroPos, villainPos) ? 'IP' : 'OOP';

  const step2: HandStep = {
    id: `step_flop_${Date.now()}`,
    street: 'flop',
    pot: flopPot,
    communityCards: flop,
    players: flopPlayers,
    heroPosition: heroPos,
    spotType: 'FACING_CBET',
    relativePosition: flopRelPos,
    actionTicker: `Preflop: Bote ${flopPot} BB · Flop: ${villainPos} apuesta 2.0 BB`,
    contextNotice: `Flop · ${villainPos} C-Bet 2.0 BB (33% pot)`,
    prompt: '¿Cuál es tu jugada?',
    questionType: 'action',
    options: [
      {
        id: 'fold',
        label: 'FOLD',
        isCorrect: heroFlopHand.score < 1000000 && !handLabel.endsWith('s'),
        verdict: heroFlopHand.score < 1000000 ? 'optimal' : 'error',
        evDiff: heroFlopHand.score < 1000000 ? '+0.00 BB' : '-0.80 BB',
        evDiffNum: heroFlopHand.score < 1000000 ? 0 : -0.80,
        frequencyGTO: 30
      },
      {
        id: 'call',
        label: 'CALL 2.0 BB',
        amountBB: 2.0,
        isCorrect: heroFlopHand.score >= 1000000 || handLabel.endsWith('s'),
        verdict: heroFlopHand.score >= 1000000 ? 'optimal' : 'mixed',
        evDiff: '+0.55 BB',
        evDiffNum: 0.55,
        frequencyGTO: 60
      },
      {
        id: 'raise',
        label: 'RAISE 6.5 BB',
        amountBB: 6.5,
        isCorrect: heroFlopHand.score >= 2000000,
        verdict: heroFlopHand.score >= 2000000 ? 'optimal' : 'mixed',
        evDiff: '+0.40 BB',
        evDiffNum: 0.40,
        frequencyGTO: 10
      }
    ],
    gtoFrequencies: { fold: 30, call: 60, raise: 10 },
    tacticalExplanation: {
      headline: `Defensa vs C-Bet en ${boardTexture.split('·')[0]}`,
      positionAndRange: `${heroPos} juega ${flopRelPos === 'IP' ? 'con posición (IP)' : 'fuera de posición (OOP)'} frente a ${villainPos}. Tu mano tiene ${heroFlopHand.name}.`,
      math: {
        payBB: 2.0,
        finalPotBB: flopPot + 2.0 + 2.0,
        potOddsPct: calculatePotOddsPct(2.0, flopPot + 2.0),
        estimatedEquityPct: 38,
        spr: calculateSPR(98, flopPot)
      },
      gameplan: 'Frente a tamaños pequeños de C-Bet (25%-33%), defiende todas tus parejas y proyectos con backdoor equity.'
    },
    hint: {
      relativePosition: flopRelPos,
      potOddsPct: calculatePotOddsPct(2.0, flopPot + 2.0),
      boardTexture
    },
    handStrengthName: `${heroFlopHand.name}: ${heroFlopHand.descr}`
  };

  // ==========================================
  // STREET 3: TURN (Clean bets from flop!)
  // ==========================================
  const turnCards = [...flop, turnCard];
  const turnPot = 10.0;
  // Bets reset to 0 between streets!
  const turnBets: Partial<Record<Position, number>> = { [villainPos]: 0, [heroPos]: 0 };
  const turnPlayers = buildRotated6MaxPlayers(heroPos, turnBets, flopFolded, heroCards);
  const heroTurnHand = evaluateHand([...heroCards, ...turnCards]);
  const turnTexture = analyzeBoardTexture(turnCards);

  const step3: HandStep = {
    id: `step_turn_${Date.now()}`,
    street: 'turn',
    pot: turnPot,
    communityCards: turnCards,
    players: turnPlayers,
    heroPosition: heroPos,
    spotType: 'TURN_RIVER_DECISION',
    relativePosition: flopRelPos,
    actionTicker: `Preflop/Flop: Bote 10.0 BB · Turn: ${villainPos} pasa (Check)`,
    contextNotice: `Turn · ${villainPos} pasa (Check)`,
    prompt: '¿Cuál es tu línea?',
    questionType: 'action',
    options: [
      {
        id: 'check',
        label: 'CHECK (Pasar detrás)',
        isCorrect: heroTurnHand.score < 1500000,
        verdict: heroTurnHand.score < 1500000 ? 'optimal' : 'mixed',
        evDiff: '+0.00 BB',
        evDiffNum: 0,
        frequencyGTO: 45
      },
      {
        id: 'bet_half',
        label: 'BET 6.5 BB',
        amountBB: 6.5,
        isCorrect: heroTurnHand.score >= 1500000,
        verdict: heroTurnHand.score >= 1500000 ? 'optimal' : 'mixed',
        evDiff: '+1.20 BB',
        evDiffNum: 1.20,
        frequencyGTO: 50
      },
      {
        id: 'all_in',
        label: 'ALL-IN 90 BB',
        amountBB: 90,
        isCorrect: false,
        verdict: 'error',
        evDiff: '-2.10 BB',
        evDiffNum: -2.10,
        frequencyGTO: 5
      }
    ],
    gtoFrequencies: { fold: 0, call: 45, raise: 55 },
    tacticalExplanation: {
      headline: 'Apuesta por Valor y Protección en el Turn',
      positionAndRange: `${villainPos} muestra debilidad al pasar. Como juegas ${flopRelPos}, puedes polarizar tu rango con apuestas medianas.`,
      math: {
        payBB: 0,
        finalPotBB: turnPot + 6.5,
        potOddsPct: 0,
        estimatedEquityPct: 62,
        spr: calculateSPR(90, turnPot)
      },
      gameplan: 'Cobra a los proyectos de color y escalera del rival para evitar cartas gratis en el River.'
    },
    hint: {
      relativePosition: flopRelPos,
      potOddsPct: 0,
      boardTexture: turnTexture
    },
    handStrengthName: `${heroTurnHand.name}: ${heroTurnHand.descr}`
  };

  // ==========================================
  // STREET 4: RIVER (Clean bets from turn!)
  // ==========================================
  const riverCards = [...turnCards, riverCard];
  const riverPot = 23.0;
  const riverBets: Partial<Record<Position, number>> = { [villainPos]: 11.5 };
  const riverPlayers = buildRotated6MaxPlayers(heroPos, riverBets, flopFolded, heroCards);
  const heroRiverHand = evaluateHand([...heroCards, ...riverCards]);
  const riverTexture = analyzeBoardTexture(riverCards);

  const step4: HandStep = {
    id: `step_river_${Date.now()}`,
    street: 'river',
    pot: riverPot,
    communityCards: riverCards,
    players: riverPlayers,
    heroPosition: heroPos,
    spotType: 'TURN_RIVER_DECISION',
    relativePosition: flopRelPos,
    actionTicker: `Preflop/Flop/Turn: Bote 23.0 BB · River: ${villainPos} apuesta 11.5 BB`,
    contextNotice: `River · ${villainPos} dispara 11.5 BB (50% pot)`,
    prompt: '¿Cuál es tu jugada?',
    questionType: 'action',
    options: [
      {
        id: 'fold',
        label: 'FOLD',
        isCorrect: heroRiverHand.score < 1000000,
        verdict: heroRiverHand.score < 1000000 ? 'optimal' : 'error',
        evDiff: heroRiverHand.score < 1000000 ? '+0.00 BB' : '-0.90 BB',
        evDiffNum: heroRiverHand.score < 1000000 ? 0 : -0.90,
        frequencyGTO: 40
      },
      {
        id: 'call',
        label: 'CALL 11.5 BB',
        amountBB: 11.5,
        isCorrect: heroRiverHand.score >= 1000000,
        verdict: heroRiverHand.score >= 1000000 ? 'optimal' : 'error',
        evDiff: '+1.65 BB',
        evDiffNum: 1.65,
        frequencyGTO: 55
      },
      {
        id: 'raise',
        label: 'RAISE ALL-IN',
        amountBB: 80,
        isCorrect: heroRiverHand.score >= 4000000,
        verdict: heroRiverHand.score >= 4000000 ? 'optimal' : 'error',
        evDiff: '-1.40 BB',
        evDiffNum: -1.40,
        frequencyGTO: 5
      }
    ],
    gtoFrequencies: { fold: 40, call: 55, raise: 5 },
    tacticalExplanation: {
      headline: 'Caza de Faroles (Bluff Catcher) en el River',
      positionAndRange: `Tu mano (${heroRiverHand.name}) vence a todos los proyectos fallidos del rival. No la conviertas en farol resubiendo.`,
      math: {
        payBB: 11.5,
        finalPotBB: riverPot + 11.5 + 11.5,
        potOddsPct: calculatePotOddsPct(11.5, riverPot + 11.5),
        estimatedEquityPct: 35,
        spr: 0.8
      },
      gameplan: 'Pagar 11.5 BB en un bote final de 46 BB requiere solo un 25% de equity para ser rentable (+EV).'
    },
    hint: {
      relativePosition: flopRelPos,
      potOddsPct: calculatePotOddsPct(11.5, riverPot + 11.5),
      boardTexture: riverTexture
    },
    handStrengthName: `${heroRiverHand.name}: ${heroRiverHand.descr}`
  };

  return {
    id: `hand_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title: `Mano 6-Max · ${heroPos} vs ${villainPos}`,
    pedagogicalLevel,
    spotType,
    steps: [step1, step2, step3, step4]
  };
}

// Spaced Repetition Hand Selector
export function getNextTrainingHand(stats: UserStats, forcedSpot?: SpotType): HandStep {
  const currentHandIdx = stats.totalHandsPlayed;

  // 1. Check for Repeat from mistakeQueue (30% probability or due for review)
  // Repeat after 3-5 hands since failure
  if (stats.mistakeQueue && stats.mistakeQueue.length > 0 && !forcedSpot) {
    const dueMistake = stats.mistakeQueue.find(m => {
      const handsSince = currentHandIdx - m.failedAtHandIndex;
      return handsSince >= 3 && m.consecutiveSuccesses < 3;
    });

    if (dueMistake && Math.random() < 0.35) {
      return {
        ...dueMistake.step,
        isReviewOfMistake: true,
        contextNotice: `🔄 Repaso de error anterior · ${dueMistake.step.contextNotice}`
      };
    }
  }

  // 2. 50% probability: Target user's biggest leak (lowest accuracy category)
  if (!forcedSpot && Math.random() < 0.50 && stats.categoryStats) {
    const categories = Object.entries(stats.categoryStats) as [SpotType, { total: number; correct: number }][];
    const categoriesWithHands = categories.filter(([_, data]) => data.total >= 2);

    if (categoriesWithHands.length > 0) {
      // Find lowest win rate
      categoriesWithHands.sort((a, b) => (a[1].correct / a[1].total) - (b[1].correct / b[1].total));
      const worstCat = categoriesWithHands[0][0];
      const scenario = generateFullHandScenario(stats.pedagogicalLevel, worstCat);
      return scenario.steps[0];
    }
  }

  // 3. New scenario
  const scenario = generateFullHandScenario(stats.pedagogicalLevel, forcedSpot);
  return scenario.steps[0];
}

// Specialized Drills for Poker Math & Fundamentals
export function generatePotOddsDrill(level: PedagogicalLevel = 2): HandStep {
  const scenarios = [
    { pot: 60, bet: 30, pct: '25 %', options: ['20 %', '25 %', '30 %'] },
    { pot: 100, bet: 50, pct: '25 %', options: ['20 %', '25 %', '33 %'] },
    { pot: 100, bet: 100, pct: '33 %', options: ['25 %', '33 %', '50 %'] },
    { pot: 80, bet: 40, pct: '25 %', options: ['20 %', '25 %', '35 %'] },
    { pot: 120, bet: 40, pct: '20 %', options: ['20 %', '25 %', '30 %'] },
    { pot: 75, bet: 25, pct: '20 %', options: ['15 %', '20 %', '25 %'] },
    { pot: 100, bet: 25, pct: '17 %', options: ['17 %', '25 %', '33 %'] }
  ];
  const sc = pick(scenarios);
  const totalPot = sc.pot + sc.bet;
  const heroCards = handLabelToCards('AKo');
  const board = randomCards(3, heroCards);

  const players: PlayerState[] = [
    {
      id: 'seat_hero',
      position: 'BB',
      isHero: true,
      isDealer: false,
      stack: 100,
      currentBet: 0,
      totalInvestedHand: 0,
      status: 'hero',
      cards: heroCards
    },
    { id: 'seat_1', position: 'UTG', isHero: false, isDealer: false, stack: 100, currentBet: 0, totalInvestedHand: 0, status: 'folded' },
    { id: 'seat_2', position: 'HJ', isHero: false, isDealer: false, stack: 100, currentBet: 0, totalInvestedHand: 0, status: 'folded' },
    {
      id: 'seat_villain',
      position: 'BTN',
      isHero: false,
      isDealer: true,
      stack: 100 - sc.bet,
      currentBet: sc.bet,
      totalInvestedHand: sc.bet,
      status: 'active'
    },
    { id: 'seat_4', position: 'SB', isHero: false, isDealer: false, stack: 100, currentBet: 0, totalInvestedHand: 0, status: 'folded' },
    { id: 'seat_5', position: 'CO', isHero: false, isDealer: false, stack: 100, currentBet: 0, totalInvestedHand: 0, status: 'folded' }
  ];

  return {
    id: `pot_odds_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    street: 'flop',
    pot: sc.pot,
    communityCards: board,
    players,
    heroPosition: 'BB',
    spotType: 'POT_ODDS_DRILL',
    relativePosition: 'OOP',
    actionTicker: `Villain apuesta ${sc.bet} BB en bote de ${sc.pot} BB · Calcula tus pot odds`,
    contextNotice: `Villain bets ${sc.bet} into ${sc.pot}.`,
    prompt: 'What are your pot odds?',
    questionType: 'pot_odds',
    options: sc.options.map(opt => ({
      id: opt,
      label: opt,
      isCorrect: opt === sc.pct,
      verdict: opt === sc.pct ? 'optimal' : 'error',
      evDiff: opt === sc.pct ? '+0.00 BB' : '-1.50 BB',
      evDiffNum: opt === sc.pct ? 0 : -1.5,
      frequencyGTO: opt === sc.pct ? 100 : 0
    })),
    gtoFrequencies: { fold: 0, call: 100, raise: 0 },
    tacticalExplanation: {
      headline: 'Cálculo de Pot Odds de Equilibrio',
      positionAndRange: 'Villain apuesta de cara y te ofrece un precio exacto para continuar con tu mano.',
      math: {
        payBB: sc.bet,
        finalPotBB: totalPot + sc.bet,
        potOddsPct: parseFloat(sc.pct),
        estimatedEquityPct: parseFloat(sc.pct)
      },
      gameplan: `Fórmula: Apuesta a pagar / (Bote antes + Apuesta + Apuesta) = ${sc.bet} / (${sc.pot} + ${sc.bet} + ${sc.bet}) = ${sc.pct}. Necesitas tener al menos ${sc.pct} de equity para pagar rentablemente.`
    },
    hint: {
      relativePosition: 'OOP',
      potOddsPct: parseFloat(sc.pct),
      boardTexture: 'Seco'
    }
  };
}

export function generateOutsDrill(level: PedagogicalLevel = 2): HandStep {
  const scenarios = [
    {
      flop: [{ rank: '5' as Rank, suit: 'c' as Suit }, { rank: '2' as Rank, suit: 'd' as Suit }, { rank: 'T' as Rank, suit: 'd' as Suit }],
      hero: [{ rank: 'K' as Rank, suit: 'c' as Suit }, { rank: '2' as Rank, suit: 'c' as Suit }] as [Card, Card],
      villain: [{ rank: 'K' as Rank, suit: 'h' as Suit }, { rank: 'T' as Rank, suit: 's' as Suit }] as [Card, Card],
      contextNotice: 'Flop – you are behind and drawing.',
      outs: '5',
      options: ['2', '4', '5'],
      explanation: 'Tienes pareja de doses con kicker Rey frente a pareja de dieces con kicker Rey. Tus outs para ganar son los doses restantes (2 outs para trío) y los Reyes (3 outs para doble pareja superior K-2 vs T-K con mejor kicker), sumando 5 outs directas.'
    },
    {
      flop: [{ rank: 'J' as Rank, suit: 's' as Suit }, { rank: '8' as Rank, suit: 's' as Suit }, { rank: '4' as Rank, suit: 'd' as Suit }],
      hero: [{ rank: 'A' as Rank, suit: 's' as Suit }, { rank: '9' as Rank, suit: 's' as Suit }] as [Card, Card],
      villain: [{ rank: 'K' as Rank, suit: 'd' as Suit }, { rank: 'J' as Rank, suit: 'c' as Suit }] as [Card, Card],
      contextNotice: 'Flop – you are behind with a flush draw.',
      outs: '9',
      options: ['8', '9', '12'],
      explanation: 'Tienes un proyecto de color con cuatro cartas del mismo palo (picas). En una baraja hay 13 cartas de cada palo; como ya hay 4 visibles (tus 2 + 2 en el flop), te quedan exactamente 9 outs de picas para ligar color.'
    },
    {
      flop: [{ rank: '9' as Rank, suit: 'h' as Suit }, { rank: '8' as Rank, suit: 'c' as Suit }, { rank: '2' as Rank, suit: 'd' as Suit }],
      hero: [{ rank: 'J' as Rank, suit: 's' as Suit }, { rank: 'T' as Rank, suit: 'd' as Suit }] as [Card, Card],
      villain: [{ rank: 'A' as Rank, suit: 'h' as Suit }, { rank: '9' as Rank, suit: 'd' as Suit }] as [Card, Card],
      contextNotice: 'Flop – open-ended straight draw.',
      outs: '8',
      options: ['4', '8', '10'],
      explanation: 'Tienes proyecto de escalera abierta (J-10 sobre 9-8). Cualquier Reina (4 reinas) o cualquier Siete (4 sietes) completa tu escalera, dándote un total de 8 outs.'
    },
    {
      flop: [{ rank: 'K' as Rank, suit: 'c' as Suit }, { rank: '7' as Rank, suit: 'd' as Suit }, { rank: '3' as Rank, suit: 's' as Suit }],
      hero: [{ rank: '9' as Rank, suit: 'h' as Suit }, { rank: '8' as Rank, suit: 'h' as Suit }] as [Card, Card],
      villain: [{ rank: 'A' as Rank, suit: 'd' as Suit }, { rank: 'K' as Rank, suit: 's' as Suit }] as [Card, Card],
      contextNotice: 'Flop – gutshot straight draw.',
      outs: '4',
      options: ['2', '4', '6'],
      explanation: 'Tienes una escalera interna (gutshot): necesitas un Diez para conectar la escalera. Hay exactamente 4 dieces en la baraja, por lo que tienes 4 outs directas.'
    }
  ];

  const sc = pick(scenarios);

  const players: PlayerState[] = [
    {
      id: 'seat_hero',
      position: 'BB',
      isHero: true,
      isDealer: false,
      stack: 100,
      currentBet: 0,
      totalInvestedHand: 0,
      status: 'hero',
      cards: sc.hero
    },
    {
      id: 'seat_villain',
      position: 'BTN',
      isHero: false,
      isDealer: true,
      stack: 100,
      currentBet: 0,
      totalInvestedHand: 0,
      status: 'active',
      cards: sc.villain
    },
    { id: 'seat_2', position: 'SB', isHero: false, isDealer: false, stack: 100, currentBet: 0, totalInvestedHand: 0, status: 'folded' },
    { id: 'seat_3', position: 'CO', isHero: false, isDealer: false, stack: 100, currentBet: 0, totalInvestedHand: 0, status: 'folded' },
    { id: 'seat_4', position: 'HJ', isHero: false, isDealer: false, stack: 100, currentBet: 0, totalInvestedHand: 0, status: 'folded' },
    { id: 'seat_5', position: 'UTG', isHero: false, isDealer: false, stack: 100, currentBet: 0, totalInvestedHand: 0, status: 'folded' }
  ];

  return {
    id: `outs_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    street: 'flop',
    pot: 7.5,
    communityCards: sc.flop,
    players,
    heroPosition: 'BB',
    spotType: 'FACING_CBET',
    relativePosition: 'OOP',
    actionTicker: 'Conteo de Outs y Probabilidades · Flop',
    contextNotice: sc.contextNotice,
    prompt: 'How many outs do you have?',
    questionType: 'outs',
    options: sc.options.map(opt => ({
      id: opt,
      label: opt,
      isCorrect: opt === sc.outs,
      verdict: opt === sc.outs ? 'optimal' : 'error',
      evDiff: opt === sc.outs ? '+0.00 BB' : '-1.00 BB',
      evDiffNum: opt === sc.outs ? 0 : -1.0,
      frequencyGTO: opt === sc.outs ? 100 : 0
    })),
    gtoFrequencies: { fold: 0, call: 100, raise: 0 },
    tacticalExplanation: {
      headline: 'Conteo Preciso de Outs',
      positionAndRange: sc.contextNotice,
      math: {
        payBB: 3.5,
        finalPotBB: 14.5,
        potOddsPct: 24,
        estimatedEquityPct: parseInt(sc.outs, 10) * 4
      },
      gameplan: sc.explanation
    },
    hint: {
      relativePosition: 'OOP',
      potOddsPct: 24,
      boardTexture: 'Coordinado'
    }
  };
}

export function generateBestHandDrill(level: PedagogicalLevel = 2): HandStep {
  const deck = randomCards(11);
  const board = deck.slice(0, 5);
  const leftCards: [Card, Card] = [deck[5], deck[6]];
  const middleCards: [Card, Card] = [deck[7], deck[8]];
  const rightCards: [Card, Card] = [deck[9], deck[10]];

  const evalLeft = evaluateHand([...board, ...leftCards]);
  const evalMiddle = evaluateHand([...board, ...middleCards]);
  const evalRight = evaluateHand([...board, ...rightCards]);

  const cmpLM = compareEvaluations(evalLeft, evalMiddle);
  const cmpBestLMorR = cmpLM >= 0 ? { pos: 'LEFT', eval: evalLeft } : { pos: 'MIDDLE', eval: evalMiddle };
  const cmpFinal = compareEvaluations(cmpBestLMorR.eval, evalRight);
  const winner = cmpFinal >= 0 ? cmpBestLMorR.pos : 'RIGHT';
  const bestEvalObj = winner === 'LEFT' ? evalLeft : winner === 'MIDDLE' ? evalMiddle : evalRight;

  const players: PlayerState[] = [
    {
      id: 'seat_middle',
      position: 'BB',
      isHero: true,
      isDealer: false,
      stack: 100,
      currentBet: 0,
      totalInvestedHand: 0,
      status: 'hero',
      cards: middleCards
    },
    {
      id: 'seat_left',
      position: 'CO',
      isHero: false,
      isDealer: false,
      stack: 100,
      currentBet: 0,
      totalInvestedHand: 0,
      status: 'active',
      cards: leftCards
    },
    { id: 'seat_2', position: 'HJ', isHero: false, isDealer: false, stack: 100, currentBet: 0, totalInvestedHand: 0, status: 'folded' },
    { id: 'seat_3', position: 'UTG', isHero: false, isDealer: false, stack: 100, currentBet: 0, totalInvestedHand: 0, status: 'folded' },
    { id: 'seat_4', position: 'SB', isHero: false, isDealer: false, stack: 100, currentBet: 0, totalInvestedHand: 0, status: 'folded' },
    {
      id: 'seat_right',
      position: 'BTN',
      isHero: false,
      isDealer: true,
      stack: 100,
      currentBet: 0,
      totalInvestedHand: 0,
      status: 'active',
      cards: rightCards
    }
  ];

  return {
    id: `best_hand_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    street: 'river',
    pot: 24,
    communityCards: board,
    players,
    heroPosition: 'BB',
    spotType: 'TURN_RIVER_DECISION',
    relativePosition: 'IP',
    actionTicker: 'Showdown de 3 Jugadores en el River',
    contextNotice: '¿Qué jugador tiene la mano ganadora?',
    prompt: 'Which hand is best?',
    questionType: 'best_hand',
    options: [
      {
        id: 'LEFT',
        label: 'LEFT IS BEST',
        isCorrect: winner === 'LEFT',
        verdict: winner === 'LEFT' ? 'optimal' : 'error',
        evDiff: winner === 'LEFT' ? '+0.00 BB' : '-1.00 BB',
        evDiffNum: winner === 'LEFT' ? 0 : -1.0,
        frequencyGTO: winner === 'LEFT' ? 100 : 0
      },
      {
        id: 'MIDDLE',
        label: 'MIDDLE IS BEST',
        isCorrect: winner === 'MIDDLE',
        verdict: winner === 'MIDDLE' ? 'optimal' : 'error',
        evDiff: winner === 'MIDDLE' ? '+0.00 BB' : '-1.00 BB',
        evDiffNum: winner === 'MIDDLE' ? 0 : -1.0,
        frequencyGTO: winner === 'MIDDLE' ? 100 : 0
      },
      {
        id: 'RIGHT',
        label: 'RIGHT IS BEST',
        isCorrect: winner === 'RIGHT',
        verdict: winner === 'RIGHT' ? 'optimal' : 'error',
        evDiff: winner === 'RIGHT' ? '+0.00 BB' : '-1.00 BB',
        evDiffNum: winner === 'RIGHT' ? 0 : -1.0,
        frequencyGTO: winner === 'RIGHT' ? 100 : 0
      }
    ],
    gtoFrequencies: { fold: 0, call: 100, raise: 0 },
    tacticalExplanation: {
      headline: `${winner} tiene la mejor jugada`,
      positionAndRange: `${winner} gana el bote con ${bestEvalObj.descr} (${bestEvalObj.name}).`,
      math: {
        payBB: 0,
        finalPotBB: 24,
        potOddsPct: 0,
        estimatedEquityPct: 100
      },
      gameplan: 'En Texas Hold\'em la mano ganadora se forma con la mejor combinación de 5 cartas elegidas entre las 2 propias y las 5 comunitarias.'
    },
    hint: {
      relativePosition: 'IP',
      potOddsPct: 0,
      boardTexture: 'River Showdown'
    }
  };
}

// Master simulator drill dispatcher supporting all subcategories
export function generateSimulatorDrill(sub: SubcategoryId, level: PedagogicalLevel = 2): HandStep {
  if (sub === 'odds') {
    return generatePotOddsDrill(level);
  }
  if (sub === 'equity') {
    return generateOutsDrill(level);
  }
  if (sub === 'ev') {
    return generatePotOddsDrill(level);
  }
  if (sub === 'best_hand' || sub === 'hand_ranking') {
    return generateBestHandDrill(level);
  }

  // Preflop or Postflop action drill
  const scenario = generateFullHandScenario(level);
  if (sub === 'preflop') {
    return scenario.steps[0];
  }
  // Return postflop step (flop, turn, or river)
  return pick([scenario.steps[1], scenario.steps[2], scenario.steps[3]]);
}
