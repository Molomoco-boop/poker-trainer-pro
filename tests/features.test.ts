/* Run: npx tsx tests/features.test.ts */
import { assignProfiles, profilePre, profileFacing, exploitPre, exploitFacing, exploitLead, profileLead, vsLabel } from '../src/utils/botProfiles';
import { preflopFreqs, leadFreqs, facingFreqs } from '../src/utils/actionModel';
import { flopGroups, flopInGroup, reportFor, allReports, FLOP_GROUPS, REPORT_SPOTS, sampleFlops, makeFlopDrill, formatFlop } from '../src/utils/flopReports';
import { pushHand, loadHands, saveHands, isErrorOrDoubt, HISTORY_MAX, ReviewHand, HISTORY_KEY } from '../src/utils/handHistory';
import { startHand, newCashTable, applyHeroAction, posOf } from '../src/utils/cashTable';
import { Card, Rank, Suit } from '../src/types/poker';

let failures = 0;
let checks = 0;
const ok = (cond: boolean, msg: string) => { checks++; if (!cond) { failures++; if (failures <= 40) console.log('FAIL', msg); } };

function C(rank: Rank, suit: Suit): Card { return { rank, suit }; }

// --- profiles ---
{
  const gtoPre = preflopFreqs('K7o', { pos: 'BTN', raiseTo: 0, betIn: 0, raises: 0, callers: 0, limpers: 0 });
  const rec = profilePre(gtoPre, 'recreativo');
  const nit = profilePre(gtoPre, 'nit');
  const man = profilePre(gtoPre, 'maniac');
  ok(rec.limp > gtoPre.limp || rec.call >= gtoPre.call, `recreativo more limp/call than GTO (gto limp ${gtoPre.limp} rec ${rec.limp})`);
  ok(nit.fold >= gtoPre.fold, `nit folds more pre (${nit.fold} vs ${gtoPre.fold})`);
  ok(man.raise > gtoPre.raise, `maniac raises more pre (${man.raise} vs ${gtoPre.raise})`);

  const face = facingFreqs({ street: 'flop', cls: 'weak', wet: false, ip: false, initiative: false, nAlive: 2, toCall: 3, pot: 6.5, spr: 15 });
  const recF = profileFacing(face, 'recreativo', 'flop');
  const nitF = profileFacing(face, 'nit', 'flop');
  const manF = profileFacing(face, 'maniac', 'river');
  ok(recF.call > face.call, `recreativo calls more (${recF.call} vs ${face.call})`);
  ok(nitF.fold > face.fold, `nit folds more to a bet (${nitF.fold} vs ${face.fold})`);
  ok(manF.raise > face.raise || manF.fold < face.fold, `maniac more aggressive facing (${JSON.stringify(manF)} vs ${JSON.stringify(face)})`);

  const stealGto = preflopFreqs('K7o', { pos: 'BTN', raiseTo: 0, betIn: 0, raises: 0, callers: 0, limpers: 0 });
  const vsNit = exploitPre(stealGto, 'nit', { pos: 'BTN', raiseTo: 0, betIn: 0, raises: 0, callers: 0, limpers: 0 });
  ok(vsNit.raise > stealGto.raise, `exploit vs nit: steal more with K7o (${vsNit.raise} vs ${stealGto.raise})`);

  const airLead = leadFreqs({ street: 'flop', cls: 'air', wet: false, ip: true, initiative: true, nAlive: 2, toCall: 0, pot: 6.5, spr: 15 });
  const vsRec = exploitLead(airLead, 'recreativo', 'air', 'river');
  ok(vsRec.bet_small + vsRec.bet_big < airLead.bet_small + airLead.bet_big, `exploit vs recreativo: fewer river bluffs`);

  const vsManFace = exploitFacing(face, 'maniac', 'river');
  ok(vsManFace.call > face.call, `exploit vs maniac: call down lighter`);

  const mixed = assignProfiles('mixto', () => 0.1);
  ok(mixed[0] === 'regular' && mixed.length === 6, 'mixed: 6 seats, hero regular');
  ok(new Set(assignProfiles('nit').slice(1)).size === 1 && assignProfiles('nit')[2] === 'nit', 'nit table: all bots nit');
  ok(vsLabel(['nit', 'nit']) === 'Vs nit', `vsLabel nit ${vsLabel(['nit','nit'])}`);
}

// --- flop groups ---
{
  ok(flopGroups([C('A','s'), C('7','h'), C('2','d')]).includes('ace'), 'A72 rainbow is A alta');
  ok(flopGroups([C('A','s'), C('7','h'), C('2','d')]).includes('rainbow'), 'A72 is rainbow');
  ok(flopGroups([C('K','s'), C('Q','h'), C('4','d')]).includes('kq'), 'KQ4 is K/Q alta');
  ok(flopGroups([C('T','s'), C('9','h'), C('8','d')]).includes('midconn'), 'T98 is medio conectado');
  ok(flopGroups([C('7','s'), C('4','h'), C('2','d')]).includes('low'), '742 is bajo');
  ok(flopGroups([C('9','s'), C('9','h'), C('3','d')]).includes('paired'), '993 is pareado');
  ok(flopGroups([C('A','s'), C('7','s'), C('2','s')]).includes('mono'), 'A72ss is monocolor');
  ok(flopGroups([C('A','s'), C('7','s'), C('2','h')]).includes('twotone'), 'A72s is dos palos');
  const pool = sampleFlops(20);
  for (const g of FLOP_GROUPS) {
    ok(pool[g.id].length >= 8, `${g.id} has ${pool[g.id].length} sample flops`);
    ok(pool[g.id].every(f => flopInGroup(f, g.id)), `${g.id} samples match the group`);
  }
}

