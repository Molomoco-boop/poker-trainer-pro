import React, { useState, useRef, useMemo } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useGame } from '../context/useGame';
import { RANGE_TASKS, rangeScore, targetWeight, RangeResult } from '../utils/sessionPlanner';
import { getHandLabel, getRangeStats } from '../data/preflopRanges';
import { BtnPrimary, BtnFlat } from '../components/ui';

/** Paint a 13×13 range from memory and get a weighted score. */
export const RangeBuilderView: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const { stats, recordRange } = useGame();
  const [taskIdx, setTaskIdx] = useState(0);
  const [painted, setPainted] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<RangeResult | null>(null);
  const mode = useRef<boolean | null>(null);
  const task = RANGE_TASKS[taskIdx];
  const matrix = useMemo(() => task.matrix(), [task]);
  const pct = Math.round(getRangeStats(matrix).percentage);

  const paintAt = (x: number, y: number) => {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    const h = el?.dataset?.hand;
    if (!h || mode.current === null) return;
    setPainted(prev => {
      if (prev.has(h) === mode.current) return prev;
      const n = new Set(prev);
      if (mode.current) n.add(h); else n.delete(h);
      return n;
    });
  };

  const onDown = (e: React.PointerEvent) => {
    if (result) return;
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const h = el?.dataset?.hand;
    if (!h) return;
    mode.current = !painted.has(h);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    paintAt(e.clientX, e.clientY);
  };

  const check = () => {
    const r = rangeScore(task, painted);
    setResult(r);
    recordRange(task.id, r.score);
  };

  const reset = (idx = taskIdx) => {
    setTaskIdx(idx);
    setPainted(new Set());
    setResult(null);
  };

  const cellClass = (h: string) => {
    const on = painted.has(h);
    if (!result) return on ? 'bg-acc text-white' : 'bg-panel2 text-dim';
    const t = targetWeight(task, matrix, h);
    if (on && t >= 0.5) return 'bg-good text-white';
    if (on) return 'bg-bad text-white';
    if (t >= 0.5) return 'bg-warn text-black';
    return t > 0 ? 'bg-panel2 text-txt' : 'bg-panel2 text-dim';
  };

  const list = (a: string[]) => a.slice(0, 5).join(', ') + (a.length > 5 ? ` +${a.length - 5}` : '');

  return (
    <div className="range-builder w-full h-[100dvh] flex flex-col bg-bg overflow-hidden">
      <div className="safe-top px-2 pb-1 flex items-center gap-2 border-b border-line shrink-0">
        <button onClick={onExit} className="w-10 h-10 flex items-center justify-center text-txt" aria-label="Salir"><ArrowLeft className="w-5 h-5" /></button>
        <span className="text-[15px] text-hi font-semibold">Construir rango</span>
        <span className="ml-auto num text-[13px] text-dim">Mejor {stats.rangeBest[task.id] ?? 0} %</span>
      </div>

      <div className="grid grid-cols-3 gap-1 px-2 pt-2 shrink-0">
        {RANGE_TASKS.map((t, i) => (
          <button key={t.id} onClick={() => reset(i)} className={`h-10 rounded-[4px] text-[13px] font-semibold border ${i === taskIdx ? 'bg-acc border-acc text-white' : 'bg-panel border-line text-txt'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="px-2 py-1.5 text-[13px] text-txt shrink-0 num">
        {task.use === 'raise' ? 'Pinta las manos que abres' : 'Pinta las que defiendes (call o 3-bet)'} · <span className="text-hi">{pct} %</span> · {painted.size} pintadas
      </div>

      <div className="flex-1 min-h-0 flex items-start justify-center px-2">
        <div
          className="range-grid grid grid-cols-13 gap-[2px] w-full max-w-[400px] touch-none"
          style={{ gridTemplateColumns: 'repeat(13, minmax(0, 1fr))' }}
          onPointerDown={onDown}
          onPointerMove={e => { if (mode.current !== null && e.buttons) paintAt(e.clientX, e.clientY); }}
          onPointerUp={() => { mode.current = null; }}
          onPointerCancel={() => { mode.current = null; }}
        >
          {Array.from({ length: 169 }).map((_, i) => {
            const h = getHandLabel(Math.floor(i / 13), i % 13);
            return (
              <div key={h} data-hand={h} className={`range-cell aspect-square rounded-[2px] flex items-center justify-center text-[9px] font-semibold leading-none ${cellClass(h)}`}>
                {h.replace(/[so]$/, '')}
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-2 pt-2 safe-bottom bg-panel border-t border-line shrink-0 flex flex-col gap-2">
        {result ? (
          <div className="range-result text-[13px] text-txt leading-snug">
            <span className="num text-[22px] font-semibold text-hi mr-2">{result.score} %</span>
            {result.missing.length > 0 && <span>Faltan <span className="text-warn">{list(result.missing)}</span>. </span>}
            {result.extra.length > 0 && <span>Sobran <span className="text-badtx">{list(result.extra)}</span>.</span>}
            {!result.missing.length && !result.extra.length && <span>Exacto.</span>}
          </div>
        ) : (
          <div className="text-[12px] text-dim">Toca o arrastra. Las mixtas puntúan según su frecuencia.</div>
        )}
        <div className="flex gap-2">
          <BtnFlat onClick={() => reset()} className="flex-1">{result ? 'Otra vez' : 'Borrar'}</BtnFlat>
          {result
            ? <BtnPrimary onClick={() => reset((taskIdx + 1) % RANGE_TASKS.length)} className="flex-1">Siguiente</BtnPrimary>
            : <BtnPrimary onClick={check} disabled={!painted.size} className="flex-1">Comprobar</BtnPrimary>}
        </div>
      </div>
    </div>
  );
};
