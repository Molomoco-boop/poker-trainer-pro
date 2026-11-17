import { useState } from 'react';
import { GameProvider } from './context/GameContext';
import { BottomNav, Tab } from './components/BottomNav';
import { LobbyView } from './views/LobbyView';
import { PracticeView } from './views/PracticeView';
import { ProfileView } from './views/ProfileView';
import { ProgressView } from './views/ProgressView';
import { TopicsView } from './views/TopicsView';
import { SprintView } from './views/SprintView';
import { RangeBuilderView } from './views/RangeBuilderView';
import { SessionSpec } from './types/poker';

type Screen = { kind: 'tabs' } | { kind: 'practice'; session: SessionSpec } | { kind: 'sprint' } | { kind: 'builder' };

function AppContent() {
  const [tab, setTab] = useState<Tab>('inicio');
  const [screen, setScreen] = useState<Screen>({ kind: 'tabs' });
  const [runId, setRunId] = useState(0);
  const play = (session: SessionSpec) => { setRunId(n => n + 1); setScreen({ kind: 'practice', session }); };
  const back = () => setScreen({ kind: 'tabs' });

  return (
    <div className="min-h-[100dvh] bg-bg text-txt flex justify-center">
      <div className="w-full max-w-md min-h-[100dvh] flex flex-col relative">
        {screen.kind === 'practice' ? (
          <PracticeView key={runId} session={screen.session} onExit={back} />
        ) : screen.kind === 'sprint' ? (
          <SprintView onExit={back} />
        ) : screen.kind === 'builder' ? (
          <RangeBuilderView onExit={back} />
        ) : (
          <>
            <main className="flex-1 px-3 pt-2 safe-top pb-[76px]">
              {tab === 'inicio' && (
                <LobbyView
                  onStartDaily={() => play({ kind: 'daily' })}
                  onStartRated={() => play({ kind: 'rated' })}
                  onStartPlacement={() => play({ kind: 'placement' })}
                  onStartSprint={() => setScreen({ kind: 'sprint' })}
                  onStartRangeBuilder={() => setScreen({ kind: 'builder' })}
                />
              )}
              {tab === 'temas' && <TopicsView onStart={concept => play({ kind: 'concept', concept })} />}
              {tab === 'progreso' && <ProgressView onTrainLeak={(pos, street) => play({ kind: 'leak', pos, street })} />}
              {tab === 'perfil' && <ProfileView />}
            </main>
            <BottomNav currentTab={tab} onSelectTab={setTab} />
          </>
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
