import React from 'react';
import { Grid, Percent, ListOrdered } from 'lucide-react';

interface ToolsSectionProps {
  onOpenRangeViewer: () => void;
  onOpenOddsCalculator: () => void;
  onOpenHandsTable: () => void;
}

export const ToolsSection: React.FC<ToolsSectionProps> = ({ onOpenRangeViewer, onOpenOddsCalculator, onOpenHandsTable }) => {
  const tools = [
    { title: 'Rangos', icon: Grid, onClick: onOpenRangeViewer },
    { title: 'Calculadora', icon: Percent, onClick: onOpenOddsCalculator },
    { title: 'Manos', icon: ListOrdered, onClick: onOpenHandsTable }
  ];
  return (
    <div className="space-y-2">
      <h2 className="text-base font-bold text-white tracking-tight">Herramientas</h2>
      <div className="grid grid-cols-3 gap-2">
        {tools.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.title}
              onClick={t.onClick}
              className="tool-card bg-[#121929] hover:bg-[#162035] border border-slate-800/90 rounded-2xl px-1 py-2.5 flex flex-col items-center gap-1.5 shadow-sm transition-all active:scale-[0.99]"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-600/15 text-blue-400 shrink-0">
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="text-[13px] font-bold text-white tracking-wide">{t.title}</h3>
            </button>
          );
        })}
      </div>
    </div>
  );
};
