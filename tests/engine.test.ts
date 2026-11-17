/* Run: npm test */
import { evaluateHand, compareEvaluations } from '../src/utils/pokerEvaluator';
import {
  generateFullHandScenario,
  generatePotOddsDrill,
  generateOutsDrill,
  generateBestHandDrill,
  generateHandRankingDrill,
  generateEvDrill,
  generateSimulatorDrill
} from '../src/utils/fullHandEngine';
import { detectCleanOuts, countOutsVsVillain } from '../src/utils/pokerMath';
import { classifyHand } from '../src/utils/handStrength';
import { CLOCKWISE_POSITIONS, HandStep, PedagogicalLevel, SpotType, Card } from '../src/types/poker';

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
ok(ev('Ah 2h 3h 4h 5h Kd Qc').descr.endsWith('5'), 'wheel straight flush named "al 5"');
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

for (let i = 0; i < N; i++) {
  const level = ((i % 4) + 1) as PedagogicalLevel;
  const forced: SpotType | undefined = i % 5 === 0 ? (['CBET_FLOP', 'FACING_CBET', 'TURN_RIVER_DECISION', '3BET_POT', 'SB_VS_OPEN'] as SpotType[])[i % 25 / 5 | 0] : undefined;
  const sc = generateFullHandScenario(level, forced);
  const pf = sc.steps[0];
  const tag = `#${i} ${sc.spotType} ${pf.heroPosition}`;
  checkStep(pf, tag + ' pre');
  ok(pf.street === 'preflop', `${tag}: first step preflop`);

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

  // continuation consistency
  for (let k = 0; k < sc.steps.length - 1; k++) {
    ok(!!sc.steps[k].continueWith, `${tag}: step ${k} continues only with continueWith`);
    ok(sc.steps[k + 1].pot >= sc.steps[k].pot - 0.05 || sc.steps[k].street === 'preflop', `${tag}: pot never shrinks`);
  }
  const post = sc.steps.slice(1);
  if (post.length) {
    const flop = post[0];
    const expectedFlopPot: Record<string, number> = { RFI_OPEN: pf.heroPosition === 'SB' ? 6 : 5.5, SB_VS_OPEN: 23 };
    const startPot = flop.pot - flop.players.reduce((a, p) => a + p.currentBet, 0);
    if (expectedFlopPot[sc.spotType] !== undefined) ok(Math.abs(startPot - expectedFlopPot[sc.spotType]) < 0.05, `${tag}: flop pot ${startPot} expected ${expectedFlopPot[sc.spotType]}`);
    if (sc.spotType === 'BB_DEFENSE') {
      const open = raisers[0];
      const exp = open.position === 'SB' ? 6 : 5.5;
      ok(Math.abs(startPot - exp) < 0.05, `${tag}: BB def flop pot ${startPot} expected ${exp}`);
    }
    if (sc.spotType === '3BET_POT') {
      const tb = raisers[0].currentBet;
      const dead = (raisers[0].position === 'SB' ? 0 : 0.5) + (raisers[0].position === 'BB' ? 0 : 1);
      ok(Math.abs(startPot - (2 * tb + dead)) < 0.05, `${tag}: 3bet flop pot ${startPot} expected ${2 * tb + dead}`);
    }
    const heroAgg = sc.spotType === 'RFI_OPEN' || sc.spotType === 'SB_VS_OPEN';
    const villainBetFirst = flop.players.some(p => !p.isHero && p.currentBet > 0);
    ok(heroAgg ? !villainBetFirst : villainBetFirst, `${tag}: c-bet only by preflop aggressor (heroAgg=${heroAgg}, villainBet=${villainBetFirst})`);
    for (const st of post) {
      postflopSteps++;
      const stag = `${tag} ${st.street}`;
      checkStep(st, stag);
      const active = st.players.filter(p => !p.isHero && p.status === 'active');
      ok(active.length === 1, `${stag}: heads-up (${active.map(p => p.position).join('/')})`);
      const facingBet = st.players.some(p => !p.isHero && p.currentBet > 0);
      if (facingBet && st.relativePosition === 'OOP') ok(/pasas/.test(st.contextNotice), `${stag}: OOP hero acts first ("${st.contextNotice}")`);
      if (!facingBet && st.relativePosition === 'IP') ok(/pasa\b/.test(st.contextNotice), `${stag}: IP aggressor gets checked to ("${st.contextNotice}")`);
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

  const bh = generateBestHandDrill();
  checkSeats(bh, 'best');
  const evals = bh.players.filter(p => p.cards).map(p => ({ id: p.isHero ? 'HERO' : p.position, e: evaluateHand([...bh.communityCards, ...p.cards!]) }));
  ok(evals.length === 3, 'best hand 3 hands');
  const best = evals.reduce((a, b) => (compareEvaluations(b.e, a.e) > 0 ? b : a));
  ok(evals.filter(x => compareEvaluations(x.e, best.e) === 0).length === 1, 'best hand: no tie');
  ok(bh.options.find(o => o.isCorrect)!.id === best.id, 'best hand winner');

  const hr = generateHandRankingDrill();
  checkSeats(hr, 'ranking');
  ok(hr.options.find(o => o.isCorrect)!.id === `rank_${evaluateHand([...hr.players[0].cards!, ...hr.communityCards]).score}`, 'hand ranking answer');

  const evd = generateEvDrill();
  checkSeats(evd, 'ev');
  ok(evd.options.filter(o => o.isCorrect).length === 1, 'ev drill one answer');
}
const potOddsUnique = new Set(Array.from({ length: 300 }, () => generatePotOddsDrill().contextNotice)).size;
ok(potOddsUnique > 40, `pot-odds drills not repetitive (${potOddsUnique} unique / 300)`);
const outsUnique = new Set(Array.from({ length: 100 }, () => generateOutsDrill().id.slice(0, 0) + JSON.stringify(generateOutsDrill().communityCards))).size;
ok(outsUnique > 80, `outs drills not repetitive (${outsUnique} unique / 100)`);
for (const sub of ['preflop', 'postflop'] as const) for (let i = 0; i < 200; i++) checkStep(generateSimulatorDrill(sub, 3), `sim ${sub}`);
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
