import React, { useState } from 'react';
import { X, CheckCircle2, Star, Plus, Infinity as InfinityIcon, Sparkles } from 'lucide-react';
import { SubcategoryId } from '../types/poker';
import { useGame } from '../context/GameContext';
import { getLevelName } from '../data/questionGenerator';

interface LevelSelectorModalProps {
  subcategory: SubcategoryId;
  subcatTitle: string;
  onSelectLevel: (level: number) => void;
  onClose: () => void;
}

export const LevelSelectorModal: React.FC<LevelSelectorModalProps> = ({
  subcategory,
  subcatTitle,
  onSelectLevel,
  onClose
}) => {
  const { getSubcategoryLevelProgress, getMaxUnlockedLevel } = useGame();
  const maxUnlocked = getMaxUnlockedLevel(subcategory);
  
  // Total levels shown (starts at least at 10, expandable to 20, 30, 50, 100+)
  const [totalLevelsCount, setTotalLevelsCount] = useState<number>(Math.max(10, maxUnlocked));

  const levels = Array.from({ length: totalLevelsCount }, (_, i) => i + 1);

  const handleAddMoreLevels = () => {
    setTotalLevelsCount(prev => prev + 10);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-3 animate-fadeIn">
      <div className="w-full max-w-md bg-[#0e1422] border border-slate-800 rounded-2xl flex flex-col max-h-[92vh] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-blue-400 text-[10px] font-bold tracking-wider uppercase">
              <InfinityIcon className="w-3.5 h-3.5" />
              <span>NIVELES INFINITOS AUTO-GENERADOS</span>
            </div>
            <h2 className="text-base font-bold text-white leading-tight">{subcatTitle}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Launch Infinite Auto-Progress Mode */}
        <div className="p-3 bg-gradient-to-r from-blue-900/40 via-blue-800/20 to-slate-900/80 border-b border-slate-800/80">
          <button
            onClick={() => onSelectLevel(1)}
            className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98]"
          >
            <Sparkles className="w-4 h-4 fill-white" />
            <span>Modo Progresivo Automático (Sube solo sin fin)</span>
          </button>
        </div>

        {/* Level List */}
        <div className="p-3 overflow-y-auto space-y-2 flex-1">
          {levels.map(lvl => {
            const progress = getSubcategoryLevelProgress(subcategory, lvl);
            const isMastered = progress.completed >= 10;
            const lvlName = getLevelName(lvl);

            return (
              <div
                key={lvl}
                onClick={() => onSelectLevel(lvl)}
                className={`w-full p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between active:scale-[0.98] ${
                  isMastered
                    ? 'bg-blue-950/20 border-blue-600/40 hover:border-blue-500'
                    : progress.completed > 0
                    ? 'bg-[#141b2d] border-slate-700/80 hover:border-blue-500/60'
                    : 'bg-[#111726] border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3.5 flex-1 min-w-0 pr-3">
                  {/* Badge */}
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                      isMastered
                        ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.4)]'
                        : lvl <= 3
                        ? 'bg-amber-800/30 text-amber-300 border border-amber-600/30'
                        : lvl <= 6
                        ? 'bg-slate-700/50 text-slate-200 border border-slate-600/30'
                        : lvl <= 8
                        ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                        : lvl <= 10
                        ? 'bg-purple-900/30 text-purple-300 border border-purple-500/40'
                        : 'bg-emerald-900/30 text-emerald-300 border border-emerald-500/40'
                    }`}
                  >
                    {isMastered ? <CheckCircle2 className="w-5 h-5" /> : `N${lvl}`}
                  </div>

                  {/* Level Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-bold text-white truncate">
                        {lvl}. {lvlName}
                      </h4>
                      <span className="text-xs font-bold text-blue-400 shrink-0">
                        {progress.percentage}%
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isMastered ? 'bg-blue-500' : 'bg-blue-600'
                        }`}
                        style={{ width: `${progress.percentage}%` }}
                      />
                    </div>

                    <div className="flex justify-between items-center mt-1 text-[10px] text-slate-400">
                      <span>{progress.completed} manos practicadas (infinitas)</span>
                      {isMastered && (
                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                          <Star className="w-3 h-3 fill-emerald-400" /> Dominado
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="shrink-0 pl-2">
                  <span className="text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white transition-all">
                    Jugar
                  </span>
                </div>
              </div>
            );
          })}

          {/* Button to generate +10 more levels on demand */}
          <button
            onClick={handleAddMoreLevels}
            className="w-full py-3 rounded-xl border border-dashed border-blue-500/50 hover:border-blue-400 bg-blue-600/10 text-blue-300 hover:text-white text-xs font-bold flex items-center justify-center gap-2 transition-all mt-2 active:scale-98"
          >
            <Plus className="w-4 h-4" />
            <span>Generar +10 Niveles Automáticamente (Hasta Nivel {totalLevelsCount + 10})</span>
          </button>
        </div>

        {/* Footer info */}
        <div className="p-3 bg-[#0a0f1a] border-t border-slate-800 text-center text-xs text-slate-400">
          ✨ Todos los ejercicios y niveles se generan de forma ilimitada en tiempo real.
        </div>
      </div>
    </div>
  );
};
