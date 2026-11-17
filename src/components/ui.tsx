import React from 'react';
import { Grade, GRADE_ES } from '../types/poker';
import { GRADE_STYLE } from './gradeStyle';

export const Panel: React.FC<{ className?: string; children: React.ReactNode }> = ({ className = '', children }) => (
  <div className={`bg-panel border border-line rounded-[4px] ${className}`}>{children}</div>
);

export const Title: React.FC<{ children: React.ReactNode; right?: React.ReactNode }> = ({ children, right }) => (
  <div className="flex items-baseline justify-between px-0.5 mb-1">
    <h2 className="text-[11px] uppercase tracking-[0.08em] text-dim font-semibold">{children}</h2>
    {right}
  </div>
);

/** "+12" green / "−9" red, like Lichess puzzle rating changes. */
export const Delta: React.FC<{ value: number | null | undefined; className?: string }> = ({ value, className = '' }) => {
  if (value === null || value === undefined) return null;
  const pos = value >= 0;
  return <span className={`rating-delta num font-semibold ${pos ? 'text-goodtx' : 'text-badtx'} ${className}`}>{pos ? '+' : '−'}{Math.abs(value)}</span>;
};

export const GradeBadge: React.FC<{ grade: Grade }> = ({ grade }) => (
  <span className={`grade-badge px-2 h-6 inline-flex items-center rounded-[3px] text-[12px] font-bold ${GRADE_STYLE[grade]}`}>{GRADE_ES[grade]}</span>
);

/** Small rating line chart. */
export const Sparkline: React.FC<{ values: number[]; width?: number; height?: number }> = ({ values, width = 300, height = 56 }) => {
  if (values.length < 2) return <div style={{ height }} className="flex items-center justify-center text-[11px] text-dim">Sin historial</div>;
  const v = values.slice(-80);
  const min = Math.min(...v) - 10;
  const max = Math.max(...v) + 10;
  const pts = v.map((x, i) => `${(i / (v.length - 1)) * width},${height - ((x - min) / (max - min)) * height}`).join(' ');
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="none" className="block">
      <polyline points={pts} fill="none" stroke="#3692e7" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
};

export const BtnPrimary: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ className = '', ...p }) => (
  <button {...p} className={`h-11 rounded-[4px] bg-good text-white font-semibold text-[14px] active:brightness-110 disabled:opacity-40 ${className}`} />
);

export const BtnFlat: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ className = '', ...p }) => (
  <button {...p} className={`h-11 rounded-[4px] bg-panel2 border border-line text-hi font-semibold text-[14px] active:bg-line disabled:opacity-40 ${className}`} />
);
