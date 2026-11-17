import React, { useState } from 'react';
import { Header } from '../components/Header';
import { TrainingCategories } from '../components/TrainingCategories';
import { ToolsSection } from '../components/ToolsSection';
import { RangeViewerModal } from '../components/RangeViewerModal';
import { OddsCalculatorModal } from '../components/OddsCalculatorModal';
import { StatsMistakesModal } from '../components/StatsMistakesModal';
import { CategoryId, SpotType } from '../types/poker';
import { Play } from 'lucide-react';
import { useGame } from '../context/GameContext';

interface LobbyViewProps {
  onSelectCategory: (cat: CategoryId) => void;
  onStartContinuousPlay: () => void;
  onStartForcedSpot?: (spot: SpotType) => void;
}

export const LobbyView: React.FC<LobbyViewProps> = ({
  onSelectCategory,
  onStartContinuousPlay,
  onStartForcedSpot
}) => {
  const { stats } = useGame();
  const [showRangeViewer, setShowRangeViewer] = useState(false);
  const [showOddsCalculator, setShowOddsCalculator] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);

  const drillProgress = stats.dailyDrillCount || 0;

  return (
    <div className="space-y-3.5 pb-20 animate-fadeIn select-none font-sans">
      
      {/* Header */}
      <Header />

      {/* Daily Drill Card with REAL PROGRESS (0/10) */}
      <div className="bg-[#121929] border border-slate-800/90 rounded-2xl p-4 shadow-sm flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border border-blue-500/40 bg-blue-600/15 flex items-center justify-center text-blue-400 shrink-0">
              <Play className="w-4 h-4 fill-blue-400 stroke-none ml-0.5" />
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-wider text-blue-400 uppercase">
                DAILY DRILL
              </span>
              <h3 className="text-sm font-[800] text-white">10 manos</h3>
              <p className="text-[11px] text-slate-400">{drillProgress}/10</p>
            </div>
          </div>

          <button
            onClick={onStartContinuousPlay}
            className="px-4 py-1.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-[800] transition-all active:scale-95 shadow-md shadow-blue-600/20"
          >
            {drillProgress > 0 && drillProgress < 10 ? 'Reanudar' : 'Jugar'}
          </button>
        </div>

        {/* Real Progress Bar */}
        <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
          <div
            className="h-full bg-gradient-to-r from-blue-600 to-sky-400 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(100, (drillProgress / 10) * 100)}%` }}
          />
        </div>
      </div>

      {/* Training Categories (Simulator, Math, Fundamentals) */}
      <TrainingCategories onSelectCategory={onSelectCategory} />

      {/* Tools Section (Range Viewer, Odds Calculator) */}
      <ToolsSection
        onOpenRangeViewer={() => setShowRangeViewer(true)}
        onOpenOddsCalculator={() => setShowOddsCalculator(true)}
      />

      {/* Stats & Mistakes quick link */}
      <button
        onClick={() => setShowStatsModal(true)}
        className="w-full bg-[#121929] border border-slate-800/90 rounded-2xl p-3.5 flex items-center justify-between shadow-sm transition-all active:scale-[0.99] cursor-pointer hover:bg-[#162035]"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-800/80 flex items-center justify-center text-slate-300 shrink-0">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><polyline points="18,17 12,11 8,15 2,9"/></svg>
          </div>
          <div className="text-left">
            <h3 className="text-xs font-bold text-white">Estadísticas</h3>
            <p className="text-[11px] text-slate-400">
              {stats.totalDecisions > 0
                ? `${Math.round((stats.totalCorrectDecisions / stats.totalDecisions) * 100)}% · ${stats.totalDecisions} manos`
                : 'Sin manos jugadas'}
            </p>
          </div>
        </div>
        <svg className="w-4 h-4 text-slate-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
      </button>

      {/* Primary Floating Start Playing Button */}
      <div className="pt-2">
        <button
          onClick={onStartContinuousPlay}
          className="w-full py-4 px-4 rounded-2xl bg-[#2563EB] hover:bg-blue-500 active:scale-[0.98] transition-all font-[800] text-white text-sm flex items-center justify-center gap-2 shadow-xl shadow-blue-600/30 uppercase tracking-wider"
        >
          <Play className="w-4 h-4 fill-white stroke-none" />
          <span>Start Playing</span>
        </button>
      </div>

      {/* Modals */}
      {showRangeViewer && <RangeViewerModal onClose={() => setShowRangeViewer(false)} />}
      {showOddsCalculator && <OddsCalculatorModal onClose={() => setShowOddsCalculator(false)} />}
      {showStatsModal && <StatsMistakesModal onClose={() => setShowStatsModal(false)} />}
    </div>
  );
};
