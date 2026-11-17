import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HandStep, FullHandScenario, SpotType, PracticeMode, DecisionVerdict } from '../types/poker';
import {
  generateFullHandScenario,
  generateSimulatorDrill,
  generatePotOddsDrill,
  generateOutsDrill
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

export const PracticeView: React.FC<PracticeViewProps> = ({ mode, forcedSpot, onExit }) => {
  const { stats, recordStepAnswer, toggleDisplayUnits } = useGame();
  const scenarioOpts = { positions: stats.preferences.trainingPositions };
  const isDrillMode = mode !== 'continuous' && mode !== 'full_hand' && mode !== 'daily';

  const [currentScenario, setCurrentScenario] = useState<FullHandScenario>(() =>
    generateFullHandScenario(stats.pedagogicalLevel, forcedSpot, scenarioOpts)
  );
  const [stepIndex, setStepIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showLevelSettings, setShowLevelSettings] = useState(false);
  const [rangeRequest, setRangeRequest] = useState<RangeRequest | null>(null);
  const [session, setSession] = useState<DecisionVerdict[]>([]);
  const [sessionEv, setSessionEv] = useState(0);
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [currentDrillStep, setCurrentDrillStep] = useState<HandStep | null>(() =>
    isDrillMode ? generateSimulatorDrill(mode, stats.pedagogicalLevel, scenarioOpts) : null
  );

  const activeStep: HandStep = isDrillMode && currentDrillStep
    ? currentDrillStep
    : currentScenario.steps[stepIndex] || currentScenario.steps[0];

  const dailyDone = mode === 'daily' && stats.dailyDrillCount >= DAILY_TOTAL && !isSubmitted;

  const { soundEnabled, volume } = stats.preferences;
  useEffect(() => {
    if (soundEnabled) playCardSound(volume);
  }, [stepIndex, currentScenario.id, currentDrillStep?.id, soundEnabled, volume]);

  useEffect(() => () => {
    if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
  }, []);

  const resetAnswer = () => {
    setSelectedOptionId(null);
    setIsSubmitted(false);
  };

  const nextScenario = useCallback(() => {
    // spaced repetition: replay a due mistake now and then
    const due = (stats.mistakeQueue || []).find(m => stats.totalHandsPlayed - m.failedAtHandIndex >= 3 && m.consecutiveSuccesses < 3);
    if (due && Math.random() < 0.25) {
      setCurrentScenario({
        id: `review_${Date.now()}`,
        title: 'Repaso',
        pedagogicalLevel: stats.pedagogicalLevel,
        spotType: due.step.spotType,
        steps: [{ ...due.step, isReviewOfMistake: true, continueWith: undefined, contextNotice: `Repaso · ${due.step.contextNotice}` }]
      });
    } else if (mode === 'continuous' && Math.random() < 0.15) {
      const drill = Math.random() < 0.5 ? generatePotOddsDrill(stats.pedagogicalLevel) : generateOutsDrill(stats.pedagogicalLevel);
      setCurrentScenario({ id: `drill_${Date.now()}`, title: 'Drill', pedagogicalLevel: stats.pedagogicalLevel, spotType: drill.spotType, steps: [drill] });
    } else {
      setCurrentScenario(generateFullHandScenario(stats.pedagogicalLevel, forcedSpot, scenarioOpts));
    }
    setStepIndex(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats.mistakeQueue, stats.totalHandsPlayed, stats.pedagogicalLevel, forcedSpot, mode, stats.preferences.trainingPositions]);

  const advanceToNext = useCallback(() => {
    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current);
      autoAdvanceTimer.current = null;
    }
    resetAnswer();
    if (isDrillMode) {
      setCurrentDrillStep(generateSimulatorDrill(mode, stats.pedagogicalLevel, scenarioOpts));
      return;
    }
    const step = currentScenario.steps[stepIndex];
    const continues = step?.continueWith && selectedOptionId === step.continueWith && stepIndex < currentScenario.steps.length - 1;
    if (continues) setStepIndex(i => i + 1);
    else nextScenario();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDrillMode, mode, stats.pedagogicalLevel, currentScenario, stepIndex, selectedOptionId, nextScenario]);

  const handleSelectOption = (optId: string) => {
    if (isSubmitted || dailyDone) return;
    setSelectedOptionId(optId);
    setIsSubmitted(true);
    const opt = activeStep.options.find(o => o.id === optId);
    setSession(s => [opt?.verdict || 'error', ...s]);
    setSessionEv(e => Math.round((e + (opt?.evDiffNum || 0)) * 100) / 100);
    const { isCorrect } = recordStepAnswer(activeStep, optId, { daily: mode === 'daily' });
    if (isCorrect) {
      autoAdvanceTimer.current = setTimeout(() => advanceToNextRef.current(), 750);
    }
  };

  const advanceToNextRef = useRef(advanceToNext);
  useEffect(() => { advanceToNextRef.current = advanceToNext; }, [advanceToNext]);

  const sessionCorrect = session.filter(v => v === 'optimal').length;

  return (
    <>
      <PokerTable
        step={activeStep}
        stake={stats.stake}
        displayUnits={stats.preferences.displayUnits}
        deckColorMode={stats.preferences.deckColorMode}
        showHandStrength={stats.preferences.showHandStrength}
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
