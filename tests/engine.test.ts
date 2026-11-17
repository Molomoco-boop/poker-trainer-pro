/* Run: npm test */
import { evaluateHand, compareEvaluations } from '../src/utils/pokerEvaluator';
import {
  generateFullHandScenario,
  generatePotOddsDrill,
  generateOutsDrill,
  generateEvDrill,
  generateSimulatorDrill,
  generateSimilarStep,
  buildOptions,
  mixedLine,
  walkHand,
  generateMdfDrill,
  generateBluffDrill,
  generateCombosDrill,
  generateEquityDrill,
  equityVsRange,
  countCombos,
  generateConceptStep,
  generateLeakStep,
  generateRatedHand,
  neighbourHand,
  handCell,
  conceptOfKey
} from '../src/utils/fullHandEngine';
import { updateRating, expectedScore, aboveChance, pickNearRating, levelForRating, START } from '../src/utils/rating';
import {
  dailyPlan, PLACEMENT, placementCurriculum, advanceCurriculum, rangeScore, RANGE_TASKS, sprintHand, sprintCorrect,
  reviewInterval, confidenceOf, chanceOf
} from '../src/utils/sessionPlanner';
import { migrateStats, applyAnswer, DEFAULT_STATS } from '../src/context/statsLogic';
import { CURRICULUM, ConceptId } from '../src/types/poker';
import { handCombos } from '../src/data/preflopRanges';
import { detectCleanOuts, countOutsVsVillain, analyzeBoardTexture } from '../src/utils/pokerMath';
import { classifyHand } from '../src/utils/handStrength';
import { getPreflopMatrix, getRangeStats, earliestOpenPosition, ALL_HANDS } from '../src/data/preflopRanges';
import { HAND_RANKING } from '../src/data/handRanking';
import { CLOCKWISE_POSITIONS, HandStep, PedagogicalLevel, SpotType, Card, Position } from '../src/types/poker';

let failures = 0;
let checks = 0;
const fail = (msg: string) => { failures++; if (failures <= 40) console.log('FAIL', msg); };
const ok = (cond: boolean, msg: string) => { checks++; if (!cond) fail(msg); };
const C = (s: string) => s.split(' ').map(x => ({ rank: x[0], suit: x[1] })) as Card[];
const ev = (s: string) => evaluateHand(C(s));
const cmp = (a: string, b: string) => compareEvaluations(ev(a), ev(b));
const r1 = (n: number) => Math.round(n * 10) / 10;

// ---------- evaluator ----------
ok(ev('Ah 2d 3c 4s 5h Kd Qc').score === 4 && ev('Ah 2d 3c 4s 5h Kd Qc').tiebreakers[0] === 5, 'wheel');
ok(cmp('2d 3c 4s 5h 6d Kc Qh', 'Ah 2d 3c 4s 5h Kd Qc') > 0, '6-high straight beats wheel');
ok(cmp('Kh Kd Ks 9h 9c 2h 3h', 'Ah Th 7h 4h 2h Kd Qc') > 0, 'full house > flush');
ok(cmp('Ah Kd 9c 7s 4d Th 2c', 'Ah Qd 9c 7s 4d Th 2c') > 0, 'kicker');
ok(cmp('Ah Kh Qh Jh Th 2c 3d', 'Ah Kh Qh Jh Th 4c 5d') === 0, 'board plays (royal) split');
ok(cmp('5c 6d 7h 8s 9c 2d 2h', '5c 6d 7h 8s 9c Ad Kh') === 0, 'board straight split');
ok(ev('Kh Kd 9c 9s 4d 4h Qc').tiebreakers.join(',') === '13,9,12', 'three pairs -> best two + kicker');
ok(cmp('9h 9d 9c 9s Ad 2h 3c', '9h 9d 9c 9s Kd 2h 3c') > 0, 'quads kicker');

// ---------- strength classifier ----------
ok(classifyHand(C('Ah Kd') as [Card, Card], C('Ac 7s 2d')).cls === 'strong', 'TPTK = strong');
ok(classifyHand(C('9h 9d') as [Card, Card], C('Ac 7s 2d')).cls === 'medium', 'underpair between = medium');
ok(classifyHand(C('7h 2d') as [Card, Card], C('Ac 7s 2c')).cls === 'monster', 'bottom two pair = monster');
ok(classifyHand(C('Ah Kh') as [Card, Card], C('Qh 7h 2c')).cls === 'draw', 'nut flush draw = draw');
ok(classifyHand(C('Ah Kh') as [Card, Card], C('5c 5s 9d 9h Td')).cls === 'air', 'board two pair, AK high = air (board plays)');
// board-aware: threats lower made hands that are not the nuts
ok(classifyHand(C('9s 6d') as [Card, Card], C('Jh 6c 9h 8c')).cls === 'strong', '96 on J698 (straight possible) = strong, not monster');
ok(classifyHand(C('9s 6d') as [Card, Card], C('Jh 6c 9h 8c')).threat === 'escalera', '96 on J698: threat escalera');
ok(classifyHand(C('7h 7d') as [Card, Card], C('7c 2h Ks')).cls === 'monster', 'set on dry board stays monster');
ok(classifyHand(C('Ts 9s') as [Card, Card], C('Jh Qd Kc 2h')).cls === 'strong', 'T-high straight with AT possible = strong');
ok(classifyHand(C('Ah 2h') as [Card, Card], C('Kh 7h 4h 9c')).cls === 'monster', 'nut flush stays monster');
ok(classifyHand(C('5h 2h') as [Card, Card], C('Kh 7h 4h 9c')).cls === 'strong', 'low flush = strong');
ok(classifyHand(C('Ah Kd') as [Card, Card], C('Ac 9h 8h 7c')).cls !== 'strong', 'TPTK on 987 two-tone is not strong');
ok(classifyHand(C('Qs Qd') as [Card, Card], C('Ah Kh 5h 2h')).cls === 'weak' || classifyHand(C('Qs Qd') as [Card, Card], C('Ah Kh 5h 2h')).cls === 'medium', 'QQ on 4-flush overcards: weak/medium');

