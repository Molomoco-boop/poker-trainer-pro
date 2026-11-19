import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useGame } from '../context/useGame';
import { PokerTable, RangeRequest } from '../components/PokerTable';
import { RangeViewerModal } from '../components/RangeViewerModal';
import { useBackLayer } from '../navigation/BackProvider';
import {
  newCashTable, startHand, applyHeroChoice, advanceTable, settleAfterHeroFold, heroDelta, posOf, CashRun, CashTable
} from '../utils/cashTable';
import { Grade } from '../types/poker';
import { assignProfiles, TableMode } from '../utils/botProfiles';
import { pushHand, newHandId, ReviewDecision } from '../utils/handHistory';

const AUTO_ADVANCE_MS = 1300;
const BOT_MS = 320;
const HAND_END_MS = 1200;

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
  const [playingBots, setPlayingBots] = useState(false);

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

  const publish = (current: CashRun) => {
    runRef.current = current;
    setRun({ ...current });
  };

  /** After the hero acts, reveal each bot (or street) on a short beat. */
  const playBots = useCallback(() => {
    setPlayingBots(true);
    const tick = () => {
      const current = runRef.current;
      const r = advanceTable(current);
      publish(current);
      if (r === 'acted') {
        timer.current = setTimeout(tick, BOT_MS);
        return;
      }
      setPlayingBots(false);
      committing.current = false;
      if (r === 'end') persistHand(current);
    };
    timer.current = setTimeout(tick, BOT_MS);
  }, []);

  const dealNext = (from: CashRun) => {
    persistHand(from);
    tableRef.current = from.table;
    decisionsRef.current = [];
    savedKey.current = null;
    const next = startHand(from.table, profilesRef.current);
    publish(next);
    if (next.award) persistHand(next);
  };

  /** Apply the queued hero action and start bot playback — or, if he folded, skip to the next hand. */
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
    applyHeroChoice(current, optId);
    resetFeedback();
    setPlayingBots(false);
    if (current.seats[0].folded) {
      settleAfterHeroFold(current);
      dealNext(current);
      committing.current = false;
      return;
    }
    publish(current);
    playBots();
  }, [playBots]);

  const nextHand = useCallback(() => {
    if (committing.current) return;
    clearTimer();
    resetFeedback();
    setPlayingBots(false);
    dealNext(runRef.current);
  }, []);

  useEffect(() => () => clearTimer(), []);
  useEffect(() => { shownAt.current = Date.now(); }, [run.step?.id]);

  // Auto-deal the next hand after a brief inline result. No summary overlay.
  useEffect(() => {
    if (!run.award || isSubmitted || playingBots) return;
    persistHand(run);
    clearTimer();
    timer.current = setTimeout(() => nextHand(), HAND_END_MS);
    return () => { if (timer.current) { clearTimeout(timer.current); timer.current = null; } };
  }, [run.award, isSubmitted, playingBots, nextHand]);

  const award = run.award;
  const showingFeedback = isSubmitted && !award;
  const showingEnd = !!award && !isSubmitted && !playingBots;
  useBackLayer(showingFeedback, commitAction);
  useBackLayer(showingEnd, nextHand);

  const handleSelect = (optId: string) => {
    const current = runRef.current;
    if (isSubmitted || current.award || playingBots || !current.step || !current.awaitingHero || committing.current) return;
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
    if (playingBots) return;
    if (award) { nextHand(); return; }
    onExit();
  };

  const step = run.step;
  if (!step) return null;

  const liveTable = award ? run.table : { ...tableRef.current, stacks: run.seats.map(s => s.stack), handNo: tableRef.current.handNo };
  const sessionDelta = heroDelta(liveTable);
  const handNo = (award ? run.table.handNo : tableRef.current.handNo + 1);
  const handDeltaLabel = award && !isSubmitted
    ? `Hand ${handNo} · ${award.delta >= 0 ? '+' : ''}${award.delta} BB`
    : `Hand ${handNo} · ${sessionDelta >= 0 ? '+' : ''}${sessionDelta} BB`;

  return (
    <>
      <PokerTable
        step={step}
        stake={stats.stake}
        displayUnits={stats.preferences.displayUnits}
        deckColorMode={stats.preferences.deckColorMode}
        selectedOptionId={selectedOptionId}
        isSubmitted={isSubmitted && !playingBots}
        rating={Math.round(stats.rating.r)}
        delta={isSubmitted ? delta : (showingEnd ? award!.delta : null)}
        streak={stats.consecutiveCorrect}
        title={handDeltaLabel}
        recentGrades={recentGrades}
        fastError={fastError}
        doubted={doubted}
        onDoubt={handleDoubt}
        onSelectOption={handleSelect}
        onNext={isSubmitted ? commitAction : (showingEnd ? nextHand : () => {})}
        onHold={clearTimer}
        onBack={handleBack}
        onToggleUnits={toggleDisplayUnits}
        onOpenRangeViewer={req => setRangeRequest(req)}
        pace="fast"
        handEnd={showingEnd && award ? { text: award.text, delta: award.delta } : null}
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
