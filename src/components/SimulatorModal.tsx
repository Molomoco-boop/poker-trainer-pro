import React from 'react';
import { ArrowLeft, Sliders } from 'lucide-react';

interface SimulatorModalProps {
  onBack: () => void;
  onPractice: () => void;
  onPlay: () => void;
}

export const SimulatorModal: React.FC<SimulatorModalProps> = ({
  onBack,
  onPractice,
  onPlay
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#020b18] via-[#010813] to-black text-white flex flex-col justify-between p-4 relative overflow-hidden select-none">
      {/* Top back button */}
      <div className="pt-1">
        <button
          onClick={onBack}
          className="w-10 h-10 flex items-center justify-center text-white hover:text-slate-300"
        >
          <ArrowLeft className="w-6 h-6 stroke-[2.2]" />
        </button>
      </div>

      {/* Background Poker Table Outline with Seats */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
        <div className="w-[300px] h-[380px] rounded-full border-2 border-[#175eff] relative flex items-center justify-center">
          {/* Top Seat CO */}
          <div className="absolute top-2 w-12 h-12 rounded-full border border-[#175eff] flex items-center justify-center text-[10px] font-bold text-slate-300">
            CO
          </div>
          {/* Right Seat BTN */}
          <div className="absolute right-2 w-12 h-12 rounded-full border border-[#175eff] flex items-center justify-center text-[10px] font-bold text-slate-300">
            BTN
          </div>
          {/* Dealer button */}
          <div className="absolute right-16 top-28 w-5 h-5 rounded-full bg-yellow-500 text-black font-extrabold text-[9px] flex items-center justify-center">
            D
          </div>
          {/* Left Seat HJ */}
          <div className="absolute left-2 w-12 h-12 rounded-full border border-[#175eff] flex items-center justify-center text-[10px] font-bold text-slate-300">
            HJ
          </div>
          {/* Bottom Seat BB */}
          <div className="absolute bottom-2 w-12 h-12 rounded-full border border-[#175eff] flex items-center justify-center text-[10px] font-bold text-slate-300">
            BB
          </div>
        </div>
      </div>

      {/* Center Modal Card */}
      <div className="z-10 bg-[#121929]/95 backdrop-blur-md border border-slate-800 rounded-2xl p-5 shadow-2xl max-w-sm mx-auto w-full space-y-4">
        {/* Title & Subtitle */}
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-white hover:text-slate-300">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-base font-bold text-white">Poker Simulator</h2>
            <p className="text-xs text-slate-400">
              Play to track your score, or Practice with no time limit.
            </p>
          </div>
        </div>

        {/* Setup Info Box */}
        <div className="bg-[#0b101c] border border-slate-800 rounded-xl p-3 flex items-start gap-2.5">
          <Sliders className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
          <div className="text-xs">
            <div className="font-bold text-white">6-max · Cash - 100 bb GTO</div>
            <div className="text-[11px] text-slate-500">Change settings in Customize setup.</div>
          </div>
        </div>

        {/* Action Buttons: Practice (dark outline) & Play (blue solid) */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            onClick={onPractice}
            className="py-2.5 px-4 rounded-xl border border-slate-700 bg-[#172033] hover:bg-[#1f2b45] text-white font-bold text-xs transition-all active:scale-95"
          >
            Practice
          </button>
          <button
            onClick={onPlay}
            className="py-2.5 px-4 rounded-xl bg-[#175eff] hover:bg-[#2069ff] text-white font-bold text-xs transition-all active:scale-95 shadow-md shadow-blue-600/30"
          >
            Play
          </button>
        </div>
      </div>

      <div className="h-6" />
    </div>
  );
};
