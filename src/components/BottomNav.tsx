import React from 'react';
import { Home, LayoutGrid, LineChart, User } from 'lucide-react';
import { useI18n } from '../i18n';

export type Tab = 'inicio' | 'temas' | 'progreso' | 'perfil';

export const BottomNav: React.FC<{ currentTab: Tab; onSelectTab: (t: Tab) => void }> = ({ currentTab, onSelectTab }) => {
  const { t } = useI18n();
  const tabs: { id: Tab; label: string; Icon: typeof Home }[] = [
    { id: 'inicio', label: t.navHome, Icon: Home },
    { id: 'temas', label: t.navTopics, Icon: LayoutGrid },
    { id: 'progreso', label: t.navProgress, Icon: LineChart },
    { id: 'perfil', label: t.navProfile, Icon: User }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md md:max-w-lg mx-auto bg-panel border-t border-line safe-bottom pt-1 grid grid-cols-4 z-40">
      {tabs.map(({ id, label, Icon }) => (
        <button
          key={id}
          onClick={() => onSelectTab(id)}
          data-tab={id}
          className={`nav-tab h-12 flex flex-col items-center justify-center gap-0.5 ${currentTab === id ? 'text-hi' : 'text-dim'}`}
        >
          <Icon className="w-5 h-5" strokeWidth={currentTab === id ? 2.4 : 1.8} />
          <span className="text-[11px] truncate max-w-full px-1">{label}</span>
        </button>
      ))}
    </nav>
  );
};
