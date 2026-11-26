import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useGame } from '../context/useGame';
import { sprintHand, sprintCorrect, SprintHand, SPRINT_SECONDS, SPRINT_LIVES } from '../utils/sessionPlanner';
import { handLabelToCards } from '../utils/fullHandEngine';
import { CardView } from '../components/CardView';
import { Panel, BtnPrimary, BtnFlat } from '../components/ui';
import { playSuccessSound, playErrorSound } from '../utils/audio';
import { useBackLayer } from '../navigation/BackProvider';
import { useI18n } from '../i18n';

/** "Open?" 60 s: open or fold from a seat, three mistakes end it (Puzzle Rush style). */
export const SprintView: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const { stats, recordSprint } = useGame();
  const { t } = useI18n();
  const [running, setRunning] = useState(false);
  const [hand, setHand] = useState<SprintHand>(() => sprintHand());
  const [cards, setCards] = useState(() => handLabelToCards(hand.hand));
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(SPRINT_LIVES);
  const [left, setLeft] = useState(SPRINT_SECONDS);
  const [misses, setMisses] = useState<SprintHand[]>([]);
  const [flash, setFlash] = useState<'ok' | 'ko' | null>(null);
  const saved = useRef(false);
  const over = running && (left === 0 || lives === 0);
  const [hideEnd, setHideEnd] = useState(false);
  useBackLayer(over && !hideEnd, () => setHideEnd(true));

  useEffect(() => {
    if (!running || over) return;
    const t = setInterval(() => setLeft(l => Math.max(0, l - 1)), 1000);
    return () => clearInterval(t);
  }, [running, over]);


  useEffect(() => {
    if (over && !saved.current) {
      saved.current = true;
      recordSprint(score);
    }
  }, [over, score, recordSprint]);

  const next = () => {
    const h = sprintHand();
    setHand(h);
    setCards(handLabelToCards(h.hand));
  };

  const answer = (opens: boolean) => {
    if (over) return;
    if (!running) setRunning(true);
    const ok = sprintCorrect(hand, opens);
    const { soundEnabled, volume } = stats.preferences;
    if (soundEnabled) (ok ? playSuccessSound : playErrorSound)(volume);
    if (ok) setScore(s => s + 1);
    else {
      setLives(l => l - 1);
      setMisses(m => [...m, hand]);
    }
    setFlash(ok ? 'ok' : 'ko');
    setTimeout(() => setFlash(null), 180);
    next();
  };

  const restart = () => {
    saved.current = false;
    setHideEnd(false);
    setScore(0); setLives(SPRINT_LIVES); setLeft(SPRINT_SECONDS); setMisses([]); setRunning(false);
    next();
  };

  return (
    <div className="sprint-view w-full h-[100dvh] flex flex-col bg-bg overflow-hidden">
      <div className="safe-top px-2 pb-1 flex items-center gap-2 border-b border-line shrink-0">
        <button onClick={onExit} className="w-10 h-10 flex items-center justify-center text-txt" aria-label={t.exit}><ArrowLeft className="w-5 h-5" /></button>
        <span className="text-[15px] text-hi font-semibold">Open?</span>
        <span className="ml-auto num text-[13px] text-dim">{t.best} {stats.sprintBest}</span>
      </div>

      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <span className={`sprint-time num text-[28px] font-semibold ${left <= 10 ? 'text-badtx' : 'text-hi'}`}>{Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</span>
        <span className="sprint-score num text-[40px] font-semibold text-hi">{score}</span>
        <div className="flex gap-1.5" aria-label="Lives">
          {Array.from({ length: SPRINT_LIVES }).map((_, i) => (
            <span key={i} className={`w-3.5 h-3.5 rounded-full ${i < lives ? 'bg-bad' : 'bg-line'}`} />
          ))}
        </div>
      </div>

      <div className={`flex-1 min-h-0 flex flex-col items-center justify-center gap-4 transition-colors ${flash === 'ok' ? 'bg-good/15' : flash === 'ko' ? 'bg-bad/15' : ''}`}>
        <span className="sprint-pos text-[40px] font-bold text-hi leading-none">{hand.pos}</span>
        <span className="text-[13px] text-dim">{t.foldedToYou}</span>
        <div className="flex gap-2">
          <CardView card={cards[0]} size="hero" deckMode={stats.preferences.deckColorMode} />
          <CardView card={cards[1]} size="hero" deckMode={stats.preferences.deckColorMode} />
        </div>
        {!running && <span className="text-[13px] text-txt text-center px-4">{t.clockStarts}</span>}
      </div>

      <div className="grid grid-cols-2 gap-2 px-2 pt-2 safe-bottom border-t border-line bg-panel shrink-0">
        <button onClick={() => answer(false)} className="sprint-fold h-16 rounded-[4px] bg-panel2 border border-line text-txt text-[18px] font-semibold">{t.fold}</button>
        <button onClick={() => answer(true)} className="sprint-open h-16 rounded-[4px] bg-good text-white text-[18px] font-semibold">{t.raise}</button>
      </div>

      {over && !hideEnd && (
        <div className="sprint-end fixed inset-0 z-[70] bg-black/75 flex items-center justify-center p-4">
          <Panel className="w-full max-w-xs p-4 flex flex-col gap-3">
            <span className="text-[13px] text-dim uppercase tracking-[0.08em]">{lives === 0 ? t.threeMisses : t.timeUp}</span>
            <div className="flex items-baseline gap-3">
              <span className="num text-[44px] leading-none font-semibold text-hi">{score}</span>
              <span className="num text-[13px] text-txt">{t.best} {Math.max(stats.sprintBest, score)}</span>
            </div>
            {misses.length > 0 && (
              <div className="text-[13px] text-txt space-y-0.5">
                {misses.map((m, i) => (
                  <div key={i} className="num">{m.pos} {m.hand}: <span className="text-hi">{m.raise >= 100 ? 'opens' : 'folds'}</span></div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <BtnFlat onClick={onExit} className="flex-1">{t.exit}</BtnFlat>
              <BtnPrimary onClick={restart} className="flex-1">{t.again}</BtnPrimary>
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
};
