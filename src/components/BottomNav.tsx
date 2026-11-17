import React from 'react';
import { Home, User } from 'lucide-react';

interface BottomNavProps {
  currentTab: 'inicio' | 'perfil';
  onSelectTab: (tab: 'inicio' | 'perfil') => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onSelectTab }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-[#0a0f1d]/95 backdrop-blur-md border-t border-slate-800/80 px-6 py-2 safe-bottom flex items-center justify-around z-40">
      <button
        onClick={() => onSelectTab('inicio')}
        className={`flex flex-col items-center justify-center py-1 px-4 transition-colors ${
          currentTab === 'inicio' ? 'text-blue-500 font-semibold' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Home className={`w-5 h-5 mb-1 ${currentTab === 'inicio' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
        <span className="text-[11px] tracking-wide">Inicio</span>
      </button>

      <button
        onClick={() => onSelectTab('perfil')}
        className={`flex flex-col items-center justify-center py-1 px-4 transition-colors ${
          currentTab === 'perfil' ? 'text-blue-500 font-semibold' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <User className={`w-5 h-5 mb-1 ${currentTab === 'perfil' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
        <span className="text-[11px] tracking-wide">Perfil</span>
      </button>
    </nav>
  );
};
