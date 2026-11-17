import React, { useState } from 'react';
import { ModalPortal } from './ModalPortal';
import { X, AlertCircle, Trash2, CheckCircle2, Filter, Layers } from 'lucide-react';
import { useGame } from '../context/useGame';

interface StatsMistakesModalProps {
  onClose: () => void;
}

export const StatsMistakesModal: React.FC<StatsMistakesModalProps> = ({ onClose }) => {
  const { stats, clearMistakes } = useGame();
  const [onlyErrorsFilter, setOnlyErrorsFilter] = useState(false);

  const totalDecisions = stats.totalDecisions || 0;
  const correctDecisions = stats.totalCorrectDecisions || 0;
  const hasHands = totalDecisions > 0;
  const accuracyPct = hasHands ? Math.round((correctDecisions / totalDecisions) * 100) : null;

  const mistakes = stats.mistakeQueue || [];
  const sessionHistory = stats.sessionHands || [];

  const filteredSession = onlyErrorsFilter
    ? sessionHistory.filter(h => h.verdict === 'error')
    : sessionHistory;

  return (
    <ModalPortal>
    <div className="fixed inset-0 z-[60] bg-black/85 flex flex-col items-center justify-center p-3 animate-fadeIn font-sans select-none">
      <div className="w-full max-w-md bg-[#0e1422] border border-slate-800 rounded-2xl flex flex-col max-h-[calc(100dvh-24px)] shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="px-4 py-2 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-[800] text-white">Estadísticas</h2>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-300" aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          
          {/* Top Accuracy Metric (NO FAKE 90%!) */}
          <div className="bg-[#121929] border border-slate-800 rounded-xl p-4 text-center shadow">
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              PRECISIÓN
            </span>

            {hasHands ? (
              <>
                <div className="text-4xl font-black text-emerald-400 my-1 tabular-nums">
                  {accuracyPct}%
                </div>
                <p className="text-xs text-slate-400">
                  {correctDecisions} aciertos de {totalDecisions} decisiones tomadas
                </p>
              </>
            ) : (
              <>
                <div className="text-4xl font-black text-[#64748B] my-1">
                  —
                </div>
                <p className="text-xs text-slate-400">
                  Sin datos
                </p>
              </>
            )}
          </div>

          {/* Mistakes Queue (Spaced Repetition System) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                Errores recientes ({mistakes.length})
              </h3>
              {mistakes.length > 0 && (
                <button
                  onClick={clearMistakes}
                  className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Limpiar
                </button>
              )}
            </div>

            {mistakes.length === 0 ? (
              <div className="bg-[#121929] border border-slate-800/80 rounded-xl p-4 text-center text-slate-400 text-xs">
                <CheckCircle2 className="w-7 h-7 text-emerald-400 mx-auto mb-1.5 opacity-80" />
                Sin errores registrados.
              </div>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {mistakes.map(m => (
                  <div key={m.id} className="bg-[#121929] border border-slate-800 rounded-xl p-3 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-blue-400 uppercase text-[10px]">
                        {m.label}
                      </span>
                      <span className="text-[10px] text-amber-400 font-semibold">
                        Repaso {Math.min(m.stage + 1, 3)}/3
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80 text-[11px]">
                      <div className="text-red-400">
                        <span className="block text-[10px] text-slate-400">Elegiste:</span>
                        {m.userAnswerLabel} (-{m.evLostBB.toFixed(2)} BB)
                      </div>
                      <div className="text-emerald-400 font-semibold">
                        <span className="block text-[10px] text-slate-400">Óptimo:</span>
                        {m.correctAnswerLabel}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Session History with "Ver solo errores" */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-sky-400" />
                Historial de Sesión ({sessionHistory.length})
              </h3>

              <button
                onClick={() => setOnlyErrorsFilter(!onlyErrorsFilter)}
                className={`h-10 px-3 rounded-full text-[11px] font-bold border flex items-center gap-1 transition-all ${
                  onlyErrorsFilter
                    ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                <Filter className="w-3 h-3" />
                <span>Solo errores</span>
              </button>
            </div>

            {filteredSession.length === 0 ? (
              <div className="bg-[#121929] border border-slate-800/80 rounded-xl p-3 text-center text-slate-400 text-xs">
                No hay jugadas registradas en este filtro.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                {filteredSession.map(h => {
                  const isErr = h.verdict === 'error';
                  const isOpt = h.verdict === 'optimal';
                  return (
                    <div
                      key={h.id}
                      className="bg-[#121929] border border-slate-800/90 rounded-xl p-2.5 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${isOpt ? 'bg-emerald-400' : isErr ? 'bg-rose-500' : 'bg-amber-400'}`} />
                        <div>
                          <div className="font-bold text-white text-[11px]">{h.handName}</div>
                          <div className="text-[10px] text-slate-400">
                            {h.position} · {h.street.toUpperCase()} · Jugada: {h.userAnswer}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className={`font-mono font-bold text-[11px] ${h.evDiffNum >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {h.evDiffNum >= 0 ? `+${h.evDiffNum.toFixed(2)}` : h.evDiffNum.toFixed(2)} BB
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
};
