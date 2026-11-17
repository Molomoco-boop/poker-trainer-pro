import React, { useState } from 'react';
import { X, RefreshCw, Sparkles, TrendingUp, HelpCircle } from 'lucide-react';
import { Card, Rank, Suit } from '../types/poker';
import { RANKS, SUITS, evaluateHand } from '../utils/pokerEvaluator';
import { CardView } from './CardView';
import { detectCleanOuts } from '../utils/pokerMath';

interface OddsCalculatorModalProps {
  onClose: () => void;
}

export const OddsCalculatorModal: React.FC<OddsCalculatorModalProps> = ({ onClose }) => {
  const [heroCards, setHeroCards] = useState<Card[]>([
    { rank: 'A', suit: 's' },
    { rank: 'K', suit: 's' }
  ]);
  const [boardCards, setBoardCards] = useState<Card[]>([
    { rank: 'Q', suit: 's' },
    { rank: 'J', suit: 'd' },
    { rank: '4', suit: 's' }
  ]);

  const [activeSlot, setActiveSlot] = useState<'hero' | 'board'>('hero');
  const [potSize, setPotSize] = useState<number>(10.0);
  const [betToCall, setBetToCall] = useState<number>(3.0);

  const allSelectedCards = [...heroCards, ...boardCards];

  const handleCardClick = (card: Card) => {
    const isAlreadyChosen = allSelectedCards.some(c => c.rank === card.rank && c.suit === card.suit);
    if (isAlreadyChosen) return;

    if (activeSlot === 'hero') {
      if (heroCards.length < 2) {
        setHeroCards(prev => [...prev, card]);
        if (heroCards.length === 1) setActiveSlot('board');
      }
    } else {
      if (boardCards.length < 5) {
        setBoardCards(prev => [...prev, card]);
      }
    }
  };

  const removeHeroCard = (index: number) => {
    setHeroCards(prev => prev.filter((_, i) => i !== index));
    setActiveSlot('hero');
  };

  const removeBoardCard = (index: number) => {
    setBoardCards(prev => prev.filter((_, i) => i !== index));
    setActiveSlot('board');
  };

  const resetAll = () => {
    setHeroCards([]);
    setBoardCards([]);
    setActiveSlot('hero');
  };

  // Math & Outs analysis
  const draws = heroCards.length === 2 && boardCards.length >= 3
    ? detectCleanOuts([heroCards[0], heroCards[1]], boardCards)
    : { drawLabels: [], cleanOuts: [], totalCleanOutsCount: 0, equityTurnPct: 0, equityRiverPct: 0 };

  const currentHand = allSelectedCards.length >= 5 ? evaluateHand(allSelectedCards) : null;

  // Pot odds
  const finalPot = potSize + betToCall;
  const potOddsPct = betToCall > 0 ? Math.round((betToCall / finalPot) * 1000) / 10 : 0;
  const isProfitableCall = draws.equityRiverPct >= potOddsPct && potOddsPct > 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col justify-between p-3 select-none animate-fadeIn font-sans">
      
      {/* Top Header */}
      <div className="w-full bg-[#0F172A] border border-slate-800 rounded-2xl p-3 flex items-center justify-between shadow-xl shrink-0">
        <div>
          <h2 className="text-sm font-[800] text-white">Calculadora de Odds & Outs</h2>
          <p className="text-[11px] text-slate-400">Detector automático de proyectos y Regla del 2 y 4</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={resetAll}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
            title="Resetear cartas"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 w-full my-2 flex flex-col gap-2 overflow-y-auto pr-0.5">
        
        {/* Selected Cards Slots */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-3 flex flex-col gap-2 shadow-lg">
          <div className="flex items-center justify-between">
            {/* Hero Cards */}
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-bold text-slate-400">Tus cartas (Hero):</span>
              <div className="flex items-center gap-1.5">
                {[0, 1].map(i => {
                  const card = heroCards[i];
                  return (
                    <div
                      key={i}
                      onClick={() => card ? removeHeroCard(i) : setActiveSlot('hero')}
                      className={`w-[48px] h-[68px] rounded-lg border flex items-center justify-center cursor-pointer transition-all ${
                        !card
                          ? activeSlot === 'hero'
                            ? 'border-blue-500 bg-blue-500/10 border-dashed'
                            : 'border-slate-700 bg-slate-900 border-dashed'
                          : 'border-transparent shadow-md'
                      }`}
                    >
                      {card ? <CardView card={card} size="sm" /> : <span className="text-slate-500 text-xs font-bold">+</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Board Cards */}
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-bold text-slate-400">Comunitarias (Board):</span>
              <div className="flex items-center gap-1.5">
                {[0, 1, 2, 3, 4].map(i => {
                  const card = boardCards[i];
                  return (
                    <div
                      key={i}
                      onClick={() => card ? removeBoardCard(i) : setActiveSlot('board')}
                      className={`w-[48px] h-[68px] rounded-lg border flex items-center justify-center cursor-pointer transition-all ${
                        !card
                          ? activeSlot === 'board'
                            ? 'border-indigo-500 bg-indigo-500/10 border-dashed'
                            : 'border-slate-700 bg-slate-900 border-dashed'
                          : 'border-transparent shadow-md'
                      }`}
                    >
                      {card ? <CardView card={card} size="sm" /> : <span className="text-slate-500 text-xs font-bold">+</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Current Made Hand */}
          {currentHand && (
            <div className="text-[11px] font-bold text-sky-400 bg-slate-900/80 px-2.5 py-1 rounded-lg flex items-center justify-between">
              <span>Jugada actual: {currentHand.name}</span>
              <span className="text-slate-400 font-normal">{currentHand.descr}</span>
            </div>
          )}
        </div>

        {/* Automatic Draw Detector & Outs */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-3 flex flex-col gap-2 shadow-lg">
          <div className="flex items-center gap-1.5 text-xs font-[800] text-amber-400">
            <Sparkles className="w-4 h-4" />
            <span>Detector de Proyectos & Outs Limpios</span>
          </div>

          {draws.drawLabels.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {draws.drawLabels.map(l => (
                <span key={l} className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-bold">
                  {l}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-xs text-slate-500">
              {heroCards.length === 2 && boardCards.length >= 3 ? 'Sin proyectos activos destacados.' : 'Selecciona 2 cartas de mano y 3 del flop.'}
            </span>
          )}

          {/* Equity Grid (Rule of 2 and 4) */}
          <div className="grid grid-cols-3 gap-2 pt-1 text-center font-mono">
            <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 font-sans block">Outs limpios</span>
              <span className="text-base font-black text-white">{draws.totalCleanOutsCount}</span>
            </div>
            <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 font-sans block">Equity Turn (×2)</span>
              <span className="text-base font-black text-emerald-400">{draws.equityTurnPct}%</span>
            </div>
            <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 font-sans block">Turn+River (×4)</span>
              <span className="text-base font-black text-sky-400">{draws.equityRiverPct}%</span>
            </div>
          </div>
        </div>

        {/* 52-Card Interactive Grid */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-2.5 flex flex-col gap-1.5 shadow-lg">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-300 px-1">
            <span>Selecciona para: <strong className={activeSlot === 'hero' ? 'text-blue-400' : 'text-indigo-400'}>{activeSlot === 'hero' ? 'Mano (Hero)' : 'Board'}</strong></span>
            <span className="text-slate-500 text-[10px]">Toca una carta para asignarla</span>
          </div>

          <div className="grid grid-cols-13 gap-1">
            {RANKS.map(r =>
              SUITS.map(s => {
                const card: Card = { rank: r, suit: s };
                const isSelected = allSelectedCards.some(c => c.rank === r && c.suit === s);

                const suitColors: Record<Suit, string> = {
                  s: 'text-slate-900',
                  h: 'text-red-600',
                  d: 'text-blue-600',
                  c: 'text-emerald-700'
                };
                const suitIcons: Record<Suit, string> = { s: '♠', h: '♥', d: '♦', c: '♣' };

                return (
                  <button
                    key={`${r}${s}`}
                    disabled={isSelected}
                    onClick={() => handleCardClick(card)}
                    className={`h-[28px] rounded-[4px] font-[800] text-[10px] flex flex-col items-center justify-center leading-none transition-all ${
                      isSelected
                        ? 'bg-slate-800 text-slate-600 opacity-25 cursor-not-allowed'
                        : `bg-white shadow hover:scale-105 active:scale-95 ${suitColors[s]}`
                    }`}
                  >
                    <span>{r === 'T' ? '10' : r}</span>
                    <span className="text-[9px]">{suitIcons[s]}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Quick Pot Odds Break-Even Tool */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-3 flex flex-col gap-2 shadow-lg">
          <div className="flex items-center justify-between text-xs font-bold text-white">
            <span>Cálculo de Rentabilidad (Call vs Equity)</span>
            <span className={isProfitableCall ? 'text-emerald-400' : 'text-rose-400'}>
              {isProfitableCall ? '✓ CALL RENTABLE (+EV)' : '✕ CALL NEGATIVO (-EV)'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center justify-between bg-slate-900 p-2 rounded-lg border border-slate-800">
              <span className="text-slate-400">Bote actual:</span>
              <input
                type="number"
                value={potSize}
                onChange={e => setPotSize(Number(e.target.value))}
                className="w-14 bg-black/60 border border-slate-700 rounded px-1.5 py-0.5 text-right font-bold text-white"
              />
            </div>
            <div className="flex items-center justify-between bg-slate-900 p-2 rounded-lg border border-slate-800">
              <span className="text-slate-400">Apuesta a pagar:</span>
              <input
                type="number"
                value={betToCall}
                onChange={e => setBetToCall(Number(e.target.value))}
                className="w-14 bg-black/60 border border-slate-700 rounded px-1.5 py-0.5 text-right font-bold text-white"
              />
            </div>
          </div>

          <div className="text-[11px] text-slate-400 bg-slate-900/60 p-2 rounded-lg flex items-center justify-between font-mono">
            <span>Pot Odds: <strong>{potOddsPct}%</strong></span>
            <span>Tu Equity River: <strong>{draws.equityRiverPct}%</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};