// ---------- outs ----------
ok(countOutsVsVillain(C('Kc 2c') as [Card, Card], C('Kh Ts') as [Card, Card], C('5c 2d Td')).length === 2, 'K2 vs KT on 52T: 2 outs');
const aks = detectCleanOuts(C('As Ks') as [Card, Card], C('Qs Jd 4s'));
ok(aks.totalCleanOutsCount >= 15 && aks.totalCleanOutsCount <= 21 && aks.equityRiverPct < 75, `AKs on QsJd4s outs=${aks.totalCleanOutsCount} eq=${aks.equityRiverPct}`);
ok(detectCleanOuts(C('9h 8h') as [Card, Card], C('Kc 7d 3s')).drawLabels.every(l => !/Gutshot|abierta/.test(l)), '98 on K73: no straight draw');

// draw detection when the straight is on the board
const at4567 = classifyHand(C('Ad Th') as [Card, Card], C('4c 5s 6d 7h'));
ok(at4567.cls === 'air' && at4567.draws.totalCleanOutsCount === 0, `AT on 4567: no draw (cls=${at4567.cls}, outs=${at4567.draws.totalCleanOutsCount})`);
const qt = detectCleanOuts(C('Qd Th') as [Card, Card], C('8c Ts Jd'));
ok(qt.drawLabels.includes('Gutshot') && qt.straightOuts === 4, `QT on 8TJ: gutshot to the 9 (${qt.drawLabels.join('/')}, ${qt.straightOuts})`);
const kq = detectCleanOuts(C('Kd Qh') as [Card, Card], C('Jc Ts 4d'));
ok(kq.drawLabels.includes('Escalera abierta') && kq.straightOuts === 8, `KQ on JT4: open-ended (${kq.straightOuts})`);
ok(detectCleanOuts(C('8h 7h') as [Card, Card], C('Kh 9d 2h')).totalCleanOutsCount === 9, '87h on Kh9d2h: 9 flush outs (9h counts on an unpaired board)');
{
  const a6 = detectCleanOuts(C('Ah 6h') as [Card, Card], C('2h Qd 3h Qs'));
  ok(a6.totalCleanOutsCount === 11 && !a6.cleanOuts.some(c => c.rank === '6'), `A6h on 2hQd3hQs: 8 flush + 3 aces, no 6s (${a6.totalCleanOutsCount})`);
}
ok(classifyHand(C('2c 3d') as [Card, Card], C('5h 6s 7c 8d 9h')).cls === 'air', 'board straight, 23 plays the board = air');
ok(classifyHand(C('Tc 2d') as [Card, Card], C('5h 6s 7c 8d 9h')).cls === 'strong', 'T beats the board straight = strong');
ok(classifyHand(C('Ac Kc') as [Card, Card], C('5c 9c Jd')).cls === 'draw', 'nut flush draw on 2-flush flop = draw');

// ---------- board texture ----------
const mono = analyzeBoardTexture(C('Kh 7h 2h'));
ok(/color posible/.test(mono) && !/seco/.test(mono), `monotone flop not "seco" (${mono})`);
ok(analyzeBoardTexture(C('Kh 7d 2c')) === 'Alto · seco · arcoíris', `rainbow (${analyzeBoardTexture(C('Kh 7d 2c'))})`);
ok(/proyecto de color/.test(analyzeBoardTexture(C('Kh 7h 2c'))), 'two-tone flop = proyecto de color');
ok(/conectado/.test(analyzeBoardTexture(C('6h 7d 8c'))), '678 connected');
ok(/Pareado/.test(analyzeBoardTexture(C('8h 8d 3c'))), 'paired');
{
  const deck = '23456789TJQKA'.split('').flatMap(r => 'shdc'.split('').map(su => r + su));
  for (let i = 0; i < 2000; i++) {
    const b = [...deck].sort(() => Math.random() - 0.5).slice(0, 3 + (i % 3)).join(' ');
    const t = analyzeBoardTexture(C(b));
    ok(!(/seco/.test(t) && /color posible/.test(t)), `texture never "seco" with "color posible" (${b}: ${t})`);
    if (C(b).every(c => c.suit === C(b)[0].suit)) ok(!/seco/.test(t), `monotone not seco (${b})`);
  }
}

// ---------- ranges ----------
const pctOf = (sit: 'RFI' | 'VS_OPEN' | 'VS_3BET', h: Position, v?: Position) => getRangeStats(getPreflopMatrix(sit, h, v)).percentage;
ok(pctOf('VS_OPEN', 'BB', 'BTN') >= 60 && pctOf('VS_OPEN', 'BB', 'BTN') <= 70, `BB vs BTN defends ${pctOf('VS_OPEN', 'BB', 'BTN')} %`);
ok(pctOf('VS_OPEN', 'BB', 'SB') >= 60 && pctOf('VS_OPEN', 'BB', 'SB') <= 70, `BB vs SB defends ${pctOf('VS_OPEN', 'BB', 'SB')} %`);
ok(pctOf('RFI', 'UTG') < pctOf('RFI', 'HJ') && pctOf('RFI', 'HJ') < pctOf('RFI', 'CO') && pctOf('RFI', 'CO') < pctOf('RFI', 'BTN'), 'open ranges widen UTG<HJ<CO<BTN');
ok(JSON.stringify(getPreflopMatrix('RFI', 'UTG')) !== JSON.stringify(getPreflopMatrix('RFI', 'HJ')), 'UTG and HJ ranges differ');
ok(JSON.stringify(getPreflopMatrix('VS_3BET', 'UTG', 'BTN')) !== JSON.stringify(getPreflopMatrix('VS_3BET', 'BTN', 'BB')), 'vs 3-bet depends on position');
ok(pctOf('VS_OPEN', 'BB', 'UTG') < pctOf('VS_OPEN', 'BB', 'BTN'), 'BB defends tighter vs UTG');
for (const h of ALL_HANDS) {
  const e = earliestOpenPosition(h);
  if (!e) continue;
  const later = (['UTG', 'HJ', 'CO', 'BTN'] as Position[]).slice((['UTG', 'HJ', 'CO', 'BTN'] as Position[]).indexOf(e));
  later.forEach(p => ok(getPreflopMatrix('RFI', p)[h]?.raise >= 50, `${h} opened from ${e} also opened from ${p}`));
}
ok(HAND_RANKING.length === 169 && new Set(HAND_RANKING.map(h => h.hand)).size === 169, '169 unique hands in ranking');
ok(HAND_RANKING[0].hand === 'AA' && HAND_RANKING[0].rank === 1, 'AA is #1');
ok(HAND_RANKING[168].openFrom === null, 'last hand is never opened');

