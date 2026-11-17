import React, { useState } from 'react';
import { X, RefreshCw } from 'lucide-react';
import { Card, Rank, Suit } from '../types/poker';
import { CardView } from './CardView';
import { detectCleanOuts, calculatePotOddsPct } from '../utils/pokerMath';
import { ModalPortal } from './ModalPortal';

interface OddsCalculatorModalProps {
  onClose: () => void;
}

const RANK_BTNS: Rank[] = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
const SUIT_BTNS: { s: Suit; sym: string; cls: string }[] = [
  { s: 's', sym: '♠', cls: 'text-hi' },
  { s: 'h', sym: '♥', cls: 'text-badtx' },
  { s: 'd', sym: '♦', cls: 'text-acc' },
  { s: 'c', sym: '♣', cls: 'text-green-500' }
];

export const OddsCalculatorModal: React.FC<OddsCalculatorModalProps> = ({ onClose }) => {
  // slots 0-1 hero, 2-6 board
  const [slots, setSlots] = useState<(Card | null)[]>([
    { rank: 'A', suit: 's' }, { rank: 'K', suit: 's' },
    { rank: 'Q', suit: 's' }, { rank: 'J', suit: 'd' }, { rank: '4', suit: 's' }, null, null
  ]);
  const [active, setActive] = useState(5);
  const [rank, setRank] = useState<Rank | null>(null);
  const [pot, setPot] = useState(10);
  const [bet, setBet] = useState(3);

  const used = slots.filter(Boolean) as Card[];
  const isUsed = (r: Rank, s: Suit) => used.some(c => c.rank === r && c.suit === s);

  const place = (s: Suit) => {
    if (!rank || isUsed(rank, s)) return;
    const next = [...slots];
    next[active] = { rank, suit: s };
    setSlots(next);
    setRank(null);
    const empty = next.findIndex(c => !c);
    if (empty >= 0) setActive(empty);
  };

  const hero = slots.slice(0, 2).filter(Boolean) as Card[];
  const board = slots.slice(2).filter(Boolean) as Card[];
  const ready = hero.length === 2 && board.length >= 3 && board.length <= 4;
  const draws = ready ? detectCleanOuts([hero[0], hero[1]], board) : null;
  const drawSummary = draws ? `${draws.drawLabels.join(' + ') || 'Sin proyecto'} · ${draws.totalCleanOutsCount} outs` : '—';
  const equity = draws ? draws.equityRiverPct : 0;
  const potOdds = calculatePotOddsPct(bet, pot + bet);
  const profitable = draws && bet > 0 && equity >= potOdds;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[60] bg-black/90 flex flex-col p-2 gap-2 select-none animate-fadeIn safe-top safe-bottom">
        <div className="w-full max-w-md mx-auto bg-panel border border-line rounded-[4px] p-2.5 flex items-center justify-between shrink-0">
          <h2 className="text-sm font-[800] text-hi">Calculadora</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setSlots([null, null, null, null, null, null, null]); setActive(0); setRank(null); }}
              className="w-10 h-10 rounded-full bg-panel2 flex items-center justify-center text-txt"
              aria-label="Borrar cartas"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="w-10 h-10 rounded-full bg-panel2 flex items-center justify-center text-txt" aria-label="Cerrar">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="w-full max-w-md mx-auto flex-1 min-h-0 flex flex-col gap-2">
          {/* Slots */}
          <div className="bg-panel border border-line rounded-[4px] p-2.5 flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[10px] text-dim font-bold uppercase">
              <span>Mano</span><span>Board</span>
            </div>
            <div className="flex items-center justify-between">
              {slots.map((c, i) => (
                <React.Fragment key={i}>
                  {i === 2 && <div className="w-px h-10 bg-line" />}
                  <button
                    onClick={() => { setActive(i); setRank(null); }}
                    onDoubleClick={() => { const n = [...slots]; n[i] = null; setSlots(n); }}
                    className={`calc-slot w-10 h-[54px] rounded-md flex items-center justify-center ${active === i ? 'ring-2 ring-acc' : ''} ${c ? '' : 'border border-dashed border-line text-dim'}`}
                    aria-label={`Hueco ${i + 1}`}
                  >
                    {c ? <CardView card={c} size="sm" className="!w-10 !h-[54px]" /> : '+'}
                  </button>
                </React.Fragment>
              ))}
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-acc font-bold truncate">{drawSummary}</span>
              {slots[active] && (
                <button
                  onClick={() => { const n = [...slots]; n[active] = null; setSlots(n); }}
                  className="h-10 px-3 rounded-lg bg-panel2 text-txt font-semibold"
                >
                  Quitar
                </button>
              )}
            </div>
          </div>

          {/* Picker */}
          <div className="bg-panel border border-line rounded-[4px] p-2.5 flex flex-col gap-1.5">
            <div className="grid grid-cols-7 gap-1.5">
              {RANK_BTNS.map(r => (
                <button
                  key={r}
                  onClick={() => setRank(r)}
                  className={`h-10 rounded-lg font-black text-sm border ${rank === r ? 'bg-acc border-acc text-hi' : 'bg-bg border-line text-hi'}`}
                >
                  {r === 'T' ? '10' : r}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {SUIT_BTNS.map(({ s, sym, cls }) => (
                <button
                  key={s}
                  onClick={() => place(s)}
                  disabled={!rank || isUsed(rank, s)}
                  className={`h-10 rounded-lg text-xl border bg-bg border-line disabled:opacity-25 ${cls}`}
                >
                  {sym}
                </button>
              ))}
            </div>
          </div>

          {/* Results */}
          <div className="bg-panel border border-line rounded-[4px] p-2.5 flex flex-col gap-2 text-xs">
            <div className="flex flex-wrap gap-1.5 min-h-[20px]">
              {draws?.drawLabels.map(l => (
                <span key={l} className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-warn text-[11px] font-bold">{l}</span>
              ))}
              {!ready && <span className="text-dim text-[11px]">2 cartas + flop o turn</span>}
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-center">
              <div className="bg-bg rounded-lg p-1.5">
                <div className="text-[10px] text-dim">Outs</div>
                <div className="text-lg font-black text-hi tabular-nums">{draws?.totalCleanOutsCount ?? '—'}</div>
              </div>
              <div className="bg-bg rounded-lg p-1.5">
                <div className="text-[10px] text-dim">Próx. carta</div>
                <div className="text-lg font-black text-goodtx tabular-nums">{draws ? `${draws.equityTurnPct}%` : '—'}</div>
              </div>
              <div className="bg-bg rounded-lg p-1.5">
                <div className="text-[10px] text-dim">Hasta river</div>
                <div className="text-lg font-black text-acc tabular-nums">{draws ? `${draws.equityRiverPct}%` : '—'}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1 text-dim">Bote
                <input type="number" min={0} value={pot} onChange={e => setPot(Math.max(0, +e.target.value || 0))}
                  className="w-16 h-10 bg-bg border border-line rounded-lg text-center text-hi font-bold" />
              </label>
              <label className="flex items-center gap-1 text-dim">Pago
                <input type="number" min={0} value={bet} onChange={e => setBet(Math.max(0, +e.target.value || 0))}
                  className="w-16 h-10 bg-bg border border-line rounded-lg text-center text-hi font-bold" />
              </label>
              <span className={`ml-auto font-black text-[11px] text-right ${profitable ? 'text-goodtx' : 'text-badtx'}`}>
                {draws ? `${potOdds}% · ${profitable ? 'CALL' : 'FOLD'}` : `${potOdds}%`}
              </span>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};
