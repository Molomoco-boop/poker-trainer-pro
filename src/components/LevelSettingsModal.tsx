import React from 'react';
import { X, CheckCircle2 } from 'lucide-react';
import { useGame } from '../context/useGame';
import { StakeLevel, PedagogicalLevel, STAKE_CONFIG, PEDAGOGICAL_LEVEL_NAMES } from '../types/poker';
import { ModalPortal } from './ModalPortal';

interface LevelSettingsModalProps {
  onClose: () => void;
}

const STAKES: StakeLevel[] = ['NL2', 'NL5', 'NL10', 'NL25', 'NL50', 'NL100'];
const LEVELS: PedagogicalLevel[] = [1, 2, 3, 4];

export const LevelSettingsModal: React.FC<LevelSettingsModalProps> = ({ onClose }) => {
  const { stats, setStake, setPedagogicalLevel, setAutoAdjustDifficulty } = useGame();

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[60] bg-black/85 flex items-center justify-center p-3 animate-fadeIn select-none">
        <div className="w-full max-w-sm bg-[#0e1422] border border-slate-800 rounded-2xl flex flex-col shadow-2xl overflow-hidden max-h-[calc(100dvh-24px)]">
          <div className="px-4 py-2 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-[800] text-white">Nivel y stake</h2>
            <button onClick={onClose} className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-300" aria-label="Cerrar">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 space-y-4 text-xs">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Nivel</span>
                <button
                  onClick={() => setAutoAdjustDifficulty(!stats.autoAdjustDifficulty)}
                  className={`h-10 px-3 rounded-full text-[11px] font-bold border ${
                    stats.autoAdjustDifficulty ? 'bg-blue-600/30 border-blue-500 text-blue-300' : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  {stats.autoAdjustDifficulty ? 'Auto' : 'Manual'}
                </button>
              </div>
              <div className="space-y-1.5">
                {LEVELS.map(lvl => {
                  const info = PEDAGOGICAL_LEVEL_NAMES[lvl];
                  const isCurrent = stats.pedagogicalLevel === lvl;
                  return (
                    <button
                      key={lvl}
                      onClick={() => setPedagogicalLevel(lvl)}
                      className={`w-full min-h-[44px] px-2.5 py-1.5 rounded-xl border text-left flex items-center gap-2.5 ${
                        isCurrent ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-[#121929] border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${isCurrent ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                        {lvl}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-xs">{info.name}</div>
                        <div className="text-[10px] text-slate-400 leading-tight">{info.desc}</div>
                      </div>
                      {isCurrent && <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">Stake</span>
              <div className="grid grid-cols-3 gap-1.5">
                {STAKES.map(stk => {
                  const isSelected = stats.stake === stk;
                  return (
                    <button
                      key={stk}
                      onClick={() => setStake(stk)}
                      className={`min-h-[44px] py-1.5 px-1.5 rounded-xl border text-center ${
                        isSelected ? 'bg-indigo-600/30 border-indigo-500 text-white font-bold' : 'bg-[#121929] border-slate-800 text-slate-400'
                      }`}
                    >
                      <div className="text-xs font-black">{stk}</div>
                      <div className="text-[9px] text-slate-400 font-mono">{STAKE_CONFIG[stk].bbInEuros.toFixed(2)} €/BB</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="p-3 border-t border-slate-800">
            <button onClick={onClose} className="w-full h-11 bg-blue-600 rounded-xl text-white font-bold text-xs uppercase tracking-wider">
              Aceptar
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};
