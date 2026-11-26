import React, { useState } from 'react';
import { RangeViewerModal } from '../components/RangeViewerModal';
import { OddsCalculatorModal } from '../components/OddsCalculatorModal';
import { HandsTableModal } from '../components/HandsTableModal';
import { useGame } from '../context/useGame';
import { CURRICULUM } from '../types/poker';
import { Panel, Title } from '../components/ui';
import { ALL_MODES, TableMode } from '../utils/botProfiles';
import { ChevronRight } from 'lucide-react';
import { useI18n } from '../i18n';
import { conceptTitle } from '../i18n/concepts';

interface LobbyViewProps {
  onStartDaily: () => void;
  onStartRated: () => void;
  onStartCash: () => void;
  onStartPlacement: () => void;
  onStartSprint: () => void;
  onStartRangeBuilder: () => void;
  onOpenReview: () => void;
  onOpenFlops: () => void;
  tableMode: import('../utils/botProfiles').TableMode;
  onTableMode: (m: import('../utils/botProfiles').TableMode) => void;
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

export const LobbyView: React.FC<LobbyViewProps> = ({ onStartDaily, onStartRated, onStartCash, onStartPlacement, onStartSprint, onStartRangeBuilder, onOpenReview, onOpenFlops, tableMode, onTableMode }) => {
  const { stats } = useGame();
  const { t, lang } = useI18n();
  const [modal, setModal] = useState<'ranges' | 'odds' | 'hands' | null>(null);
  const daily = stats.dailyDrillCount || 0;
  const concept = CURRICULUM[Math.min(stats.curriculumIndex, CURRICULUM.length - 1)];
  const due = stats.mistakeQueue.filter(m => m.dueAt <= stats.totalHandsPlayed).length;
  const last = stats.ratingHistory.length > 1 ? stats.ratingHistory[stats.ratingHistory.length - 1] - stats.ratingHistory[Math.max(0, stats.ratingHistory.length - 11)] : 0;

  const modeTitle: Record<TableMode, string> = {
    regular: t.modeRegular,
    mixto: t.modeMixed,
    recreativo: t.modeRecreativo,
    nit: t.modeNit,
    maniac: t.modeManiac
  };
  const modeSub: Record<TableMode, string> = {
    regular: t.modeRegularSub,
    mixto: t.modeMixedSub,
    recreativo: t.modeRecreativoSub,
    nit: t.modeNitSub,
    maniac: t.modeManiacSub
  };

  return (
    <div className="lobby space-y-3 animate-fadeIn">
      <div className="flex items-end justify-between px-0.5 pt-1">
        <div>
          <div className="flex items-center gap-1.5 text-[12px] text-dim">
            <img src="/icon-32.png" alt="" width="16" height="16" className="rounded-[3px]" />
            {stats.username}
          </div>
          <div className="text-[11px] text-dim leading-none mb-0.5">{t.ratingYourLevel}</div>
          <div className="flex items-baseline gap-2">
            <span className="lobby-rating num text-[36px] leading-none font-semibold text-hi">{Math.round(stats.rating.r)}{stats.rating.rd > 110 ? '?' : ''}</span>
            {last !== 0 && <span className={`num text-[14px] font-semibold ${last > 0 ? 'text-goodtx' : 'text-badtx'}`}>{last > 0 ? '+' : '−'}{Math.abs(last)} <span className="text-[11px] font-normal text-dim">{t.recent}</span></span>}
          </div>
        </div>
        <div className="text-right num text-[12px] text-dim leading-tight">
          <div>{t.streak} <span className="text-hi">{stats.consecutiveCorrect}</span></div>
          <div>{t.days} <span className="text-hi">{stats.dayStreak}</span></div>
        </div>
      </div>

      <Panel className="overflow-hidden">
        {!stats.placementDone && (
          <Row cls="placement-row" accent title={t.placementTest} sub={t.placementSub} onClick={onStartPlacement} />
        )}
        <Row
          cls="daily-row"
          title={t.dailySession}
          sub={daily >= 10 ? t.doneToday : `${conceptTitle(concept, lang)} · ${t.dailyMixSub}`}
          right={<span className="num text-[13px] text-txt">{Math.min(daily, 10)}/10</span>}
          onClick={onStartDaily}
        />
        <Row cls="cash-row" title={t.playCash} sub={`${t.sixMaxTable} · ${modeTitle[tableMode]} · ${modeSub[tableMode]}`} right={due ? <span className="num text-[12px] text-warn">{due} {t.repShort}</span> : undefined} onClick={onStartCash} />
        <div className="profile-picker flex flex-wrap gap-1 px-3 py-2 border-b border-line">
          {ALL_MODES.map(m => (
            <button
              key={m}
              type="button"
              className={`profile-chip h-8 px-2 rounded-[4px] text-[11px] font-semibold border ${tableMode === m ? 'bg-acc text-white border-acc' : 'border-line text-txt'}`}
              data-mode={m}
              onClick={e => { e.stopPropagation(); onTableMode(m); }}
            >
              {modeTitle[m]}
            </button>
          ))}
        </div>
        <Row cls="review-row" title={t.handReview} sub={t.handReviewSub} onClick={onOpenReview} />
        <Row cls="flops-row" title={t.flopReports} sub={t.flopReportsSub} onClick={onOpenFlops} />
        <Row cls="rated-row" title={t.spots} sub={t.spotsSub} onClick={onStartRated} />
        <Row cls="sprint-row" title={t.open60s} sub={t.open60sSub} right={<span className="num text-[13px] text-txt">{stats.sprintBest}</span>} onClick={onStartSprint} />
        <Row cls="builder-row" title={t.buildRange} sub={t.buildRangeSub} onClick={onStartRangeBuilder} />
      </Panel>

      <div>
        <Title>{t.tools}</Title>
        <div className="grid grid-cols-3 gap-1.5">
          {([['ranges', t.ranges], ['hands', t.hands], ['odds', t.calculator]] as const).map(([id, label]) => (
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
