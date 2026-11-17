import React, { useState } from 'react';
import { X, RotateCcw, Play, Check, Edit3, Eye } from 'lucide-react';
import {
  GTO_PREFLOP_SOLUTIONS,
  RANKS_ORDER,
  getHandLabel,
  getPositionStats,
  HandFrequency
} from '../data/preflopRanges';

interface RangeViewerModalProps {
  onClose: () => void;
  highlightHand?: string;
  onPracticeRange?: (situation: string, position: string) => void;
}

export const RangeViewerModal: React.FC<RangeViewerModalProps> = ({
  onClose,
  highlightHand,
  onPracticeRange
}) => {
  const [situation, setSituation] = useState<'RFI' | 'VS_OPEN' | 'VS_3BET' | 'BB_DEFENSE'>('RFI');
  const [position, setPosition] = useState<string>('BTN');
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [customEdits, setCustomEdits] = useState<Record<string, HandFrequency>>({});

  const situations: { id: 'RFI' | 'VS_OPEN' | 'VS_3BET' | 'BB_DEFENSE'; label: string }[] = [
    { id: 'RFI', label: 'Open Raise (RFI)' },
    { id: 'VS_OPEN', label: 'Vs Open (3-Bet/Call)' },
    { id: 'VS_3BET', label: 'Vs 3-Bet' },
    { id: 'BB_DEFENSE', label: 'Defensa BB' }
  ];

  const positions = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];

  const currentMatrix = GTO_PREFLOP_SOLUTIONS[situation]?.[position] || GTO_PREFLOP_SOLUTIONS.RFI.BTN;
  const stats = getPositionStats(position, situation);

  const handleCellClick = (hand: string) => {
    if (!isEditMode) return;
    setCustomEdits(prev => {
      const cur = prev[hand] || currentMatrix[hand] || { raise: 0, call: 0, fold: 100 };
      // Cycle: Fold -> Raise -> Call -> Fold
      let next: HandFrequency;
      if (cur.raise > 50) {
        next = { raise: 0, call: 100, fold: 0 };
      } else if (cur.call > 50) {
        next = { raise: 0, call: 0, fold: 100 };
      } else {
        next = { raise: 100, call: 0, fold: 0 };
      }
      return { ...prev, [hand]: next };
    });
  };

  const resetRange = () => {
    setCustomEdits({});
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col justify-between p-2 select-none animate-fadeIn font-sans">
      
      {/* Top Header */}
      <div className="w-full bg-[#0F172A] border border-slate-800 rounded-2xl p-3 flex flex-col gap-2 shadow-xl shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-[800] text-white">Range Viewer (6-Max GTO)</h2>
            <p className="text-[11px] text-slate-400">
              {stats.percentage}% de manos en rango ({stats.count} combos)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditMode(!isEditMode)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all flex items-center gap-1 ${
                isEditMode
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              {isEditMode ? <Edit3 className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{isEditMode ? 'Editando' : 'Consulta'}</span>
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Row 1 Filter: Situation */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          {situations.map(s => (
            <button
              key={s.id}
              onClick={() => { setSituation(s.id); setCustomEdits({}); }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition-all border ${
                situation === s.id
                  ? 'bg-blue-600 border-blue-400 text-white shadow-md'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Row 2 Filter: Position */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          {positions.map(p => (
            <button
              key={p}
              onClick={() => { setPosition(p); setCustomEdits({}); }}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold shrink-0 transition-all border ${
                position === p
                  ? 'bg-indigo-600 border-indigo-400 text-white shadow-md'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {p}
            </button>
          ))}

          {isEditMode && (
            <button
              onClick={resetRange}
              className="ml-auto p-1 text-slate-400 hover:text-white"
              title="Resetear a GTO"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 13x13 Matrix Grid (Full Width Mobile) */}
      <div className="flex-1 w-full my-2 flex items-center justify-center overflow-hidden">
        <div className="w-full max-w-[390px] aspect-square grid grid-cols-13 gap-[1.5px] p-1 bg-[#090E17] border border-slate-800 rounded-xl shadow-2xl">
          {Array.from({ length: 13 }).map((_, r) =>
            Array.from({ length: 13 }).map((_, c) => {
              const hand = getHandLabel(r, c);
              const freq = customEdits[hand] || currentMatrix[hand] || { raise: 0, call: 0, fold: 100 };
              const isHighlighted = highlightHand && highlightHand.toUpperCase() === hand.toUpperCase();

              // Bar percentages inside cell
              const raisePct = freq.raise;
              const callPct = freq.call;
              const foldPct = freq.fold;

              return (
                <div
                  key={hand}
                  onClick={() => handleCellClick(hand)}
                  className={`relative rounded-[2px] overflow-hidden flex items-center justify-center cursor-pointer transition-all ${
                    isHighlighted ? 'ring-2 ring-yellow-400 z-20 scale-110 shadow-lg' : ''
                  }`}
                  style={{
                    backgroundColor: '#1E293B'
                  }}
                  title={`${hand}: Raise ${raisePct}%, Call ${callPct}%, Fold ${foldPct}%`}
                >
                  {/* Mixed frequency proportional vertical bars */}
                  <div className="absolute inset-0 flex">
                    {raisePct > 0 && (
                      <div
                        style={{ width: `${raisePct}%` }}
                        className="h-full bg-blue-600"
                      />
                    )}
                    {callPct > 0 && (
                      <div
                        style={{ width: `${callPct}%` }}
                        className="h-full bg-emerald-600"
                      />
                    )}
                    {foldPct > 0 && (
                      <div
                        style={{ width: `${foldPct}%` }}
                        className="h-full bg-slate-800/90"
                      />
                    )}
                  </div>

                  {/* Hand Label */}
                  <span
                    className={`relative z-10 text-[8.5px] sm:text-[9.5px] font-[800] leading-none tracking-tighter ${
                      isHighlighted
                        ? 'text-yellow-300 font-black'
                        : raisePct > 0 || callPct > 0
                        ? 'text-white'
                        : 'text-slate-400 opacity-60'
                    }`}
                  >
                    {hand}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Bottom Controls & Legend */}
      <div className="w-full bg-[#0F172A] border border-slate-800 rounded-2xl p-2.5 flex items-center justify-between shrink-0 shadow-lg">
        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px] font-semibold">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-blue-600" />
            <span className="text-slate-300">Raise / 3-Bet</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-emerald-600" />
            <span className="text-slate-300">Call</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-slate-800" />
            <span className="text-slate-400">Fold</span>
          </div>
        </div>

        {/* Practice Range button */}
        {onPracticeRange && (
          <button
            onClick={() => onPracticeRange(situation, position)}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-[800] text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow-md shadow-blue-600/30"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>Practicar</span>
          </button>
        )}
      </div>
    </div>
  );
};
