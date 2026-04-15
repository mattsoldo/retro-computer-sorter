import { useState } from 'react';
import StartScreen from './components/StartScreen';
import GameScreen from './components/GameScreen';
import HighScoreScreen from './components/HighScoreScreen';
import './App.css';

type Screen = 'start' | 'playing' | 'scores';

export default function App() {
  const [screen, setScreen] = useState<Screen>('start');
  const [finalScore, setFinalScore] = useState(0);

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
          onGameOver={(score) => { setFinalScore(score); setScreen('scores'); }}
          onQuit={() => setScreen('start')}
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
