import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HandStep, FullHandScenario, SpotType, PracticeMode } from '../types/poker';
import {
  generateFullHandScenario,
  generateSimulatorDrill,
  generatePotOddsDrill,
  generateOutsDrill,
  generateBestHandDrill
} from '../utils/fullHandEngine';
import { useGame } from '../context/GameContext';
import { PokerTable } from '../components/PokerTable';
import { LevelSettingsModal } from '../components/LevelSettingsModal';
import { RangeViewerModal } from '../components/RangeViewerModal';
import { playCardSound } from '../utils/audio';

interface PracticeViewProps {
  mode: PracticeMode;
  forcedSpot?: SpotType;
  onExit: () => void;
}

export const PracticeView: React.FC<PracticeViewProps> = ({ mode, forcedSpot, onExit }) => {
  const { stats, recordStepAnswer, toggleDisplayUnits } = useGame();

  // Full hand scenario for multi-street progression
  const [currentScenario, setCurrentScenario] = useState<FullHandScenario>(() =>
    generateFullHandScenario(stats.pedagogicalLevel, forcedSpot)
  );

  const [stepIndex, setStepIndex] = useState<number>(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [showLevelSettings, setShowLevelSettings] = useState<boolean>(false);
  const [showRangeViewer, setShowRangeViewer] = useState<boolean>(false);
  const [rangeHighlightHand, setRangeHighlightHand] = useState<string | undefined>(undefined);
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Standalone drill step for single-topic practice (odds, equity, best_hand, etc.)
  const isDrillMode = mode !== 'continuous' && mode !== 'full_hand';
  const [currentDrillStep, setCurrentDrillStep] = useState<HandStep | null>(() => {
    if (isDrillMode) {
      return generateSimulatorDrill(mode, stats.pedagogicalLevel);
    }
    return null;
  });

  // Active step
  const activeStep: HandStep = isDrillMode && currentDrillStep
    ? currentDrillStep
    : currentScenario.steps[stepIndex] || currentScenario.steps[0];

  useEffect(() => {
    if (stats.preferences.soundEnabled) {
      playCardSound(stats.preferences.volume);
    }
  }, [stepIndex, currentScenario.id, currentDrillStep?.id]);

  // Cleanup auto advance timer
  useEffect(() => {
    return () => {
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    };
  }, []);

  const advanceToNext = useCallback(() => {
    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current);
      autoAdvanceTimer.current = null;
    }

    if (isDrillMode) {
      // Generate next drill step of this subcategory
      setCurrentDrillStep(generateSimulatorDrill(mode, stats.pedagogicalLevel));
      setSelectedOptionId(null);
      setIsSubmitted(false);
      return;
    }

    const isFold = selectedOptionId === 'fold';
    const isLastStep = stepIndex >= currentScenario.steps.length - 1;

    if (isFold || isLastStep) {
      // In continuous mode, 20% of hands intersperse an Odds or Outs probability drill!
      if (mode === 'continuous' && Math.random() < 0.22) {
        const randomDrill = Math.random() < 0.5
          ? generatePotOddsDrill(stats.pedagogicalLevel)
          : generateOutsDrill(stats.pedagogicalLevel);

        setCurrentScenario({
          id: `drill_${Date.now()}`,
          title: 'Desafío de Probabilidades y Outs',
          pedagogicalLevel: stats.pedagogicalLevel,
          spotType: randomDrill.spotType,
          steps: [randomDrill]
        });
        setStepIndex(0);
        setSelectedOptionId(null);
        setIsSubmitted(false);
        return;
      }

      // Next full hand scenario
      const newScenario = generateFullHandScenario(stats.pedagogicalLevel, forcedSpot);
      setCurrentScenario(newScenario);
      setStepIndex(0);
      setSelectedOptionId(null);
      setIsSubmitted(false);
    } else {
      // Advance to next street (Flop -> Turn -> River)
      setStepIndex(prev => prev + 1);
      setSelectedOptionId(null);
      setIsSubmitted(false);
    }
  }, [selectedOptionId, stepIndex, currentScenario, stats.pedagogicalLevel, forcedSpot, mode, isDrillMode]);

  const handleSelectOption = (optId: string) => {
    if (isSubmitted) return;
    setSelectedOptionId(optId);
    setIsSubmitted(true);
    const { isCorrect } = recordStepAnswer(activeStep, optId);

    // Auto-advance on correct answer after a snappy 750ms flash!
    if (isCorrect) {
      autoAdvanceTimer.current = setTimeout(() => {
        advanceToNext();
      }, 750);
    }
  };

  const handleNextStep = () => {
    advanceToNext();
  };

  // Chain postflop from preflop Call/Raise
  const handleContinuePostflop = () => {
    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current);
      autoAdvanceTimer.current = null;
    }
    if (stepIndex === 0 && currentScenario.steps.length > 1) {
      setStepIndex(1);
      setSelectedOptionId(null);
      setIsSubmitted(false);
    }
  };

  const handleOpenRangeViewer = (hand?: string) => {
    setRangeHighlightHand(hand);
    setShowRangeViewer(true);
  };

  // Recent results for bottom progress bar
  const recentResults = (stats.sessionHands || []).slice(0, 10).map(s => s.verdict);
  const sessionCorrectCount = (stats.sessionHands || []).filter(s => s.verdict === 'optimal').length;

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
        sessionHandsCount={stats.sessionHands.length}
        sessionCorrectCount={sessionCorrectCount}
        totalEvAccumulatedBB={stats.totalEvAccumulatedBB}
        recentResults={recentResults}
        onSelectOption={handleSelectOption}
        onNext={handleNextStep}
        onBack={onExit}
        onToggleUnits={toggleDisplayUnits}
        onOpenLevelSettings={() => setShowLevelSettings(true)}
        onOpenRangeViewer={handleOpenRangeViewer}
        onContinuePostflop={stepIndex === 0 && !isDrillMode ? handleContinuePostflop : undefined}
      />

      {showLevelSettings && (
        <LevelSettingsModal onClose={() => setShowLevelSettings(false)} />
      )}

      {showRangeViewer && (
        <RangeViewerModal
          onClose={() => setShowRangeViewer(false)}
          highlightHand={rangeHighlightHand}
          onPracticeRange={() => {
            setShowRangeViewer(false);
            setCurrentScenario(generateFullHandScenario(stats.pedagogicalLevel, 'RFI_OPEN'));
            setStepIndex(0);
            setSelectedOptionId(null);
            setIsSubmitted(false);
          }}
        />
      )}
    </>
  );
};
