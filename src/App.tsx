import React, { useState } from 'react';
import { GameProvider } from './context/GameContext';
import { BottomNav } from './components/BottomNav';
import { LobbyView } from './views/LobbyView';
import { CategoryView } from './views/CategoryView';
import { PracticeView } from './views/PracticeView';
import { ProfileView } from './views/ProfileView';
import { CategoryId, SubcategoryId, SpotType, PracticeMode } from './types/poker';

function AppContent() {
  const [currentTab, setCurrentTab] = useState<'inicio' | 'perfil'>('inicio');
  const [activeCategory, setActiveCategory] = useState<CategoryId | null>(null);
  const [activePracticeMode, setActivePracticeMode] = useState<PracticeMode | null>(null);
  const [forcedSpot, setForcedSpot] = useState<SpotType | undefined>(undefined);

  const handleSelectTab = (tab: 'inicio' | 'perfil') => {
    setCurrentTab(tab);
    if (tab === 'perfil') {
      setActiveCategory(null);
      setActivePracticeMode(null);
      setForcedSpot(undefined);
    }
  };

  const handleSelectCategory = (cat: CategoryId) => {
    setActiveCategory(cat);
  };

  const handleStartPractice = (mode: PracticeMode, spot?: SpotType) => {
    setForcedSpot(spot);
    setActivePracticeMode(mode);
  };

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 flex justify-center selection:bg-blue-600 selection:text-white">
      {/* Mobile-first centered app shell */}
      <div className="w-full max-w-md min-h-screen bg-[#0a0f18] flex flex-col relative shadow-[0_0_60px_rgba(0,0,0,0.9)] border-x border-slate-900/80">
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto">
          {activePracticeMode ? (
            <PracticeView
              mode={activePracticeMode}
              forcedSpot={forcedSpot}
              onExit={() => {
                setActivePracticeMode(null);
                setForcedSpot(undefined);
              }}
            />
          ) : activeCategory ? (
            <div className="p-3.5 pb-16">
              <CategoryView
                categoryId={activeCategory}
                onBack={() => setActiveCategory(null)}
                onStartPractice={(sub: SubcategoryId) => {
                  handleStartPractice(sub);
                }}
              />
            </div>
          ) : currentTab === 'inicio' ? (
            <div className="p-3.5 pb-16">
              <LobbyView
                onSelectCategory={handleSelectCategory}
                onStartContinuousPlay={() => handleStartPractice('continuous')}
                onStartForcedSpot={(spot) => handleStartPractice('continuous', spot)}
              />
            </div>
          ) : (
            <div className="p-3.5 pb-16">
              <ProfileView />
            </div>
          )}
        </main>

        {/* Bottom Nav (Hidden during active practice) */}
        {!activePracticeMode && (
          <BottomNav currentTab={currentTab} onSelectTab={handleSelectTab} />
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <GameProvider>
      <AppContent />
    </GameProvider>
  );
}
