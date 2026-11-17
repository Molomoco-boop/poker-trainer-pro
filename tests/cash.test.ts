/* Run: npx tsx tests/cash.test.ts */
import { CLOCKWISE_POSITIONS, Position } from '../src/types/poker';
import { newCashTable, startHand, applyHeroAction, posOf, seatOf, CashTable, CashRun } from '../src/utils/cashTable';
import { r1, populationFreqs, preflopFreqs } from '../src/utils/actionModel';

let failures = 0;
let checks = 0;
const ok = (cond: boolean, msg: string) => { checks++; if (!cond) { failures++; if (failures <= 50) console.log('FAIL', msg); } };

const order: Position[] = CLOCKWISE_POSITIONS;

function checkSeats(run: CashRun, tag: string) {
  const step = run.step!;
  ok(step.players.length === 6, `${tag}: 6 seats`);
  ok(step.players[0].isHero, `${tag}: hero seat 0`);
  step.players.forEach((p, i) => {
    ok(p.position === posOf(i, run.buttonSeat), `${tag}: seat ${i} is ${p.position}`);
    ok(p.isDealer === (p.position === 'BTN'), `${tag}: D on BTN (seat ${i} ${p.position})`);
  });
  // clockwise labels from hero
  const h = order.indexOf(step.heroPosition);
  step.players.forEach((p, i) => ok(p.position === order[(h + i) % 6], `${tag}: clockwise ${i}=${p.position}`));
}

function playOut(table: CashTable, maxDecisions = 24): CashRun {
  let run = startHand(table);
  for (let i = 0; i < maxDecisions && !run.award; i++) {
    const step = run.step;
    ok(!!step, `hand ${table.handNo}: has step`);
    if (!step || !run.awaitingHero) break;
    checkSeats(run, `h${table.handNo}d${i}`);
    ok(step.options.length === 2 || step.options.length === 3, `h${table.handNo}d${i}: 2-3 options (${step.options.map(o => o.id).join('/')})`);
    ok(step.options.some(o => o.isCorrect), `h${table.handNo}d${i}: has a valid action`);
    const hero = step.players[0];
    const facing = Math.max(0, ...step.players.filter(p => !p.isHero).map(p => p.currentBet));
    const call = step.options.find(o => o.id === 'call');
    if (call && call.amountBB !== undefined) {
      const exp = r1(Math.min(facing - hero.currentBet, hero.stack));
      ok(Math.abs(call.amountBB - exp) < 0.05, `h${table.handNo}d${i}: CALL ${call.amountBB} == ${exp} (${facing}-${hero.currentBet})`);
    }
    const potFromPlayers = r1(step.players.reduce((a, p) => a + p.totalInvestedHand, 0));
    ok(Math.abs(potFromPlayers - step.pot) < 0.08, `h${table.handNo}d${i}: pot ${step.pot} == invested ${potFromPlayers}`);
    const pick = step.options.find(o => o.isCorrect) || step.options[0];
    run = applyHeroAction(run, pick.id);
  }
  ok(!!run.award, `hand ${table.handNo}: finished`);
  if (run.award) {
    const stacks = run.table.stacks.reduce((a, b) => a + b, 0);
    ok(Math.abs(stacks - 600) < 1.1, `hand ${table.handNo}: stacks sum ${stacks} ~= 600`);
    checkSeats(run, `h${table.handNo}end`);
  }
  return run;
}

// button moves clockwise on the visual table (next seat index)
{
  let table = newCashTable();
  ok(table.buttonSeat === 0 && posOf(0, 0) === 'BTN', 'hand 1: hero is BTN');
  const seen: Position[] = [];
  const btnSeats: number[] = [];
  for (let i = 0; i < 6; i++) {
    const run = startHand(table);
    seen.push(posOf(0, run.buttonSeat));
    btnSeats.push(run.buttonSeat);
    ok(run.step, `hand ${i}: started`);
    // finish quickly if needed
    let r = run;
    for (let k = 0; k < 20 && !r.award && r.step; k++) {
      const id = r.step.options.find(o => o.id === 'fold')?.id || r.step.options[0]?.id;
      if (!id) break;
      r = applyHeroAction(r, id);
    }
    table = r.table;
  }
  ok(btnSeats.join(',') === '0,1,2,3,4,5', `button seats clockwise ${btnSeats}`);
  ok(new Set(seen).size === 6, `hero visits every seat (${seen.join(',')})`);
}

