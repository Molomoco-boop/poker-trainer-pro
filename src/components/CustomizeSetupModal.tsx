import React, { useState } from 'react';
import { X, Check } from 'lucide-react';

interface CustomizeSetupModalProps {
  onClose: () => void;
}

export const CustomizeSetupModal: React.FC<CustomizeSetupModalProps> = ({ onClose }) => {
  const [tableFormat, setTableFormat] = useState<'6-max' | 'Heads-Up' | 'MTT 8-max'>('6-max');
  const [stackDepth, setStackDepth] = useState<number>(100);
  const [activePositions, setActivePositions] = useState<string[]>(['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB']);

  const togglePos = (p: string) => {
    setActivePositions(prev =>
      prev.includes(p) ? (prev.length > 2 ? prev.filter(x => x !== p) : prev) : [...prev, p]
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-3 animate-fadeIn font-sans select-none">
      <div className="w-full max-w-md bg-[#0e1422] border border-slate-800 rounded-2xl flex flex-col shadow-2xl overflow-hidden max-h-[92vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-[800] text-white">Customize Setup</h2>
            <p className="text-xs text-slate-400">Configura la estructura de mesa, stacks y posiciones</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4 text-xs overflow-y-auto">
          
          {/* Table Format */}
          <div>
            <label className="text-slate-400 font-bold block mb-2 uppercase text-[10px] tracking-wider">
              Formato de Mesa
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['6-max', 'Heads-Up', 'MTT 8-max'] as const).map(fmt => (
                <button
                  key={fmt}
                  onClick={() => setTableFormat(fmt)}
                  className={`py-2 px-2 rounded-xl border text-center font-bold transition-all ${
                    tableFormat === fmt
                      ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                      : 'bg-[#121929] border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>

          {/* Stack Depth */}
          <div>
            <label className="text-slate-400 font-bold block mb-2 uppercase text-[10px] tracking-wider">
              Profundidad de Stack Efectivo
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { bb: 100, label: '100 BB (Deep Cash GTO)' },
                { bb: 40, label: '40 BB (Mid Stack MTT)' },
                { bb: 20, label: '20 BB (Short Stack Nash)' }
              ].map(s => (
                <button
                  key={s.bb}
                  onClick={() => setStackDepth(s.bb)}
                  className={`p-2.5 rounded-xl border text-center font-bold transition-all flex flex-col items-center justify-center ${
                    stackDepth === s.bb
                      ? 'bg-blue-600/30 border-blue-500 text-white shadow'
                      : 'bg-[#121929] border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="text-sm font-black">{s.bb} BB</span>
                  <span className="text-[9px] opacity-75 mt-0.5">{s.label.split('(')[1].replace(')', '')}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Active Positions Filter */}
          <div>
            <label className="text-slate-400 font-bold block mb-2 uppercase text-[10px] tracking-wider">
              Posiciones Activas en el Entrenamiento
            </label>
            <div className="grid grid-cols-6 gap-1.5">
              {['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'].map(pos => {
                const isAct = activePositions.includes(pos);
                return (
                  <button
                    key={pos}
                    onClick={() => togglePos(pos)}
                    className={`py-2 rounded-lg font-black text-xs border transition-all ${
                      isAct
                        ? 'bg-indigo-600/30 border-indigo-500 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-600'
                    }`}
                  >
                    {pos}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full mt-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-[800] text-xs uppercase tracking-wider transition-transform active:scale-95 shadow-md"
          >
            Guardar Configuración
          </button>
        </div>
      </div>
    </div>
  );
};
