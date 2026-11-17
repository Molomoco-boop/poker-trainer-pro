import React from 'react';
import { Card, Suit } from '../types/poker';

interface CardViewProps {
  card: Card;
  size?: 'hero' | 'board' | 'sm' | 'xs';
  faceDown?: boolean;
  deckMode?: '4color' | '2color';
  className?: string;
}

export const CardView: React.FC<CardViewProps> = ({
  card,
  size = 'hero',
  faceDown = false,
  deckMode = '4color',
  className = ''
}) => {
  // 4-Color vs 2-Color Deck Palette
  const colorMap4: Record<Suit, string> = {
    s: 'text-[#0F172A]', // Picas = Negro azulado
    h: 'text-[#DC2626]', // Corazones = Rojo intenso
    d: 'text-[#1D4ED8]', // Diamantes = Azul cobalto
    c: 'text-[#15803D]'  // Tréboles = Verde esmeralda
  };

  const colorMap2: Record<Suit, string> = {
    s: 'text-[#0F172A]',
    h: 'text-[#DC2626]',
    d: 'text-[#DC2626]',
    c: 'text-[#0F172A]'
  };

  const suitSymbols: Record<Suit, string> = {
    s: '♠',
    h: '♥',
    d: '♦',
    c: '♣'
  };

  const colorClass = deckMode === '2color' ? colorMap2[card.suit] : colorMap4[card.suit];

  if (faceDown) {
    if (size === 'hero') {
      return (
        <div
          className={`w-[70px] h-[98px] rounded-[10px] bg-[#0B1A30] border border-[#2563EB]/40 shadow-[0_10px_25px_rgba(0,0,0,0.65)] flex items-center justify-center select-none shrink-0 ${className}`}
        >
          <div className="w-[62px] h-[90px] border border-blue-400/20 rounded-[8px] flex items-center justify-center bg-[radial-gradient(#1D4ED8_1px,transparent_1px)] [background-size:6px_6px]">
            <span className="text-blue-400/40 text-base font-bold">♠</span>
          </div>
        </div>
      );
    }
    return (
      <div
        className={`w-[54px] h-[76px] rounded-[8px] bg-[#0B1A30] border border-[#2563EB]/40 shadow-md flex items-center justify-center select-none shrink-0 ${className}`}
      >
        <div className="w-[48px] h-[70px] border border-blue-400/20 rounded-[6px] flex items-center justify-center bg-[radial-gradient(#1D4ED8_1px,transparent_1px)] [background-size:5px_5px]">
          <span className="text-blue-400/40 text-xs font-bold">♠</span>
        </div>
      </div>
    );
  }

  const rankDisplay = card.rank === 'T' ? '10' : card.rank;

  // Hero Card: 70px x 98px, Jumbo Index
  if (size === 'hero') {
    return (
      <div
        className={`w-[70px] h-[98px] rounded-[10px] bg-[#F8FAFC] shadow-[0_10px_25px_rgba(0,0,0,0.65)] border border-slate-300 p-1.5 flex flex-col justify-between select-none shrink-0 font-sans ${colorClass} ${className}`}
      >
        {/* Top-Left Jumbo Index */}
        <div className="flex flex-col items-start leading-none pl-0.5 pt-0.5">
          <span className="text-[20px] font-[800] leading-none tracking-tighter tabular-nums">
            {rankDisplay}
          </span>
          <span className="text-[14px] leading-none mt-0.5">
            {suitSymbols[card.suit]}
          </span>
        </div>

        {/* Center-Bottom Large Suit */}
        <div className="flex justify-center items-end leading-none pb-0.5">
          <span className="text-[32px] leading-none">
            {suitSymbols[card.suit]}
          </span>
        </div>
      </div>
    );
  }

  // Board Card: 54px x 76px
  if (size === 'board') {
    return (
      <div
        className={`w-[50px] h-[72px] rounded-[8px] bg-[#F8FAFC] shadow-md border border-slate-300 p-1 flex flex-col items-center justify-between select-none shrink-0 animate-fadeIn ${colorClass} ${className}`}
      >
        <span className="text-[16px] font-[800] leading-none tracking-tighter tabular-nums mt-0.5">
          {rankDisplay}
        </span>
        <span className="text-[24px] leading-none mb-1">
          {suitSymbols[card.suit]}
        </span>
      </div>
    );
  }

  if (size === 'xs') {
    return (
      <div
        className={`w-[28px] h-[38px] rounded-[5px] bg-[#F8FAFC] shadow-md border border-slate-300 flex flex-col items-center justify-center select-none shrink-0 leading-none ${colorClass} ${className}`}
      >
        <span className="text-[12px] font-[800] tabular-nums">{rankDisplay}</span>
        <span className="text-[12px]">{suitSymbols[card.suit]}</span>
      </div>
    );
  }

  // Small size (e.g. for calculators or compact displays)
  return (
    <div
      className={`w-[36px] h-[50px] rounded-[6px] bg-[#F8FAFC] shadow-sm border border-slate-300 p-0.5 flex flex-col items-center justify-between select-none shrink-0 ${colorClass} ${className}`}
    >
      <span className="text-[12px] font-[800] leading-none tabular-nums">
        {rankDisplay}
      </span>
      <span className="text-[16px] leading-none">
        {suitSymbols[card.suit]}
      </span>
    </div>
  );
};