// ---------- mixed scoring ----------
const mixed = buildOptions([{ id: 'fold', label: 'FOLD', freq: 40 }, { id: 'call', label: 'CALL', freq: 60 }, { id: 'raise', label: 'RAISE', freq: 0 }]);
ok(mixed[0].isCorrect && mixed[0].grade === 'valid' && mixed[1].isCorrect && mixed[1].grade === 'best', 'freq ≥25 % = Válida, top = Mejor');
ok(!mixed[2].isCorrect && mixed[2].verdict === 'error' && mixed[2].grade === 'error', 'freq 0 = Error');
ok(buildOptions([{ id: 'fold', label: 'F', freq: 0 }, { id: 'raise', label: 'R', freq: 100 }], ['fold'])[0].grade === 'blunder', 'severe freq 0 = Grave');
ok(!('evDiff' in mixed[0]) && !('evDiffNum' in mixed[0]), 'no invented EV on options');
ok(mixedLine(mixed) === 'Pagar 60 % · Fold 40 %: ambas valen', `mixed line (${mixedLine(mixed)})`);
const rare = buildOptions([{ id: 'check', label: 'CHECK', freq: 85 }, { id: 'bet_small', label: 'BET', freq: 15 }]);
ok(!rare[1].isCorrect && rare[1].verdict === 'mixed' && rare[1].grade === 'imprecise', 'freq 15 % = Imprecisa');
ok(mixedLine(rare) === null, 'single answer: no mixed line');

// ---------- full-hand sweep ----------
const order = CLOCKWISE_POSITIONS;
const acts = (a: string, b: string) => order.indexOf(a as never) < order.indexOf(b as never);
const optimalByStreet: Record<string, Record<string, number>> = {};
let postflopSteps = 0;
let streetCounts: Record<string, number> = {};
const N = 3000;

function checkSeats(step: HandStep, tag: string) {
  const h = order.indexOf(step.heroPosition);
  ok(step.players.length === 6, `${tag}: 6 seats`);
  step.players.forEach((p, i) => ok(p.position === order[(h + i) % 6], `${tag}: seat ${i} is ${p.position}`));
  ok(step.players[0].isHero, `${tag}: hero seat 0`);
  step.players.forEach(p => ok(p.isDealer === (p.position === 'BTN'), `${tag}: dealer on BTN`));
}

function checkStep(step: HandStep, tag: string) {
  checkSeats(step, tag);
  const opts = step.options;
  ok(opts.some(o => o.isCorrect), `${tag}: has optimal option`);
  opts.forEach(o => ok(o.isCorrect === (o.verdict === 'optimal'), `${tag}: isCorrect<->verdict ${o.id}`));
  opts.forEach(o => ok(o.isCorrect === (o.grade === 'best' || o.grade === 'valid'), `${tag}: grade<->correct ${o.id} ${o.grade}`));
  ok(opts.filter(o => o.grade === 'best').length >= 1, `${tag}: one best`);
  ok(!!step.concept && step.difficulty >= 900 && step.difficulty <= 2100, `${tag}: concept ${step.concept} difficulty ${step.difficulty}`);
  step.players.forEach(p => ok(Math.abs(p.stack + p.totalInvestedHand - 100) < 0.01, `${tag}: stack+invested=100 (${p.position})`));
  const potFromPlayers = r1(step.players.reduce((a, p) => a + p.totalInvestedHand, 0));
  ok(Math.abs(potFromPlayers - step.pot) < 0.05, `${tag}: pot ${step.pot} == invested ${potFromPlayers}`);
  const hero = step.players[0];
  const facing = Math.max(...step.players.filter(p => !p.isHero).map(p => p.currentBet));
  const call = opts.find(o => o.id === 'call');
  if (call) ok(Math.abs((call.amountBB || 0) - r1(Math.min(facing - hero.currentBet, hero.stack))) < 0.05, `${tag}: CALL ${call.amountBB} == ${facing} - ${hero.currentBet}`);
  const cards = [...(hero.cards || []), ...step.communityCards].map(c => c.rank + c.suit);
  ok(new Set(cards).size === cards.length, `${tag}: no duplicate cards`);
  if (step.questionType === 'action') {
    ok(opts.length === 3, `${tag}: always 3 options (${opts.map(o => o.id).join('/')})`);
    ok(new Set(opts.map(o => o.label)).size === 3, `${tag}: 3 distinct labels`);
    const amts = opts.filter(o => o.amountBB !== undefined).map(o => o.amountBB!);
    amts.forEach(a => ok(a > 0 && a <= hero.stack + hero.currentBet + 0.05, `${tag}: amount ${a} within stack ${hero.stack}`));
    const rows = step.detail || [];
    ok(rows.length >= 2 && rows.length <= 3 && rows.some(r => r.k === 'plan'), `${tag}: 2-3 detail rows with plan`);
    rows.forEach(r => ok(r.value.length > 0 && r.value.length <= 70, `${tag}: compact row "${r.value}"`));
    if (step.street === 'preflop') rows.filter(r => r.k === 'plan').forEach(r => ok(!/%/.test(r.value), `${tag}: plan without % (${r.value})`));
    const limp = opts.find(o => o.id === 'limp');
    if (limp) ok(limp.grade === 'error' && limp.amountBB === (step.heroPosition === 'SB' ? 0.5 : 1), `${tag}: limp is an error, ${limp.amountBB} BB`);
  }
}

