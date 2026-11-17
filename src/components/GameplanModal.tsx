import React from 'react';
import { X } from 'lucide-react';
import { ModalPortal } from './ModalPortal';

interface GameplanModalProps {
  onClose: () => void;
}

const FLOP_ROWS: { board: string; ex: string; freq: string; size: string }[] = [
  { board: 'Seco', ex: 'A♠ 8♦ 2♣', freq: '80-100%', size: '33%' },
  { board: 'Pareado', ex: 'Q♠ Q♦ 5♣', freq: '85-95%', size: '25%' },
  { board: 'Húmedo', ex: 'J♠ T♠ 9♦', freq: '40-50%', size: '75%' },
  { board: 'Monocolor', ex: '8♥ 6♥ 2♥', freq: '35-50%', size: '33%' }
];

const SIZES: { size: string; when: string }[] = [
  { size: '33%', when: 'Ventaja de rango' },
  { size: '75%', when: 'Rango polarizado' },
  { size: '125%', when: 'Ventaja de nuts' }
];

export const GameplanModal: React.FC<GameplanModalProps> = ({ onClose }) => (
  <ModalPortal>
    <div className="fixed inset-0 z-[60] bg-black/85 flex items-center justify-center p-3 animate-fadeIn">
      <div className="w-full max-w-md bg-[#0e1422] border border-slate-800 rounded-2xl flex flex-col max-h-[calc(100dvh-24px)] shadow-2xl overflow-hidden">
        <div className="px-4 py-2 border-b border-slate-800 flex items-center justify-between shrink-0">
          <h2 className="text-sm font-[800] text-white">Gameplan</h2>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-300" aria-label="Cerrar">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 space-y-3 text-xs">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">C-bet en flop</div>
            <div className="rounded-xl border border-slate-800 overflow-hidden">
              <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-x-3 px-3 py-1.5 bg-[#121929] text-[10px] font-bold text-slate-400 uppercase">
                <span>Board</span><span>Ejemplo</span><span>Frec.</span><span>Tamaño</span>
              </div>
              {FLOP_ROWS.map(r => (
                <div key={r.board} className="grid grid-cols-[1fr_1fr_auto_auto] gap-x-3 px-3 py-2 border-t border-slate-800 text-slate-200 tabular-nums">
                  <span className="font-bold text-white">{r.board}</span>
                  <span>{r.ex}</span>
                  <span className="text-emerald-400 font-bold">{r.freq}</span>
                  <span className="text-sky-400 font-bold">{r.size}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Tamaños</div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {SIZES.map(s => (
                <div key={s.size} className="p-2 bg-[#121929] border border-slate-800 rounded-lg">
                  <div className="font-bold text-white text-sm">{s.size}</div>
                  <div className="text-[10px] text-slate-400">{s.when}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Turn y river</div>
            <div className="rounded-xl border border-slate-800 divide-y divide-slate-800 text-slate-200">
              <div className="px-3 py-2 flex justify-between gap-2"><span>2.º barril</span><span className="text-white font-bold text-right">Equity nueva · overcards A/K</span></div>
              <div className="px-3 py-2 flex justify-between gap-2"><span>Bluff-catch river</span><span className="text-white font-bold text-right">Bloquea valor, no faroles</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </ModalPortal>
);
