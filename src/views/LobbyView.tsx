import React, { useState } from 'react';
import { Header } from '../components/Header';
import { TrainingCategories } from '../components/TrainingCategories';
import { ToolsSection } from '../components/ToolsSection';
import { RangeViewerModal } from '../components/RangeViewerModal';
import { OddsCalculatorModal } from '../components/OddsCalculatorModal';
import { StatsMistakesModal } from '../components/StatsMistakesModal';
import { CategoryId } from '../types/poker';
import { Play } from 'lucide-react';
import { useGame } from '../context/useGame';

interface LobbyViewProps {
  onSelectCategory: (cat: CategoryId) => void;
  onStartDaily: () => void;
  onStartContinuousPlay: () => void;
}

export const LobbyView: React.FC<LobbyViewProps> = ({
  onSelectCategory,
  onStartDaily,
  onStartContinuousPlay
}) => {
  const { stats } = useGame();
  const [showRangeViewer, setShowRangeViewer] = useState(false);
  const [showOddsCalculator, setShowOddsCalculator] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);

  const drillProgress = stats.dailyDrillCount || 0;

  return (
    <div className="space-y-3 animate-fadeIn select-none font-sans">
      
      {/* Header */}
      <Header />

      {/* Daily Drill Card with REAL PROGRESS (0/10) */}
      <div className="bg-[#121929] border border-slate-800/90 rounded-2xl p-3.5 shadow-sm flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border border-blue-500/40 bg-blue-600/15 flex items-center justify-center text-blue-400 shrink-0">
              <Play className="w-4 h-4 fill-blue-400 stroke-none ml-0.5" />
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-wider text-blue-400 uppercase">
                Drill diario
              </span>
              <h3 className="text-sm font-[800] text-white">10 decisiones</h3>
              <p className="text-[11px] text-slate-400">{drillProgress >= 10 ? 'Hecho hoy' : `${drillProgress}/10`}</p>
            </div>
          </div>

          <button
            onClick={drillProgress >= 10 ? onStartContinuousPlay : onStartDaily}
            className="h-10 px-5 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-[800] transition-all active:scale-95 shadow-md shadow-blue-600/20"
          >
            {drillProgress >= 10 ? 'Libre' : drillProgress > 0 ? 'Seguir' : 'Jugar'}
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
        className="w-full bg-[#121929] border border-slate-800/90 rounded-2xl px-3.5 py-2.5 flex items-center justify-between shadow-sm transition-all active:scale-[0.99] cursor-pointer hover:bg-[#162035]"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-800/80 flex items-center justify-center text-slate-300 shrink-0">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><polyline points="18,17 12,11 8,15 2,9"/></svg>
          </div>
          <div className="text-left">
            <h3 className="text-xs font-bold text-white">Estadísticas</h3>
            <p className="text-[11px] text-slate-400">
              {stats.totalDecisions > 0
                ? `${Math.round((stats.totalCorrectDecisions / stats.totalDecisions) * 100)}% · ${stats.totalDecisions} decisiones`
                : 'Sin manos jugadas'}
            </p>
          </div>
        </div>
        <svg className="w-4 h-4 text-slate-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
      </button>

      {/* Modals */}
      {showRangeViewer && <RangeViewerModal onClose={() => setShowRangeViewer(false)} />}
      {showOddsCalculator && <OddsCalculatorModal onClose={() => setShowOddsCalculator(false)} />}
      {showStatsModal && <StatsMistakesModal onClose={() => setShowStatsModal(false)} />}
    </div>
  );
};
