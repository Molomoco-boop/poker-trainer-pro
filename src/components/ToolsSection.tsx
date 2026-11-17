import React from 'react';
import { Grid, Percent, ChevronRight } from 'lucide-react';

interface ToolsSectionProps {
  onOpenRangeViewer: () => void;
  onOpenOddsCalculator: () => void;
}

export const ToolsSection: React.FC<ToolsSectionProps> = ({
  onOpenRangeViewer,
  onOpenOddsCalculator
}) => {
  return (
    <div className="space-y-2 mt-4">
      <div className="mb-2">
        <h2 className="text-base font-bold text-white tracking-tight">Tools</h2>
      </div>

      <div className="space-y-2.5">
        {/* Range Viewer */}
        <div
          onClick={onOpenRangeViewer}
          className="w-full bg-[#121929] hover:bg-[#162035] border border-slate-800/90 rounded-2xl p-4 flex items-center justify-between shadow-md transition-all active:scale-[0.99] cursor-pointer"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-blue-600/15 text-blue-400 shrink-0">
              <Grid className="w-5 h-5" />
            </div>

            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">Range Viewer</h3>
            </div>
          </div>

          <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
        </div>

        {/* Odds Calculator */}
        <div
          onClick={onOpenOddsCalculator}
          className="w-full bg-[#121929] hover:bg-[#162035] border border-slate-800/90 rounded-2xl p-4 flex items-center justify-between shadow-md transition-all active:scale-[0.99] cursor-pointer"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-blue-600/15 text-blue-400 shrink-0">
              <Percent className="w-5 h-5" />
            </div>

            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">Odds Calculator</h3>
            </div>
          </div>

          <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
        </div>
      </div>
    </div>
  );
};
