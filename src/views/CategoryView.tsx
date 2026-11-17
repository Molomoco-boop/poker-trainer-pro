import React, { useState } from 'react';
import {
  ArrowLeft,
  ChevronRight,
  Sliders,
  MapPin,
  ChevronDown,
  Layers,
  SquareDashedBottomCode,
  LayoutGrid,
  Percent,
  PieChart,
  TrendingUp,
  ListOrdered,
  Trophy
} from 'lucide-react';
import { CategoryId, SubcategoryId, SPOT_TYPE_NAMES } from '../types/poker';
import { StatsMistakesModal } from '../components/StatsMistakesModal';
import { CustomizeSetupModal } from '../components/CustomizeSetupModal';
import { GameplanModal } from '../components/GameplanModal';
import { useGame } from '../context/GameContext';
import { PEDAGOGICAL_LEVEL_NAMES } from '../types/poker';

interface CategoryViewProps {
  categoryId: CategoryId;
  onBack: () => void;
  onStartPractice: (subcategory: SubcategoryId) => void;
}

export const CategoryView: React.FC<CategoryViewProps> = ({
  categoryId,
  onBack,
  onStartPractice
}) => {
  const { stats } = useGame();
  const [showStatsMistakes, setShowStatsMistakes] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [showGameplan, setShowGameplan] = useState(false);

  const categoryConfig: Record<
    CategoryId,
    {
      title: string;
      subcategories: {
        id: SubcategoryId;
        title: string;
        icon: React.ComponentType<{ className?: string }>;
      }[];
    }
  > = {
    simulator: {
      title: 'Poker Simulator',
      subcategories: [
        { id: 'full_hand', title: 'Full hand', icon: Layers },
        { id: 'preflop', title: 'Preflop', icon: SquareDashedBottomCode },
        { id: 'postflop', title: 'Postflop', icon: LayoutGrid }
      ]
    },
    math: {
      title: 'Poker Math',
      subcategories: [
        { id: 'odds', title: 'Odds', icon: Percent },
        { id: 'equity', title: 'Equity', icon: PieChart },
        { id: 'ev', title: 'EV', icon: TrendingUp }
      ]
    },
    fundamentals: {
      title: 'Fundamentals',
      subcategories: [
        { id: 'hand_ranking', title: 'Hand ranking', icon: ListOrdered },
        { id: 'best_hand', title: 'Best hand', icon: Trophy }
      ]
    }
  };

  const currentCat = categoryConfig[categoryId];
  const levelInfo = PEDAGOGICAL_LEVEL_NAMES[stats.pedagogicalLevel];

  const totalDecisions = stats.totalDecisions || 0;
  const correctDecisions = stats.totalCorrectDecisions || 0;
  const hasDecisions = totalDecisions > 0;
  const accuracyPct = hasDecisions ? Math.round((correctDecisions / totalDecisions) * 100) : null;

  return (
    <div className="space-y-4 pb-12 animate-fadeIn select-none font-sans">
      {/* Top Navigation */}
      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-slate-800/80 hover:bg-slate-700 flex items-center justify-center text-slate-300 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-[800] text-white tracking-wide">{currentCat.title}</h1>
      </div>

      {/* Training Section */}
      <div className="space-y-2">
        <div className="mb-1">
          <h2 className="text-sm font-[800] text-white">Training</h2>
        </div>

        {/* Overall level summary */}
        <div className="bg-[#121929] border border-slate-800/90 rounded-2xl p-3.5 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[11px] text-slate-400 block">Dificultad actual</span>
            <span className="text-xs font-bold text-white">{levelInfo.name}</span>
          </div>
          <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full"
              style={{ width: `${stats.pedagogicalLevel * 25}%` }}
            />
          </div>
        </div>

        {/* Subcategories (Modules) */}
        <div className="space-y-2 pt-1">
          {currentCat.subcategories.map(sub => {
            const Icon = sub.icon;
            return (
              <div
                key={sub.id}
                onClick={() => onStartPractice(sub.id)}
                className="w-full bg-[#121929] hover:bg-[#162035] border border-slate-800/90 rounded-2xl p-3.5 flex items-center justify-between shadow-sm transition-all active:scale-[0.99] cursor-pointer"
              >
                <div className="flex items-center gap-3.5 flex-1 min-w-0 pr-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600/15 text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-white tracking-wide">{sub.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] text-slate-400 font-semibold">{stats.stake}</span>
                    </div>
                  </div>
                </div>

                <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
              </div>
            );
          })}
        </div>
      </div>

      {/* Simulator Extra Cards (Decision Accuracy, Customize Setup, Gameplan) */}
      {categoryId === 'simulator' && (
        <div className="space-y-2.5 pt-1">
          {/* Decision Accuracy Card */}
          <div className="bg-[#121929] border border-slate-800/90 rounded-2xl p-4 shadow-sm text-center">
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              Precisión
            </span>

            {hasDecisions ? (
              <>
                <div className="text-3xl font-black text-emerald-400 my-1 tabular-nums">
                  {accuracyPct}%
                </div>
                <div className="text-[11px] text-slate-400">
                  {correctDecisions} de {totalDecisions} decisiones acertadas
                </div>
              </>
            ) : (
              <>
                <div className="text-3xl font-black text-[#64748B] my-1">
                  —
                </div>
                <p className="text-xs text-slate-400">
                  Sin datos
                </p>
              </>
            )}

            <button
              onClick={() => setShowStatsMistakes(true)}
              className="text-xs font-semibold text-slate-400 hover:text-white flex items-center justify-center gap-1 mx-auto mt-2 transition-colors"
            >
              <span>View stats & mistakes</span>
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {/* Customize Setup Button */}
          <div
            onClick={() => setShowCustomize(true)}
            className="w-full bg-[#121929] hover:bg-[#162035] border border-slate-800/90 rounded-2xl p-3.5 flex items-center justify-between shadow-sm cursor-pointer transition-all active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-800/80 flex items-center justify-center text-slate-300">
                <Sliders className="w-4 h-4" />
              </div>
              <div className="text-left">
                <h3 className="text-xs font-bold text-white">Customize setup</h3>
                <p className="text-[11px] text-slate-400">6-max · Cash - 100 bb GTO</p>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </div>

          {/* Gameplan Button */}
          <div
            onClick={() => setShowGameplan(true)}
            className="w-full bg-[#121929] hover:bg-[#162035] border border-slate-800/90 rounded-2xl p-3.5 flex items-center justify-between shadow-sm cursor-pointer transition-all active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600/15 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="text-left">
                <h3 className="text-xs font-bold text-white">Gameplan</h3>
                <p className="text-[11px] text-slate-400">Explore postflop strategy</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </div>
        </div>
      )}

      {/* Modals */}
      {showStatsMistakes && <StatsMistakesModal onClose={() => setShowStatsMistakes(false)} />}
      {showCustomize && <CustomizeSetupModal onClose={() => setShowCustomize(false)} />}
      {showGameplan && <GameplanModal onClose={() => setShowGameplan(false)} />}
    </div>
  );
};