// --- reports from the engine ---
{
  for (const id of ['ace', 'low', 'paired', 'mono'] as const) {
    const r = reportFor(id, 'srp_btn_bb');
    ok(r.cbet >= 5 && r.cbet <= 95, `${id} srp_btn_bb cbet ${r.cbet}`);
    ok(Math.abs(r.small + r.big - r.cbet) <= 1, `${id} small+big`);
    ok(r.defFold + r.defCall + r.defRaise >= 98 && r.defFold + r.defCall + r.defRaise <= 102, `${id} def`);
    ok(r.prefSize > 0 && r.pot > 0, `${id} size`);
  }
  const ace = reportFor('ace', 'srp_btn_bb');
  const three = reportFor('ace', 'threebet');
  ok(three.pot > ace.pot, `3bet pot ${three.pot} > SRP ${ace.pot}`);
  const d = makeFlopDrill();
  ok(d.options.length === 3 && d.options.includes(d.answer), `drill has 3 opts including ${d.answer}: ${d.options}`);
  ok(!!formatFlop(d.flop), 'drill flop format');
  const t0 = Date.now();
  for (const g of FLOP_GROUPS) {
    const rows = allReports(g.id);
    ok(rows.length === REPORT_SPOTS.length, `${g.id} has ${rows.length} spots`);
    for (const s of REPORT_SPOTS) {
      const r = rows.find(x => x.spot === s.id);
      ok(!!r, `${g.id} ${s.id}`);
      ok(r!.cbet >= 5 && r!.cbet <= 95, `${g.id} ${s.id} cbet ${r!.cbet}`);
    }
  }
  const ms = Date.now() - t0;
  ok(ms < 50, `precomputed reports are instant (${ms} ms)`);
}

// --- history cap and filter ---
{
  const mem: Record<string, string> = {};
  const ls = globalThis.localStorage;
  const fake = {
    getItem: (k: string) => mem[k] ?? null,
    setItem: (k: string, v: string) => { mem[k] = v; },
    removeItem: (k: string) => { delete mem[k]; }
  } as Storage;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).localStorage = fake;

  const hand = (i: number, grade: ReviewHand['decisions'][0]['grade'] = 'best'): ReviewHand => ({
    id: `h${i}`, ts: i, handNo: i, heroPos: 'BTN',
    heroCards: [C('A','s'), C('K','h')], board: [],
    actions: [], decisions: [{ street: 'preflop', stepId: 's', pot: 1.5, board: [], ticker: '', notice: '', selectedId: 'raise', grade, doubted: grade === 'best' && i === 1, why: '', options: [], players: [] }],
    awardText: 'BTN gana', delta: 1, profiles: ['regular','regular','regular','regular','regular','regular'], stacksAfter: [101,99,100,100,100,100]
  });
  let list: ReviewHand[] = [];
  for (let i = 0; i < 120; i++) list = pushHand(hand(i, i % 5 === 0 ? 'error' : 'best'), list);
  ok(list.length === HISTORY_MAX, `cap at ${HISTORY_MAX}, got ${list.length}`);
  ok(list[0].id === 'h119', 'newest first');
  ok(loadHands().length === HISTORY_MAX, 'load returns capped');
  const err = list.filter(isErrorOrDoubt);
  ok(err.length >= 20, `errors/doubt filter ${err.length}`);
  (globalThis as any).localStorage = ls;
}

// --- cash table honors profiles (nit bots fold more) ---
{
  const foldRate = (mode: 'regular' | 'nit' | 'maniac') => {
    let folds = 0, n = 0;
    for (let h = 0; h < 40; h++) {
      const profiles = assignProfiles(mode, () => 0);
      // all bots same; seed unused for non-mixto
      let table = newCashTable();
      table.buttonSeat = h % 6;
      let run = startHand(table, assignProfiles(mode));
      for (const a of run.log) {
        if (a.pos !== posOf(0, run.buttonSeat)) {
          n++;
          if (a.id === 'fold') folds++;
        }
      }
      for (let i = 0; i < 8 && run.step && !run.award; i++) {
        const id = run.step.options.find(o => o.id === 'fold')?.id || run.step.options[0].id;
        run = applyHeroAction(run, id);
      }
    }
    return n ? folds / n : 0;
  };
  const nit = foldRate('nit');
  const man = foldRate('maniac');
  ok(nit > man, `nit bots fold more often than maniacs (${nit.toFixed(2)} vs ${man.toFixed(2)})`);
}

console.log(`${checks} checks, ${failures} failures`);
process.exit(failures ? 1 : 0);
