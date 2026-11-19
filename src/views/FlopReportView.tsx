import React, { useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Panel, BtnPrimary } from '../components/ui';
import { CardView } from '../components/CardView';
import { useGame } from '../context/useGame';
import {
  FLOP_GROUPS, REPORT_SPOTS, FlopGroupId, allReports, exampleFlop, formatFlop,
  makeFlopDrill, FlopDrill, SpotReport
} from '../utils/flopReports';

export const FlopReportView: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const { stats } = useGame();
  const [tab, setTab] = useState<'informe' | 'practica'>('informe');
  const [group, setGroup] = useState<FlopGroupId>('ace');
  const [drill, setDrill] = useState<FlopDrill | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [help, setHelp] = useState(false);
  const reports = useMemo(() => allReports(group), [group]);
  const flop = exampleFlop(group);
  const meta = FLOP_GROUPS.find(g => g.id === group)!;

  const startDrill = () => {
    setPicked(null);
    setDrill(makeFlopDrill());
    setTab('practica');
  };

  const nextDrill = () => {
    setPicked(null);
    setDrill(makeFlopDrill());
  };

  return (
    <div className="flop-report flex flex-col h-[100dvh] bg-bg text-txt">
      <div className="px-2 safe-top pb-1 flex items-center gap-2 border-b border-line shrink-0">
        <button onClick={onExit} className="w-10 h-10 flex items-center justify-center" aria-label="Back">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0 text-[15px] font-semibold text-hi">How to play each flop</div>
        <button
          type="button"
          className={`flop-help-btn w-10 h-10 rounded-[4px] border text-[15px] font-semibold ${help ? 'bg-acc text-white border-acc' : 'border-line text-txt'}`}
          aria-label="What this screen is"
          aria-expanded={help}
          onClick={() => setHelp(h => !h)}
        >
          ?
        </button>
      </div>

      {help && (
        <div className="flop-help mx-3 mt-2 px-3 py-2 rounded-[4px] border border-line bg-panel text-[12.5px] leading-snug text-hi space-y-1">
          <p>Each card is a typical flop situation (the three community cards).</p>
          <p>The bars show, out of 100 times, how often that player bets, checks, calls or folds.</p>
          <p>Use it to see how the plan changes with the type of flop.</p>
        </div>
      )}

      <div className="px-3 py-2 flex gap-1.5 shrink-0">
        <button
          className={`flop-tab-informe h-10 px-3 rounded-[4px] text-[13px] font-semibold border ${tab === 'informe' ? 'bg-acc text-white border-acc' : 'border-line text-txt'}`}
          onClick={() => setTab('informe')}
        >
          Guide
        </button>
        <button
          className={`flop-tab-drill h-10 px-3 rounded-[4px] text-[13px] font-semibold border ${tab === 'practica' ? 'bg-acc text-white border-acc' : 'border-line text-txt'}`}
          onClick={startDrill}
        >
          How often does it bet?
        </button>
      </div>

      {tab === 'informe' ? (
        <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-2">
          <div className="flex flex-wrap gap-1">
            {FLOP_GROUPS.map(g => (
              <button
                key={g.id}
                className={`flop-group h-9 px-2 rounded-[4px] text-[12px] font-semibold border ${group === g.id ? 'bg-acc text-white border-acc' : 'border-line text-txt'}`}
                data-group={g.id}
                onClick={() => setGroup(g.id)}
              >
                {g.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-[12px] text-dim">
            <div className="flex gap-0.5">
              {flop.map((c, i) => <CardView key={i} card={c} size="xs" deckMode={stats.preferences.deckColorMode} />)}
            </div>
            <span>Ex. {formatFlop(flop)}{meta.sub ? ` · ${meta.sub}` : ''}</span>
          </div>
          <div className="flop-learn text-[13px] text-hi leading-snug px-0.5">
            <span className="text-dim">What to learn · </span>{meta.learn}
          </div>
          {reports.map(r => (
            <SpotCard key={r.spot} r={r} groupId={group} />
          ))}
        </div>
      ) : (
        <div className="flop-drill flex-1 overflow-y-auto px-3 pb-4 space-y-3">
          {!drill ? (
            <BtnPrimary onClick={startDrill} className="w-full">Start</BtnPrimary>
          ) : (
            <>
              <Panel className="p-3 space-y-1.5">
                <div className="flex items-center gap-2">
                  {drill.flop.map((c, i) => <CardView key={i} card={c} size="board" deckMode={stats.preferences.deckColorMode} />)}
                </div>
                <div className="text-[15px] font-semibold text-hi leading-snug">{drill.question}</div>
                <div className="text-[12px] text-dim leading-snug">
                  35 means they bet 35 out of 100 times and check the rest.
                </div>
              </Panel>
              <div className="grid grid-cols-3 gap-1.5">
                {drill.options.map(n => {
                  const shown = picked != null;
                  const ok = n === drill.answer;
                  const mine = n === picked;
                  return (
                    <button
                      key={n}
                      disabled={shown}
                      data-drill-opt={n}
                      data-correct={ok ? '1' : '0'}
                      onClick={() => setPicked(n)}
                      className={`flop-drill-opt h-14 rounded-[4px] border font-semibold num text-[16px] leading-tight ${
                        shown && ok ? 'bg-good/20 border-good text-goodtx'
                          : shown && mine ? 'bg-bad/20 border-bad text-badtx'
                          : 'border-line text-hi bg-panel'
                      }`}
                    >
                      {n}
                      <span className="block text-[10px] font-normal text-dim">out of 100</span>
                    </button>
                  );
                })}
              </div>
              {picked != null && (
                <div className="space-y-2">
                  <div className={`text-[14px] font-semibold ${picked === drill.answer ? 'text-goodtx' : 'text-badtx'}`}>
                    {picked === drill.answer ? 'Nice' : `It was ${drill.answer} out of 100`}
                  </div>
                  <BtnPrimary onClick={nextDrill} className="flop-drill-next w-full">Next</BtnPrimary>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

const SpotCard: React.FC<{ r: SpotReport; groupId: FlopGroupId }> = ({ r, groupId }) => {
  const spot = REPORT_SPOTS.find(s => s.id === r.spot)!;
  const group = FLOP_GROUPS.find(g => g.id === groupId)!;
  const pass = Math.max(0, 100 - r.cbet);
  return (
    <Panel className="flop-spot p-3 space-y-2" data-spot={r.spot}>
      <div>
        <div className="text-[14px] font-semibold text-hi leading-snug">{spot.label}</div>
        <div className="text-[11px] text-dim leading-snug">{group.sit} · pot {r.pot} BB · {spot.raisedBy}</div>
      </div>
      <div>
        <div className="text-[12.5px] text-hi leading-snug mb-0.5">
          {spot.agg} bets <b className="num">{r.cbet}</b> out of 100 times
        </div>
        <Bar parts={[{ n: r.small, c: 'bg-acc' }, { n: r.big, c: 'bg-good' }, { n: pass, c: 'bg-line' }]} />
        <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-dim mt-0.5">
          <span>Small {r.small}</span>
          <span>Big {r.big}</span>
          <span>Checks {pass}</span>
        </div>
        <div className="text-[12px] text-hi leading-snug mt-1">{takeaway(groupId, r)}</div>
      </div>
      <div>
        <div className="text-[12.5px] text-hi leading-snug mb-0.5">
          If {spot.agg} bets, {spot.def}: folds {r.defFold} · calls {r.defCall} · raises {r.defRaise}
        </div>
        <Bar parts={[{ n: r.defFold, c: 'bg-bad' }, { n: r.defCall, c: 'bg-warn' }, { n: r.defRaise, c: 'bg-good' }]} />
        <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-dim mt-0.5">
          <span>Folds {r.defFold}</span>
          <span>Calls {r.defCall}</span>
          <span>Raises {r.defRaise}</span>
        </div>
      </div>
    </Panel>
  );
};

function takeaway(group: FlopGroupId, r: SpotReport): string {
  if (r.cbet <= 40) {
    if (group === 'ace') return 'Checks a lot: the ace helps both ranges.';
    return 'Checks more than half the time.';
  }
  if (group === 'paired') return 'Bets more: two pair is hard to hit.';
  if (group === 'rainbow') return 'No flush possible: bet a bit more.';
  if (group === 'mono') return 'There is a flush on the board: do not always bet.';
  return r.pref === 'bet_big' ? `When they bet, it is usually big (${r.prefSize} BB).` : `When they bet, it is usually small (${r.prefSize} BB).`;
}

const Bar: React.FC<{ parts: { n: number; c: string }[] }> = ({ parts }) => (
  <div className="h-2 w-full rounded-[2px] bg-line overflow-hidden flex" aria-hidden>
    {parts.map((p, i) => (
      <div key={i} className={`${p.c} h-full`} style={{ width: `${Math.max(0, p.n)}%` }} />
    ))}
  </div>
);
