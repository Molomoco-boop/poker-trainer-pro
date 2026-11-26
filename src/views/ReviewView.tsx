import React, { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { PokerTable } from '../components/PokerTable';
import { GradeBadge, Panel, Delta } from '../components/ui';
import { useGame } from '../context/useGame';
import { useBackLayer } from '../navigation/BackProvider';
import { loadHands, isErrorOrDoubt, worstGrade, ReviewHand, ReviewDecision } from '../utils/handHistory';
import { cardsToHandLabel } from '../utils/handStrength';
import { StakeLevel } from '../types/poker';
import { PROFILE_ES, BotProfile } from '../utils/botProfiles';
import { useI18n } from '../i18n';

export const ReviewView: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const { stats, toggleDisplayUnits } = useGame();
  const { t } = useI18n();
  const [filterErrors, setFilterErrors] = useState(false);
  const [open, setOpen] = useState<ReviewHand | null>(null);
  const [idx, setIdx] = useState(0);
  const [tick, setTick] = useState(0);
  const hands = useMemo(() => loadHands(), [tick, open]);
  const list = filterErrors ? hands.filter(isErrorOrDoubt) : hands;

  useBackLayer(!!open, () => { setOpen(null); setIdx(0); });

  if (open) {
    return (
      <Replay
        hand={open}
        idx={idx}
        setIdx={setIdx}
        onClose={() => { setOpen(null); setIdx(0); setTick(n => n + 1); }}
        stake={stats.stake}
        displayUnits={stats.preferences.displayUnits}
        deckColorMode={stats.preferences.deckColorMode}
        rating={Math.round(stats.rating.r)}
        onToggleUnits={toggleDisplayUnits}
      />
    );
  }

  return (
    <div className="review-view flex flex-col h-[100dvh] bg-bg text-txt">
      <div className="px-2 safe-top pb-1 flex items-center gap-2 border-b border-line shrink-0">
        <button onClick={onExit} className="w-10 h-10 flex items-center justify-center" aria-label="Back">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0 text-[15px] font-semibold text-hi">{t.handReview}</div>
      </div>
      <div className="px-3 py-2 flex gap-1.5 shrink-0">
        <button
          className={`review-filter-all h-10 px-3 rounded-[4px] text-[13px] font-semibold border ${!filterErrors ? 'bg-acc text-white border-acc' : 'border-line text-txt'}`}
          onClick={() => setFilterErrors(false)}
        >
          {t.all}
        </button>
        <button
          className={`review-filter-errors h-10 px-3 rounded-[4px] text-[13px] font-semibold border ${filterErrors ? 'bg-acc text-white border-acc' : 'border-line text-txt'}`}
          onClick={() => setFilterErrors(true)}
        >
          {t.errorsDoubts}
        </button>
      </div>
      <div className="review-list flex-1 overflow-y-auto px-3 pb-4">
        {list.length === 0 ? (
          <Panel className="p-3 text-[13px] text-dim">
            {hands.length === 0 ? t.noHandsYet : t.noErrorsYet}
          </Panel>
        ) : (
          <Panel className="overflow-hidden">
            {list.map(h => {
              const g = worstGrade(h);
              return (
                <button
                  key={h.id}
                  className="review-item w-full text-left flex items-center gap-2 px-3 min-h-[56px] border-b border-line last:border-b-0 active:bg-panel2"
                  data-grade={g || ''}
                  onClick={() => { setOpen(h); setIdx(0); }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-semibold text-hi truncate">
                      Mano {h.handNo} · {h.heroPos} · {cardsToHandLabel(h.heroCards)}
                    </div>
                    <div className="text-[11px] text-dim truncate">{h.awardText}</div>
                  </div>
                  {g && <GradeBadge grade={g} />}
                  <Delta value={h.delta} className="text-[14px]" />
                </button>
              );
            })}
          </Panel>
        )}
      </div>
    </div>
  );
};

const STREET_ES = { preflop: 'Preflop', flop: 'Flop', turn: 'Turn', river: 'River' } as const;

function Replay({
  hand, idx, setIdx, onClose, stake, displayUnits, deckColorMode, rating, onToggleUnits
}: {
  hand: ReviewHand;
  idx: number;
  setIdx: (n: number) => void;
  onClose: () => void;
  stake: StakeLevel;
  displayUnits: 'bb' | 'units';
  deckColorMode: '4color' | '2color';
  rating: number;
  onToggleUnits: () => void;
}) {
  const decs = hand.decisions;
  const atEnd = idx >= decs.length;
  const d: ReviewDecision | undefined = decs[idx];
  const total = decs.length + 1;
  const profiles = uniqueProfiles(hand.profiles);

  if (d && !atEnd) {
    const step = decisionToStep(d, hand);
    return (
      <div className="review-replay relative">
        <PokerTable
          step={step}
          stake={stake}
          displayUnits={displayUnits}
          deckColorMode={deckColorMode}
          selectedOptionId={d.selectedId}
          isSubmitted
          rating={rating}
          delta={null}
          streak={0}
          title={`Hand ${hand.handNo} · ${idx + 1}/${total}`}
          recentGrades={decs.map(x => x.grade)}
          doubted={d.doubted}
          onSelectOption={() => {}}
          onNext={() => setIdx(Math.min(total - 1, idx + 1))}
          onHold={() => {}}
          onBack={onClose}
          onToggleUnits={onToggleUnits}
          onOpenRangeViewer={() => {}}
        />
        <div className="review-nav pointer-events-none absolute top-[52px] left-0 right-0 z-[80] flex justify-center">
          <div className="pointer-events-auto flex items-center gap-2 bg-bg/90 border border-line rounded-[4px] px-2 py-1">
            <button className="review-prev h-10 w-10 flex items-center justify-center" disabled={idx <= 0} onClick={() => setIdx(Math.max(0, idx - 1))} aria-label="Previous">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="text-[12px] text-dim num">{idx + 1}/{total}</span>
            <button className="review-next h-10 w-10 flex items-center justify-center" onClick={() => setIdx(idx + 1)} aria-label="Next">
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="review-end flex flex-col h-[100dvh] bg-bg text-txt">
      <div className="px-2 safe-top pb-1 flex items-center gap-2 border-b border-line shrink-0">
        <button onClick={onClose} className="w-10 h-10 flex items-center justify-center" aria-label="Back">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0 text-[15px] font-semibold text-hi">Mano {hand.handNo} · {hand.heroPos}</div>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        <Panel className="p-3 flex flex-col gap-1.5">
          <div className="text-[13px] text-dim">{cardsToHandLabel(hand.heroCards)} · {hand.heroPos}</div>
          <div className="cash-end-text text-[16px] text-hi font-semibold">{hand.awardText}</div>
          <div className="flex items-baseline gap-2">
            <span className="num text-[20px] font-semibold text-hi">{hand.stacksAfter[0]} BB</span>
            <Delta value={hand.delta} className="text-[16px]" />
          </div>
          {profiles && <div className="text-[12px] text-dim">{profiles}</div>}
        </Panel>
        <Panel className="p-3">
          <div className="text-[11px] uppercase tracking-[0.08em] text-dim mb-1">Acciones</div>
          {(['preflop', 'flop', 'turn', 'river'] as const).map(st => {
            const acts = hand.actions.filter(a => a.street === st);
            if (!acts.length && st !== 'preflop') return null;
            return (
              <div key={st} className="text-[13px] text-txt py-0.5">
                <span className="text-dim">{STREET_ES[st]} · </span>
                {acts.length ? acts.map(a => a.text).join(' · ') : '—'}
              </div>
            );
          })}
        </Panel>
      </div>
      <div className="px-3 pb-[max(12px,env(safe-area-inset-bottom))] flex gap-2">
        {decs.length > 0 && (
          <button className="review-prev flex-1 h-11 rounded-[4px] border border-line text-hi font-semibold" onClick={() => setIdx(decs.length - 1)}>
            Previous decision
          </button>
        )}
        <button className="review-close flex-1 h-11 rounded-[4px] bg-acc text-white font-semibold" onClick={onClose}>Lista</button>
      </div>
    </div>
  );
}

function uniqueProfiles(profiles: BotProfile[]): string | null {
  const bots = (profiles || []).slice(1);
  if (!bots.length) return null;
  const u = [...new Set(bots)];
  return 'Villains: ' + u.map(p => PROFILE_ES[p]).join(', ');
}

function decisionToStep(d: ReviewDecision, hand: ReviewHand) {
  return {
    id: d.stepId,
    street: d.street,
    pot: d.pot,
    communityCards: d.board,
    players: d.players,
    heroPosition: hand.heroPos,
    spotType: 'RFI_OPEN' as const,
    relativePosition: 'IP' as const,
    actionTicker: d.ticker,
    contextNotice: d.notice,
    prompt: 'Your action',
    questionType: 'action' as const,
    options: d.options,
    hint: { relativePosition: 'IP' as const, potOddsPct: 0, boardTexture: '', spr: 0 },
    why: d.why,
    detail: [],
    concept: 'cbet' as const,
    difficulty: 1500,
    review: { kind: 'post' as const, spot: 'RFI_OPEN' as const, heroPos: hand.heroPos, street: d.street, decision: 'lead' as const, hand: cardsToHandLabel(hand.heroCards), concept: 'cbet' as const }
  };
}