const flopSizes = new Set<string>();
let heroAggFlops = 0;
let donks = 0;
let foldNotes = 0;
let raiseSteps = 0;
let probeSpots = 0;

function checkWhy(step: HandStep, tag: string) {
  ok(!!step.why && step.why.length <= 140, `${tag}: why line present and short (${step.why?.length}) "${step.why}"`);
  const m = /necesitas (\d+) %/.exec(step.why || '');
  const call = step.options.find(o => o.id === 'call');
  if (call && call.amountBB && call.frequencyGTO > 0 && step.questionType === 'action') {
    ok(!!m, `${tag}: why mentions what you need ("${step.why}")`);
    if (m) {
      const need = Math.round((call.amountBB / (step.pot + call.amountBB)) * 100);
      ok(Math.abs(Number(m[1]) - need) <= 1, `${tag}: necesitas ${m[1]} == ${need}`);
    }
  }
}

for (let i = 0; i < N; i++) {
  const level = ((i % 4) + 1) as PedagogicalLevel;
  const forced: SpotType | undefined = i % 5 === 0 ? (['CBET_FLOP', 'FACING_CBET', 'TURN_RIVER_DECISION', '3BET_POT', 'SB_VS_OPEN'] as SpotType[])[i % 25 / 5 | 0] : undefined;
  const sc = generateFullHandScenario(level, forced);
  const pf = sc.steps[0];
  const tag = `#${i} ${sc.spotType} ${pf.heroPosition}`;
  checkStep(pf, tag + ' pre');
  checkWhy(pf, tag + ' pre');
  ok(pf.street === 'preflop', `${tag}: first step preflop`);
  ok(pf.options.some(o => o.id === 'limp') === (sc.spotType === 'RFI_OPEN'), `${tag}: limp only when unopened`);
  ok(pf.review.kind === 'pre' && pf.review.heroPos === pf.heroPosition, `${tag}: review key`);

  // opener acts before hero (except a 3-bettor, who acts after hero's open)
  const raisers = pf.players.filter(p => !p.isHero && p.currentBet > 1);
  raisers.forEach(r => {
    if (sc.spotType === '3BET_POT') ok(acts(pf.heroPosition, r.position) && pf.players[0].currentBet === 2.5, `${tag}: 3-bettor ${r.position} after hero open`);
    else ok(acts(r.position, pf.heroPosition), `${tag}: opener ${r.position} acts before hero`);
    ok(r.status === 'active', `${tag}: opener ${r.position} not folded`);
  });
  if (sc.spotType === 'RFI_OPEN') ok(raisers.length === 0, `${tag}: RFI has no raiser`);
  if (sc.spotType === 'BB_DEFENSE') {
    const open = raisers[0];
    const callOpt = pf.options.find(o => o.id === 'call')!;
    ok(callOpt.amountBB === r1(open.currentBet - 1), `${tag}: BB call = open - 1`);
  }
  if (sc.spotType === 'SB_VS_OPEN') ok(pf.options.find(o => o.id === 'call')!.amountBB === 2, `${tag}: SB call 2.0 vs 2.5`);
  if (sc.spotType === '3BET_POT') ok((getPreflopMatrix('RFI', pf.heroPosition)[pf.review.hand!]?.raise || 0) >= 50, `${tag}: facing a 3-bet only with a hand you open`);

  // play the hand with random correct answers
  let preChoice = '';
  const { steps, note } = walkHand(pf, st => {
    const id = pick(st.options.filter(o => o.isCorrect)).id;
    if (st === pf) preChoice = id;
    return id;
  });
  if (note && /foldea/.test(note)) foldNotes++;
  for (let k = 0; k < steps.length - 1; k++) {
    ok(steps[k + 1].pot >= steps[k].pot - 0.05 || steps[k].street === 'preflop', `${tag}: pot never shrinks`);
  }
  const post = steps.slice(1);
  if (post.length) {
    const flop = post[0];
    const startPot = r1(flop.pot - flop.players.reduce((a, p) => a + p.currentBet, 0));
    if (flop.street === 'flop') {
      const villain = flop.players.find(p => !p.isHero && p.status === 'active')!;
      let exp: number | undefined;
      if (sc.spotType === 'RFI_OPEN') exp = pf.heroPosition === 'SB' || villain.position === 'SB' ? 6 : 5.5;
      if (sc.spotType === 'SB_VS_OPEN') exp = 23;
      if (sc.spotType === 'BB_DEFENSE') {
        const open = raisers[0];
        exp = preChoice === '3bet' ? (open.position === 'SB' ? 18 : 22.5) : open.position === 'SB' ? 6 : 5.5;
      }
      if (sc.spotType === '3BET_POT') {
        const tb = preChoice === '4bet' ? 22 : raisers[0].currentBet;
        const dead = (raisers[0].position === 'SB' || pf.heroPosition === 'SB' ? 0 : 0.5) + (raisers[0].position === 'BB' ? 0 : 1);
        exp = 2 * tb + dead;
      }
      if (exp !== undefined) ok(Math.abs(startPot - exp) < 0.05, `${tag}: flop pot ${startPot} expected ${exp} (${preChoice})`);
      const heroAgg = sc.spotType === 'RFI_OPEN' || sc.spotType === 'SB_VS_OPEN' || preChoice === '3bet' || preChoice === '4bet';
      const villainBetFirst = flop.players.some(p => !p.isHero && p.currentBet > 0) && flop.players[0].currentBet === 0;
      if (heroAgg && flop.relativePosition === 'IP') { heroAggFlops++; if (villainBetFirst) donks++; }
      if (villainBetFirst) {
        const bet = flop.players.find(p => !p.isHero && p.currentBet > 0)!.currentBet;
        flopSizes.add((bet / startPot).toFixed(2));
      }
    }
    for (const st of post) {
      postflopSteps++;
      const stag = `${tag} ${st.street}`;
      checkStep(st, stag);
      checkWhy(st, stag);
      ok(st.review.kind === 'post' && !!st.review.decision && st.review.street === st.street, `${stag}: review key`);
      if (st.review.decision === 'raise') raiseSteps++;
      const active = st.players.filter(p => !p.isHero && p.status === 'active');
      ok(active.length === 1, `${stag}: heads-up (${active.map(p => p.position).join('/')})`);
      const facingBet = st.players.some(p => !p.isHero && p.currentBet > st.players[0].currentBet);
      if (facingBet && st.relativePosition === 'OOP' && st.review.decision === 'facing') ok(/pasas/i.test(st.contextNotice), `${stag}: OOP hero acts first ("${st.contextNotice}")`);
      if (!facingBet && st.relativePosition === 'IP') ok(/pasa\b/.test(st.contextNotice), `${stag}: IP hero gets checked to ("${st.contextNotice}")`);
      if (!facingBet && /hablas primero/.test(st.contextNotice)) probeSpots++;
      const opt = st.options.filter(o => o.isCorrect).map(o => o.id).join('+');
      optimalByStreet[st.street] = optimalByStreet[st.street] || {};
      optimalByStreet[st.street][opt] = (optimalByStreet[st.street][opt] || 0) + 1;
      streetCounts[st.street] = (streetCounts[st.street] || 0) + 1;
      if (st.street === 'river' && facingBet) {
        const cls = classifyHand(st.players[0].cards!, st.communityCards).cls;
        if (cls === 'monster') ok(!st.options.find(o => o.id === 'fold')!.isCorrect, `${stag}: never fold a monster on river`);
      }
    }
  }
}
function pick<T>(a: T[]): T { return a[Math.floor(Math.random() * a.length)]; }

