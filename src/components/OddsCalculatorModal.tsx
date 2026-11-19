import React, { useState } from 'react';
import { X, RotateCcw, Minus, Plus } from 'lucide-react';
import { Card, Rank, Suit } from '../types/poker';
import { CardView } from './CardView';
import { detectCleanOuts, calculatePotOddsPct } from '../utils/pokerMath';
import { ModalPortal } from './ModalPortal';
import { useBackLayer } from '../navigation/BackProvider';

interface OddsCalculatorModalProps {
  onClose: () => void;
}

const RANK_BTNS: Rank[] = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
const SUIT_BTNS: { s: Suit; sym: string; cls: string }[] = [
  { s: 's', sym: '♠', cls: 'text-hi' },
  { s: 'h', sym: '♥', cls: 'text-badtx' },
  { s: 'd', sym: '♦', cls: 'text-acc' },
  { s: 'c', sym: '♣', cls: 'text-goodtx' }
];
const DRAW_ES: Record<string, string> = { 'Flush draw': 'flush draw', 'Open-ended': 'open-ended', Gutshot: 'gutshot', Overcards: 'overcards' };

const Num: React.FC<{ label: string; value: number; set: (v: number) => void; step?: number }> = ({ label, value, set, step = 1 }) => (
  <div className="flex-1 min-w-0 flex flex-col gap-0.5">
    <span className="text-[11px] text-dim truncate">{label}</span>
    <div className="flex items-center border border-line rounded-[4px] bg-bg h-10">
      <button onClick={() => set(Math.max(0, value - step))} className="w-10 h-10 flex items-center justify-center text-txt" aria-label={`Minus ${label}`}><Minus className="w-4 h-4" /></button>
      <input
        type="number" inputMode="decimal" min={0} value={value}
        onChange={e => set(Math.max(0, +e.target.value || 0))}
        className="calc-input flex-1 min-w-0 h-10 bg-transparent text-center text-hi font-semibold num text-[15px] outline-none"
        aria-label={label}
      />
      <button onClick={() => set(value + step)} className="w-10 h-10 flex items-center justify-center text-txt" aria-label={`Plus ${label}`}><Plus className="w-4 h-4" /></button>
    </div>
  </div>
);

const StepTitle: React.FC<{ n: number; children: React.ReactNode; done: boolean }> = ({ n, children, done }) => (
  <div className="flex items-center gap-1.5 text-[12px] text-txt">
    <span className={`w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center ${done ? 'bg-good text-white' : 'bg-line text-hi'}`}>{n}</span>
    {children}
  </div>
);

