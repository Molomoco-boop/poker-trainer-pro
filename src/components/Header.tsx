import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="safe-top pb-2 px-4 flex items-center justify-between border-b border-slate-800/40 select-none">
      <div className="flex items-center gap-1.5">
        <span className="text-base font-black tracking-wider text-white">POKER</span>
        <span className="text-[#175eff] text-base font-black">♠</span>
        <span className="text-base font-black tracking-wider text-white">TRAINER</span>
      </div>
    </header>
  );
};
