import React from 'react';
import { X, Target, Zap, ShieldAlert, Sparkles } from 'lucide-react';

interface GameplanModalProps {
  onClose: () => void;
}

export const GameplanModal: React.FC<GameplanModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-3 animate-fadeIn">
      <div className="w-full max-w-md bg-[#0e1422] border border-slate-800 rounded-2xl flex flex-col max-h-[92vh] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white">Gameplan · Postflop Strategy</h2>
            <p className="text-xs text-slate-400">Guía práctica GTO para Flop, Turn y River</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-3.5 text-xs">
          {/* Card 1: Textura de Boards */}
          <div className="bg-[#121929] border border-slate-800 rounded-xl p-3.5 space-y-2">
            <h3 className="font-bold text-blue-400 flex items-center gap-1.5 uppercase text-[11px] tracking-wide">
              <Target className="w-4 h-4" /> 1. Texturas de Flop & Frecuencia de C-Bet
            </h3>
            <ul className="space-y-1.5 text-slate-300">
              <li>
                <strong className="text-white">Boards Secos y Desconectados (A♠ 8♦ 2♣, K♥ 7♦ 2♠):</strong> Frecuencia altísima de C-Bet (80-100%) con tamaño pequeño (25-33% pot).
              </li>
              <li>
                <strong className="text-white">Boards Coordinados / Húmedos (J♠ T♠ 9♦, 8♥ 7♥ 6♣):</strong> Frecuencia moderada (40-50%) con tamaño grande (66-75% pot) para proteger y cobrar a proyectos.
              </li>
              <li>
                <strong className="text-white">Boards Pareados (Q♠ Q♦ 5♣, 8♣ 8♦ 2♥):</strong> Frecuencia altísima (85-95%) con tamaño diminuto (20-25% pot). Los rangos conectan muy rara vez con viajes y la fold equity es masiva.
              </li>
              <li>
                <strong className="text-white">Boards Monocolor (3 del mismo palo):</strong> Reducir frecuencia y apostar manos con bloqueo al As del palo.
              </li>
            </ul>
          </div>

          {/* Card 2: Turn Double Barrel */}
          <div className="bg-[#121929] border border-slate-800 rounded-xl p-3.5 space-y-2">
            <h3 className="font-bold text-emerald-400 flex items-center gap-1.5 uppercase text-[11px] tracking-wide">
              <Zap className="w-4 h-4" /> 2. Selección de Segundos Barriles en Turn
            </h3>
            <p className="text-slate-300 leading-relaxed">
              Dispara el segundo barril en cartas que aumenten tu equity (overcards que te den top pair o cartas que abran proyectos de color/escalera) y cartas que beneficien el rango del agresor (Ases y Reyes).
            </p>
          </div>

          {/* Card 3: River Bluff Catching */}
          <div className="bg-[#121929] border border-slate-800 rounded-xl p-3.5 space-y-2">
            <h3 className="font-bold text-amber-400 flex items-center gap-1.5 uppercase text-[11px] tracking-wide">
              <ShieldAlert className="w-4 h-4" /> 3. River Bluff Catcher & Bloqueadores
            </h3>
            <p className="text-slate-300 leading-relaxed">
              En el River, paga con manos que bloqueen el valor del rival (e.g. tener un As cuando su mejor mano es As-alto o dos parejas) y que <em>no</em> bloqueen los proyectos fallidos que el rival usaría de farol (e.g. no tener la carta del color fallido).
            </p>
          </div>

          {/* Card 4: Sizing Golden Rules */}
          <div className="bg-[#121929] border border-slate-800 rounded-xl p-3.5 space-y-2">
            <h3 className="font-bold text-purple-400 flex items-center gap-1.5 uppercase text-[11px] tracking-wide">
              <Sparkles className="w-4 h-4" /> 4. Regla de Oro de Tamaños (Sizings)
            </h3>
            <div className="grid grid-cols-3 gap-2 text-center pt-1">
              <div className="p-2 bg-[#0a0f1d] rounded-lg">
                <div className="font-bold text-white text-sm">33% Pot</div>
                <div className="text-[10px] text-slate-400">Ventaja de rango</div>
              </div>
              <div className="p-2 bg-[#0a0f1d] rounded-lg">
                <div className="font-bold text-white text-sm">66-75% Pot</div>
                <div className="text-[10px] text-slate-400">Ventaja polarizada</div>
              </div>
              <div className="p-2 bg-[#0a0f1d] rounded-lg">
                <div className="font-bold text-white text-sm">125%+ Pot</div>
                <div className="text-[10px] text-slate-400">Ventaja de nuts pura</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
