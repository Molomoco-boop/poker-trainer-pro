import React, { useState } from 'react';
import { HandStep, StakeLevel, Position, DecisionVerdict } from '../types/poker';
import { CardView } from './CardView';
import { ArrowLeft, Lightbulb, Sliders, Check, X as CloseIcon, ArrowRight } from 'lucide-react';
import { convertBBToEUR } from '../utils/difficultyEngine';
import { PreflopSituation } from '../data/preflopRanges';
import { cardsToHandLabel } from '../utils/handStrength';

export interface RangeRequest {
  hand?: string;
  situation: PreflopSituation;
  position: Position;
  opener?: Position;
}

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
  recentResults: DecisionVerdict[];
  progressLabel?: string;
  onSelectOption: (id: string) => void;
  onNext: () => void;
  onBack: () => void;
  onToggleUnits: () => void;
  onOpenLevelSettings: () => void;
  onOpenRangeViewer: (req: RangeRequest) => void;
}

type SeatCfg = {
  style: React.CSSProperties;
  chip: React.CSSProperties;
  shown: React.CSSProperties;
};

// Seat 0 = Hero bottom centre, then clockwise: bottom-left, top-left, top, top-right, bottom-right
const SEATS: SeatCfg[] = [
  { style: { bottom: '0%', left: '50%', transform: 'translateX(-50%)' },
    chip: { left: 'calc(100% + 6px)', top: '50%', transform: 'translateY(-50%)' },
    shown: { bottom: 'calc(100% + 4px)', left: '50%', transform: 'translateX(-50%)' } },
  { style: { bottom: '15%', left: '2%' },
    chip: { left: 'calc(100% + 4px)', top: '50%', transform: 'translateY(-50%)' },
    shown: { bottom: 'calc(100% + 4px)', left: '0' } },
  { style: { top: '15%', left: '2%' },
    chip: { left: 'calc(100% + 4px)', top: '50%', transform: 'translateY(-50%)' },
    shown: { top: 'calc(100% + 4px)', left: '0' } },
  { style: { top: '0%', left: '50%', transform: 'translateX(-50%)' },
    chip: { top: 'calc(100% + 4px)', left: '50%', transform: 'translateX(-50%)' },
    shown: { left: 'calc(100% + 6px)', top: '50%', transform: 'translateY(-50%)' } },
  { style: { top: '15%', right: '2%' },
    chip: { right: 'calc(100% + 4px)', top: '50%', transform: 'translateY(-50%)' },
    shown: { top: 'calc(100% + 4px)', right: '0' } },
  { style: { bottom: '15%', right: '2%' },
    chip: { right: 'calc(100% + 4px)', top: '50%', transform: 'translateY(-50%)' },
    shown: { bottom: 'calc(100% + 4px)', right: '0' } }
];

