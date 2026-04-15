import type { HighScoreEntry } from './types';

const STORAGE_KEY = 'retro-place-value-scores';
const MAX_SCORES = 10;

const PRELOADED: HighScoreEntry[] = [
  { name: 'MARIO',    score: 1_200_000, date: '1985-09-13' },
  { name: 'SONIC',    score:   987_654, date: '1991-06-23' },
  { name: 'DONK',     score:   876_500, date: '1981-07-09' },
  { name: 'LINK',     score:   743_200, date: '1986-02-21' },
  { name: 'SAMUS',    score:   612_800, date: '1986-08-06' },
  { name: 'MEGAMAN',  score:   498_750, date: '1987-12-17' },
  { name: 'KIRBY',    score:   387_600, date: '1992-04-27' },
  { name: 'PIKACHU',  score:   276_400, date: '1996-02-27' },
  { name: 'YOSHI',    score:   165_300, date: '1990-11-21' },
  { name: 'TOAD',     score:    54_200, date: '1985-10-18' },
];

export function loadHighScores(): HighScoreEntry[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as HighScoreEntry[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    /* ignore */
  }
  return [...PRELOADED];
}

export function saveHighScore(entry: HighScoreEntry): HighScoreEntry[] {
  const scores = loadHighScores();
  scores.push(entry);
  scores.sort((a, b) => b.score - a.score);
  const trimmed = scores.slice(0, MAX_SCORES);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    /* ignore */
  }
  return trimmed;
}

export function isHighScore(score: number): boolean {
  if (score <= 0) return false;
  const scores = loadHighScores();
  return scores.length < MAX_SCORES || score > scores[scores.length - 1].score;
}

export function getRank(score: number): number | null {
  const scores = loadHighScores();
  const sorted = [...scores, { name: '__QUERY__', score, date: '' }].sort((a, b) => b.score - a.score);
  const idx = sorted.findIndex(s => s.name === '__QUERY__');
  return idx >= 0 && idx < MAX_SCORES ? idx + 1 : null;
}

export function resetHighScores(): void {
  try { localStorage.removeItem(STORAGE_KEY); } catch {
    /* ignore */
  }
}
