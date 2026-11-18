import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Position } from '../types/poker';
import { getHandLabel, getPreflopMatrix, getRangeStats, PreflopSituation } from '../data/preflopRanges';
import { ModalPortal } from './ModalPortal';
import { useBackLayer } from '../navigation/BackProvider';

interface RangeViewerModalProps {
  onClose: () => void;
  highlightHand?: string;
  initialSituation?: PreflopSituation;
  initialPosition?: Position;
  initialOpener?: Position;
}

const SITUATIONS: { id: PreflopSituation; label: string }[] = [
  { id: 'RFI', label: 'Subo primero' },
  { id: 'VS_OPEN', label: 'Me suben' },
  { id: 'VS_3BET', label: 'Me resuben' }
];

const HERO_POSITIONS: Record<PreflopSituation, Position[]> = {
  RFI: ['UTG', 'HJ', 'CO', 'BTN', 'SB'],
  VS_OPEN: ['SB', 'BB'],
  VS_3BET: ['UTG', 'HJ', 'CO', 'BTN']
};

const ORDER: Position[] = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];

/** Vs open: who opened (players before hero). Vs 3-bet: who 3-bets (players after hero). */
function villainsFor(situation: PreflopSituation, position: Position): Position[] {
  const i = ORDER.indexOf(position);
  if (situation === 'VS_OPEN') return ORDER.slice(0, i);
  if (situation === 'VS_3BET') return ORDER.slice(i + 1);
  return [];
}

export const RangeViewerModal: React.FC<RangeViewerModalProps> = ({
  onClose,
  highlightHand,
  initialSituation = 'RFI',
  initialPosition,
  initialOpener
}) => {
  const [situation, setSituation] = useState<PreflopSituation>(initialSituation);
  const [position, setPosition] = useState<Position>(
    initialPosition && HERO_POSITIONS[initialSituation].includes(initialPosition) ? initialPosition : HERO_POSITIONS[initialSituation][HERO_POSITIONS[initialSituation].length - 1]
  );
  const [opener, setOpener] = useState<Position>(initialOpener || 'BTN');
  useBackLayer(true, onClose);

  const changeSituation = (s: PreflopSituation) => {
    setSituation(s);
    if (!HERO_POSITIONS[s].includes(position)) setPosition(HERO_POSITIONS[s][HERO_POSITIONS[s].length - 1]);
  };

  const openers = villainsFor(situation, position);
  const effOpener = openers.includes(opener) ? opener : situation === 'VS_3BET' ? openers[0] : openers[openers.length - 1];
  const matrix = getPreflopMatrix(situation, position, effOpener);
  const stats = getRangeStats(matrix);
  const chip = (on: boolean) =>
    `h-10 rounded-lg text-[12px] font-bold border ${on ? 'bg-acc border-acc text-hi' : 'bg-bg border-line text-dim'}`;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[60] bg-bg flex flex-col p-2 gap-2 select-none animate-fadeIn safe-top safe-bottom">
        <div className="w-full max-w-md mx-auto bg-panel border border-line rounded-[4px] p-2.5 flex flex-col gap-2 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-[800] text-hi">Rangos</h2>
              <p className="text-[11px] text-dim tabular-nums leading-snug">Juegas {stats.percentage} % de las manos · {stats.count} combinaciones</p>
            </div>
            <button onClick={onClose} className="w-10 h-10 rounded-full bg-panel2 flex items-center justify-center text-txt" aria-label="Cerrar">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {SITUATIONS.map(s => (
              <button key={s.id} onClick={() => changeSituation(s.id)} className={chip(situation === s.id)}>{s.label}</button>
            ))}
          </div>

          <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${HERO_POSITIONS[situation].length}, minmax(0, 1fr))` }}>
            {HERO_POSITIONS[situation].map(p => (
              <button key={p} onClick={() => setPosition(p)} className={chip(position === p)}>{p}</button>
            ))}
          </div>

          {openers.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-dim w-12 shrink-0 leading-tight">{situation === 'VS_OPEN' ? 'Sube' : 'Resube'}</span>
              <div className="grid flex-1 gap-1.5" style={{ gridTemplateColumns: `repeat(${openers.length}, minmax(0, 1fr))` }}>
                {openers.map(p => (
                  <button key={p} onClick={() => setOpener(p)} className={chip(effOpener === p)}>{p}</button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 min-h-0 w-full flex flex-col items-center gap-2">
          <div className="range-grid w-full max-w-[min(400px,calc(100dvh-250px))] aspect-square grid grid-cols-13 gap-[1.5px] p-1 bg-bg border border-line rounded-[4px]">
            {Array.from({ length: 13 }).map((_, r) =>
              Array.from({ length: 13 }).map((_, c) => {
                const hand = getHandLabel(r, c);
                const f = matrix[hand] || { raise: 0, call: 0, fold: 100 };
                const hl = highlightHand && highlightHand.toUpperCase() === hand.toUpperCase();
                return (
                  <div
                    key={hand}
                    className={`relative rounded-[2px] overflow-hidden flex items-center justify-center bg-panel2 ${hl ? 'ring-2 ring-yellow-400 z-20' : ''}`}
                  >
                    <div className="absolute inset-0 flex">
                      {f.raise > 0 && <div style={{ width: `${f.raise}%` }} className="h-full bg-acc" />}
                      {f.call > 0 && <div style={{ width: `${f.call}%` }} className="h-full bg-emerald-600" />}
                    </div>
                    <span className={`relative z-10 text-[8.5px] font-[800] leading-none tracking-tighter ${hl ? 'text-yellow-300' : f.raise || f.call ? 'text-hi' : 'text-dim'}`}>
                      {hand}
                    </span>
                  </div>
                );
              })
            )}
          </div>
          <div className="w-full max-w-md mx-auto flex items-center justify-center gap-4 text-[11px] font-semibold">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-acc" /> <span className="text-txt">{situation === 'RFI' ? 'Sube' : situation === 'VS_OPEN' ? 'Resube' : 'Vuelve a resubir'}</span></span>
            {situation !== 'RFI' && <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-600" /> <span className="text-txt">Paga</span></span>}
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-panel2 border border-line" /> <span className="text-dim">Tira</span></span>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};
