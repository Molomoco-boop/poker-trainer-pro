import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useGame } from '../context/useGame';
import { Position, CLOCKWISE_POSITIONS } from '../types/poker';
import { ModalPortal } from './ModalPortal';

interface CustomizeSetupModalProps {
  onClose: () => void;
}

export const CustomizeSetupModal: React.FC<CustomizeSetupModalProps> = ({ onClose }) => {
  const { stats, updatePreferences } = useGame();
  const [active, setActive] = useState<Position[]>(stats.preferences.trainingPositions || [...CLOCKWISE_POSITIONS]);

  const toggle = (p: Position) =>
    setActive(prev => (prev.includes(p) ? (prev.length > 1 ? prev.filter(x => x !== p) : prev) : [...prev, p]));

  const save = () => {
    updatePreferences({ trainingPositions: CLOCKWISE_POSITIONS.filter(p => active.includes(p)) });
    onClose();
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[60] bg-black/85 flex items-center justify-center p-3 animate-fadeIn select-none">
        <div className="w-full max-w-md bg-[#0e1422] border border-slate-800 rounded-2xl flex flex-col shadow-2xl overflow-hidden max-h-[calc(100dvh-24px)]">
          <div className="px-4 py-2 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-[800] text-white">Configurar mesa</h2>
            <button onClick={onClose} className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-300" aria-label="Cerrar">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 space-y-3 text-xs">
            <div className="flex items-center justify-between text-slate-300">
              <span className="font-bold">Formato</span>
              <span className="text-white font-bold">6-max · 100 BB</span>
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Posiciones del Hero</div>
              <div className="grid grid-cols-6 gap-1.5">
                {CLOCKWISE_POSITIONS.map(pos => {
                  const on = active.includes(pos);
                  return (
                    <button
                      key={pos}
                      onClick={() => toggle(pos)}
                      className={`h-11 rounded-xl font-bold border ${on ? 'bg-indigo-600/30 border-indigo-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-500'}`}
                    >
                      {pos}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="p-3 border-t border-slate-800">
            <button onClick={save} className="w-full h-11 rounded-xl bg-blue-600 text-white font-bold text-xs uppercase tracking-wider">
              Guardar
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};
