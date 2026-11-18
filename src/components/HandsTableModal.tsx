import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Position } from '../types/poker';
import { getHandLabel } from '../data/preflopRanges';
import { HAND_RANKING, HAND_RANK_BY_LABEL } from '../data/handRanking';
import { ModalPortal } from './ModalPortal';
import { useBackLayer } from '../navigation/BackProvider';

interface HandsTableModalProps {
  onClose: () => void;
}

const TIERS: { pos: Position | null; label: string; cls: string }[] = [
  { pos: 'UTG', label: 'UTG', cls: 'bg-emerald-600' },
  { pos: 'HJ', label: 'HJ', cls: 'bg-lime-600' },
  { pos: 'CO', label: 'CO', cls: 'bg-sky-600' },
  { pos: 'BTN', label: 'BTN', cls: 'bg-violet-600' },
  { pos: 'SB', label: 'SB', cls: 'bg-orange-600' },
  { pos: null, label: 'Nunca', cls: 'bg-panel2' }
];

const tierClass = (pos: Position | null) => TIERS.find(t => t.pos === pos)?.cls || 'bg-panel2';

export const HandsTableModal: React.FC<HandsTableModalProps> = ({ onClose }) => {
  const [view, setView] = useState<'rank' | 'matrix'>('rank');
  const [selected, setSelected] = useState('AA');
  useBackLayer(true, onClose);
  const sel = HAND_RANK_BY_LABEL[selected];
  const cells: string[] = view === 'rank'
    ? HAND_RANKING.map(h => h.hand)
    : Array.from({ length: 169 }, (_, i) => getHandLabel(Math.floor(i / 13), i % 13));
  const chip = (on: boolean) =>
    `h-10 rounded-lg text-[12px] font-bold border ${on ? 'bg-acc border-acc text-hi' : 'bg-bg border-line text-dim'}`;

  return (
    <ModalPortal>
      <div className="hands-modal fixed inset-0 z-[60] bg-bg flex flex-col p-2 gap-2 select-none animate-fadeIn safe-top safe-bottom">
        <div className="w-full max-w-md mx-auto bg-panel border border-line rounded-[4px] p-2.5 flex flex-col gap-2 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-[800] text-hi">Las 169 manos</h2>
              <p className="text-[11px] text-dim leading-snug">Color: desde qué asiento se sube primero. UTG habla primero, BTN es el botón.</p>
            </div>
            <button onClick={onClose} className="w-10 h-10 rounded-full bg-panel2 flex items-center justify-center text-txt" aria-label="Cerrar">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button onClick={() => setView('rank')} className={chip(view === 'rank')}>Ranking</button>
            <button onClick={() => setView('matrix')} className={chip(view === 'matrix')}>Matriz</button>
          </div>
        </div>

        <div className="flex-1 min-h-0 w-full flex flex-col items-center gap-2">
          <div className="hands-grid w-full max-w-[min(400px,calc(100dvh-230px))] aspect-square grid grid-cols-13 gap-[1.5px] p-1 bg-bg border border-line rounded-[4px]">
            {cells.map(hand => {
              const h = HAND_RANK_BY_LABEL[hand];
              const on = hand === selected;
              return (
                <button
                  key={hand}
                  onClick={() => setSelected(hand)}
                  className={`relative rounded-[2px] flex items-center justify-center ${tierClass(h.openFrom)} ${on ? 'ring-2 ring-yellow-400 z-20' : ''}`}
                  aria-label={hand}
                >
                  <span className={`text-[8.5px] font-[800] leading-none tracking-tighter ${on ? 'text-yellow-200' : h.openFrom ? 'text-hi' : 'text-dim'}`}>{hand}</span>
                </button>
              );
            })}
          </div>

          <div className="w-full max-w-md mx-auto flex items-center justify-center gap-2.5 text-[10px] font-semibold flex-wrap">
            {TIERS.filter(t => HAND_RANKING.some(h => h.openFrom === t.pos)).map(t => (
              <span key={t.label} className="flex items-center gap-1">
                <span className={`w-2.5 h-2.5 rounded-sm ${t.cls}`} />
                <span className="text-txt">{t.label}</span>
              </span>
            ))}
          </div>

          {sel && (
            <div className="hand-detail w-full max-w-md mx-auto bg-panel border border-line rounded-[4px] px-3 py-2 text-center text-[12px] font-semibold text-hi tabular-nums">
              #{sel.rank} · {sel.hand} · {Math.round(sel.equity)} % vs aleatoria · {sel.openFrom ? `Abre desde ${sel.openFrom}` : 'No se abre'} · {sel.combos} combos
            </div>
          )}
        </div>
      </div>
    </ModalPortal>
  );
};
