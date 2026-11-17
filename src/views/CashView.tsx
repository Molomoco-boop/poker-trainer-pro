import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useGame } from '../context/useGame';
import { PokerTable } from '../components/PokerTable';
import { Panel, BtnPrimary, Delta } from '../components/ui';
import { useBackLayer } from '../navigation/BackProvider';
import { newCashTable, startHand, applyHeroAction, heroDelta, CashRun, CashTable } from '../utils/cashTable';
import { r1 } from '../utils/actionModel';

const ADVANCE_MS = 1600;

/** Live 6-max cash: full hands, bots at every seat, stacks persist, button moves clockwise. */
export const CashView: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const { stats, recordStepAnswer, toggleDisplayUnits, markDoubt } = useGame();
  const tableRef = useRef<CashTable>(newCashTable());
  const [run, setRun] = useState<CashRun>(() => startHand(tableRef.current));
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [delta, setDelta] = useState<number | null>(null);
  const [doubted, setDoubted] = useState(false);
  const [fastError, setFastError] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shownAt = useRef(Date.now());

  const award = run.award;
  useBackLayer(!!award, () => nextHand());

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => { shownAt.current = Date.now(); }, [run.step?.id]);

  const nextHand = useCallback(() => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    const table = run.table;
    tableRef.current = table;
    setSelectedOptionId(null);
    setIsSubmitted(false);
    setDelta(null);
    setDoubted(false);
    setFastError(false);
    setRun(startHand(table));
  }, [run.table]);

  const continueHand = useCallback(() => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    if (!selectedOptionId || !run.step) return;
    const next = applyHeroAction(run, selectedOptionId);
    setSelectedOptionId(null);
    setIsSubmitted(false);
    setDelta(null);
    setDoubted(false);
    setFastError(false);
    setRun({ ...next });
  }, [run, selectedOptionId]);

  const handleSelect = (optId: string) => {
    if (isSubmitted || award || !run.step) return;
    const ms = Date.now() - shownAt.current;
    setSelectedOptionId(optId);
    setIsSubmitted(true);
    const res = recordStepAnswer(run.step, optId, { ms });
    setDelta(res.delta);
    setFastError(!res.isCorrect && res.confidence === 'fast');
    timer.current = setTimeout(() => {
      const next = applyHeroAction(run, optId);
      setSelectedOptionId(null);
      setIsSubmitted(false);
      setDelta(null);
      setDoubted(false);
      setFastError(false);
      setRun({ ...next });
    }, ADVANCE_MS);
  };

  const handleDoubt = () => {
    if (doubted || !run.step) return;
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    setDoubted(true);
    markDoubt(run.step);
  };

  const step = run.step;
  if (!step) return null;
  const sessionDelta = heroDelta(run.award ? run.table : { ...tableRef.current, stacks: run.seats.map(s => s.stack), handNo: tableRef.current.handNo });
  const handNo = (run.award ? run.table.handNo : tableRef.current.handNo) + (run.award ? 0 : 1);

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
        title={`Mesa ${handNo} · ${sessionDelta >= 0 ? '+' : ''}${sessionDelta} BB`}
        recentGrades={[]}
        fastError={fastError}
        doubted={doubted}
        onDoubt={handleDoubt}
        onSelectOption={handleSelect}
        onNext={award ? nextHand : continueHand}
        onHold={() => { if (timer.current) { clearTimeout(timer.current); timer.current = null; } }}
        onBack={onExit}
        onToggleUnits={toggleDisplayUnits}
        onOpenRangeViewer={() => { /* ranges stay in tools */ }}
      />

      {award && (
        <div className="cash-end fixed inset-0 z-[70] bg-black/60 flex items-end justify-center p-3 pb-[max(12px,env(safe-area-inset-bottom))]">
          <Panel className="w-full max-w-xs p-3 flex flex-col gap-2">
            <div className="text-[13px] text-dim uppercase tracking-[0.08em]">Mano {handNo}</div>
            <div className="text-[15px] text-hi font-semibold leading-snug">{award.text}</div>
            <div className="flex items-baseline gap-2">
              <span className="num text-[22px] font-semibold text-hi">{r1(run.seats[0].stack)} BB</span>
              <Delta value={award.delta} className="text-[16px]" />
            </div>
            <BtnPrimary onClick={nextHand} className="w-full">Siguiente mano</BtnPrimary>
          </Panel>
        </div>
      )}
    </>
  );
};
