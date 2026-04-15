import { useEffect, useMemo, useState } from 'react';
import { loadHighScores, saveHighScore, isHighScore } from '../game/highScores';
import type { HighScoreEntry } from '../game/types';

interface Props {
  highlightScore?: number;
  onPlay: () => void;
  onBack: () => void;
}

function formatDate(iso: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function HighScoreScreen({ highlightScore = 0, onPlay, onBack }: Props) {
  const qualifies = useMemo(() => highlightScore > 0 && isHighScore(highlightScore), [highlightScore]);
  const [scores, setScores] = useState<HighScoreEntry[]>(() => loadHighScores());
  const [name, setName] = useState('');
  const [saved, setSaved] = useState(!qualifies);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Enter' && saved) onPlay();
      if (e.key === 'Escape') onBack();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onPlay, onBack, saved]);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = (name || 'YOU').trim().toUpperCase().slice(0, 3) || 'YOU';
    const iso = new Date().toISOString().slice(0, 10);
    const next = saveHighScore({ name: trimmed, score: highlightScore, date: iso });
    setScores(next);
    setSaved(true);
  }

  const playerEntry = qualifies && saved
    ? scores.find(s => s.score === highlightScore)
    : null;

  return (
    <div className="scores-screen">
      <h1 className="scores-title">★ HIGH SCORES ★</h1>

      {highlightScore > 0 && (
        <div style={{ marginBottom: 12, fontFamily: 'VT323, monospace', fontSize: '1.4rem' }}>
          Your score: <span style={{ color: 'var(--phosphor)' }}>
            {highlightScore.toLocaleString()}
          </span>
        </div>
      )}

      {qualifies && !saved && (
        <form className="name-entry" onSubmit={handleSave}>
          <label>★ NEW HIGH SCORE — ENTER NAME ★</label>
          <input
            autoFocus
            maxLength={3}
            value={name}
            onChange={e => setName(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
            placeholder="AAA"
          />
          <button type="submit" className="arcade-btn primary">SUBMIT</button>
        </form>
      )}

      <div className="score-table">
        {scores.map((s, i) => {
          const isPlayer = playerEntry && s === playerEntry;
          return (
            <div key={`${s.name}-${i}-${s.score}`} className={`score-row ${isPlayer ? 'highlight' : ''}`}>
              <div className="rank">{String(i + 1).padStart(2, '0')}</div>
              <div className="name">{s.name}</div>
              <div className="score">{s.score.toLocaleString()}</div>
              <div className="date">{formatDate(s.date)}</div>
            </div>
          );
        })}
      </div>

      <div className="start-buttons" style={{ marginTop: 20 }}>
        <button className="arcade-btn primary" onClick={onPlay}>▶ PLAY AGAIN</button>
        <button className="arcade-btn" onClick={onBack}>MAIN MENU</button>
      </div>
    </div>
  );
}