// stacks persist (not reset to 100 every hand unless short)
{
  let table = newCashTable();
  const deltas: number[] = [];
  for (let i = 0; i < 12; i++) {
    const run = playOut(table);
    if (!run.award) break;
    deltas.push(run.award.delta);
    table = run.table;
    const heroInvestedGone = table.stacks[0];
    ok(heroInvestedGone > 0, `hero still has chips ${heroInvestedGone}`);
  }
  ok(deltas.some(d => d !== 0), 'some hands change hero stack');
}

// multiway and showdowns appear in a long session
{
  let table = newCashTable();
  let multi = 0, hu = 0, show = 0, foldwin = 0, decisions = 0, streets = { preflop: 0, flop: 0, turn: 0, river: 0 };
  for (let i = 0; i < 40; i++) {
    let run = startHand(table);
    const seen: string[] = [];
    for (let k = 0; k < 24 && !run.award && run.step; k++) {
      seen.push(run.step.street);
      streets[run.step.street]++;
      decisions++;
      const active = run.step.players.filter(p => p.status !== 'folded').length;
      if (run.step.street !== 'preflop') {
        if (active >= 3) multi++; else hu++;
      }
      const weighted = run.step.options.filter(o => o.frequencyGTO > 0);
      const pool = weighted.length ? weighted : run.step.options;
      const pick = pool[Math.floor(Math.random() * pool.length)];
      run = applyHeroAction(run, pick.id);
    }
    if (run.award) {
      if (run.award.text.includes('BB') && /Pareja|Trío|Carta|Color|Full|Escalera|Póker|Empate/.test(run.award.text)) show++;
      else foldwin++;
      table = run.table;
    }
  }
  ok(decisions > 40, `many decisions (${decisions})`);
  ok(streets.flop + streets.turn + streets.river > 5, `postflop reached ${JSON.stringify(streets)}`);
  ok(multi + hu > 0, 'saw postflop pots');
  console.log('cash session', { multi, hu, show, foldwin, decisions, streets });
}

// population: open/fold rates in a realistic band
{
  const utg = populationFreqs({ pos: 'UTG', raiseTo: 0, betIn: 0, raises: 0, callers: 0, limpers: 0 });
  const btn = populationFreqs({ pos: 'BTN', raiseTo: 0, betIn: 0, raises: 0, callers: 0, limpers: 0 });
  ok(utg.raise >= 12 && utg.raise <= 22, `UTG open ${utg.raise}%`);
  ok(btn.raise >= 30 && btn.raise <= 55, `BTN open ${btn.raise}%`);
  const bbVsBtn = populationFreqs({ pos: 'BB', raiseTo: 2.5, betIn: 1, raises: 1, openPos: 'BTN', callers: 0, limpers: 0 });
  ok(bbVsBtn.call + bbVsBtn.raise >= 25 && bbVsBtn.call + bbVsBtn.raise <= 70, `BB vs BTN continue ${bbVsBtn.call + bbVsBtn.raise}%`);
  const sq = populationFreqs({ pos: 'BB', raiseTo: 2.5, betIn: 1, raises: 1, openPos: 'UTG', callers: 1, limpers: 0 });
  const flat = populationFreqs({ pos: 'BB', raiseTo: 2.5, betIn: 1, raises: 1, openPos: 'UTG', callers: 0, limpers: 0 });
  ok(sq.raise > flat.raise, `squeeze 3-bet ${sq.raise} > vs open ${flat.raise}`);
}

// AA always raises UTG
{
  const f = preflopFreqs('AA', { pos: 'UTG', raiseTo: 0, betIn: 0, raises: 0, callers: 0, limpers: 0 });
  ok(f.raise === 100, 'AA opens 100% UTG');
  const foldy = preflopFreqs('72o', { pos: 'UTG', raiseTo: 0, betIn: 0, raises: 0, callers: 0, limpers: 0 });
  ok(foldy.fold >= 100 || foldy.raise === 0, '72o folds UTG');
}

console.log(`${checks} checks, ${failures} failures`);
process.exit(failures ? 1 : 0);
