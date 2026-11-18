import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { HandStep, MistakeRecord, SessionSpec, Grade, CONCEPT_ES, ConceptId, CURRICULUM } from '../types/poker';
import {
  generateRatedHand,
  generateConceptStep,
  generateLeakStep,
  generateSimilarStep,
  conceptOfKey,
  rememberWhy
} from '../utils/fullHandEngine';
import { levelForRating } from '../utils/rating';
import { dailyPlan, PLACEMENT, placementCurriculum, REVIEW_GAP, weakestConcepts, DailySlot, UNLOCK_N } from '../utils/sessionPlanner';
import { useGame } from '../context/useGame';
import { PokerTable, RangeRequest } from '../components/PokerTable';
import { RangeViewerModal } from '../components/RangeViewerModal';
import { Panel, Delta, BtnPrimary } from '../components/ui';
import { playCardSound } from '../utils/audio';
import { useBackLayer } from '../navigation/BackProvider';

interface PracticeViewProps {
  session: SessionSpec;
  onExit: () => void;
}

/** Time a correct answer stays on screen so the why line can be read. */
const AUTO_ADVANCE_MS = 3500;
const MATH_MIX: ConceptId[] = ['m_mdf', 'm_bluff', 'm_combos', 'm_equity'];

const STREET_ES: Record<string, string> = { preflop: 'Preflop', flop: 'Flop', turn: 'Turn', river: 'River' };

function sessionTitle(s: SessionSpec): string {
  switch (s.kind) {
    case 'rated': return 'Decisiones';
    case 'cash': return 'Mesa';
    case 'daily': return 'Sesión diaria';
    case 'placement': return 'Test de nivel';
    case 'concept': return CONCEPT_ES[s.concept];
    case 'leak': return `${s.pos} · ${STREET_ES[s.street]}`;
  }
}

