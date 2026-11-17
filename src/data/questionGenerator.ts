import { ExerciseQuestion, SubcategoryId, Card, Rank, Suit, PlayerSeat } from '../types/poker';
import { RANKS, SUITS, evaluateHand, compareEvaluations } from '../utils/pokerEvaluator';
import { GTO_OPEN_RANGES, RANKS_ORDER } from './preflopRanges';

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

// ====================================================
// 1. OUTS & DRAWING QUESTION (Exact as Screenshot 1)
// ====================================================
function generateOutsQuestion(): ExerciseQuestion {
  const scenarios = [
    {
      flop: [{ rank: '5' as Rank, suit: 'c' as Suit }, { rank: '2' as Rank, suit: 'd' as Suit }, { rank: 'T' as Rank, suit: 'd' as Suit }],
      hero: [{ rank: 'K' as Rank, suit: 'c' as Suit }, { rank: '2' as Rank, suit: 'c' as Suit }],
      villain: [{ rank: 'K' as Rank, suit: 'h' as Suit }, { rank: 'T' as Rank, suit: 's' as Suit }],
      tableSubtitle: 'Flop – you are behind and drawing.',
      outs: 5, // Two remaining 2s to make trips (2 outs) + three remaining Kings for two pair King-Deuce (3 outs) = 5 outs (or 2 outs to improve to two pair/trips)
      correct: '5',
      options: ['2', '4', '5'],
      explanation: 'Tienes pareja de doses con kicker Rey frente a pareja de dieces con kicker Rey. Tus outs para ganar son los doses restantes (2 outs para trío) y los Reyes (3 outs para doble pareja superior K-2 vs T-K con mejor kicker), sumando 5 outs directas.'
    },
    {
      flop: [{ rank: 'J' as Rank, suit: 's' as Suit }, { rank: '8' as Rank, suit: 's' as Suit }, { rank: '4' as Rank, suit: 'd' as Suit }],
      hero: [{ rank: 'A' as Rank, suit: 's' as Suit }, { rank: '9' as Rank, suit: 's' as Suit }],
      villain: [{ rank: 'K' as Rank, suit: 'd' as Suit }, { rank: 'J' as Rank, suit: 'c' as Suit }],
      tableSubtitle: 'Flop – you are behind with a flush draw.',
      outs: 9,
      correct: '9',
      options: ['8', '9', '12'],
      explanation: 'Tienes un proyecto de color con cuatro cartas del mismo palo (picas). En una baraja hay 13 cartas de cada palo; como ya hay 4 visibles (tus 2 + 2 en el flop), te quedan exactamente 9 outs de picas para ligar color.'
    },
    {
      flop: [{ rank: '9' as Rank, suit: 'h' as Suit }, { rank: '8' as Rank, suit: 'c' as Suit }, { rank: '2' as Rank, suit: 'd' as Suit }],
      hero: [{ rank: 'J' as Rank, suit: 's' as Suit }, { rank: 'T' as Rank, suit: 'd' as Suit }],
      villain: [{ rank: 'A' as Rank, suit: 'h' as Suit }, { rank: '9' as Rank, suit: 'd' as Suit }],
      tableSubtitle: 'Flop – open-ended straight draw.',
      outs: 8,
      correct: '8',
      options: ['4', '8', '10'],
      explanation: 'Tienes proyecto de escalera abierta (J-10 sobre 9-8). Cualquier Reina (4 reinas) o cualquier Siete (4 sietes) completa tu escalera, dándote un total de 8 outs.'
    },
    {
      flop: [{ rank: 'K' as Rank, suit: 'c' as Suit }, { rank: '7' as Rank, suit: 'd' as Suit }, { rank: '3' as Rank, suit: 's' as Suit }],
      hero: [{ rank: '9' as Rank, suit: 'h' as Suit }, { rank: '8' as Rank, suit: 'h' as Suit }],
      villain: [{ rank: 'A' as Rank, suit: 'd' as Suit }, { rank: 'K' as Rank, suit: 's' as Suit }],
      tableSubtitle: 'Flop – gutshot straight draw.',
      outs: 4,
      correct: '4',
      options: ['2', '4', '6'],
      explanation: 'Tienes una escalera interna (gutshot): necesitas un Diez para conectar la escalera (7-8-9-T-J o K-T...). Hay exactamente 4 dieces en la baraja, por lo que tienes 4 outs.'
    }
  ];

  const sc = pick(scenarios);

  const seats: PlayerSeat[] = [
    {
      id: 'villain',
      label: 'VILLAIN',
      cards: [sc.villain[0], sc.villain[1]]
    },
    {
      id: 'hero',
      label: 'HERO',
      cards: [sc.hero[0], sc.hero[1]]
    }
  ];

  return {
    id: `outs_${Date.now()}_${Math.random()}`,
    category: 'math',
    subcategory: 'equity',
    title: 'Outs Calculation',
    prompt: 'How many outs do you have?',
    tableSubtitle: sc.tableSubtitle,
    communityCards: sc.flop,
    seats,
    options: sc.options.map(val => ({
      id: val,
      label: val,
      isCorrect: val === sc.correct
    })),
    explanation: sc.explanation,
    infoExplanation: 'Una "out" es cualquier carta restante en la baraja que mejora tu mano hasta convertirla en la mejor de la mesa frente al rival.'
  };
}

