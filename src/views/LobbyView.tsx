import React, { useState } from 'react';
import { RangeViewerModal } from '../components/RangeViewerModal';
import { OddsCalculatorModal } from '../components/OddsCalculatorModal';
import { HandsTableModal } from '../components/HandsTableModal';
import { useGame } from '../context/useGame';
import { CONCEPT_ES, CURRICULUM } from '../types/poker';
import { Panel, Title } from '../components/ui';
import { ChevronRight } from 'lucide-react';

interface LobbyViewProps {
  onStartDaily: () => void;
  onStartRated: () => void;
  onStartPlacement: () => void;
  onStartSprint: () => void;
  onStartRangeBuilder: () => void;
}

const Row: React.FC<{ title: string; sub: string; right?: React.ReactNode; onClick: () => void; accent?: boolean; cls?: string }> = ({ title, sub, right, onClick, accent, cls = '' }) => (
  <button onClick={onClick} className={`${cls} w-full text-left flex items-center gap-3 px-3 min-h-[60px] border-b border-line last:border-b-0 active:bg-panel2 ${accent ? 'bg-good/10' : ''}`}>
    <div className="flex-1 min-w-0">
      <div className={`text-[15px] font-semibold ${accent ? 'text-goodtx' : 'text-hi'}`}>{title}</div>
      <div className="text-[12px] text-dim truncate">{sub}</div>
    </div>
    {right}
    <ChevronRight className="w-4 h-4 text-dim shrink-0" />
  </button>
);

export const LobbyView: React.FC<LobbyViewProps> = ({ onStartDaily, onStartRated, onStartPlacement, onStartSprint, onStartRangeBuilder }) => {
  const { stats } = useGame();
  const [modal, setModal] = useState<'ranges' | 'odds' | 'hands' | null>(null);
  const daily = stats.dailyDrillCount || 0;
  const concept = CURRICULUM[Math.min(stats.curriculumIndex, CURRICULUM.length - 1)];
  const due = stats.mistakeQueue.filter(m => m.dueAt <= stats.totalHandsPlayed).length;
  const last = stats.ratingHistory.length > 1 ? stats.ratingHistory[stats.ratingHistory.length - 1] - stats.ratingHistory[Math.max(0, stats.ratingHistory.length - 11)] : 0;

  return (
    <div className="lobby space-y-3 animate-fadeIn">
      <div className="flex items-end justify-between px-0.5 pt-1">
        <div>
          <div className="text-[12px] text-dim">{stats.username}</div>
          <div className="flex items-baseline gap-2">
            <span className="lobby-rating num text-[36px] leading-none font-semibold text-hi">{Math.round(stats.rating.r)}{stats.rating.rd > 110 ? '?' : ''}</span>
            {last !== 0 && <span className={`num text-[14px] font-semibold ${last > 0 ? 'text-goodtx' : 'text-badtx'}`}>{last > 0 ? '+' : '−'}{Math.abs(last)}</span>}
          </div>
        </div>
        <div className="text-right num text-[12px] text-dim leading-tight">
          <div>Racha <span className="text-hi">{stats.consecutiveCorrect}</span></div>
          <div>Días <span className="text-hi">{stats.dayStreak}</span></div>
        </div>
      </div>

      <Panel className="overflow-hidden">
        {!stats.placementDone && (
          <Row cls="placement-row" accent title="Test de nivel" sub="12 spots · fija tu rating y tu punto de partida" onClick={onStartPlacement} />
        )}
        <Row
          cls="daily-row"
          title="Sesión diaria"
          sub={daily >= 10 ? 'Hecha hoy' : `${CONCEPT_ES[concept]} · 4 tema + 3 repaso + 3 mezcla`}
          right={<span className="num text-[13px] text-txt">{Math.min(daily, 10)}/10</span>}
          onClick={onStartDaily}
        />
        <Row cls="rated-row" title="Jugar" sub="Manos completas a tu nivel · puntúa" right={due ? <span className="num text-[12px] text-warn">{due} rep.</span> : undefined} onClick={onStartRated} />
        <Row cls="sprint-row" title="¿Abre? 60 s" sub="Open o fold, tres fallos y fuera" right={<span className="num text-[13px] text-txt">{stats.sprintBest}</span>} onClick={onStartSprint} />
        <Row cls="builder-row" title="Construir rango" sub="Pinta el rango de memoria" onClick={onStartRangeBuilder} />
      </Panel>

      <div>
        <Title>Herramientas</Title>
        <div className="grid grid-cols-3 gap-1.5">
          {([['ranges', 'Rangos'], ['hands', 'Manos'], ['odds', 'Calculadora']] as const).map(([id, label]) => (
            <button key={id} onClick={() => setModal(id)} className="tool-card h-11 rounded-[4px] bg-panel border border-line text-[13px] font-semibold text-hi active:bg-panel2">
              {label}
            </button>
          ))}
        </div>
      </div>

      {modal === 'ranges' && <RangeViewerModal onClose={() => setModal(null)} />}
      {modal === 'odds' && <OddsCalculatorModal onClose={() => setModal(null)} />}
      {modal === 'hands' && <HandsTableModal onClose={() => setModal(null)} />}
    </div>
  );
};
