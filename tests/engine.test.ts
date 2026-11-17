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
  walkHand
} from '../src/utils/fullHandEngine';
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
const mixed = buildOptions([{ id: 'fold', label: 'FOLD', freq: 40 }, { id: 'call', label: 'CALL', freq: 60 }, { id: 'raise', label: 'RAISE', freq: 0 }], 10);
ok(mixed[0].isCorrect && mixed[0].evDiffNum === 0 && mixed[1].isCorrect && mixed[1].evDiffNum === 0, 'freq ≥25 % = correct, no EV loss');
ok(!mixed[2].isCorrect && mixed[2].verdict === 'error' && mixed[2].evDiffNum < 0, 'freq 0 = error');
ok(mixedLine(mixed) === 'Pagar 60 % · Fold 40 %: ambas valen', `mixed line (${mixedLine(mixed)})`);
const rare = buildOptions([{ id: 'check', label: 'CHECK', freq: 85 }, { id: 'bet_small', label: 'BET', freq: 15 }], 10);
ok(!rare[1].isCorrect && rare[1].verdict === 'mixed' && rare[1].evDiffNum < 0, 'freq 15 % = not correct');
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
  step.players.forEach(p => ok(Math.abs(p.stack + p.totalInvestedHand - 100) < 0.01, `${tag}: stack+invested=100 (${p.position})`));
  const potFromPlayers = r1(step.players.reduce((a, p) => a + p.totalInvestedHand, 0));
  ok(Math.abs(potFromPlayers - step.pot) < 0.05, `${tag}: pot ${step.pot} == invested ${potFromPlayers}`);
  const hero = step.players[0];
  const facing = Math.max(...step.players.filter(p => !p.isHero).map(p => p.currentBet));
  const call = opts.find(o => o.id === 'call');
  if (call) ok(Math.abs((call.amountBB || 0) - r1(Math.min(facing - hero.currentBet, hero.stack))) < 0.05, `${tag}: CALL ${call.amountBB} == ${facing} - ${hero.currentBet}`);
  const cards = [...(hero.cards || []), ...step.communityCards].map(c => c.rank + c.suit);
  ok(new Set(cards).size === cards.length, `${tag}: no duplicate cards`);
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
  ok(!pf.options.some(o => o.id === 'limp'), `${tag}: no limp option`);
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
for (let i = 0; i < 60; i++) {
  const pre = generateFullHandScenario(3).steps[0];
  const sim = generateSimilarStep(pre.review, 3);
  ok(sim.spotType === pre.spotType && sim.heroPosition === pre.heroPosition && sim.review.hand === pre.review.hand && sim.review.villainPos === pre.review.villainPos, `similar preflop spot (${pre.review.hand} ${pre.spotType})`);
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
ok(generateSimilarStep({ kind: 'odds', spot: 'POT_ODDS_DRILL', heroPos: 'BB' }).questionType === 'pot_odds', 'odds review stays a pot-odds drill');
// level 1 never shows 3-bet pots; positions filter respected
for (let i = 0; i < 300; i++) {
  ok(generateFullHandScenario(1).spotType !== '3BET_POT', 'level 1 has no 3-bet pots');
  const s = generateFullHandScenario(3, undefined, { positions: ['BTN'] });
  ok(s.steps[0].heroPosition === 'BTN', `positions filter (got ${s.steps[0].heroPosition})`);
}

console.log('\nOptimal answers by street:', JSON.stringify(optimalByStreet));
console.log(`postflop steps: ${postflopSteps}`);
console.log(`${checks} checks, ${failures} failures`);
process.exit(failures ? 1 : 0);
