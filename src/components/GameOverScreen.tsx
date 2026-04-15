// GameOverScreen is currently rolled into the HighScoreScreen flow
// (on game over we navigate directly to the scores screen with the
// final score so the player can optionally enter their name).
// This file is kept as a stub so the file structure matches the
// project brief; HighScoreScreen handles the full flow.

interface Props {
  score: number;
  onContinue: () => void;
}

export default function GameOverScreen({ score, onContinue }: Props) {
  return (
    <div className="scores-screen">
      <div className="gameover-banner">GAME OVER</div>
      <div style={{ fontFamily: 'VT323, monospace', fontSize: '1.6rem', marginBottom: 20 }}>
        Final score: <span style={{ color: 'var(--phosphor)' }}>{score.toLocaleString()}</span>
      </div>
      <button className="arcade-btn primary" onClick={onContinue}>CONTINUE</button>
    </div>
  );
}
