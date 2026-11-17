import React, { useState } from 'react';
import { useGame } from '../context/useGame';
import { Position, Street } from '../types/poker';
import { LEAK_POSITIONS, LEAK_STREETS, leakKey } from '../utils/sessionPlanner';
import { aboveChance } from '../utils/rating';
import { Panel, Title, Sparkline, BtnPrimary } from '../components/ui';

const STREET_SHORT: Record<string, string> = { preflop: 'Pre', flop: 'Flop', turn: 'Turn', river: 'River' };

const tone = (v: number | null, n: number) =>
  v === null || n < 3 ? 'bg-panel2 text-dim' : v >= 60 ? 'bg-good/80 text-white' : v >= 30 ? 'bg-warn/80 text-black' : 'bg-bad/80 text-white';

export const ProgressView: React.FC<{ onTrainLeak: (pos: Position, street: Street) => void }> = ({ onTrainLeak }) => {
  const { stats } = useGame();
  const [sel, setSel] = useState<{ pos: Position; street: Street } | null>(null);
  const real = aboveChance(stats.totalCorrectDecisions, stats.totalDecisions, stats.totalChance);
  const provisional = stats.rating.rd > 110;
  const selStats = sel ? stats.leakStats[leakKey(sel.pos, sel.street)] : undefined;
  const selReal = selStats ? aboveChance(selStats.ok, selStats.n, selStats.chance) : null;

  return (
    <div className="progress-view space-y-3 animate-fadeIn">
      <Panel className="p-3">
        <div className="flex items-baseline gap-2">
          <span className="num text-[40px] leading-none font-semibold text-hi">{Math.round(stats.rating.r)}{provisional ? '?' : ''}</span>
          <span className="text-[12px] text-dim">rating</span>
        </div>
        <div className="mt-2"><Sparkline values={stats.ratingHistory} /></div>
        <div className="grid grid-cols-4 gap-1 mt-2 text-center">
          {[
            ['Decisiones', String(stats.totalDecisions)],
            ['Acierto real', real === null ? '—' : `${real} %`],
            ['Mejor racha', String(stats.bestStreak)],
            ['Días', String(stats.dayStreak)]
          ].map(([k, v]) => (
            <div key={k}>
              <div className="num text-[17px] font-semibold text-hi">{v}</div>
              <div className="text-[10px] text-dim">{k}</div>
            </div>
          ))}
        </div>
      </Panel>

      <div>
        <Title right={<span className="text-[10px] text-dim">sobre el azar</span>}>Fugas</Title>
        <Panel className="p-1.5">
          <div className="leak-map grid gap-[3px]" style={{ gridTemplateColumns: '40px repeat(4, minmax(0, 1fr))' }}>
            <div />
            {LEAK_STREETS.map(s => <div key={s} className="text-center text-[11px] text-dim py-0.5">{STREET_SHORT[s]}</div>)}
            {LEAK_POSITIONS.map(pos => (
              <React.Fragment key={pos}>
                <div className="text-[12px] font-semibold text-txt flex items-center">{pos}</div>
                {LEAK_STREETS.map(street => {
                  const d = stats.leakStats[leakKey(pos, street)];
                  const v = d ? aboveChance(d.ok, d.n, d.chance) : null;
                  const active = sel?.pos === pos && sel?.street === street;
                  return (
                    <button
                      key={street}
                      onClick={() => setSel({ pos, street })}
                      className={`leak-cell h-10 rounded-[3px] num text-[13px] font-semibold flex flex-col items-center justify-center leading-none ${tone(v, d?.n || 0)} ${active ? 'ring-2 ring-acc' : ''}`}
                    >
                      <span>{d && d.n >= 3 && v !== null ? v : '·'}</span>
                      {d && <span className="text-[9px] opacity-75 mt-0.5">{d.n}</span>}
                    </button>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
          {sel && (
            <div className="flex items-center gap-2 pt-2 px-0.5">
              <div className="flex-1 min-w-0 text-[13px] text-txt num">
                <span className="text-hi font-semibold">{sel.pos} · {STREET_SHORT[sel.street]}</span>{' '}
                {selStats ? `${selReal ?? 0} % · ${selStats.n} dec.` : 'sin datos'}
              </div>
              <BtnPrimary onClick={() => onTrainLeak(sel.pos, sel.street)} className="train-leak px-4 shrink-0">Entrenar esto</BtnPrimary>
            </div>
          )}
        </Panel>
      </div>

      <div className="flex items-center justify-between px-0.5 text-[13px] text-txt num">
        <span>Repasos pendientes <b className="text-hi">{stats.mistakeQueue.length}</b></span>
        <span>¿Abre? <b className="text-hi">{stats.sprintBest}</b></span>
      </div>
    </div>
  );
};
