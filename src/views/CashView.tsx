import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useGame } from '../context/useGame';
import { PokerTable, RangeRequest } from '../components/PokerTable';
import { RangeViewerModal } from '../components/RangeViewerModal';
import { BtnPrimary, Delta } from '../components/ui';
import { useBackLayer } from '../navigation/BackProvider';
import { newCashTable, startHand, applyHeroAction, heroDelta, posOf, CashRun, CashTable } from '../utils/cashTable';
import { r1 } from '../utils/actionModel';
import { Grade } from '../types/poker';
import { assignProfiles, TableMode } from '../utils/botProfiles';
import { pushHand, newHandId, ReviewDecision } from '../utils/handHistory';

/** Same timing as Spots: correct answers auto-advance after the countdown. */
const AUTO_ADVANCE_MS = 3500;

/**
 * Live 6-max cash. Hero feedback is frozen on the decision that was just played;
 * the hand only continues once that feedback is dismissed.
 */
export const CashView: React.FC<{ onExit: () => void; mode?: TableMode }> = ({ onExit, mode = 'regular' }) => {
  const { stats, recordStepAnswer, toggleDisplayUnits, markDoubt } = useGame();
  const tableRef = useRef<CashTable>(newCashTable());
  const profilesRef = useRef(assignProfiles(mode));
  const [run, setRun] = useState<CashRun>(() => startHand(tableRef.current, profilesRef.current));
  const runRef = useRef(run);
  runRef.current = run;
  const decisionsRef = useRef<ReviewDecision[]>([]);
  const savedKey = useRef<string | null>(null);

  const persistHand = (current: CashRun) => {
    if (!current.award) return;
    const key = `${current.table.handNo}:${current.award.text}`;
    if (savedKey.current === key) return;
    savedKey.current = key;
    pushHand({
      id: newHandId(),
      ts: Date.now(),
      handNo: current.table.handNo,
      heroPos: posOf(0, current.buttonSeat),
      heroCards: current.seats[0].cards,
      board: current.board.slice(),
      actions: (current.log || []).slice(),
      decisions: decisionsRef.current.slice(),
      awardText: current.award.text,
      delta: current.award.delta,
      profiles: (current.profiles || []).slice(),
      stacksAfter: current.table.stacks.slice()
    });
  };

  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [delta, setDelta] = useState<number | null>(null);
  const [doubted, setDoubted] = useState(false);
  const [fastError, setFastError] = useState(false);
  const [rangeRequest, setRangeRequest] = useState<RangeRequest | null>(null);
  const [recentGrades, setRecentGrades] = useState<Grade[]>([]);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shownAt = useRef(Date.now());
  const pendingAction = useRef<string | null>(null);
  const pendingStepId = useRef<string | null>(null);
  const committing = useRef(false);

  const clearTimer = () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
  };

  const resetFeedback = () => {
    pendingAction.current = null;
    pendingStepId.current = null;
    setSelectedOptionId(null);
    setIsSubmitted(false);
    setDelta(null);
    setDoubted(false);
    setFastError(false);
    setRangeRequest(null);
  };

  /** Apply the queued hero action and reveal whatever comes next (next decision or showdown). */
  const commitAction = useCallback(() => {
    if (committing.current) return;
    const optId = pendingAction.current;
    const stepId = pendingStepId.current;
    const current = runRef.current;
    if (!optId || !current.step || current.step.id !== stepId) return;
    if (!current.awaitingHero) return;
    committing.current = true;
    clearTimer();
    pendingAction.current = null;
    pendingStepId.current = null;
    const next = applyHeroAction(current, optId);
    setSelectedOptionId(null);
    setIsSubmitted(false);
    setDelta(null);
    setDoubted(false);
    setFastError(false);
    setRangeRequest(null);
    runRef.current = next;
    setRun({ ...next });
    committing.current = false;
    if (next.award) persistHand(next);
  }, []);

  const nextHand = useCallback(() => {
    if (committing.current) return;
    clearTimer();
    resetFeedback();
    persistHand(runRef.current);
    const table = runRef.current.table;
    tableRef.current = table;
    decisionsRef.current = [];
    savedKey.current = null;
    const next = startHand(table, profilesRef.current);
    runRef.current = next;
    setRun({ ...next });
    if (next.award) persistHand(next);
  }, []);

  useEffect(() => () => clearTimer(), []);
  useEffect(() => { shownAt.current = Date.now(); }, [run.step?.id]);
  useEffect(() => {
    if (run.award && !isSubmitted) persistHand(run);
  }, [run, isSubmitted]);


  const award = run.award;
  const showingFeedback = isSubmitted && !award;
  // Back: close feedback (and play the chosen action), then close showdown, then exit (App layer).
  useBackLayer(showingFeedback, commitAction);
  useBackLayer(!!award && !isSubmitted, nextHand);

  const handleSelect = (optId: string) => {
    const current = runRef.current;
    if (isSubmitted || current.award || !current.step || !current.awaitingHero || committing.current) return;
    if (pendingAction.current) return;
    clearTimer();
    pendingAction.current = optId;
    pendingStepId.current = current.step.id;
    setSelectedOptionId(optId);
    setIsSubmitted(true);
    const ms = Date.now() - shownAt.current;
    const res = recordStepAnswer(current.step, optId, { ms });
    setDelta(res.delta);
    setFastError(!res.isCorrect && res.confidence === 'fast');
    if (res.grade) setRecentGrades(g => [...g, res.grade].slice(-12));
    const st = current.step;
    decisionsRef.current.push({
      street: st.street,
      stepId: st.id,
      pot: st.pot,
      board: st.communityCards.slice(),
      ticker: st.actionTicker,
      notice: st.contextNotice,
      selectedId: optId,
      grade: res.grade,
      doubted: false,
      why: st.why,
      options: st.options,
      players: st.players
    });
    if (res.isCorrect) {
      timer.current = setTimeout(() => commitAction(), AUTO_ADVANCE_MS);
    }
  };

  const handleDoubt = () => {
    if (doubted || !runRef.current.step) return;
    clearTimer();
    setDoubted(true);
    markDoubt(runRef.current.step);
    const last = decisionsRef.current[decisionsRef.current.length - 1];
    if (last) last.doubted = true;
  };

  const handleBack = () => {
    if (rangeRequest) { setRangeRequest(null); return; }
    if (showingFeedback) { commitAction(); return; }
    if (award) { nextHand(); return; }
    onExit();
  };

  const step = run.step;
  if (!step) return null;

  const liveTable = award ? run.table : { ...tableRef.current, stacks: run.seats.map(s => s.stack), handNo: tableRef.current.handNo };
  const sessionDelta = heroDelta(liveTable);
  const handNo = (award ? run.table.handNo : tableRef.current.handNo + 1);

  return (
    <>
      <PokerTable
        step={step}
        stake={stats.stake}
        displayUnits={stats.preferences.displayUnits}
        deckColorMode={stats.preferences.deckColorMode}
        selectedOptionId={selectedOptionId}
        isSubmitted={isSubmitted}
        rating={Math.round(stats.rating.r)}
        delta={isSubmitted ? delta : null}
        streak={stats.consecutiveCorrect}
        title={`Mano ${handNo} · ${sessionDelta >= 0 ? '+' : ''}${sessionDelta} BB`}
        recentGrades={recentGrades}
        fastError={fastError}
        doubted={doubted}
        onDoubt={handleDoubt}
        onSelectOption={handleSelect}
        onNext={isSubmitted ? commitAction : (award ? nextHand : () => {})}
        onHold={clearTimer}
        onBack={handleBack}
        onToggleUnits={toggleDisplayUnits}
        onOpenRangeViewer={req => setRangeRequest(req)}
        footer={award && !isSubmitted ? (
          <div className="cash-end w-full flex flex-col gap-2 pb-1">
            <div className="text-[13px] text-dim uppercase tracking-[0.08em]">Mano {handNo}</div>
            <div className="cash-end-text text-[15px] text-hi font-semibold leading-snug">{award.text}</div>
            <div className="flex items-baseline gap-2">
              <span className="num text-[22px] font-semibold text-hi">{r1(run.seats[0].stack)} BB</span>
              <Delta value={award.delta} className="text-[16px]" />
            </div>
            <BtnPrimary onClick={nextHand} className="next-hand w-full">Siguiente mano</BtnPrimary>
          </div>
        ) : undefined}
      />

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
