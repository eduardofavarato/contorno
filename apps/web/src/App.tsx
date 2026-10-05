import { useState } from 'react';
import { FreeGame } from './game/free/FreeGame';
import { GameScreen } from './game/GameScreen';
import { HomeScreen } from './home/HomeScreen';
import type { Screen } from './navigation/types';

export function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'home' });
  const goHome = () => {
    setScreen({ name: 'home' });
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
        />
      );
    case 'free':
      return <FreeGame onQuit={goHome} />;
  }
}
