import React from 'react';
import { useGame } from '../context/useGame';
import { CURRICULUM, CONCEPT_ES, ConceptId } from '../types/poker';
import { UNLOCK_N, UNLOCK_RATING } from '../utils/sessionPlanner';
import { Title } from '../components/ui';

const MATH: ConceptId[] = ['m_mdf', 'm_bluff', 'm_combos', 'm_equity', 'm_odds', 'm_outs', 'm_ev'];

/** Concept grid: every topic with its own rating; the current one is marked. */
export const TopicsView: React.FC<{ onStart: (c: ConceptId) => void }> = ({ onStart }) => {
  const { stats } = useGame();
  const tile = (c: ConceptId, i?: number) => {
    const r = stats.conceptRatings[c];
    const current = i === stats.curriculumIndex;
    const passed = r && r.r >= UNLOCK_RATING && r.n >= UNLOCK_N;
    return (
      <button
        key={c}
        onClick={() => onStart(c)}
        className={`topic-tile text-left rounded-[4px] border px-2.5 py-2 min-h-[56px] flex flex-col justify-between ${current ? 'border-acc bg-acc/10' : 'border-line bg-panel'}`}
      >
        <span className="text-[13px] text-hi leading-tight">{i !== undefined && <span className="text-dim num mr-1">{i + 1}</span>}{CONCEPT_ES[c]}</span>
        <span className="flex items-baseline justify-between">
          <span className="num text-[15px] font-semibold text-txt">{r ? Math.round(r.r) : '—'}</span>
          <span className="num text-[10px] text-dim">{passed ? '✓' : current ? 'ahora' : r ? `${Math.min(r.n, UNLOCK_N)}/${UNLOCK_N}` : ''}</span>
        </span>
      </button>
    );
  };
  return (
    <div className="space-y-3 animate-fadeIn">
      <div>
        <Title>Rangos → postflop</Title>
        <div className="grid grid-cols-2 gap-1.5">{CURRICULUM.map((c, i) => tile(c, i))}</div>
      </div>
      <div>
        <Title>Cálculo</Title>
        <div className="grid grid-cols-2 gap-1.5">{MATH.map(c => tile(c))}</div>
      </div>
    </div>
  );
};