/** Outs → probability → pot odds → verdict, in three steps. */
export const OddsCalculatorModal: React.FC<OddsCalculatorModalProps> = ({ onClose }) => {
  // slots 0-1 hero, 2-5 board (flop + turn)
  const [slots, setSlots] = useState<(Card | null)[]>([
    { rank: '8', suit: 'h' }, { rank: '7', suit: 'h' },
    { rank: 'K', suit: 'h' }, { rank: '9', suit: 'd' }, { rank: '2', suit: 'h' }, null
  ]);
  const [active, setActive] = useState(5);
  const [rank, setRank] = useState<Rank | null>(null);
  const [pot, setPot] = useState(10);
  const [bet, setBet] = useState(5);
  useBackLayer(true, onClose);

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
  const tapSlot = (i: number) => {
    if (active === i && slots[i]) { const n = [...slots]; n[i] = null; setSlots(n); }
    setActive(i);
    setRank(null);
  };

  const hero = slots.slice(0, 2).filter(Boolean) as Card[];
  const board = slots.slice(2).filter(Boolean) as Card[];
  const ready = hero.length === 2 && board.length >= 3;
  const d = ready ? detectCleanOuts([hero[0], hero[1]], board) : null;
  const onFlop = board.length === 3;
  const nextCard = d ? d.equityTurnPct : 0;
  const need = bet > 0 ? Math.round(calculatePotOddsPct(bet, pot + bet)) : 0;
  const drawName = d?.drawLabels.map(l => DRAW_ES[l] || l.toLowerCase()).join(' + ');
  const verdict = d && bet > 0 ? (nextCard >= need ? 'ok' : 'no') : null;

  const slot = (i: number) => {
    const c = slots[i];
    return (
      <button
        key={i}
        onClick={() => tapSlot(i)}
        className={`calc-slot w-10 h-[54px] rounded-[4px] flex items-center justify-center text-[18px] ${active === i ? 'ring-2 ring-acc' : ''} ${c ? '' : 'border border-dashed border-line text-dim'}`}
        aria-label={`Carta ${i + 1}`}
      >
        {c ? <CardView card={c} size="sm" className="!w-10 !h-[54px]" /> : i === 5 ? <span className="text-[10px]">turn</span> : '+'}
      </button>
    );
  };

  return (
    <ModalPortal>
      <div className="calc-modal fixed inset-0 z-[60] bg-bg flex flex-col select-none animate-fadeIn safe-top safe-bottom overflow-hidden">
        <div className="w-full max-w-md mx-auto px-2 h-12 flex items-center gap-2 shrink-0 border-b border-line">
          <h2 className="flex-1 text-[15px] font-semibold text-hi">Pot odds</h2>
          <button onClick={() => { setSlots([null, null, null, null, null, null]); setActive(0); setRank(null); }} className="w-10 h-10 flex items-center justify-center text-txt" aria-label="Clear cards">
            <RotateCcw className="w-4 h-4" />
          </button>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center text-txt" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="w-full max-w-md mx-auto flex-1 min-h-0 flex flex-col gap-2 px-2 pt-2">
          {/* 1 + 2: cards */}
          <div className="flex items-end justify-between gap-2">
            <div className="flex flex-col gap-1">
              <StepTitle n={1} done={hero.length === 2}>Your cards</StepTitle>
              <div className="flex gap-1">{[0, 1].map(slot)}</div>
            </div>
            <div className="flex flex-col gap-1 items-end">
              <StepTitle n={2} done={board.length >= 3}>Board</StepTitle>
              <div className="flex gap-1">{[2, 3, 4, 5].map(slot)}</div>
            </div>
          </div>

          {/* picker: rank then suit */}
          <div className="flex flex-col gap-1">
            <div className="grid grid-cols-7 gap-1">
              {RANK_BTNS.map(r => (
                <button key={r} onClick={() => setRank(r)}
                  className={`h-10 rounded-[4px] font-semibold text-[14px] border ${rank === r ? 'bg-acc border-acc text-white' : 'bg-panel border-line text-hi'}`}>
                  {r === 'T' ? '10' : r}
                </button>
              ))}
              <button onClick={() => { const n = [...slots]; n[active] = null; setSlots(n); }} className="h-10 rounded-[4px] border border-line bg-panel text-dim text-[11px]" aria-label="Remove card">Remove</button>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {SUIT_BTNS.map(({ s, sym, cls }) => (
                <button key={s} onClick={() => place(s)} disabled={!rank || isUsed(rank, s)}
                  className={`h-10 rounded-[4px] text-[20px] border bg-panel border-line disabled:opacity-25 ${cls}`}>
                  {sym}
                </button>
              ))}
            </div>
            <span className="text-[11px] text-dim text-center">{rank ? 'Now the suit' : 'Tap a slot, then rank and suit'}</span>
          </div>

          {/* 3: pot and bet */}
          <div className="flex flex-col gap-1">
            <StepTitle n={3} done={bet > 0}>Pot and bet (BB)</StepTitle>
            <div className="flex gap-2">
              <Num label="Pot before the bet" value={pot} set={setPot} />
              <Num label="Bet you face" value={bet} set={setBet} />
            </div>
          </div>

          {/* results */}
          <div className="calc-result grid grid-cols-3 gap-1.5">
            <div className="bg-panel border border-line rounded-[4px] px-2 py-1.5 flex flex-col">
              <span className="text-[11px] text-dim">Outs</span>
              <span className="calc-outs num text-[26px] leading-tight font-semibold text-hi">{d ? d.totalCleanOutsCount : '—'}</span>
              <span className="text-[11px] text-txt truncate">{d ? drawName || 'no draw' : 'missing cards'}</span>
            </div>
            <div className="bg-panel border border-line rounded-[4px] px-2 py-1.5 flex flex-col">
              <span className="text-[11px] text-dim">Probability</span>
              <span className="calc-prob num text-[26px] leading-tight font-semibold text-hi">{d ? `${Math.round(nextCard)} %` : '—'}</span>
              <span className="text-[11px] text-txt truncate">{d ? (onFlop ? `turn · ${Math.round(d.equityRiverPct)} % river` : 'on the river') : ''}</span>
            </div>
            <div className="bg-panel border border-line rounded-[4px] px-2 py-1.5 flex flex-col">
              <span className="text-[11px] text-dim">You need</span>
              <span className="calc-need num text-[26px] leading-tight font-semibold text-hi">{bet > 0 ? `${need} %` : '—'}</span>
              <span className="text-[11px] text-txt truncate">{bet > 0 ? `you call ${bet} of ${pot + bet * 2}` : ''}</span>
            </div>
          </div>
          {verdict && (
            <div className={`calc-verdict h-11 rounded-[4px] flex items-center justify-center gap-2 text-[15px] font-semibold ${verdict === 'ok' ? 'bg-good text-white' : 'bg-bad text-white'}`}>
              {verdict === 'ok' ? 'Calling is +EV' : 'Not profitable: fold'}
              <span className="num text-[12px] font-normal opacity-90">{Math.round(nextCard)} % {verdict === 'ok' ? '≥' : '<'} {need} %</span>
            </div>
          )}
          <p className="text-[11px] text-dim leading-snug">
            Outs: cards that give you the best hand. Compared to the next card: if they bet again, you face pot odds once more.
          </p>
        </div>
      </div>
    </ModalPortal>
  );
};