// villain is not predictable
ok(flopSizes.size >= 3, `villain flop sizes vary (${[...flopSizes].join(', ')})`);
ok(donks > 0 && donks / Math.max(1, heroAggFlops) < 0.25, `donk bets exist but are rare (${donks}/${heroAggFlops})`);
ok(foldNotes > 20, `villain folds to bets sometimes (${foldNotes})`);
ok(raiseSteps > 20, `villain raises / check-raises sometimes (${raiseSteps})`);
ok(probeSpots > 20, `checked streets lead to probe spots (${probeSpots})`);

// postflop answer variety
const share = (street: string, id: string) =>
  Object.entries(optimalByStreet[street] || {}).filter(([k]) => k.split('+').some(x => x === id || x.startsWith(id + '_'))).reduce((a, [, v]) => a + v, 0) / (streetCounts[street] || 1);
for (const street of ['flop', 'turn', 'river']) {
  ok((streetCounts[street] || 0) > 100, `${street}: reached ${streetCounts[street]} times`);
  const ids = street === 'river' ? ['fold', 'call', 'check'] : ['fold', 'call', 'check', 'bet'];
  ids.forEach(id => ok(share(street, id) > 0.03, `${street}: "${id}" optimal in ${(share(street, id) * 100).toFixed(1)}% (>3%)`));
}
ok(share('flop', 'raise') + share('turn', 'raise') + share('flop', 'bet_big') > 0.02, 'aggressive answers exist');

// ---------- drills ----------
for (let i = 0; i < 300; i++) {
  const po = generatePotOddsDrill();
  checkSeats(po, 'potodds');
  const bet = po.players.find(p => p.currentBet > 0)!.currentBet;
  const potBefore = po.pot - bet;
  const correct = po.options.find(o => o.isCorrect)!;
  ok(Math.abs(parseFloat(correct.label) - (bet / (potBefore + 2 * bet)) * 100) <= 0.5, `potodds answer ${correct.label}`);
  ok(new Set(po.options.map(o => o.label)).size === 3, 'potodds 3 distinct options');

  const od = generateOutsDrill();
  checkSeats(od, 'outs');
  const vill = od.players.find(p => !p.isHero && p.cards)!;
  const outs = countOutsVsVillain(od.players[0].cards!, vill.cards!, od.communityCards).length;
  ok(od.options.find(o => o.isCorrect)!.label === `${outs}`, `outs drill answer ${outs}`);

  const evd = generateEvDrill();
  checkSeats(evd, 'ev');
  ok(evd.options.filter(o => o.isCorrect).length === 1, 'ev drill one answer');
  ok(/=/.test(po.why) && /=/.test(od.why) && /=/.test(evd.why), 'drills show the calculation');
  ok(new RegExp(`= ${outs} outs$`).test(od.why), `outs why "${od.why}"`);
  const evNum = parseFloat(evd.options.find(o => o.isCorrect)!.label);
  const whyNum = parseFloat(evd.why.split('= ')[1].replace('−', '-'));
  ok(Math.abs(evNum - whyNum) < 0.11, `ev why ${evd.why} vs ${evNum}`);
}
const potOddsUnique = new Set(Array.from({ length: 300 }, () => generatePotOddsDrill().contextNotice)).size;
ok(potOddsUnique > 40, `pot-odds drills not repetitive (${potOddsUnique} unique / 300)`);
const outsUnique = new Set(Array.from({ length: 100 }, () => generateOutsDrill().id.slice(0, 0) + JSON.stringify(generateOutsDrill().communityCards))).size;
ok(outsUnique > 80, `outs drills not repetitive (${outsUnique} unique / 100)`);
for (const sub of ['preflop', 'postflop'] as const) for (let i = 0; i < 200; i++) checkStep(generateSimulatorDrill(sub, 3), `sim ${sub}`);