// ====================================================
// 2. BEST HAND 3-PLAYER SHOWDOWN (Exact as Screenshot 2)
// ====================================================
function generateThreePlayerShowdown(): ExerciseQuestion {
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

  const seats: PlayerSeat[] = [
    { id: 'left', label: 'LEFT', cards: leftCards },
    { id: 'middle', label: 'MIDDLE', cards: middleCards },
    { id: 'right', label: 'RIGHT', cards: rightCards }
  ];

  const bestEvalObj = winner === 'LEFT' ? evalLeft : winner === 'MIDDLE' ? evalMiddle : evalRight;

  return {
    id: `best_hand_${Date.now()}_${Math.random()}`,
    category: 'fundamentals',
    subcategory: 'best_hand',
    title: 'Best Hand Showdown',
    prompt: 'Which hand is best?',
    communityCards: board,
    seats,
    options: [
      { id: 'LEFT', label: 'LEFT IS BEST', isCorrect: winner === 'LEFT' },
      { id: 'MIDDLE', label: 'MIDDLE IS BEST', isCorrect: winner === 'MIDDLE' },
      { id: 'RIGHT', label: 'RIGHT IS BEST', isCorrect: winner === 'RIGHT' }
    ],
    explanation: `${winner} gana el bote con ${bestEvalObj.descr} (${bestEvalObj.name}).`,
    infoExplanation: 'En Texas Hold\'em la mano ganadora se forma con la mejor combinación de 5 cartas elegidas entre las 2 propias y las 5 comunitarias.'
  };
}

// ====================================================
// 3. POT ODDS WITH CHIPS (Exact as Screenshot 4)
// ====================================================
function generatePotOddsQuestion(): ExerciseQuestion {
  const scenarios = [
    { pot: 60, bet: 30, pct: '25 %', options: ['20 %', '30 %', '25 %'] },
    { pot: 100, bet: 50, pct: '25 %', options: ['25 %', '33 %', '20 %'] },
    { pot: 80, bet: 40, pct: '25 %', options: ['20 %', '25 %', '35 %'] },
    { pot: 100, bet: 100, pct: '33 %', options: ['50 %', '33 %', '25 %'] },
    { pot: 100, bet: 25, pct: '17 %', options: ['17 %', '25 %', '20 %'] },
    { pot: 75, bet: 25, pct: '20 %', options: ['15 %', '20 %', '25 %'] },
    { pot: 120, bet: 40, pct: '20 %', options: ['20 %', '25 %', '30 %'] }
  ];

  const sc = pick(scenarios);
  const totalPot = sc.pot + sc.bet;

  const seats: PlayerSeat[] = [
    { id: 'villain', label: 'VILLAIN', chips: sc.bet },
    { id: 'hero', label: 'HERO' }
  ];

  return {
    id: `pot_odds_${Date.now()}_${Math.random()}`,
    category: 'math',
    subcategory: 'odds',
    title: 'Pot Odds',
    prompt: 'What are your pot odds?',
    tableSubtitle: `Villain bets ${sc.bet} into ${sc.pot}.`,
    pot: sc.pot,
    seats,
    options: sc.options.map(val => ({
      id: val,
      label: val,
      isCorrect: val === sc.pct
    })),
    explanation: `Fórmula: Apuesta / (Bote antes + Apuesta + Apuesta) = ${sc.bet} / (${sc.pot} + ${sc.bet} + ${sc.bet}) = ${sc.bet} / ${totalPot + sc.bet} = ${sc.pct}. Necesitas tener al menos ese porcentaje de equity para pagar rentablemente.`,
    infoExplanation: 'Las Pot Odds te indican el porcentaje de victorias que necesitas para que pagar una apuesta concreta tenga valor esperado positivo (+EV).'
  };
}

