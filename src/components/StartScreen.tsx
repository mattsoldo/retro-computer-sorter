import { useEffect } from 'react';
import { UNLOCK_TIERS, BIN_DEFINITIONS } from '../game/constants';
import { unlockAudio } from '../game/audio';

interface Props {
  onPlay: () => void;
  onScores: () => void;
}

export default function StartScreen({ onPlay, onScores }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Enter' || e.key === ' ') {
        unlockAudio();
        onPlay();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onPlay]);

  return (
    <div className="start-screen">
      <h1 className="start-title">RETRO COMPUTER SORTER</h1>
      <div className="start-subtitle">
        Sort falling retro computers, chips &amp; consoles into the right place value bins!
        Score combos. Don&apos;t miss. Become a legend.
      </div>

      <div className="start-insert-coin">▶ PRESS ENTER TO PLAY ◀</div>

      <div className="start-buttons">
        <button
          className="arcade-btn primary"
          onClick={() => { unlockAudio(); onPlay(); }}
          aria-label="Start game"
        >
          ▶ PLAY
        </button>
        <button
          className="arcade-btn"
          onClick={onScores}
          aria-label="View high scores"
        >
          HIGH SCORES
        </button>
      </div>

      <div className="instructions">
        <h3>LEVEL 1 — STARTING BINS (largest left → smallest right)</h3>
        <div className="bin-preview">
          {[...UNLOCK_TIERS[0]].reverse().map(pv => {
            const def = BIN_DEFINITIONS[pv];
            return (
              <div
                key={pv}
                style={{
                  borderColor: def.textColor,
                  color: def.textColor,
                  background: def.color,
                }}
              >
                {def.label} · {def.range}
              </div>
            );
          })}
        </div>
        <p>
          A number falls from the top. Use <kbd>←</kbd> <kbd>→</kbd> to steer it into the right bin.
          Press <kbd>↓</kbd> to fast-drop. Unlock more bins as you score.
        </p>
      </div>
    </div>
  );
}
