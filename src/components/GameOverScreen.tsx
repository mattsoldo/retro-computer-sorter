import { useEffect } from 'react';

interface Props {
  score: number;
  onContinue: () => void;
}

export default function GameOverScreen({ score, onContinue }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Enter' || e.key === ' ') onContinue();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onContinue]);

  return (
    <div className="scores-screen">
      <div className="gameover-banner">GAME OVER</div>
      <div style={{ fontFamily: 'VT323, monospace', fontSize: '1.6rem', marginBottom: 20 }}>
        Final score: <span style={{ color: 'var(--phosphor)' }}>{score.toLocaleString()}</span>
      </div>
      <div style={{ fontFamily: 'VT323, monospace', fontSize: '1.2rem', color: '#bbb', marginBottom: 20 }}>
        Press Enter to submit your score
      </div>
      <button className="arcade-btn primary" onClick={onContinue}>CONTINUE</button>
    </div>
  );
}