// ====================================================
// 4. PREFLOP TABLE DECISION (Exact Table Oval as Screenshot 3)
// ====================================================
function generatePreflopDecision(): ExerciseQuestion {
  const positions: Array<'UTG' | 'HJ' | 'CO' | 'BTN' | 'SB' | 'BB'> = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
  const heroPos = pick(positions);
  const posKey = heroPos === 'HJ' ? 'MP' : heroPos;
  const range = GTO_OPEN_RANGES[posKey] || GTO_OPEN_RANGES.BTN;

  const r1 = pick(RANKS_ORDER);
  const r2 = pick(RANKS_ORDER);
  const isSuited = Math.random() > 0.5 && r1 !== r2;
  const handLabel = r1 === r2 ? `${r1}${r2}` : (isSuited ? `${r1}${r2}s` : `${r2}${r1}o`);

  const action = range[handLabel] || 'fold';

  const heroCard1: Card = { rank: r1, suit: 's' };
  const heroCard2: Card = { rank: r2, suit: isSuited ? 's' : 'h' };

  let correct = 'FOLD';
  if (action === 'raise' || action === 'mixed') correct = 'RAISE';

  const seats: PlayerSeat[] = [
    { id: 'seat_co', label: 'CO' },
    { id: 'seat_btn', label: 'BTN' },
    { id: 'seat_bb', label: 'BB' },
    { id: 'seat_hj', label: 'HJ' },
    {
      id: 'hero',
      label: 'HERO',
      position: heroPos,
      cards: [heroCard1, heroCard2]
    }
  ];

  return {
    id: `pref_${Date.now()}_${Math.random()}`,
    category: 'simulator',
    subcategory: 'preflop',
    title: 'Preflop Action',
    prompt: `You hold ${handLabel} in ${heroPos}. What is your action?`,
    tableSubtitle: `Action folded to you in ${heroPos}.`,
    seats,
    options: [
      { id: 'FOLD', label: 'FOLD', isCorrect: correct === 'FOLD' },
      { id: 'CALL', label: 'CALL', isCorrect: false },
      { id: 'RAISE', label: 'RAISE', isCorrect: correct === 'RAISE' }
    ],
    explanation: `En posición ${heroPos}, ${handLabel} debe ser ${correct === 'RAISE' ? 'abierta con subida (Raise a 2.3 BB)' : 'foldeada'} según las tablas GTO de 100 BB.`,
    infoExplanation: 'En 6-max preflop, subir (Raise) o retirarse (Fold) son las opciones principales; pagar (Limp) raramente forma parte de la estrategia óptima.'
  };
}

// ====================================================
// 5. POSTFLOP & FULL HAND SIMULATOR
// ====================================================
function generatePostflopDecision(): ExerciseQuestion {
  const cards = randomCards(7);
  const heroCards: [Card, Card] = [cards[0], cards[1]];
  const board = cards.slice(2, 5); // Flop

  const seats: PlayerSeat[] = [
    { id: 'villain', label: 'VILLAIN' },
    { id: 'hero', label: 'HERO', cards: heroCards }
  ];

  return {
    id: `post_${Date.now()}_${Math.random()}`,
    category: 'simulator',
    subcategory: 'postflop',
    title: 'Flop C-Bet',
    prompt: 'Villain checks to you on the flop. What is your move?',
    tableSubtitle: 'Pot is 6.5 BB. You are in position on BTN.',
    communityCards: board,
    seats,
    pot: 6.5,
    options: [
      { id: 'CHECK', label: 'CHECK', isCorrect: false },
      { id: 'BET_SMALL', label: 'BET 33% POT', isCorrect: true },
      { id: 'ALL_IN', label: 'ALL-IN', isCorrect: false }
    ],
    explanation: 'Como agresor preflop en posición con ventaja de rango, una apuesta de continuación pequeña (33% pot) ejerce presión eficiente y cobra a manos peores.',
    infoExplanation: 'Las C-bets pequeñas con ventaja de rango obligan al rival a defender con manos marginales o abandonar equity gratis.'
  };
}

// Master generator dispatcher
export function generateQuestion(subcategory: SubcategoryId): ExerciseQuestion {
  switch (subcategory) {
    case 'best_hand':
      return generateThreePlayerShowdown();
    case 'odds':
      return generatePotOddsQuestion();
    case 'equity':
      return generateOutsQuestion();
    case 'ev':
      return generatePotOddsQuestion();
    case 'preflop':
      return generatePreflopDecision();
    case 'postflop':
    case 'full_hand':
      return generatePostflopDecision();
    case 'hand_ranking':
    default:
      return generateThreePlayerShowdown();
  }
}
