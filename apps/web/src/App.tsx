import { useState } from 'react';
import { AccountScreen } from './auth/AccountScreen';
import { LoginScreen } from './auth/LoginScreen';
import { FreeGame } from './game/free/FreeGame';
import { GameScreen } from './game/GameScreen';
import { HomeScreen } from './home/HomeScreen';
import type { Screen, Tab } from './navigation/types';
import { RankingScreen } from './ranking/RankingScreen';
import { AppShell } from './shell/AppShell';

export function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'home', tab: 'play' });
  const goTab = (tab: Tab) => {
    setScreen({ name: 'home', tab });
  };
  const goHome = () => {
    goTab('play');
  };
  const goLogin = () => {
    setScreen({ name: 'login' });
  };

  switch (screen.name) {
    case 'home':
      return (
        <AppShell tab={screen.tab} onTab={goTab}>
          {screen.tab === 'play' && (
            <HomeScreen
              onPlay={(request) => {
                setScreen({ name: 'game', request, run: 0 });
              }}
              onPlayFree={() => {
                setScreen({ name: 'free' });
              }}
              onLogin={goLogin}
              onOpenAccount={() => {
                goTab('account');
              }}
            />
          )}
          {screen.tab === 'ranking' && (
            <RankingScreen {...(screen.board && { initial: screen.board })} onLogin={goLogin} />
          )}
          {screen.tab === 'account' && <AccountScreen onLogin={goLogin} onContinue={goHome} />}
        </AppShell>
      );
    case 'game':
      return (
        <GameScreen
          key={screen.run}
          request={screen.request}
          onQuit={goHome}
          onPlayAgain={() => {
            setScreen({ ...screen, run: screen.run + 1 });
          }}
          onLogin={goLogin}
          onOpenRanking={(board) => {
            setScreen({ name: 'home', tab: 'ranking', board });
          }}
        />
      );
    case 'free':
      return <FreeGame onQuit={goHome} />;
    case 'login':
      return <LoginScreen onDone={goHome} onBack={goHome} />;
  }
}
