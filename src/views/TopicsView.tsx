import React, { useState } from 'react';
import { useGame } from '../context/useGame';
import { CURRICULUM, CONCEPT_ES, CONCEPT_DESC, ConceptId } from '../types/poker';
import { UNLOCK_N, UNLOCK_RATING } from '../utils/sessionPlanner';
import { Title } from '../components/ui';
import { useBackLayer } from '../navigation/BackProvider';

const MATH: ConceptId[] = ['m_mdf', 'm_bluff', 'm_combos', 'm_equity', 'm_odds', 'm_outs', 'm_ev'];

/** Concept grid: every topic with its own rating; the flip button shows what each topic is. */
export const TopicsView: React.FC<{ onStart: (c: ConceptId) => void }> = ({ onStart }) => {
  const { stats } = useGame();
  const [flipped, setFlipped] = useState(false);
  useBackLayer(flipped, () => setFlipped(false));
  const tile = (c: ConceptId, i?: number) => {
    const r = stats.conceptRatings[c];
    const current = i === stats.curriculumIndex;
    const passed = r && r.r >= UNLOCK_RATING && r.n >= UNLOCK_N;
    const face = `absolute inset-0 rounded-[4px] border px-2.5 py-1.5 flex flex-col [backface-visibility:hidden] ${current ? 'border-acc bg-[#1f2a36]' : 'border-line bg-panel'}`;
    return (
      <button key={c} onClick={() => onStart(c)} className="topic-tile relative h-[54px] text-left [perspective:600px]" aria-label={CONCEPT_ES[c]}>
        <span className={`topic-inner absolute inset-0 transition-transform duration-500 ease-out [transform-style:preserve-3d] ${flipped ? '[transform:rotateY(180deg)]' : ''}`}>
          <span className={`${face} justify-between`}>
            <span className="text-[13px] text-hi leading-tight truncate">{i !== undefined && <span className="text-dim num mr-1">{i + 1}</span>}{CONCEPT_ES[c]}</span>
            <span className="flex items-baseline justify-between">
              <span className="num text-[15px] font-semibold text-txt">{r ? Math.round(r.r) : '—'}</span>
              <span className="num text-[10px] text-dim">{passed ? '✓' : current ? 'now' : r ? `${Math.min(r.n, UNLOCK_N)}/${UNLOCK_N}` : ''}</span>
            </span>
          </span>
          <span className={`topic-back ${face} justify-center [transform:rotateY(180deg)]`}>
            <span className="text-[11.5px] leading-[1.3] text-hi line-clamp-2">{CONCEPT_DESC[c]}</span>
          </span>
        </span>
      </button>
    );
  };
  return (
    <div className="space-y-2 animate-fadeIn">
      <button
        onClick={() => setFlipped(f => !f)}
        className="flip-topics w-full h-10 rounded-[4px] border border-line bg-panel text-[13px] font-semibold text-txt"
      >
        {flipped ? 'See your level in each topic' : 'What is each topic?'}
      </button>
      <div>
        <Title>Ranges → postflop</Title>
        <div className="grid grid-cols-2 gap-1.5">{CURRICULUM.map((c, i) => tile(c, i))}</div>
      </div>
      <div>
        <Title>Math</Title>
        <div className="grid grid-cols-2 gap-1.5">{MATH.map(c => tile(c))}</div>
      </div>
    </div>
  );
};
