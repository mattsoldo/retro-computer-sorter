import { useState } from 'react';
import StartScreen from './components/StartScreen';
import GameScreen from './components/GameScreen';
import GameOverScreen from './components/GameOverScreen';
import CreditsScreen from './components/CreditsScreen';
import HighScoreScreen from './components/HighScoreScreen';
import type { BinState } from './game/types';
import './App.css';

type Screen = 'start' | 'playing' | 'gameOver' | 'credits' | 'scores';

export default function App() {
  const [screen, setScreen] = useState<Screen>('start');
  const [finalScore, setFinalScore] = useState(0);
  const [finalBins, setFinalBins] = useState<BinState[]>([]);

  return (
    <div className="app scanlines">
      {screen === 'start' && (
        <StartScreen
          onPlay={() => { setFinalScore(0); setScreen('playing'); }}
          onScores={() => setScreen('scores')}
        />
      )}
      {screen === 'playing' && (
        <GameScreen
          onGameOver={(score, bins) => {
            setFinalScore(score);
            setFinalBins(bins);
            setScreen('gameOver');
          }}
          onQuit={() => setScreen('start')}
        />
      )}
      {screen === 'gameOver' && (
        <GameOverScreen
          score={finalScore}
          onContinue={() => setScreen('credits')}
        />
      )}
      {screen === 'credits' && (
        <CreditsScreen
          score={finalScore}
          bins={finalBins}
          onContinue={() => setScreen('scores')}
        />
      )}
      {screen === 'scores' && (
        <HighScoreScreen
          highlightScore={finalScore}
          onPlay={() => { setFinalScore(0); setScreen('playing'); }}
          onBack={() => setScreen('start')}
        />
      )}
    </div>
  );
}