const SITUATION_BY_SPOT: Partial<Record<string, PreflopSituation>> = {
  RFI_OPEN: 'RFI',
  BB_DEFENSE: 'VS_OPEN',
  SB_VS_OPEN: 'VS_OPEN',
  '3BET_POT': 'VS_3BET'
};

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
  progressLabel,
  onSelectOption,
  onNext,
  onBack,
  onToggleUnits,
  onOpenLevelSettings,
  onOpenRangeViewer
}) => {
  const [showHint, setShowHint] = useState(false);
  const hero = step.players.find(p => p.isHero) || step.players[0];
  const isAction = step.questionType === 'action';

  const fmtBB = (v: number) => `${Math.round(v * 10) / 10}`;
  const money = (bb: number) => (displayUnits === 'bb' ? `${fmtBB(bb)} BB` : `${convertBBToEUR(bb, stake).toFixed(2)} €`);

  const selectedOpt = step.options.find(o => o.id === selectedOptionId);
  const verdict = selectedOpt?.verdict || 'error';
  const isCorrectAnswer = selectedOpt?.isCorrect === true;
  const optimalLabels = step.options.filter(o => o.isCorrect).map(o => o.label).join(' / ');

  const situation = step.street === 'preflop' ? SITUATION_BY_SPOT[step.spotType] : undefined;
  const opener = step.players
    .filter(p => !p.isHero && p.status === 'active')
    .sort((a, b) => b.currentBet - a.currentBet)[0]?.position;

  const labelFor = (label: string, amountBB?: number) => {
    if (amountBB === undefined || displayUnits === 'bb') return { main: label, sub: undefined as string | undefined };
    const eur = `${convertBBToEUR(amountBB, stake).toFixed(2)} €`;
    return { main: label.replace(/[\d.]+ BB/, eur), sub: `${fmtBB(amountBB)} BB` };
  };

  const barColor = (id: string) =>
    id === 'fold' ? 'bg-slate-600' : id === 'call' || id === 'check' ? 'bg-emerald-600' : id === 'limp' ? 'bg-slate-500' : 'bg-blue-600';

  return (
    <div className="w-full h-[100dvh] max-h-[100dvh] flex flex-col justify-between bg-[radial-gradient(circle_at_50%_35%,#0F172A_0%,#060913_100%)] text-slate-100 select-none overflow-hidden relative font-sans">
      {/* Header */}
      <div className="w-full px-3 safe-top pb-1 flex flex-col shrink-0 z-30">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-xl bg-slate-900/80 border border-slate-700/60 flex items-center justify-center text-slate-300 active:scale-95"
            aria-label="Salir"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center bg-[#0F172A]/90 border border-slate-700/80 rounded-full p-0.5 shadow-lg">
            <button
              onClick={onOpenLevelSettings}
              className="h-10 px-3 text-[12px] font-[800] text-slate-200 flex items-center gap-1 border-r border-slate-700/60"
              aria-label="Nivel y stake"
            >
              <span>{stake}</span>
              <Sliders className="w-3.5 h-3.5 text-slate-400" />
            </button>
            <button
              onClick={onToggleUnits}
              className="h-10 min-w-[44px] px-3 rounded-full text-[12px] font-black flex items-center justify-center bg-[#2563EB] text-white"
              aria-label="Cambiar BB / €"
            >
              {displayUnits === 'bb' ? 'BB' : '€'}
            </button>
          </div>

          <button
            onClick={() => setShowHint(true)}
            className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 active:scale-95"
            aria-label="Pista"
          >
            <Lightbulb className="w-5 h-5" />
          </button>
        </div>
        <div className="mt-1 px-1 text-[10px] text-slate-500 truncate text-center">{step.actionTicker}</div>
      </div>

      {/* Table */}
      <div className="flex-1 w-full flex items-center justify-center px-2 py-0.5 relative z-10 min-h-0">
        <div className="relative w-full max-w-[400px] h-full max-h-[440px] flex items-center justify-center">
          <div className="absolute inset-[3%] rounded-[150px] bg-[radial-gradient(ellipse_at_center,#13233C_0%,#0B1424_75%,#080E1A_100%)] border-[4px] border-[#1E3A5F] shadow-[0_20px_50px_rgba(0,0,0,0.85),inset_0_0_30px_rgba(0,0,0,0.85)] overflow-hidden">
            <div className="absolute inset-[14px] rounded-[136px] border border-sky-400/20 pointer-events-none" />
          </div>

          <div className="w-[66%] z-20 flex flex-col items-center justify-center gap-2 pointer-events-none">
            <div className="bg-[#0B1424]/90 border border-slate-700/80 px-3.5 py-1 rounded-full shadow whitespace-nowrap">
              <span className="text-[15px] font-black text-amber-300 tabular-nums">{money(step.pot)}</span>
              {displayUnits === 'units' && (
                <span className="text-[11px] text-slate-300 font-semibold tabular-nums ml-1.5">({fmtBB(step.pot)} BB)</span>
              )}
            </div>

            <div className="min-h-[76px] flex items-center justify-center gap-1">
              {step.communityCards.map((c, i) => (
                <CardView key={i} card={c} size="board" deckMode={deckColorMode} />
              ))}
            </div>

            <div className="bg-[#0F172A]/85 border border-sky-400/25 px-3 py-1 rounded-[10px] text-center shadow-md max-w-[100%]">
              <span className="text-[11px] font-semibold text-slate-200 leading-tight block truncate">{step.contextNotice}</span>
            </div>

            <div className="flex flex-col items-center mt-1">
              {hero.cards && (
                <div className="flex items-center gap-2">
                  <CardView card={hero.cards[0]} size="hero" deckMode={deckColorMode} className="rotate-[-3deg]" />
                  <CardView card={hero.cards[1]} size="hero" deckMode={deckColorMode} className="rotate-[3deg]" />
                </div>
              )}
              {showHandStrength && step.handStrengthName && (
                <div className="mt-1 bg-black/60 border border-slate-700/50 px-2 py-0.5 rounded-full text-[10px] font-bold text-sky-300 truncate max-w-[180px]">
                  {step.handStrengthName}
                </div>
              )}
            </div>
          </div>

          {step.players.map((p, idx) => {
            const cfg = SEATS[idx] || SEATS[0];
            const isFolded = p.status === 'folded';
            return (
              <div key={p.id} className="absolute z-20" style={cfg.style} data-seat={idx} data-pos={p.position}>
                <div className="relative flex flex-col items-center">
                  <div
                    className={`seat-node w-[70px] h-[48px] rounded-[11px] flex flex-col items-center justify-center shadow-lg relative ${
                      p.isHero
                        ? 'bg-[#0F172A] border-[2px] border-[#38BDF8] shadow-[0_0_12px_rgba(56,189,248,0.4)]'
                        : isFolded
                        ? 'bg-[#060A14] border border-[#334155] opacity-[0.32]'
                        : 'bg-[#0F172A] border-[1.5px] border-[#2563EB]'
                    }`}
                  >
                    <span className="text-[14px] font-black text-white leading-none">{p.position}</span>
                    <span className="text-[12px] font-bold text-slate-200 leading-none mt-1 tabular-nums whitespace-nowrap">
                      {isFolded ? 'FOLD' : money(p.stack)}
                    </span>
                  </div>

                  {p.isDealer && (
                    <div className="dealer-btn absolute -top-1.5 -right-1.5 w-[22px] h-[22px] rounded-full bg-[#FACC15] border border-white text-black font-black text-[10px] flex items-center justify-center shadow-md z-30">
                      D
                    </div>
                  )}

                  {!p.isHero && p.cards && (
                    <div className="absolute flex gap-0.5 z-30" style={cfg.shown}>
                      <CardView card={p.cards[0]} size="xs" deckMode={deckColorMode} />
                      <CardView card={p.cards[1]} size="xs" deckMode={deckColorMode} />
                    </div>
                  )}

                  {p.currentBet > 0 && (
                    <div className="bet-chip absolute bg-black/80 border border-slate-700/60 rounded-full px-1.5 py-0.5 shadow whitespace-nowrap z-30" style={cfg.chip}>
                      <span className="text-[11px] font-bold text-white tabular-nums">{money(p.currentBet)}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Decision / feedback */}
      <div className="w-full shrink-0 z-30 bg-[#090E17]/95 border-t border-slate-800/80 p-2 safe-bottom flex flex-col gap-1.5">
        {!isSubmitted ? (
          <div className="w-full flex flex-col gap-2 animate-fadeIn">
            <div className="text-center text-xs font-semibold text-slate-300">{step.prompt}</div>
            <div className={`grid gap-2 ${step.options.length <= 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {step.options.map(opt => {
                const isPassive = opt.id === 'call' || opt.id === 'check';
                const isAggro = !isPassive && opt.id !== 'fold' && opt.id !== 'limp';
                let style = 'bg-[#111827] border-[1.5px] border-[#374151] text-[#F87171]';
                if (!isAction) style = 'bg-[#121929] border-[1.5px] border-blue-500/40 text-blue-200';
                else if (opt.id === 'limp') style = 'bg-[#111827] border-[1.5px] border-[#374151] text-slate-300';
                else if (isPassive) style = 'bg-[#0F2942] border-[1.5px] border-[#2563EB] text-white';
                else if (isAggro) style = 'bg-[#172554] border-[1.5px] border-[#3B82F6] text-[#60A5FA]';
                const { main, sub } = labelFor(opt.label, opt.amountBB);
                return (
                  <button
                    key={opt.id}
                    onClick={() => onSelectOption(opt.id)}
                    className={`option-btn min-h-[56px] rounded-[14px] p-1.5 flex flex-col items-center justify-center font-[700] text-[14px] leading-tight active:scale-95 shadow-md ${style}`}
                  >
                    <span className="tracking-wide">{main}</span>
                    {sub && <span className="text-[10px] font-semibold opacity-75 tabular-nums">{sub}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ) : isCorrectAnswer ? (
          <button onClick={onNext} className="w-full flex flex-col gap-1.5 animate-fadeIn text-left" aria-label="Siguiente">
            <div className="w-full flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/40 rounded-xl p-2.5 min-h-[56px]">
              <div className="w-7 h-7 rounded-full bg-emerald-500/25 flex items-center justify-center">
                <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
              </div>
              <span className="text-sm font-[800] text-emerald-300">Correcto</span>
              <span className="ml-auto text-[11px] text-emerald-400/80 tabular-nums">{selectedOpt?.label}</span>
            </div>
            <div className="w-full h-0.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-400 rounded-full animate-shrinkBar" />
            </div>
          </button>
        ) : (
          <div
            className="feedback-card w-full bg-[#0F172A] border-t-2 rounded-t-[14px] p-2 flex flex-col gap-1.5 animate-fadeIn"
            style={{ borderColor: verdict === 'mixed' ? '#F59E0B' : '#EF4444' }}
          >
            <div className="flex items-center justify-between gap-2">
              {verdict === 'mixed' ? (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-[800] whitespace-nowrap">
                  Mixta {selectedOpt?.evDiff}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[11px] font-[800] flex items-center gap-1 whitespace-nowrap">
                  <CloseIcon className="w-3 h-3 stroke-[3]" /> {isAction ? `Error ${selectedOpt?.evDiff}` : 'Error'}
                </span>
              )}
              <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1 truncate">
                <Check className="w-3.5 h-3.5 stroke-[3] shrink-0" />
                <span className="truncate">{optimalLabels}</span>
              </span>
            </div>

            {isAction && (
              <div className="gto-bar w-full h-[18px] rounded-md overflow-hidden flex bg-slate-900 border border-slate-700/80">
                {step.options.filter(o => o.frequencyGTO > 0).map(o => (
                  <div
                    key={o.id}
                    style={{ width: `${o.frequencyGTO}%` }}
                    className={`h-full ${barColor(o.id)} flex items-center justify-center text-[9px] font-bold text-white whitespace-nowrap overflow-hidden`}
                  >
                    {o.frequencyGTO >= 18 ? `${o.label.split(' ')[0]} ${o.frequencyGTO}%` : ''}
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 pt-0.5">
              {situation && hero.cards && (
                <button
                  onClick={() => onOpenRangeViewer({ hand: cardsToHandLabel(hero.cards!), situation, position: step.heroPosition, opener })}
                  className="h-11 px-3 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-700/80 shrink-0"
                >
                  Rango
                </button>
              )}
              <button
                onClick={onNext}
                className="flex-1 h-11 rounded-xl bg-[#2563EB] text-white font-[800] text-xs flex items-center justify-center gap-1.5 active:scale-95 shadow-md shadow-blue-600/30 uppercase tracking-wider"
              >
                <span>SIGUIENTE</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Session bar */}
        <div className="flex items-center justify-between px-2 pt-1 text-xs border-t border-slate-800/60">
          <div className="flex items-center gap-1.5 font-bold text-emerald-400 tabular-nums">
            <Check className="w-3.5 h-3.5 stroke-[3]" />
            <span>{progressLabel ?? `${sessionCorrectCount}/${sessionHandsCount}`}</span>
          </div>
          <div className="flex items-center gap-1">
            {Array.from({ length: 10 }).map((_, i) => {
              const res = recentResults[i];
              const bg = res === 'optimal' ? 'bg-emerald-400' : res === 'mixed' ? 'bg-amber-400' : res === 'error' ? 'bg-rose-500' : 'bg-slate-800';
              return <div key={i} className={`w-2 h-2 rounded-full ${bg}`} />;
            })}
          </div>
          <div className={`font-bold tabular-nums text-xs ${totalEvAccumulatedBB >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {totalEvAccumulatedBB.toFixed(1)}
          </div>
        </div>
      </div>

      {showHint && (
        <div className="fixed inset-0 z-[70] bg-black/80 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#0F172A] border border-slate-700 rounded-2xl p-4 max-w-xs w-full shadow-2xl flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-1.5 font-bold text-amber-400 text-sm">
                <Lightbulb className="w-4 h-4" />
                <span>Pista</span>
              </div>
              <button onClick={() => setShowHint(false)} className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400" aria-label="Cerrar">
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 text-xs">
              {isAction && (
                <div className="flex items-center justify-between bg-slate-900/80 p-2 rounded-lg">
                  <span className="text-slate-400">Posición</span>
                  <span className="font-bold text-sky-400">{step.hint.relativePosition}</span>
                </div>
              )}
              {step.hint.potOddsPct > 0 && (
                <div className="flex items-center justify-between bg-slate-900/80 p-2 rounded-lg">
                  <span className="text-slate-400">Pot odds</span>
                  <span className="font-bold text-emerald-400">{step.hint.potOddsPct}%</span>
                </div>
              )}
              <div className="flex items-center justify-between bg-slate-900/80 p-2 rounded-lg gap-2">
                <span className="text-slate-400">{isAction ? 'Board' : 'Clave'}</span>
                <span className="font-semibold text-slate-200 text-right">{step.hint.boardTexture}</span>
              </div>
            </div>
            <button onClick={() => setShowHint(false)} className="w-full h-11 bg-blue-600 rounded-xl text-white font-bold text-xs">
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
