import React from 'react';
import { Home, LayoutGrid, LineChart, User } from 'lucide-react';

export type Tab = 'inicio' | 'temas' | 'progreso' | 'perfil';

const TABS: { id: Tab; label: string; Icon: typeof Home }[] = [
  { id: 'inicio', label: 'Inicio', Icon: Home },
  { id: 'temas', label: 'Temas', Icon: LayoutGrid },
  { id: 'progreso', label: 'Progreso', Icon: LineChart },
  { id: 'perfil', label: 'Perfil', Icon: User }
];

export const BottomNav: React.FC<{ currentTab: Tab; onSelectTab: (t: Tab) => void }> = ({ currentTab, onSelectTab }) => (
  <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-panel border-t border-line safe-bottom pt-1 grid grid-cols-4 z-40">
    {TABS.map(({ id, label, Icon }) => (
      <button
        key={id}
        onClick={() => onSelectTab(id)}
        data-tab={id}
        className={`nav-tab h-12 flex flex-col items-center justify-center gap-0.5 ${currentTab === id ? 'text-hi' : 'text-dim'}`}
      >
        <Icon className="w-5 h-5" strokeWidth={currentTab === id ? 2.4 : 1.8} />
        <span className="text-[11px]">{label}</span>
      </button>
    ))}
  </nav>
);