// ---------- spaced repetition: similar spots ----------
let sameShape = 0;
let newHands = 0;
for (let i = 0; i < 60; i++) {
  const pre = generateFullHandScenario(3).steps[0];
  const sim = generateSimilarStep(pre.review, 3);
  ok(sim.spotType === pre.spotType && sim.heroPosition === pre.heroPosition && sim.review.villainPos === pre.review.villainPos, `similar preflop spot (${pre.review.hand} ${pre.spotType})`);
  const [ra, ca] = handCell(pre.review.hand!);
  const [rb, cb] = handCell(sim.review.hand!);
  ok(Math.max(Math.abs(ra - rb), Math.abs(ca - cb)) <= 2, `review hand is a neighbour (${pre.review.hand} → ${sim.review.hand})`);
  if (sim.review.hand !== pre.review.hand) newHands++;
  const post = generateSimulatorDrill('postflop', 3);
  const simPost = generateSimilarStep(post.review, 3);
  checkStep(simPost, 'similar post');
  ok(simPost.heroPosition === post.heroPosition, 'similar postflop keeps hero position');
  if (simPost.street === post.street && simPost.review.decision === post.review.decision) sameShape++;
  const cardsA = JSON.stringify(post.players[0].cards) + JSON.stringify(post.communityCards);
  const cardsB = JSON.stringify(simPost.players[0].cards) + JSON.stringify(simPost.communityCards);
  ok(cardsA !== cardsB, 'similar spot uses new cards');
}
ok(sameShape >= 54, `similar postflop: same street+decision ${sameShape}/60`);
ok(newHands >= 40, `review uses a different, similar hand most of the time (${newHands}/60)`);
ok(generateSimilarStep({ kind: 'odds', spot: 'POT_ODDS_DRILL', heroPos: 'BB' }).questionType === 'pot_odds', 'old odds review key stays a pot-odds drill');
ok(generateSimilarStep({ kind: 'math', spot: 'POT_ODDS_DRILL', heroPos: 'BB', concept: 'm_mdf' }).questionType === 'mdf', 'math review keeps its drill');
// level 1 never shows 3-bet pots; positions filter respected
for (let i = 0; i < 300; i++) {
  ok(generateFullHandScenario(1).spotType !== '3BET_POT', 'level 1 has no 3-bet pots');
  const s = generateFullHandScenario(3, undefined, { positions: ['BTN'] });
  ok(s.steps[0].heroPosition === 'BTN', `positions filter (got ${s.steps[0].heroPosition})`);
}

// ---------- neighbour hands ----------
{
  const m = getPreflopMatrix('RFI', 'BTN');
  for (let i = 0; i < 200; i++) {
    const h = ALL_HANDS[i % 169];
    const n = neighbourHand(m, h);
    const dom = (x: string) => { const f = m[x] || { raise: 0, call: 0, fold: 100 }; return f.raise >= f.fold ? 'raise' : 'fold'; };
    ok(dom(n) === dom(h), `neighbour ${h}→${n} plays the same`);
  }
}

// ---------- rating (Glicko-1) ----------
{
  ok(Math.abs(expectedScore(1500, 1500) - 0.5) < 1e-9, 'E = 0.5 at equal ratings');
  ok(expectedScore(1700, 1500) > 0.7, 'higher rated expected to win');
  const w = updateRating(START, 1500, 1);
  const l = updateRating(START, 1500, 0);
  ok(w.r > 1500 && l.r < 1500 && Math.abs((w.r - 1500) + (l.r - 1500)) < 0.5, `symmetric update (${w.r}, ${l.r})`);
  ok(w.rd < START.rd, 'RD shrinks after a game');
  ok(w.r - 1500 >= 90, `new player moves fast (${w.r})`);
  let p = { r: 1500, rd: 60, n: 100 };
  const before = p.r;
  p = updateRating(p, 1500, 1);
  ok(p.r - before < 12 && p.r - before > 3, `settled player moves little (${p.r - before})`);
  ok(updateRating(p, 1900, 1).r - p.r > updateRating(p, 1300, 1).r - p.r, 'beating a harder spot gives more');
  ok(updateRating(p, 1900, 0).r - p.r > updateRating(p, 1300, 0).r - p.r, 'losing to a harder spot costs less');
  ok(updateRating({ r: 1500, rd: 60, n: 0 }, 1500, 1).rd >= 60, 'RD floor');
  ok(levelForRating(1200) === 1 && levelForRating(1800) === 4, 'level from rating');
  // random tapper: rating falls, real accuracy ≈ 0
  let rnd = { ...START };
  let okN = 0, chance = 0, n = 0;
  for (let i = 0; i < 400; i++) {
    const s = i % 2 ? generateConceptStep(CURRICULUM[i % 5], rnd.r) : generateRatedHand(rnd.r).steps[0];
    const o = s.options[Math.floor(Math.random() * s.options.length)];
    rnd = updateRating(rnd, s.difficulty, o.isCorrect ? 1 : o.grade === 'imprecise' ? 0.3 : 0, chanceOf(s));
    okN += o.isCorrect ? 1 : 0; chance += chanceOf(s); n++;
  }
  const real = aboveChance(okN, n, chance)!;
  ok(real <= 12, `random play: real accuracy near 0 (${real} %, raw ${Math.round(okN / n * 100)} %)`);
  ok(rnd.r < 1300, `random play rating falls (${Math.round(rnd.r)})`);
  ok(aboveChance(10, 10, 5) === 100 && aboveChance(5, 10, 5) === 0, 'above-chance bounds');
  const picks = Array.from({ length: 300 }, () => pickNearRating([{ difficulty: 1100 }, { difficulty: 1500 }, { difficulty: 1900 }], 1500).difficulty);
  ok(picks.filter(x => x === 1500).length > 200, 'pickNearRating prefers the closest');
  // selection near rating
  const diffAt = (r: number) => Array.from({ length: 60 }, () => generateRatedHand(r).steps[0].difficulty).reduce((a, b) => a + b, 0) / 60;
  ok(diffAt(1800) - diffAt(1200) > 150, `harder spots for higher ratings (${Math.round(diffAt(1200))} → ${Math.round(diffAt(1800))})`);
}

