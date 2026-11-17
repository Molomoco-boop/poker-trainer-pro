import React, { useState } from 'react';
import {
  HandStep,
  PlayerState,
  StakeLevel,
  DecisionOption
} from '../types/poker';
import { CardView } from './CardView';
import {
  ArrowLeft,
  Lightbulb,
  Sliders,
  Check,
  X as CloseIcon,
  ArrowRight
} from 'lucide-react';
import { convertBBToEUR } from '../utils/difficultyEngine';

interface PokerTableProps {
  step: HandStep;
  stake: StakeLevel;
  displayUnits: 'bb' | 'units';
  deckColorMode: '4color' | '2color';
  showHandStrength: boolean;
  selectedOptionId: string | null;
  isSubmitted: boolean;
  sessionHandsCount: number;
  sessionCorrectCount: number;
  totalEvAccumulatedBB: number;
  recentResults: Array<'optimal' | 'mixed' | 'error'>;
  onSelectOption: (id: string) => void;
  onNext: () => void;
  onBack: () => void;
  onToggleUnits: () => void;
  onOpenLevelSettings: () => void;
  onOpenRangeViewer: (handToHighlight?: string) => void;
  onContinuePostflop?: () => void;
}



export const PokerTable: React.FC<PokerTableProps> = ({
  step,
  stake,
  displayUnits,
  deckColorMode,
  showHandStrength,
  selectedOptionId,
  isSubmitted,
  sessionHandsCount,
  sessionCorrectCount,
  totalEvAccumulatedBB,
  recentResults,
  onSelectOption,
  onNext,
  onBack,
  onToggleUnits,
  onOpenLevelSettings,
  onOpenRangeViewer,
  onContinuePostflop
}) => {
  const [showHint, setShowHint] = useState(false);

  const hero = step.players.find(p => p.isHero) || step.players[0];
  const opponents = step.players.filter(p => !p.isHero);

  // Exact Clockwise 6-Max Seat layout relative to Hero (Seat 0 at bottom center)
  const seatPositions = [
    { bottom: '0%', left: '50%', transform: 'translateX(-50%)', isHero: true }, // Seat 0 (Hero)
    { bottom: '15%', left: '2%', transform: 'none', chipRight: '-30px', chipTop: '50%' }, // Seat 1
    { top: '15%', left: '2%', transform: 'none', chipRight: '-30px', chipTop: '50%' },    // Seat 2
    { top: '0%', left: '50%', transform: 'translateX(-50%)', chipBottom: '-28px', chipLeft: '50%' }, // Seat 3
    { top: '15%', right: '2%', transform: 'none', chipLeft: '-30px', chipTop: '50%' },   // Seat 4
    { bottom: '15%', right: '2%', transform: 'none', chipLeft: '-30px', chipTop: '50%' },// Seat 5
  ];

  // Currency helper
  const formatAmount = (bbVal: number): { primary: string; secondary?: string } => {
    if (displayUnits === 'bb') {
      return { primary: `${bbVal.toFixed(bbVal % 1 === 0 ? 0 : 1)} BB` };
    }
    const eur = convertBBToEUR(bbVal, stake);
    return {
      primary: `${eur.toFixed(2)} €`,
      secondary: `${bbVal.toFixed(1)} BB`
    };
  };

  const selectedOpt = step.options.find(o => o.id === selectedOptionId);
  const verdict = selectedOpt?.verdict || 'error';
  const isCorrectAnswer = selectedOpt?.isCorrect === true;

  return (
    <div className="w-full h-[100dvh] max-h-[100dvh] flex flex-col justify-between bg-[radial-gradient(circle_at_50%_35%,#0F172A_0%,#060913_100%)] text-slate-100 select-none overflow-hidden relative font-sans">
      
      {/* ============================================================== */}
      {/* 1. TOP HEADER (8% approx) */}
      {/* ============================================================== */}
      <div className="w-full px-3 safe-top pb-1 flex flex-col shrink-0 z-30">
        <div className="flex items-center justify-between">
          {/* Back button */}
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-xl bg-slate-900/80 border border-slate-700/60 flex items-center justify-center text-slate-300 hover:text-white transition-all active:scale-95"
            aria-label="Salir"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Center Pill: [Stake | BB/€ toggle] */}
          <div className="flex items-center bg-[#0F172A]/90 border border-slate-700/80 rounded-full p-0.5 shadow-lg">
            <button
              onClick={onOpenLevelSettings}
              className="px-2.5 py-1 text-[11px] font-[800] text-slate-200 hover:text-white flex items-center gap-1 border-r border-slate-700/60"
            >
              <span>{stake}</span>
              <Sliders className="w-3 h-3 text-slate-400" />
            </button>

            {/* Quick BB / € Switch */}
            <button
              onClick={onToggleUnits}
              className="px-2.5 py-1 rounded-full text-[11px] font-black transition-all flex items-center gap-1 bg-[#2563EB] text-white shadow-sm"
              title="Cambiar entre BB y Euros"
            >
              <span>{displayUnits === 'bb' ? 'BB' : '€'}</span>
            </button>
          </div>

          {/* Hint button */}
          <button
            onClick={() => setShowHint(true)}
            className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 hover:bg-amber-500/20 transition-all active:scale-95"
            aria-label="Pista"
          >
            <Lightbulb className="w-5 h-5" />
          </button>
        </div>

        {/* Action context — minimal */}
        <div className="mt-1 px-1 text-[10px] text-slate-500 truncate text-center">
          {step.actionTicker}
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. MIDDLE POKER TABLE (62% approx) */}
      {/* ============================================================== */}
      <div className="flex-1 w-full flex items-center justify-center px-2 py-0.5 relative z-10 min-h-0">
        
        {/* Stadium Felt Container */}
        <div className="relative w-full max-w-[400px] h-full max-h-[440px] flex items-center justify-center">
          
          {/* Oval Felt Surface */}
          <div className="absolute inset-[3%] rounded-[150px] bg-[radial-gradient(ellipse_at_center,#13233C_0%,#0B1424_75%,#080E1A_100%)] border-[4px] border-[#1E3A5F] shadow-[0_20px_50px_rgba(0,0,0,0.85),inset_0_0_30px_rgba(0,0,0,0.85)] overflow-hidden">
            
            {/* Inner betting track ring (14px from rail) */}
            <div className="absolute inset-[14px] rounded-[136px] border border-sky-400/20 pointer-events-none" />

            {/* Subtle center watermark */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.04]">
              <span className="text-[130px] font-black text-white select-none">♠</span>
            </div>
          </div>

          {/* ---------------------------------------------------------- */}
          {/* CENTER STRICT FLEXBOX COLUMN (NO OVERLAPPING!) */}
          {/* ---------------------------------------------------------- */}
          <div className="w-[66%] z-20 flex flex-col items-center justify-center gap-2 pointer-events-none">
            
            {/* BLOCK A: POT */}
            <div className="bg-[#0B1424]/90 border border-slate-700/80 px-3.5 py-1 rounded-full shadow pointer-events-auto">
              <span className="text-[15px] font-black text-amber-300 tabular-nums">
                {formatAmount(step.pot).primary}
              </span>
              {formatAmount(step.pot).secondary && (
                <span className="text-[11px] text-slate-300 font-semibold tabular-nums ml-1.5">
                  ({formatAmount(step.pot).secondary})
                </span>
              )}
            </div>

            {/* BLOCK B: COMMUNITY CARDS */}
            <div className="min-h-[76px] flex items-center justify-center gap-1.5 pointer-events-auto">
              {step.communityCards && step.communityCards.length > 0 ? (
                step.communityCards.map((c, i) => (
                  <CardView
                    key={i}
                    card={c}
                    size="board"
                    deckMode={deckColorMode}
                    className="transform transition-transform hover:-translate-y-1"
                  />
                ))
              ) : (
                <div className="h-[76px]" />
              )}
            </div>

            {/* BLOCK C: ACTION BANNER PILL */}
            <div className="bg-[#0F172A]/85 border border-sky-400/25 px-3 py-1 rounded-[10px] text-center shadow-md max-w-[95%] pointer-events-auto">
              <span className="text-[11px] font-semibold text-slate-200 leading-tight block truncate">
                {step.contextNotice}
              </span>
            </div>

            {/* BLOCK D: HERO HOLE CARDS & HAND STRENGTH */}
            <div className="flex flex-col items-center mt-1 pointer-events-auto">
              {hero.cards && (
                <div className="flex items-center gap-2">
                  <CardView
                    card={hero.cards[0]}
                    size="hero"
                    deckMode={deckColorMode}
                    className="transform rotate-[-3deg] hover:rotate-0 transition-transform"
                  />
                  <CardView
                    card={hero.cards[1]}
                    size="hero"
                    deckMode={deckColorMode}
                    className="transform rotate-[3deg] hover:rotate-0 transition-transform"
                  />
                </div>
              )}

              {/* Hand Strength Pill */}
              {showHandStrength && step.handStrengthName && (
                <div className="mt-1 bg-black/60 border border-slate-700/50 px-2 py-0.5 rounded-full text-[10px] font-bold text-sky-300 truncate max-w-[180px]">
                  {step.handStrengthName}
                </div>
              )}
            </div>
          </div>

          {/* ---------------------------------------------------------- */}
          {/* SEATS (6-MAX ROTATED CLOCKWISE RELATIVE TO HERO AT SEAT 0) */}
          {/* ---------------------------------------------------------- */}
          {step.players.map((p, idx) => {
            const posCfg = seatPositions[idx] || seatPositions[0];
            const isFolded = p.status === 'folded';
            const isHeroPlayer = p.isHero;

            return (
              <div
                key={p.id}
                className="absolute z-20"
                style={{
                  top: posCfg.top,
                  bottom: posCfg.bottom,
                  left: posCfg.left,
                  right: posCfg.right,
                  transform: posCfg.transform
                }}
              >
                <div className="relative flex flex-col items-center">
                  
                  {/* Seat Card Node: 70px x 48px */}
                  <div
                    className={`w-[70px] h-[48px] rounded-[11px] flex flex-col items-center justify-center shadow-lg transition-all relative ${
                      isHeroPlayer
                        ? 'bg-[#0F172A] border-[2px] border-[#38BDF8] shadow-[0_0_12px_rgba(56,189,248,0.4)]'
                        : isFolded
                        ? 'bg-[#060A14] border border-[#334155] opacity-[0.32] grayscale-[60%]'
                        : 'bg-[#0F172A] border-[1.5px] border-[#2563EB]'
                    }`}
                  >
                    {/* Opponent Hole Cards if exposed in drill */}
                    {!isHeroPlayer && p.cards && p.cards.length === 2 && (
                      <div className="absolute -top-8 flex items-center -space-x-1 pointer-events-auto z-25">
                        <CardView card={p.cards[0]} size="board" deckMode={deckColorMode} className="w-6 h-8 text-[8px] shadow-md" />
                        <CardView card={p.cards[1]} size="board" deckMode={deckColorMode} className="w-6 h-8 text-[8px] shadow-md" />
                      </div>
                    )}
                    <span className="text-[14px] font-black text-white leading-none tracking-tight">
                      {p.position}
                    </span>
                    <span className="text-[12px] font-bold text-slate-200 leading-none mt-1 tabular-nums">
                      {isFolded ? 'FOLD' : formatAmount(p.stack).primary}
                    </span>
                  </div>

                  {/* Dealer Button "D" attached to BTN seat ALWAYS! */}
                  {p.isDealer && (
                    <div className="absolute -top-1.5 -right-1.5 w-[22px] h-[22px] rounded-full bg-[#FACC15] border border-white text-black font-black text-[10px] flex items-center justify-center shadow-md z-30">
                      D
                    </div>
                  )}

                  {/* Bet amount in front of player */}
                  {p.currentBet > 0 && (
                    <div
                      className="absolute bg-black/75 rounded-full px-1.5 py-0.5 shadow z-15"
                      style={{
                        top: posCfg.chipTop,
                        bottom: posCfg.chipBottom,
                        left: posCfg.chipLeft,
                        right: posCfg.chipRight,
                        transform: posCfg.chipLeft === '50%' ? 'translateX(-50%)' : 'none'
                      }}
                    >
                      <span className="text-[11px] font-bold text-white tabular-nums">
                        {formatAmount(p.currentBet).primary}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. BOTTOM DECISION & FEEDBACK AREA (30% approx) */}
      {/* ============================================================== */}
      <div className="w-full shrink-0 z-30 bg-[#090E17]/95 border-t border-slate-800/80 p-2 safe-bottom flex flex-col gap-1.5">
        
        {/* ---------------- NORMAL DECISION STATE ---------------- */}
        {!isSubmitted ? (
          <div className="w-full flex flex-col gap-2 animate-fadeIn">
            
            {/* Prompt */}
            <div className="text-center text-xs font-semibold text-slate-300">
              {step.prompt}
            </div>

            {/* Action Buttons */}
            <div className={`grid gap-2 ${step.options.length <= 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {step.options.map(opt => {
                const isAction = step.questionType === 'action';
                const isFoldBtn = opt.id === 'fold';
                const isCallBtn = opt.id === 'call' || opt.id === 'check';
                const isRaiseBtn = opt.id === 'raise' || opt.id === '3bet' || opt.id === 'bet_half' || opt.id === 'all_in';

                let style = 'bg-[#111827] border-[1.5px] border-[#374151] text-[#F87171]'; // Fold
                if (!isAction) {
                  style = 'bg-[#121929] border-[1.5px] border-blue-500/40 text-blue-200 hover:bg-blue-600 hover:text-white shadow-md text-xs';
                } else if (isCallBtn) {
                  style = 'bg-[#0F2942] border-[1.5px] border-[#2563EB] text-[#FFFFFF]';
                } else if (isRaiseBtn) {
                  style = 'bg-[#172554] border-[1.5px] border-[#3B82F6] text-[#60A5FA]';
                }

                // Format button label with EUR & BB if in euro mode
                const amtBB = opt.amountBB;
                let subLabel: string | undefined = undefined;
                let mainLabel = opt.label;

                if (amtBB !== undefined && displayUnits === 'units') {
                  const eur = convertBBToEUR(amtBB, stake);
                  const actionName = opt.id.toUpperCase();
                  mainLabel = `${actionName} ${eur.toFixed(2)} €`;
                  subLabel = `${amtBB} BB`;
                }

                return (
                  <button
                    key={opt.id}
                    onClick={() => onSelectOption(opt.id)}
                    className={`min-h-[56px] rounded-[14px] p-1.5 flex flex-col items-center justify-center font-[700] text-[14px] leading-tight transition-all active:scale-95 shadow-md ${style}`}
                  >
                    <span className="tracking-wide">{mainLabel}</span>
                    {subLabel && (
                      <span className="text-[10px] font-semibold opacity-75 tabular-nums">
                        {subLabel}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ) : isCorrectAnswer ? (
          /* ---------------- CORRECT ANSWER: COMPACT FLASH ---------------- */
          <div className="w-full flex flex-col gap-2 animate-fadeIn">
            {/* Success banner with auto-advance indicator */}
            <div className="flex items-center justify-between bg-emerald-500/15 border border-emerald-500/40 rounded-xl p-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-emerald-500/25 flex items-center justify-center">
                  <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                </div>
                <div>
                  <span className="text-xs font-[800] text-emerald-300 block">Correcto</span>
                  <span className="text-[10px] text-emerald-400/70">{selectedOpt?.evDiff}</span>
                </div>
              </div>

              {/* Next button */}
              <div className="flex items-center">
                <button
                  onClick={onNext}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition-all active:scale-95 flex items-center gap-1"
                >
                  <span>Siguiente</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Auto-advance progress bar */}
            <div className="w-full h-0.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-400 rounded-full animate-shrinkBar" />
            </div>
          </div>
        ) : (
          /* ---------------- ERROR/MIXED: COMPACT DIRECT FEEDBACK (ZERO SCROLL!) ---------------- */
          <div className="w-full bg-[#0F172A] border-t-2 rounded-t-[14px] p-2 flex flex-col gap-1.5 animate-fadeIn"
               style={{
                 borderColor: verdict === 'mixed' ? '#F59E0B' : '#EF4444'
               }}
          >
            {/* Header: Verdict + Óptimo side-by-side */}
            <div className="flex items-center justify-between">
              {verdict === 'mixed' ? (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-[800]">
                  Mixta ({selectedOpt?.evDiff})
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[11px] font-[800] flex items-center gap-1">
                  <CloseIcon className="w-3 h-3 stroke-[3]" /> Incorrecto ({selectedOpt?.evDiff})
                </span>
              )}

              {!isCorrectAnswer && (
                <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  Óptimo: {step.options.find(o => o.isCorrect)?.label || '—'}
                </span>
              )}
            </div>

            {/* GTO Solver Horizontal Bar */}
            <div className="w-full h-[18px] rounded-md overflow-hidden flex bg-slate-900 border border-slate-700/80">
              {step.gtoFrequencies.fold > 0 && (
                <div
                  style={{ width: `${step.gtoFrequencies.fold}%` }}
                  className="h-full bg-slate-600 flex items-center justify-center text-[9px] font-bold text-white"
                >
                  {step.gtoFrequencies.fold > 15 ? `Fold ${step.gtoFrequencies.fold}%` : ''}
                </div>
              )}
              {step.gtoFrequencies.call > 0 && (
                <div
                  style={{ width: `${step.gtoFrequencies.call}%` }}
                  className="h-full bg-emerald-600 flex items-center justify-center text-[9px] font-bold text-white"
                >
                  {step.gtoFrequencies.call > 15 ? `Call ${step.gtoFrequencies.call}%` : ''}
                </div>
              )}
              {step.gtoFrequencies.raise > 0 && (
                <div
                  style={{ width: `${step.gtoFrequencies.raise}%` }}
                  className="h-full bg-blue-600 flex items-center justify-center text-[9px] font-bold text-white"
                >
                  {step.gtoFrequencies.raise > 15 ? `Raise ${step.gtoFrequencies.raise}%` : ''}
                </div>
              )}
            </div>

            {/* Direct Action Buttons - Always in full view without scrolling */}
            <div className="flex items-center gap-2 pt-0.5">
              <button
                onClick={() => onOpenRangeViewer(step.handStrengthName?.split(':')[1]?.trim())}
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700/80 transition-all shrink-0"
              >
                Rango
              </button>

              <button
                onClick={onNext}
                className="flex-1 h-[44px] rounded-xl bg-[#2563EB] hover:bg-blue-500 text-white font-[800] text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-md shadow-blue-600/30 uppercase tracking-wider"
              >
                <span>SIGUIENTE</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ---------------- SESSION TRACKER BAR ---------------- */}
        <div className="flex items-center justify-between px-2 pt-1 text-xs border-t border-slate-800/60">
          {/* Accuracy */}
          <div className="flex items-center gap-1.5 font-bold text-emerald-400">
            <Check className="w-3.5 h-3.5 stroke-[3]" />
            <span>
              {sessionCorrectCount}/{sessionHandsCount || 10} ({sessionHandsCount > 0 ? Math.round((sessionCorrectCount / sessionHandsCount) * 100) : 0}%)
            </span>
          </div>

          {/* Segmented Dots */}
          <div className="flex items-center gap-1">
            {Array.from({ length: 10 }).map((_, i) => {
              const res = recentResults[i];
              let bg = 'bg-slate-800';
              if (res === 'optimal') bg = 'bg-emerald-400';
              else if (res === 'mixed') bg = 'bg-amber-400';
              else if (res === 'error') bg = 'bg-rose-500';

              return <div key={i} className={`w-2 h-2 rounded-full ${bg} transition-colors`} />;
            })}
          </div>

          {/* EV Balance */}
          <div className={`font-bold tabular-nums text-xs ${totalEvAccumulatedBB >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {totalEvAccumulatedBB >= 0 ? `+${totalEvAccumulatedBB.toFixed(1)}` : totalEvAccumulatedBB.toFixed(1)}
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 4. FLOATING HINT CARD MODAL (💡) */}
      {/* ============================================================== */}
      {showHint && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#0F172A] border border-slate-700 rounded-2xl p-4 max-w-xs w-full shadow-2xl flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-1.5 font-bold text-amber-400 text-sm">
                <Lightbulb className="w-4 h-4" />
                <span>Pista</span>
              </div>
              <button
                onClick={() => setShowHint(false)}
                className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between bg-slate-900/80 p-2 rounded-lg">
                <span className="text-slate-400">Posición:</span>
                <span className="font-bold text-sky-400">{step.hint.relativePosition} ({step.hint.relativePosition === 'IP' ? 'Con Posición' : 'Fuera de Posición'})</span>
              </div>

              <div className="flex items-center justify-between bg-slate-900/80 p-2 rounded-lg">
                <span className="text-slate-400">Pot Odds:</span>
                <span className="font-bold text-emerald-400">{step.hint.potOddsPct}%</span>
              </div>

              <div className="bg-slate-900/80 p-2 rounded-lg">
                <span className="text-slate-400 block mb-0.5">Board:</span>
                <span className="font-semibold text-slate-200">{step.hint.boardTexture}</span>
              </div>
            </div>

            <button
              onClick={() => setShowHint(false)}
              className="w-full py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-bold text-xs"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
