import React from 'react';
import { HandStep, StakeLevel, Position, Grade } from '../types/poker';
import { CardView } from './CardView';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { convertBBToEUR } from '../utils/difficultyEngine';
import { PreflopSituation } from '../data/preflopRanges';
import { cardsToHandLabel } from '../utils/handStrength';
import { mixedLine } from '../utils/fullHandEngine';
import { GradeBadge, Delta } from './ui';
import { GRADE_STYLE } from './gradeStyle';

export interface RangeRequest {
  hand?: string;
  situation: PreflopSituation;
  position: Position;
  opener?: Position;
}

interface PokerTableProps {
  step: HandStep;
  /** What happened after a correct answer that ended the hand. */
  endNote?: string;
  stake: StakeLevel;
  displayUnits: 'bb' | 'units';
  deckColorMode: '4color' | '2color';
  selectedOptionId: string | null;
  isSubmitted: boolean;
  /** Current rating and the change from the last answer. */
  rating: number;
  delta: number | null;
  streak: number;
  /** Session label, e.g. "Diaria 3/10". */
  title?: string;
  recentGrades: Grade[];
  /** Answer given fast but wrong: highlighted (confident mistake). */
  fastError?: boolean;
  doubted?: boolean;
  onDoubt?: () => void;
  onSelectOption: (id: string) => void;
  onNext: () => void;
  onBack: () => void;
  onToggleUnits: () => void;
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

const BAR_LABEL: Record<string, string> = {
  fold: 'Fold', call: 'Pagar', check: 'Check', bet_small: 'Peq.', bet_big: 'Grande', raise: 'Subir', '3bet': '3-bet', '4bet': '4-bet', jam: 'All-in'
};
const barColor = (id: string) => (id === 'fold' ? 'bg-[#5a5754]' : id === 'call' || id === 'check' ? 'bg-good' : 'bg-acc');

export const PokerTable: React.FC<PokerTableProps> = ({
  step, stake, displayUnits, deckColorMode, endNote, selectedOptionId, isSubmitted,
  rating, delta, streak, title, recentGrades, fastError, doubted, onDoubt,
  onSelectOption, onNext, onBack, onToggleUnits, onOpenRangeViewer
}) => {
  const hero = step.players.find(p => p.isHero) || step.players[0];
  const isAction = step.questionType === 'action';
  const fmtBB = (v: number) => `${Math.round(v * 10) / 10}`;
  const money = (bb: number) => (displayUnits === 'bb' ? `${fmtBB(bb)} BB` : `${convertBBToEUR(bb, stake).toFixed(2)} €`);

  const selectedOpt = step.options.find(o => o.id === selectedOptionId);
  const grade: Grade = selectedOpt?.grade || 'error';
  const isCorrectAnswer = selectedOpt?.isCorrect === true;
  const best = [...step.options].sort((a, b) => b.frequencyGTO - a.frequencyGTO)[0];
  const okLabels = step.options.filter(o => o.isCorrect).map(o => o.label).join(' / ');
  const mixLine = isAction ? mixedLine(step.options) : null;
  const needPct = (amount?: number) => (amount && step.pot > 0 ? Math.round((amount / (step.pot + amount)) * 100) : 0);

  const situation = step.street === 'preflop' ? SITUATION_BY_SPOT[step.spotType] : undefined;
  const opener = step.players.filter(p => !p.isHero && p.status === 'active').sort((a, b) => b.currentBet - a.currentBet)[0]?.position;

  const labelFor = (label: string, amountBB?: number) => {
    if (amountBB === undefined || displayUnits === 'bb') return { main: label, sub: undefined as string | undefined };
    return { main: label.replace(/[\d.]+ BB/, `${convertBBToEUR(amountBB, stake).toFixed(2)} €`), sub: `${fmtBB(amountBB)} BB` };
  };

  return (
    <div className="w-full h-[100dvh] max-h-[100dvh] flex flex-col bg-bg text-txt select-none overflow-hidden relative">
      {/* Header: back · rating ± · streak · units */}
      <div className="w-full px-2 safe-top pb-1 shrink-0 flex items-center gap-2 border-b border-line">
        <button onClick={onBack} className="w-10 h-10 flex items-center justify-center text-txt" aria-label="Salir">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0 flex items-baseline gap-2">
          <span className="table-rating num text-[22px] leading-none font-semibold text-hi">{rating}</span>
          <Delta value={delta} className="text-[15px]" />
          {title && <span className="text-[12px] text-dim truncate">{title}</span>}
        </div>
        <span className="streak num text-[13px] text-txt whitespace-nowrap" aria-label="Racha">Racha <b className="text-hi">{streak}</b></span>
        <button onClick={onToggleUnits} className="h-10 min-w-[40px] px-2 text-[12px] font-semibold text-txt border border-line rounded-[4px]" aria-label="Cambiar BB / €">
          {displayUnits === 'bb' ? 'BB' : '€'}
        </button>
      </div>
      <div className="px-3 pt-1 text-[11px] text-dim truncate text-center shrink-0">{step.actionTicker}</div>

      {/* Table */}
      <div className="flex-1 w-full flex items-center justify-center px-2 relative min-h-0">
        <div className="relative w-full max-w-[400px] h-full max-h-[440px] flex items-center justify-center">
          <div className="absolute inset-[3%] rounded-[150px] bg-felt border-2 border-feltline" />

          <div className="w-[66%] z-20 flex flex-col items-center justify-center gap-2 pointer-events-none">
            <div className="px-3 py-0.5 rounded-[3px] bg-bg/70 whitespace-nowrap">
              <span className="num text-[15px] font-semibold text-hi">{money(step.pot)}</span>
              {displayUnits === 'units' && <span className="num text-[11px] text-txt ml-1.5">({fmtBB(step.pot)} BB)</span>}
            </div>
            <div className="min-h-[76px] flex items-center justify-center gap-1">
              {step.communityCards.map((c, i) => <CardView key={i} card={c} size="board" deckMode={deckColorMode} />)}
            </div>
            <div className="text-center max-w-full">
              <span className="text-[12px] text-hi leading-tight block truncate">
                {step.isReviewOfMistake && <span className="text-warn font-semibold">Repaso · </span>}
                {step.contextNotice}
              </span>
            </div>
            {hero.cards && (
              <div className="flex items-center gap-2 mt-1">
                <CardView card={hero.cards[0]} size="hero" deckMode={deckColorMode} />
                <CardView card={hero.cards[1]} size="hero" deckMode={deckColorMode} />
              </div>
            )}
          </div>

          {step.players.map((p, idx) => {
            const cfg = SEATS[idx] || SEATS[0];
            const isFolded = p.status === 'folded';
            return (
              <div key={p.id} className="absolute z-20" style={cfg.style} data-seat={idx} data-pos={p.position}>
                <div className="relative flex flex-col items-center">
                  <div className={`seat-node w-[70px] h-[46px] rounded-[4px] flex flex-col items-center justify-center ${
                    p.isHero ? 'bg-panel border-2 border-acc' : isFolded ? 'bg-bg border border-line opacity-40' : 'bg-panel border border-line'
                  }`}>
                    <span className="text-[13px] font-bold text-hi leading-none">{p.position}</span>
                    <span className="num text-[12px] text-txt leading-none mt-1 whitespace-nowrap">{isFolded ? 'Fold' : money(p.stack)}</span>
                  </div>
                  {p.isDealer && (
                    <div className="dealer-btn absolute -top-1.5 -right-1.5 w-[20px] h-[20px] rounded-full bg-hi text-bg font-bold text-[10px] flex items-center justify-center z-30">D</div>
                  )}
                  {!p.isHero && p.cards && (
                    <div className="absolute flex gap-0.5 z-30" style={cfg.shown}>
                      <CardView card={p.cards[0]} size="xs" deckMode={deckColorMode} />
                      <CardView card={p.cards[1]} size="xs" deckMode={deckColorMode} />
                    </div>
                  )}
                  {p.currentBet > 0 && (
                    <div className="bet-chip absolute bg-bg/85 rounded-[3px] px-1.5 py-0.5 whitespace-nowrap z-30" style={cfg.chip}>
                      <span className="num text-[11px] font-semibold text-hi">{money(p.currentBet)}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Decision / feedback */}
      <div className="w-full shrink-0 z-30 bg-panel border-t border-line px-2 pt-2 safe-bottom flex flex-col gap-1.5">
        {!isSubmitted ? (
          <div className="w-full flex flex-col gap-2">
            <div className="text-center text-[13px] text-txt">{step.prompt}</div>
            <div className={`grid gap-1.5 ${step.options.length <= 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {step.options.map(opt => {
                const { main, sub } = labelFor(opt.label, opt.amountBB);
                return (
                  <button
                    key={opt.id}
                    onClick={() => onSelectOption(opt.id)}
                    className={`option-btn min-h-[56px] rounded-[4px] p-1.5 flex flex-col items-center justify-center font-semibold text-[14px] leading-tight border border-line active:bg-line ${
                      opt.id === 'fold' ? 'bg-panel2 text-txt' : 'bg-panel2 text-hi'
                    }`}
                  >
                    <span>{main}</span>
                    {sub && <span className="num text-[10px] text-dim">{sub}</span>}
                    {isAction && opt.id === 'call' && needPct(opt.amountBB) > 0 && (
                      <span className="need-pct num text-[10px] font-normal text-acc">Necesitas {needPct(opt.amountBB)} %</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ) : isCorrectAnswer ? (
          <div onClick={onNext} role="button" aria-label="Siguiente" className="correct-card w-full flex flex-col gap-1 animate-fadeIn text-left cursor-pointer">
            <div className="w-full flex flex-col gap-1 border-l-4 border-good bg-bg/40 rounded-[3px] px-2.5 py-2 min-h-[56px]">
              <div className="flex items-center gap-2">
                <GradeBadge grade={grade} />
                <span className="text-[12px] text-txt truncate">{selectedOpt?.label}</span>
                <Delta value={delta} className="ml-auto text-[15px]" />
                {onDoubt && (
                  <button
                    onClick={e => { e.stopPropagation(); onDoubt(); }}
                    className={`doubt-chip h-10 px-3 rounded-[4px] text-[12px] font-semibold border ${doubted ? 'bg-warn border-warn text-black' : 'border-line text-txt'}`}
                  >
                    Dudé
                  </button>
                )}
              </div>
              {step.why && <span className="why-line text-[12px] leading-snug text-hi">{step.why}</span>}
              {mixLine && <span className="mix-line text-[12px] leading-snug text-warn">{mixLine}</span>}
              {endNote && <span className="text-[12px] text-acc">{endNote}</span>}
            </div>
            {!doubted && <div className="w-full h-0.5 bg-line overflow-hidden"><div className="h-full bg-good animate-shrinkBar" /></div>}
          </div>
        ) : (
          <div className={`feedback-card w-full flex flex-col gap-1.5 animate-fadeIn border-l-4 ${grade === 'imprecise' ? 'border-warn' : 'border-bad'} bg-bg/40 rounded-[3px] px-2.5 py-2 ${fastError ? 'fast-error ring-1 ring-warn' : ''}`}>
            <div className="flex items-center gap-2 min-w-0">
              <GradeBadge grade={grade} />
              <Delta value={delta} className="text-[15px]" />
              <span className="ml-auto text-[12px] text-goodtx font-semibold truncate">{isAction ? okLabels : best.label}</span>
            </div>
            {fastError && <span className="text-[11px] text-warn">Rápido y mal: repásalo</span>}
            {isAction && (
              <div className="gto-bar w-full h-[18px] rounded-[3px] overflow-hidden flex bg-bg">
                {step.options.filter(o => o.frequencyGTO > 0).map(o => (
                  <div key={o.id} style={{ width: `${o.frequencyGTO}%` }} className={`h-full ${barColor(o.id)} flex items-center justify-center text-[10px] font-semibold text-white whitespace-nowrap overflow-hidden`}>
                    {o.frequencyGTO >= 18 ? `${BAR_LABEL[o.id] || o.label.split(' ')[0]} ${o.frequencyGTO}%` : ''}
                  </div>
                ))}
              </div>
            )}
            {step.why && <div className="why-line text-[12px] leading-snug text-hi">{step.why}</div>}
            {mixLine && <div className="mix-line text-[12px] leading-snug text-warn">{mixLine}</div>}
            <div className="flex items-center gap-2 pt-0.5">
              {situation && hero.cards && (
                <button
                  onClick={() => onOpenRangeViewer({ hand: cardsToHandLabel(hero.cards!), situation, position: step.heroPosition, opener })}
                  className="h-11 px-3 rounded-[4px] bg-panel2 border border-line text-txt text-[13px] font-semibold shrink-0"
                >
                  Rango
                </button>
              )}
              <button onClick={onNext} className="flex-1 h-11 rounded-[4px] bg-acc text-white font-semibold text-[14px] flex items-center justify-center gap-1.5">
                Siguiente <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-1 h-4">
          {Array.from({ length: 12 }).map((_, i) => {
            const g = recentGrades[i];
            return <div key={i} className={`w-2.5 h-1.5 rounded-[1px] ${g ? GRADE_STYLE[g].split(' ')[0] : 'bg-line'}`} />;
          })}
        </div>
      </div>
    </div>
  );
};
