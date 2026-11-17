import React from 'react';
import { Grid, Percent } from 'lucide-react';

interface ToolsSectionProps {
  onOpenRangeViewer: () => void;
  onOpenOddsCalculator: () => void;
}

export const ToolsSection: React.FC<ToolsSectionProps> = ({ onOpenRangeViewer, onOpenOddsCalculator }) => {
  const tools = [
    { title: 'Rangos', icon: Grid, onClick: onOpenRangeViewer },
    { title: 'Calculadora', icon: Percent, onClick: onOpenOddsCalculator }
  ];
  return (
    <div className="space-y-2">
      <h2 className="text-base font-bold text-white tracking-tight">Herramientas</h2>
      <div className="grid grid-cols-2 gap-2">
        {tools.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.title}
              onClick={t.onClick}
              className="bg-[#121929] hover:bg-[#162035] border border-slate-800/90 rounded-2xl px-3 py-3 flex items-center gap-2.5 shadow-sm transition-all active:scale-[0.99]"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-600/15 text-blue-400 shrink-0">
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white tracking-wide">{t.title}</h3>
            </button>
          );
        })}
      </div>
    </div>
  );
};
