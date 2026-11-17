import React from 'react';
import { X, CheckCircle2, Zap, Shield, Swords, Layers } from 'lucide-react';
import { useGame } from '../context/GameContext';
import {
  StakeLevel,
  PedagogicalLevel,
  OpponentProfile,
  STAKE_CONFIG,
  PEDAGOGICAL_LEVEL_NAMES
} from '../types/poker';

interface LevelSettingsModalProps {
  onClose: () => void;
}

export const LevelSettingsModal: React.FC<LevelSettingsModalProps> = ({ onClose }) => {
  const {
    stats,
    setStake,
    setPedagogicalLevel,
    setOpponentProfile,
    setAutoAdjustDifficulty
  } = useGame();

  const stakes: StakeLevel[] = ['NL2', 'NL5', 'NL10', 'NL25', 'NL50', 'NL100'];
  const pedagogicalLevels: PedagogicalLevel[] = [1, 2, 3, 4];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-3 animate-fadeIn font-sans select-none">
      <div className="w-full max-w-sm bg-[#0e1422] border border-slate-800 rounded-2xl flex flex-col shadow-2xl overflow-hidden max-h-[92vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-[800] text-white">Nivel y Stake</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto flex-1 text-xs">
          
          {/* Section 1: Pedagogical Level (1 - 4) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Nivel Pedagógico
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400">Auto-ajuste:</span>
                <button
                  onClick={() => setAutoAdjustDifficulty(!stats.autoAdjustDifficulty)}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    stats.autoAdjustDifficulty
                      ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  {stats.autoAdjustDifficulty ? 'ACTIVO' : 'MANUAL'}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              {pedagogicalLevels.map(lvl => {
                const info = PEDAGOGICAL_LEVEL_NAMES[lvl];
                const isCurrent = stats.pedagogicalLevel === lvl;

                return (
                  <button
                    key={lvl}
                    onClick={() => setPedagogicalLevel(lvl)}
                    className={`w-full p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                      isCurrent
                        ? 'bg-blue-600/20 border-blue-500 text-white shadow-md'
                        : 'bg-[#121929] border-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                      isCurrent ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {lvl}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-xs">{info.name}</div>
                      <div className="text-[10px] text-slate-400 leading-tight mt-0.5">{info.desc}</div>
                    </div>
                    {isCurrent && <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Stake Level (NL2 to NL100) */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
              Stake
            </span>

            <div className="grid grid-cols-3 gap-1.5">
              {stakes.map(stk => {
                const cfg = STAKE_CONFIG[stk];
                const isSelected = stats.stake === stk;

                return (
                  <button
                    key={stk}
                    onClick={() => setStake(stk)}
                    className={`py-2 px-1.5 rounded-xl border text-center transition-all ${
                      isSelected
                        ? 'bg-indigo-600/30 border-indigo-500 text-white font-bold shadow'
                        : 'bg-[#121929] border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="text-xs font-black">{stk}</div>
                    <div className="text-[9px] text-slate-400 font-mono">{cfg.bbInEuros.toFixed(2)} €/BB</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Opponent Profile */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
              Perfil de Rivales
            </span>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setOpponentProfile('gto_balanced')}
                className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                  stats.opponentProfile === 'gto_balanced'
                    ? 'bg-blue-600/20 border-blue-500 text-white shadow'
                    : 'bg-[#121929] border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-1 font-bold text-xs text-blue-400">
                  <Shield className="w-3.5 h-3.5" /> GTO Equilibrado
                </div>
                <div className="text-[10px] text-slate-400 leading-tight">
                  Juego solver puro
                </div>
              </button>

              <button
                onClick={() => setOpponentProfile('micro_exploitative')}
                className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                  stats.opponentProfile === 'micro_exploitative'
                    ? 'bg-blue-600/20 border-blue-500 text-white shadow'
                    : 'bg-[#121929] border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-1 font-bold text-xs text-amber-400">
                  <Swords className="w-3.5 h-3.5" /> Explotativo
                </div>
                <div className="text-[10px] text-slate-400 leading-tight">
                  Ajustado a microlímites
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#0a0f1a] border-t border-slate-800 text-center">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-[800] text-xs rounded-xl shadow-md uppercase tracking-wider"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
};
