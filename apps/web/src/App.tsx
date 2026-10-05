import { useState } from 'react';
import { LoginScreen } from './auth/LoginScreen';
import { FreeGame } from './game/free/FreeGame';
import { GameScreen } from './game/GameScreen';
import { HomeScreen } from './home/HomeScreen';
import type { Screen } from './navigation/types';
import { RankingScreen } from './ranking/RankingScreen';

export function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'home' });
  const goHome = () => {
    setScreen({ name: 'home' });
  };
  const goLogin = () => {
    setScreen({ name: 'login' });
  };

  switch (screen.name) {
    case 'home':
      return (
        <HomeScreen
          onPlay={(request) => {
            setScreen({ name: 'game', request, run: 0 });
          }}
          onPlayFree={() => {
            setScreen({ name: 'free' });
          }}
          onLogin={goLogin}
          onOpenRanking={() => {
            setScreen({ name: 'ranking' });
          }}
        />
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
            setScreen({ name: 'ranking', board });
          }}
        />
      );
    case 'free':
      return <FreeGame onQuit={goHome} />;
    case 'login':
      return <LoginScreen onDone={goHome} onBack={goHome} />;
    case 'ranking':
      return <RankingScreen {...(screen.board && { initial: screen.board })} onBack={goHome} onLogin={goLogin} />;
  }
}