// ---------- concepts, leak cells ----------
for (const c of [...CURRICULUM, 'm_mdf', 'm_bluff', 'm_combos', 'm_odds', 'm_outs', 'm_ev'] as ConceptId[]) {
  for (let i = 0; i < 6; i++) {
    const s = generateConceptStep(c, 1500);
    checkStep(s, `concept ${c}`);
    ok(s.concept === c, `concept step ${c} → ${s.concept}`);
    ok(conceptOfKey(s.review) === c || c.startsWith('m_'), `review key maps back to ${c}`);
    if (s.questionType === 'action') checkWhy(s, `concept ${c}`);
  }
}
for (const pos of CLOCKWISE_POSITIONS) for (const st of ['preflop', 'flop', 'turn', 'river'] as const) {
  const s = generateLeakStep(pos, st, 1500);
  checkStep(s, `leak ${pos} ${st}`);
  ok(s.heroPosition === pos && s.street === st, `leak cell ${pos}/${st} → ${s.heroPosition}/${s.street}`);
}

// ---------- reasons, not templates ----------
{
  const whys: string[] = [];
  for (let i = 0; i < 150; i++) {
    const s = generateConceptStep((['cbet', 'flop_def', 'turn', 'river'] as ConceptId[])[i % 4], 1500);
    whys.push(s.why.replace(/Bote [^.]*\. /, '').split(' → ')[0]);
  }
  let repeats = 0;
  for (let i = 1; i < whys.length; i++) if (whys[i] === whys[i - 1]) repeats++;
  ok(repeats <= 3, `consecutive explanations rarely repeat (${repeats})`);
  ok(new Set(whys).size > 40, `explanations vary (${new Set(whys).size} distinct / 150)`);
  ok(whys.some(w => /Valor/.test(w)) && whys.some(w => /Farol|Semifarol/.test(w)) && whys.some(w => /Control del bote|Bluff-catcher/.test(w)), 'reasons cover valor, farol, control');
  ok(!whys.some(w => /Iniciativa de/.test(w)), 'old template phrase gone');
}

// ---------- math drills ----------
for (let i = 0; i < 200; i++) {
  const m = generateMdfDrill();
  checkSeats(m, 'mdf');
  const bet = m.players.find(p => p.currentBet > 0)!.currentBet;
  const pot = m.pot - bet;
  ok(Math.abs(parseFloat(m.options.find(o => o.isCorrect)!.label) - pot / (pot + bet) * 100) <= 0.5, `mdf answer ${m.why}`);
  ok(new Set(m.options.map(o => o.label)).size === 3, 'mdf 3 options');
  const b = generateBluffDrill();
  checkSeats(b, 'bluff');
  const hb = b.players[0].currentBet;
  const bp = b.pot - hb;
  ok(Math.abs(parseFloat(b.options.find(o => o.isCorrect)!.label) - hb / (bp + 2 * hb) * 100) <= 0.5, `bluff answer ${b.why}`);
  const c = generateCombosDrill();
  checkSeats(c, 'combos');
  const label = c.prompt.match(/de (\w+)\?/)![1];
  const dead = [...c.players[0].cards!, ...c.communityCards];
  // brute force
  const deck = '23456789TJQKA'.split('').flatMap(r => 'shdc'.split('').map(su => ({ rank: r, suit: su })));
  const live = deck.filter(d => !dead.some(x => x.rank === d.rank && x.suit === d.suit));
  let brute = 0;
  for (let a = 0; a < live.length; a++) for (let z = a + 1; z < live.length; z++) {
    const [x, y] = [live[a], live[z]];
    if ((x.rank === label[0] && y.rank === label[1]) || (x.rank === label[1] && y.rank === label[0])) brute++;
  }
  ok(c.options.find(o => o.isCorrect)!.label === String(brute), `combos ${label}: ${brute} (${c.why})`);
  ok(countCombos(label, []) === handCombos(label.length === 2 && label[0] === label[1] ? label : label + 'o') + (label[0] === label[1] ? 0 : 4), `unblocked combos ${label}`);
}
{
  const eqTimes: number[] = [];
  for (let i = 0; i < 6; i++) {
    const t = Date.now();
    const e = generateEquityDrill();
    eqTimes.push(Date.now() - t);
    const v = e.players.find(p => !p.isHero && p.status === 'active')!.position;
    const range = ALL_HANDS.map(h => ({ h, w: ((getPreflopMatrix('RFI', v)[h]?.raise || 0) / 100) * handCombos(h) })).filter(x => x.w > 0);
    const precise = equityVsRange(e.players[0].cards!, e.communityCards, range, 15000);
    const vals = e.options.map(o => parseFloat(o.label));
    const nearest = vals.reduce((a, b2) => (Math.abs(b2 - precise) < Math.abs(a - precise) ? b2 : a));
    ok(e.options.find(o => o.isCorrect)!.label === `${nearest} %`, `equity drill: nearest option to ${precise.toFixed(1)} (${e.why})`);
    ok(Math.max(...vals) - Math.min(...vals) <= 24, 'equity distractors are close');
  }
  ok(Math.max(...eqTimes) < 1500, `equity drill fast enough (${Math.max(...eqTimes)} ms)`);
  const aa = equityVsRange(C('As Ah') as [Card, Card], [], [{ h: '72o', w: 1 }], 4000);
  ok(aa > 83 && aa < 92, `AA vs 72o ≈ 88 % (${aa.toFixed(1)})`);
}

