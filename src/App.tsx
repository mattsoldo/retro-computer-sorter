import { useState } from 'react';
import StartScreen from './components/StartScreen';
import GameScreen from './components/GameScreen';
import GameOverScreen from './components/GameOverScreen';
import HighScoreScreen from './components/HighScoreScreen';
import './App.css';
import type { BinState, SortedItemRecord } from './game/types';

type Screen = 'start' | 'playing' | 'gameOver' | 'scores';

export default function App() {
  const [screen, setScreen] = useState<Screen>('start');
  const [finalScore, setFinalScore] = useState(0);
  const [finalBins, setFinalBins] = useState<BinState[]>([]);
  const [finalSortedItems, setFinalSortedItems] = useState<SortedItemRecord[]>([]);

  return (
    <div className="app scanlines">
      {screen === 'start' && (
        <StartScreen
          onPlay={() => { setFinalScore(0); setFinalBins([]); setFinalSortedItems([]); setScreen('playing'); }}
          onScores={() => setScreen('scores')}
        />
      )}
      {screen === 'playing' && (
        <GameScreen
          onGameOver={(score, bins, sortedItems) => {
            setFinalScore(score);
            setFinalBins(bins);
            setFinalSortedItems(sortedItems);
            setScreen('gameOver');
          }}
          onQuit={() => setScreen('start')}
        />
      )}
      {screen === 'gameOver' && (
        <GameOverScreen
          score={finalScore}
          bins={finalBins}
          sortedItems={finalSortedItems}
          onPlay={() => { setFinalScore(0); setFinalBins([]); setFinalSortedItems([]); setScreen('playing'); }}
          onBack={() => setScreen('start')}
        />
      )}
      {screen === 'scores' && (
        <HighScoreScreen
          highlightScore={0}
          onPlay={() => { setFinalScore(0); setScreen('playing'); }}
          onBack={() => setScreen('start')}
        />
      )}
    </div>
  );
}