export const PracticeView: React.FC<PracticeViewProps> = ({ session, onExit }) => {
  const { stats, recordStepAnswer, toggleDisplayUnits, markDoubt, finishPlacement } = useGame();
  const statsRef = useRef(stats);
  useEffect(() => { statsRef.current = stats; }, [stats]);

  const startDaily = useRef(stats.dailyDrillCount);
  const plan = useMemo<DailySlot[] | null>(() => (session.kind === 'daily' ? dailyPlan(stats.curriculumIndex, stats.conceptRatings) : null),
    // the plan is fixed for the whole session
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []);
  const total = session.kind === 'daily' ? 10 : session.kind === 'placement' ? PLACEMENT.length : 0;

  /** A due review allowed now (at most one every REVIEW_GAP decisions unless forced). */
  const dueReview = useCallback((filter: (m: MistakeRecord) => boolean, force = false): HandStep | null => {
    const st = statsRef.current;
    if (!force && st.totalHandsPlayed - st.lastReviewAt < REVIEW_GAP) return null;
    const due = [...st.mistakeQueue].filter(m => m.key && m.dueAt <= st.totalHandsPlayed && filter(m)).sort((a, b) => a.dueAt - b.dueAt)[0];
    if (!due) return null;
    const s = generateSimilarStep(due.key, levelForRating(st.rating.r));
    return { ...s, isReviewOfMistake: true, reviewOf: due.id };
  }, []);

  const makeStep = useCallback((i: number): HandStep => {
    const st = statsRef.current;
    const r = st.rating.r;
    const cr = (c: ConceptId) => st.conceptRatings[c]?.r ?? r;
    switch (session.kind) {
      case 'rated': {
        const rev = dueReview(() => true);
        if (rev) return rev;
        if (Math.random() < 0.12) {
          const c = MATH_MIX[Math.floor(Math.random() * MATH_MIX.length)];
          return generateConceptStep(c, r);
        }
        return generateRatedHand(r, { positions: st.preferences.trainingPositions }).steps[0];
      }
      case 'cash':
        return generateRatedHand(r, { positions: st.preferences.trainingPositions }).steps[0];
      case 'placement':
        return generateConceptStep(PLACEMENT[Math.min(i, PLACEMENT.length - 1)], r);
      case 'concept': {
        const rev = dueReview(m => conceptOfKey(m.key) === session.concept);
        return rev || generateConceptStep(session.concept, cr(session.concept));
      }
      case 'leak':
        return generateLeakStep(session.pos, session.street, r);
      case 'daily': {
        const slot = plan![Math.min(i + startDaily.current, 9)];
        if (slot.kind === 'review') {
          const rev = dueReview(() => true, true);
          if (rev) return rev;
          const weak = weakestConcepts(st.conceptRatings, CURRICULUM.slice(0, st.curriculumIndex + 1))[0];
          return generateConceptStep(weak, cr(weak));
        }
        return generateConceptStep(slot.concept, cr(slot.concept));
      }
    }
  }, [session, plan, dueReview]);

  const [step, setStep] = useState<HandStep>(() => makeStep(0));
  const [answered, setAnswered] = useState(0);
  const [nextInHand, setNextInHand] = useState<HandStep | null>(null);
  const [endNote, setEndNote] = useState<string | undefined>(undefined);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [delta, setDelta] = useState<number | null>(null);
  const [fastError, setFastError] = useState(false);
  const [doubted, setDoubted] = useState(false);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [results, setResults] = useState<{ concept: ConceptId; ok: boolean }[]>([]);
  const [rangeRequest, setRangeRequest] = useState<RangeRequest | null>(null);
  const shownAt = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRating = useRef(Math.round(stats.rating.r));
  const [hideEnd, setHideEnd] = useState(false);

  const done = total > 0 && answered >= total - (session.kind === 'daily' ? startDaily.current : 0) && !isSubmitted;
  useBackLayer(done && !hideEnd, () => setHideEnd(true));

  const { soundEnabled, volume } = stats.preferences;
  useEffect(() => {
    shownAt.current = Date.now();
    rememberWhy(step.why);
    if (soundEnabled) playCardSound(volume);
  }, [step.id, step.why, soundEnabled, volume]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const placementSaved = useRef(false);
  useEffect(() => {
    if (done && session.kind === 'placement' && !placementSaved.current) {
      placementSaved.current = true;
      finishPlacement(placementCurriculum(results));
    }
  }, [done, session.kind, results, finishPlacement]);

  const advance = useCallback(() => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    setSelectedOptionId(null);
    setIsSubmitted(false);
    setEndNote(undefined);
    setFastError(false);
    setDoubted(false);
    if (nextInHand) {
      setStep(nextInHand);
      setNextInHand(null);
      return;
    }
    // session finished: keep the last step, the summary covers the screen
    if (total > 0 && answered >= total - (session.kind === 'daily' ? startDaily.current : 0)) return;
    setStep(makeStep(answered));
  }, [nextInHand, makeStep, answered, total, session.kind]);

  const advanceRef = useRef(advance);
  useEffect(() => { advanceRef.current = advance; }, [advance]);

  const handleSelect = (optId: string) => {
    if (isSubmitted || done) return;
    const ms = Date.now() - shownAt.current;
    setSelectedOptionId(optId);
    setIsSubmitted(true);
    const res = recordStepAnswer(step, optId, { ms, daily: session.kind === 'daily' });
    setDelta(res.delta);
    setGrades(g => [res.grade, ...g].slice(0, 12));
    setAnswered(a => a + 1);
    setResults(r => [...r, { concept: step.concept, ok: res.isCorrect }]);
    setFastError(!res.isCorrect && res.confidence === 'fast');
    if (res.isCorrect && step.advance && session.kind === 'rated') {
      const nx = step.advance(optId);
      setNextInHand(nx.next);
      setEndNote(nx.note);
    } else {
      setNextInHand(null);
    }
    if (res.isCorrect) timer.current = setTimeout(() => advanceRef.current(), AUTO_ADVANCE_MS);
  };

  const handleDoubt = () => {
    if (doubted) return;
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    setDoubted(true);
    markDoubt(step);
  };

  const progress = total ? ` ${Math.min(answered + (session.kind === 'daily' ? startDaily.current : 0) + (isSubmitted ? 0 : 1), total)}/${total}` : '';
  const curConcept = CURRICULUM[Math.min(stats.curriculumIndex, CURRICULUM.length - 1)];
  const curR = stats.conceptRatings[curConcept];
  const dueTomorrow = stats.mistakeQueue.length;

  return (
    <>
      <PokerTable
        step={step}
        endNote={endNote}
        stake={stats.stake}
        displayUnits={stats.preferences.displayUnits}
        deckColorMode={stats.preferences.deckColorMode}
        selectedOptionId={selectedOptionId}
        isSubmitted={isSubmitted}
        rating={Math.round(stats.rating.r)}
        delta={isSubmitted ? delta : null}
        streak={stats.consecutiveCorrect}
        title={`${sessionTitle(session)}${progress}`}
        recentGrades={grades}
        fastError={fastError}
        doubted={doubted}
        onDoubt={handleDoubt}
        onSelectOption={handleSelect}
        onNext={advance}
        onHold={() => { if (timer.current) { clearTimeout(timer.current); timer.current = null; } }}
        onBack={onExit}
        onToggleUnits={toggleDisplayUnits}
        onOpenRangeViewer={req => setRangeRequest(req)}
      />

      {done && !hideEnd && (
        <div className="session-end fixed inset-0 z-[70] bg-bg flex items-center justify-center p-4">
          <Panel className="w-full max-w-xs p-4 flex flex-col gap-3">
            <span className="text-[13px] text-dim uppercase tracking-[0.08em]">{session.kind === 'placement' ? 'Test terminado' : 'Sesión diaria hecha'}</span>
            <div className="flex items-baseline gap-2">
              <span className="num text-[40px] leading-none font-semibold text-hi">{Math.round(stats.rating.r)}</span>
              <Delta value={Math.round(stats.rating.r) - startRating.current} className="text-[18px]" />
            </div>
            <div className="text-[14px] text-txt num">{results.filter(r => r.ok).length}/{results.length} correctas</div>
            {session.kind === 'placement' ? (
              <div className="text-[14px] text-hi">Empiezas en: <b>{CONCEPT_ES[CURRICULUM[placementCurriculum(results)]]}</b></div>
            ) : (
              <div className="text-[13px] text-txt space-y-0.5">
                <div>Tema: <span className="text-hi">{CONCEPT_ES[curConcept]}</span> <span className="num">{Math.round(curR?.r ?? 1500)} · {Math.min(curR?.n ?? 0, UNLOCK_N)}/{UNLOCK_N}</span></div>
                <div className="num">Repasos pendientes: {dueTomorrow}</div>
              </div>
            )}
            <div className="flex gap-2">
              <BtnPrimary onClick={onExit} className="flex-1">Inicio</BtnPrimary>
            </div>
          </Panel>
        </div>
      )}

      {rangeRequest && (
        <RangeViewerModal
          onClose={() => setRangeRequest(null)}
          highlightHand={rangeRequest.hand}
          initialSituation={rangeRequest.situation}
          initialPosition={rangeRequest.position}
          initialOpener={rangeRequest.opener}
        />
      )}
    </>
  );
};
