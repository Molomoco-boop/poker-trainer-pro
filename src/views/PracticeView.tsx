import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HandStep, SpotType, PracticeMode, DecisionVerdict, MistakeRecord, ReviewKind, PEDAGOGICAL_LEVEL_NAMES } from '../types/poker';
import {
  generateFullHandScenario,
  generateSimulatorDrill,
  generatePotOddsDrill,
  generateOutsDrill,
  generateSimilarStep
} from '../utils/fullHandEngine';
import { useGame } from '../context/useGame';
import { PokerTable, RangeRequest } from '../components/PokerTable';
import { LevelSettingsModal } from '../components/LevelSettingsModal';
import { RangeViewerModal } from '../components/RangeViewerModal';
import { playCardSound } from '../utils/audio';

interface PracticeViewProps {
  mode: PracticeMode;
  forcedSpot?: SpotType;
  onExit: () => void;
}

const DAILY_TOTAL = 10;
/** Time a correct answer stays on screen so the why line can be read. */
const AUTO_ADVANCE_MS = 2500;

/** Review kinds that each mode can replay. */
const MODE_REVIEWS: Record<PracticeMode, ReviewKind[]> = {
  continuous: ['pre', 'post', 'odds', 'equity'],
  daily: ['pre', 'post'],
  full_hand: ['pre', 'post'],
  preflop: ['pre'],
  postflop: ['post'],
  odds: ['odds'],
  equity: ['equity'],
  ev: ['ev']
};

