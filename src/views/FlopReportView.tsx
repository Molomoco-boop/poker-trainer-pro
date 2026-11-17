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
  const reports = useMemo(() => allReports(group), [group]);
  const flop = exampleFlop(group);

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
        <button onClick={onExit} className="w-10 h-10 flex items-center justify-center" aria-label="Salir">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0 text-[15px] font-semibold text-hi">Informes de flop</div>
      </div>
      <div className="px-3 py-2 flex gap-1.5 shrink-0">
        <button
          className={`flop-tab-informe h-10 px-3 rounded-[4px] text-[13px] font-semibold border ${tab === 'informe' ? 'bg-acc text-white border-acc' : 'border-line text-txt'}`}
          onClick={() => setTab('informe')}
        >
          Informe
        </button>
        <button
          className={`flop-tab-drill h-10 px-3 rounded-[4px] text-[13px] font-semibold border ${tab === 'practica' ? 'bg-acc text-white border-acc' : 'border-line text-txt'}`}
          onClick={startDrill}
        >
          ¿Con qué frecuencia apuesta?
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
            <span>Ej. {formatFlop(flop)} · {FLOP_GROUPS.find(g => g.id === group)?.sub}</span>
          </div>
          {reports.map(r => (
            <SpotCard key={r.spot} r={r} />
          ))}
        </div>
      ) : (
        <div className="flop-drill flex-1 overflow-y-auto px-3 pb-4 space-y-3">
          {!drill ? (
            <BtnPrimary onClick={startDrill} className="w-full">Empezar</BtnPrimary>
          ) : (
            <>
              <Panel className="p-3 space-y-1.5">
                <div className="text-[12px] text-dim">{REPORT_SPOTS.find(s => s.id === drill.spot)?.label}</div>
                <div className="flex items-center gap-2">
                  {drill.flop.map((c, i) => <CardView key={i} card={c} size="board" deckMode={stats.preferences.deckColorMode} />)}
                </div>
                <div className="text-[15px] font-semibold text-hi leading-snug">{drill.question}</div>
                <div className="text-[12px] text-dim">Frecuencia de c-bet del agresor, según el motor.</div>
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
                      className={`flop-drill-opt h-14 rounded-[4px] border font-semibold num text-[18px] ${
                        shown && ok ? 'bg-good/20 border-good text-goodtx'
                          : shown && mine ? 'bg-bad/20 border-bad text-badtx'
                          : 'border-line text-hi bg-panel'
                      }`}
                    >
                      {n} %
                    </button>
                  );
                })}
              </div>
              {picked != null && (
                <div className="space-y-2">
                  <div className={`text-[14px] font-semibold ${picked === drill.answer ? 'text-goodtx' : 'text-badtx'}`}>
                    {picked === drill.answer ? 'Bien' : `Era ${drill.answer} %`}
                  </div>
                  <BtnPrimary onClick={nextDrill} className="flop-drill-next w-full">Siguiente</BtnPrimary>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

const SpotCard: React.FC<{ r: SpotReport }> = ({ r }) => {
  const meta = REPORT_SPOTS.find(s => s.id === r.spot)!;
  const size = r.pref === 'bet_big' ? 'grande' : 'pequeña';
  return (
    <Panel className="flop-spot p-3 space-y-2" data-spot={r.spot}>
      <div>
        <div className="text-[14px] font-semibold text-hi">{meta.label}</div>
        <div className="text-[11px] text-dim">{meta.sub} · bote {r.pot} BB</div>
      </div>
      <div>
        <div className="flex justify-between text-[12px] mb-0.5">
          <span className="text-dim">C-bet agresor</span>
          <span className="num text-hi font-semibold">{r.cbet} % · {size} {r.prefSize} BB</span>
        </div>
        <Bar parts={[{ n: r.small, c: 'bg-acc' }, { n: r.big, c: 'bg-good' }, { n: Math.max(0, 100 - r.cbet), c: 'bg-line' }]} />
        <div className="flex gap-2 text-[10px] text-dim mt-0.5">
          <span>Peq. {r.small} %</span>
          <span>Grande {r.big} %</span>
          <span>Check {Math.max(0, 100 - r.cbet)} %</span>
        </div>
      </div>
      <div>
        <div className="flex justify-between text-[12px] mb-0.5">
          <span className="text-dim">Defensa</span>
          <span className="num text-hi font-semibold">F {r.defFold} · C {r.defCall} · R {r.defRaise}</span>
        </div>
        <Bar parts={[{ n: r.defFold, c: 'bg-bad' }, { n: r.defCall, c: 'bg-warn' }, { n: r.defRaise, c: 'bg-good' }]} />
      </div>
    </Panel>
  );
};

const Bar: React.FC<{ parts: { n: number; c: string }[] }> = ({ parts }) => (
  <div className="h-2 w-full rounded-[2px] bg-line overflow-hidden flex">
    {parts.map((p, i) => (
      <div key={i} className={`${p.c} h-full`} style={{ width: `${Math.max(0, p.n)}%` }} />
    ))}
  </div>
);
