import { describe, it, expect, beforeEach } from 'vitest';
import { loadHighScores, saveHighScore, isHighScore, resetHighScores, getRank } from '../../game/highScores';

describe('highScores', () => {
  beforeEach(() => {
    localStorage.clear();
    resetHighScores();
  });

  it('loadHighScores returns preloaded scores when empty', () => {
    const scores = loadHighScores();
    expect(scores.length).toBe(10);
    expect(scores[0].name).toBe('MARIO');
    expect(scores[0].score).toBe(1_200_000);
  });

  it('saves and sorts highest-first', () => {
    const after = saveHighScore({ name: 'TEST', score: 2_000_000, date: '2024-01-01' });
    expect(after[0].name).toBe('TEST');
    expect(after[0].score).toBe(2_000_000);
    expect(after.length).toBeLessThanOrEqual(10);
  });

  it('caps at 10 entries', () => {
    for (let i = 0; i < 15; i++) {
      saveHighScore({ name: `N${i}`, score: 10_000 + i, date: '2024-01-01' });
    }
    const all = loadHighScores();
    expect(all.length).toBe(10);
  });

  it('isHighScore returns true when score beats last entry', () => {
    const all = loadHighScores();
    const lowest = all[all.length - 1].score;
    expect(isHighScore(lowest + 1)).toBe(true);
    expect(isHighScore(lowest - 1)).toBe(false);
  });

  it('isHighScore rejects non-positive scores', () => {
    expect(isHighScore(0)).toBe(false);
  });

  it('getRank returns correct rank or null', () => {
    const all = loadHighScores();
    expect(getRank(all[0].score + 1)).toBe(1);
    expect(getRank(1)).toBeNull();
  });
});