export const PracticeView: React.FC<PracticeViewProps> = ({ mode, forcedSpot, onExit }) => {
  const { stats, recordStepAnswer, toggleDisplayUnits, levelNotice, clearLevelNotice } = useGame();
  const scenarioOpts = { positions: stats.preferences.trainingPositions };
  const isDrillMode = mode !== 'continuous' && mode !== 'full_hand' && mode !== 'daily';

  const freshStep = useCallback((): HandStep => {
    const lvl = stats.pedagogicalLevel;
    const opts = { positions: stats.preferences.trainingPositions };
    if (isDrillMode) return generateSimulatorDrill(mode, lvl, opts);
    if (mode === 'continuous' && Math.random() < 0.15) {
      return Math.random() < 0.5 ? generatePotOddsDrill(lvl) : generateOutsDrill(lvl);
    }
    return generateFullHandScenario(lvl, forcedSpot, opts).steps[0];
  }, [isDrillMode, mode, forcedSpot, stats.pedagogicalLevel, stats.preferences.trainingPositions]);

  const [step, setStep] = useState<HandStep>(() =>
    isDrillMode ? generateSimulatorDrill(mode, stats.pedagogicalLevel, scenarioOpts) : generateFullHandScenario(stats.pedagogicalLevel, forcedSpot, scenarioOpts).steps[0]
  );
  const [nextInHand, setNextInHand] = useState<HandStep | null>(null);
  const [endNote, setEndNote] = useState<string | undefined>(undefined);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showLevelSettings, setShowLevelSettings] = useState(false);
  const [rangeRequest, setRangeRequest] = useState<RangeRequest | null>(null);
  const [session, setSession] = useState<DecisionVerdict[]>([]);
  const [sessionEv, setSessionEv] = useState(0);
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dailyDone = mode === 'daily' && stats.dailyDrillCount >= DAILY_TOTAL && !isSubmitted;

  const { soundEnabled, volume } = stats.preferences;
  useEffect(() => {
    if (soundEnabled) playCardSound(volume);
  }, [step.id, soundEnabled, volume]);

  useEffect(() => () => {
    if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
  }, []);

  useEffect(() => {
    if (!levelNotice) return;
    const t = setTimeout(clearLevelNotice, 3500);
    return () => clearTimeout(t);
  }, [levelNotice, clearLevelNotice]);

  /** A due mistake of this mode, replayed as a similar spot with new cards. */
  const dueReview = useCallback((): HandStep | null => {
    const kinds = MODE_REVIEWS[mode];
    const due: MistakeRecord | undefined = [...(stats.mistakeQueue || [])]
      .filter(m => m.key && kinds.includes(m.key.kind) && m.dueAt <= stats.totalHandsPlayed)
      .sort((a, b) => a.dueAt - b.dueAt)[0];
    if (!due) return null;
    const s = generateSimilarStep(due.key, stats.pedagogicalLevel);
    return { ...s, isReviewOfMistake: true, reviewOf: due.id };
  }, [mode, stats.mistakeQueue, stats.totalHandsPlayed, stats.pedagogicalLevel]);

  const advanceToNext = useCallback(() => {
    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current);
      autoAdvanceTimer.current = null;
    }
    setSelectedOptionId(null);
    setIsSubmitted(false);
    setEndNote(undefined);
    if (nextInHand) {
      setStep(nextInHand);
      setNextInHand(null);
      return;
    }
    setStep(dueReview() || freshStep());
  }, [nextInHand, dueReview, freshStep]);

  const advanceToNextRef = useRef(advanceToNext);
  useEffect(() => { advanceToNextRef.current = advanceToNext; }, [advanceToNext]);

  const handleSelectOption = (optId: string) => {
    if (isSubmitted || dailyDone) return;
    setSelectedOptionId(optId);
    setIsSubmitted(true);
    const opt = step.options.find(o => o.id === optId);
    setSession(s => [opt?.verdict || 'error', ...s]);
    setSessionEv(e => Math.round((e + (opt?.evDiffNum || 0)) * 100) / 100);
    const { isCorrect } = recordStepAnswer(step, optId, { daily: mode === 'daily' });
    if (isCorrect && step.advance && !isDrillMode) {
      const res = step.advance(optId);
      setNextInHand(res.next);
      setEndNote(res.note);
    } else {
      setNextInHand(null);
    }
    if (isCorrect) {
      autoAdvanceTimer.current = setTimeout(() => advanceToNextRef.current(), AUTO_ADVANCE_MS);
    }
  };

  const sessionCorrect = session.filter(v => v === 'optimal').length;
  const noticeText = levelNotice
    ? `Nivel ${levelNotice.level} · ${levelNotice.up ? PEDAGOGICAL_LEVEL_NAMES[levelNotice.level].desc : `baja a ${PEDAGOGICAL_LEVEL_NAMES[levelNotice.level].name}`}`
    : null;

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
        sessionHandsCount={session.length}
        sessionCorrectCount={sessionCorrect}
        totalEvAccumulatedBB={sessionEv}
        recentResults={session.slice(0, 10)}
        progressLabel={mode === 'daily' ? `${Math.min(stats.dailyDrillCount, DAILY_TOTAL)}/${DAILY_TOTAL}` : undefined}
        onSelectOption={handleSelectOption}
        onNext={advanceToNext}
        onBack={onExit}
        onToggleUnits={toggleDisplayUnits}
        onOpenLevelSettings={() => setShowLevelSettings(true)}
        onOpenRangeViewer={req => setRangeRequest(req)}
      />

      {noticeText && (
        <button
          onClick={clearLevelNotice}
          className={`level-notice fixed top-12 left-1/2 -translate-x-1/2 z-[65] h-10 px-4 rounded-full text-xs font-[800] shadow-lg whitespace-nowrap ${levelNotice?.up ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-black'}`}
        >
          {noticeText}
        </button>
      )}

      {dailyDone && (
        <div className="fixed inset-0 z-[70] bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-xs bg-[#0F172A] border border-slate-700 rounded-2xl p-4 flex flex-col gap-3 text-center">
            <span className="text-sm font-[800] text-white">Drill diario completado</span>
            <span className="text-2xl font-black text-emerald-400 tabular-nums">{sessionCorrect}/{session.length || DAILY_TOTAL}</span>
            <span className={`text-xs font-bold tabular-nums ${sessionEv >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>EV {sessionEv.toFixed(2)} BB</span>
            <button onClick={onExit} className="h-11 rounded-xl bg-blue-600 text-white font-[800] text-sm">Volver</button>
          </div>
        </div>
      )}

      {showLevelSettings && <LevelSettingsModal onClose={() => setShowLevelSettings(false)} />}

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
