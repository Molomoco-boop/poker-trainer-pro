import React from 'react';
import { useGame } from '../context/GameContext';
import { Play } from 'lucide-react';

interface DailyDrillCardProps {
  onStartDrill: () => void;
}

export const DailyDrillCard: React.FC<DailyDrillCardProps> = ({ onStartDrill }) => {
  const { stats } = useGame();
  const progress = stats.dailyDrillProgress;
  const progressPct = Math.min(100, (progress / 10) * 100);

  return (
    <div className="bg-[#121929] border border-slate-800/90 rounded-2xl p-4 shadow-lg relative overflow-hidden">
      {/* Top Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full border border-blue-500/30 bg-blue-600/10 flex items-center justify-center text-blue-400">
            <Play className="w-5 h-5 fill-blue-500 stroke-none ml-0.5" />
          </div>
          <div>
            <span className="text-[10px] font-bold tracking-wider text-blue-400 uppercase">
              DAILY DRILL
            </span>
            <h3 className="text-sm font-bold text-white leading-snug">
              Play ten poker hands
            </h3>
            <p className="text-[11px] text-slate-400 leading-tight">
              Put what you know into practice.
            </p>
          </div>
        </div>

        <button
          onClick={onStartDrill}
          className="px-4 py-1.5 rounded-full border border-blue-500/40 text-blue-400 hover:text-white hover:bg-blue-600/20 text-xs font-semibold transition-all active:scale-95 shadow-sm"
        >
          {progress > 0 && progress < 10 ? 'Resume' : progress >= 10 ? 'Completado' : 'Comenzar'}
        </button>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
        <div
          className="bg-blue-500 h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progressPct}%` }}
        />
      </div>
      <div className="flex justify-between items-center mt-1 text-[10px] text-slate-400">
        <span>Progreso diario</span>
        <span>{progress}/10 manos</span>
      </div>
    </div>
  );
};