// ---------- sessions ----------
{
  const plan = dailyPlan(3, {});
  ok(plan.length === 10, 'daily = 10');
  ok(plan.filter(s => s.kind === 'concept').length === 4 && plan.filter(s => s.kind === 'review').length === 3 && plan.filter(s => s.kind === 'mixed').length === 3, 'daily 4+3+3');
  ok(plan.every((s, i) => i === 0 || s.kind !== plan[i - 1].kind), 'daily interleaved');
  ok(plan.filter(s => s.kind === 'concept').every(s => s.kind === 'concept' && s.concept === CURRICULUM[3]), 'daily concept = curriculum');
  ok(PLACEMENT.length === 12 && new Set(PLACEMENT).size === 12, 'placement 12 distinct');
  ok(placementCurriculum(CURRICULUM.map((c, i) => ({ concept: c, ok: i < 4 }))) === 4, 'placement → first miss');
  ok(placementCurriculum(CURRICULUM.map(c => ({ concept: c, ok: true }))) === CURRICULUM.length - 1, 'placement all ok → last');
  ok(advanceCurriculum(0, { rfi_early: { r: 1600, rd: 80, n: 12 } }) === 1, 'unlock after 1550 & 10');
  ok(advanceCurriculum(0, { rfi_early: { r: 1600, rd: 80, n: 5 } }) === 0, 'no unlock under 10 answers');
  ok(reviewInterval(1, 'fast') > reviewInterval(1, 'normal') && reviewInterval(2, 'slow') === 3, 'confidence changes interval');
  ok(confidenceOf(2000, 'flop') === 'fast' && confidenceOf(9000, 'preflop') === 'slow' && confidenceOf(9000, 'river') === 'normal', 'confidence by time');
  // sprint
  let mixedSeen = 0;
  for (let i = 0; i < 500; i++) {
    const h = sprintHand();
    const f = getPreflopMatrix('RFI', h.pos)[h.hand]?.raise || 0;
    ok(f === h.raise, 'sprint freq');
    if (f > 0 && f < 100) { mixedSeen++; ok(sprintCorrect(h, true) && sprintCorrect(h, false), 'mixed accepts both'); }
    else ok(sprintCorrect(h, f >= 100) && !sprintCorrect(h, f < 100), 'pure answer');
  }
  ok(mixedSeen > 10, 'sprint shows frontier hands');
  // range builder
  const t = RANGE_TASKS[0];
  const m = t.matrix();
  const exact = new Set(ALL_HANDS.filter(h => (m[h]?.raise || 0) >= 50));
  ok(rangeScore(t, exact).score >= 85, `exact range scores high (${rangeScore(t, exact).score})`);
  ok(rangeScore(t, new Set(ALL_HANDS)).score < 30, 'paint all scores low');
  ok(rangeScore(t, new Set()).score === 0, 'empty scores 0');
  const missOne = new Set(exact); missOne.delete('AA');
  ok(rangeScore(t, missOne).missing.includes('AA'), 'reports missing hands');
}

// ---------- stats: migration and answers ----------
{
  const old = { schemaVersion: 3, pedagogicalLevel: 3, totalDecisions: 120, totalCorrectDecisions: 80, totalEvAccumulatedBB: -12.5, recentAnswers: [true], mistakeQueue: [{ id: 'a', key: { kind: 'pre', spot: 'RFI_OPEN', heroPos: 'BTN', hand: 'A5s' }, stage: 0, dueAt: 3, evLostBB: 1 }], preferences: { volume: 30 } };
  const m = migrateStats(old);
  ok(m.schemaVersion === 4 && m.rating.r === 1600 && m.rating.rd === 250 && m.placementDone, 'v3 → v4 rating from level');
  ok(!('pedagogicalLevel' in m) && !('totalEvAccumulatedBB' in m), 'old fields removed');
  ok(m.mistakeQueue.length === 1 && !('evLostBB' in m.mistakeQueue[0]), 'mistakes kept, EV dropped');
  ok(m.preferences.volume === 30 && m.preferences.displayUnits === 'bb', 'preferences merged');
  ok(migrateStats({ schemaVersion: 1 }).rating.r === 1500, 'very old data → 1500');
  ok(migrateStats(null).rating.r === 1500, 'null → defaults');

  let st = { ...DEFAULT_STATS };
  let step = generateConceptStep('rfi_late', 1500);
  while (step.options.every(o => o.isCorrect)) step = generateConceptStep('rfi_late', 1500);
  const good = step.options.find(o => o.isCorrect)!;
  const r1s = applyAnswer(st, step, good.id, { ms: 4000 });
  ok(r1s.result.delta > 0 && r1s.next.rating.r > 1500 && r1s.next.consecutiveCorrect === 1, `correct raises rating (+${r1s.result.delta})`);
  ok(r1s.next.ratingHistory.length === 1 && !!r1s.next.conceptRatings.rfi_late, 'history and concept rating');
  ok(r1s.next.leakStats[`${step.heroPosition}|preflop`].n === 1, 'leak stats updated');
  const bad = step.options.find(o => !o.isCorrect)!;
  const r2s = applyAnswer(r1s.next, { ...step, trivial: false }, bad.id, { ms: 5000 });
  ok(r2s.result.delta < 0 && r2s.next.consecutiveCorrect === 0, 'mistake lowers rating and streak');
  ok(r2s.next.mistakeQueue.length === 1, 'mistake queued for review');
  const r3s = applyAnswer(r1s.next, { ...step, trivial: true }, bad.id, { ms: 5000 });
  ok(r3s.next.mistakeQueue.length === 0, 'obvious (trivial) mistake not queued');
  const slow = applyAnswer(st, step, good.id, { ms: 15000 });
  ok(slow.result.confidence === 'slow' && slow.next.mistakeQueue.length === 1, 'slow correct answer comes back');
  const unrated = applyAnswer(st, step, good.id, { rated: false });
  ok(unrated.next.rating.r === 1500, 'unrated answers keep rating');
  st = r2s.next;
}

console.log('\nOptimal answers by street:', JSON.stringify(optimalByStreet));
console.log(`postflop steps: ${postflopSteps}`);
console.log(`${checks} checks, ${failures} failures`);
process.exit(failures ? 1 : 0);
