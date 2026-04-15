import { describe, it, expect } from 'vitest';
import {
  createInitialState, moveLeft, moveRight, spawnObject, handleLanding,
  getAllBinsSorted, setFastDrop, tick,
} from '../../game/gameEngine';
import { CORRECT_PER_UNLOCK, INITIAL_LIVES } from '../../game/constants';
import type { GameState } from '../../game/types';

describe('createInitialState', () => {
  it('starts with 4 unlocked bins (tier 0)', () => {
    const s = createInitialState();
    const unlocked = s.bins.filter(b => b.unlocked);
    expect(unlocked.length).toBe(4);
    expect(unlocked.map(b => b.placeValue).sort()).toEqual(
      ['hundreds','ones','tens','thousands'].sort(),
    );
  });
  it('starts with INITIAL_LIVES lives and score 0', () => {
    const s = createInitialState();
    expect(s.lives).toBe(INITIAL_LIVES);
    expect(s.score).toBe(0);
    expect(s.totalCorrect).toBe(0);
    expect(s.combo).toBe(0);
    expect(s.status).toBe('playing');
  });
});

describe('movement', () => {
  it('moveLeft clamps at 0', () => {
    let s = createInitialState();
    s = spawnObject(s);
    const min = getAllBinsSorted(s).findIndex(b => b.unlocked);
    s.currentObject!.column = min;
    s = moveLeft(s);
    expect(s.currentObject!.column).toBe(min);
  });
  it('moveRight clamps at unlockedBins.length - 1', () => {
    let s = createInitialState();
    s = spawnObject(s);
    const max = getAllBinsSorted(s).length - 1;
    s.currentObject!.column = max;
    s = moveRight(s);
    expect(s.currentObject!.column).toBe(max);
  });
  it('moveLeft moves by 1', () => {
    let s = createInitialState();
    s = spawnObject(s);
    s.currentObject!.column = 4;
    s = moveLeft(s);
    expect(s.currentObject!.column).toBe(3);
  });
  it('moveRight moves by 1', () => {
    let s = createInitialState();
    s = spawnObject(s);
    s.currentObject!.column = 3;
    s = moveRight(s);
    expect(s.currentObject!.column).toBe(4);
  });
  it('no-ops when no current object', () => {
    const s = createInitialState();
    expect(moveLeft(s)).toBe(s);
    expect(moveRight(s)).toBe(s);
    expect(setFastDrop(s, true)).toBe(s);
  });
});

describe('handleLanding — correct drop', () => {
  it('increases score and combo, keeps lives', () => {
    let s = createInitialState();
    s = spawnObject(s);
    const allBins = getAllBinsSorted(s);
    const targetIndex = allBins.findIndex(b => b.placeValue === 'thousands');
    const targetBin = allBins[targetIndex];
    s.currentObject!.object = { ...s.currentObject!.object, placeValue: targetBin.placeValue };
    s.currentObject!.column = targetIndex;
    const after = handleLanding(s);
    expect(after.lives).toBe(INITIAL_LIVES);
    expect(after.combo).toBe(1);
    expect(after.totalCorrect).toBe(1);
    expect(after.score).toBeGreaterThan(0);
    expect(after.lastDropResult).toBe('correct');
  });

  it('combo multiplier boosts score on subsequent correct drops', () => {
    let s = createInitialState();
    s = spawnObject(s);
    s.currentObject!.object = { ...s.currentObject!.object, placeValue: 'thousands' };
    s.currentObject!.column = getAllBinsSorted(s).findIndex(b => b.placeValue === 'thousands');
    const after1 = handleLanding(s);
    const firstScore = after1.score;

    // Land a second one
    const s2 = spawnObject(after1);
    s2.currentObject!.object = { ...s2.currentObject!.object, placeValue: 'thousands' };
    s2.currentObject!.column = getAllBinsSorted(s2).findIndex(b => b.placeValue === 'thousands');
    const after2 = handleLanding(s2);
    expect(after2.score - firstScore).toBeGreaterThan(100);
    expect(after2.combo).toBe(2);
  });
});

describe('handleLanding — wrong drop', () => {
  it('decreases lives and resets combo', () => {
    let s = createInitialState();
    s = spawnObject(s);
    s.currentObject!.object = { ...s.currentObject!.object, placeValue: 'thousands' };
    s.currentObject!.column = getAllBinsSorted(s).findIndex(b => b.placeValue === 'hundreds');
    s.combo = 5;
    const after = handleLanding(s);
    expect(after.lives).toBe(INITIAL_LIVES - 1);
    expect(after.combo).toBe(0);
    expect(after.lastDropResult).toBe('wrong');
  });

  it('triggers gameOver when lives reach 0', () => {
    let s: GameState = createInitialState();
    s = { ...s, lives: 1 };
    s = spawnObject(s);
    s.currentObject!.object = { ...s.currentObject!.object, placeValue: 'thousands' };
    s.currentObject!.column = getAllBinsSorted(s).findIndex(b => b.placeValue === 'hundreds');
    const after = handleLanding(s);
    expect(after.lives).toBe(0);
    expect(after.status).toBe('gameOver');
  });
});

describe('unlocks', () => {
  it('unlocks one new place-value column after CORRECT_PER_UNLOCK correct drops', () => {
    let s = createInitialState();
    // Simulate N correct drops
    for (let i = 0; i < CORRECT_PER_UNLOCK; i++) {
      s = spawnObject(s);
      s.currentObject!.object = { ...s.currentObject!.object, placeValue: 'thousands' };
      s.currentObject!.column = getAllBinsSorted(s).findIndex(b => b.placeValue === 'thousands');
      s = handleLanding(s);
    }
    const unlocked = s.bins.filter(b => b.unlocked).map(b => b.placeValue).sort();
    expect(unlocked).toContain('ten-thousands');
    expect(unlocked).not.toContain('hundred-thousands');
    expect(s.level).toBe(2);
  });

  it('unlocks the next column after 2 * CORRECT_PER_UNLOCK correct drops', () => {
    let s = createInitialState();
    for (let i = 0; i < CORRECT_PER_UNLOCK * 2; i++) {
      s = spawnObject(s);
      s.currentObject!.object = { ...s.currentObject!.object, placeValue: 'thousands' };
      s.currentObject!.column = getAllBinsSorted(s).findIndex(b => b.placeValue === 'thousands');
      s = handleLanding(s);
    }
    const unlocked = s.bins.filter(b => b.unlocked).map(b => b.placeValue);
    expect(unlocked).toContain('hundred-thousands');
    expect(unlocked).not.toContain('millions');
    expect(s.level).toBe(3);
  });

  it('unlocks millions after 3 * CORRECT_PER_UNLOCK correct drops', () => {
    let s = createInitialState();
    for (let i = 0; i < CORRECT_PER_UNLOCK * 3; i++) {
      s = spawnObject(s);
      s.currentObject!.object = { ...s.currentObject!.object, placeValue: 'thousands' };
      s.currentObject!.column = getAllBinsSorted(s).findIndex(b => b.placeValue === 'thousands');
      s = handleLanding(s);
    }
    const unlocked = s.bins.filter(b => b.unlocked).map(b => b.placeValue);
    expect(unlocked).toContain('millions');
    expect(s.level).toBe(4);
  });
});

describe('tick', () => {
  it('moves the object downward', () => {
    let s = createInitialState();
    s = spawnObject(s);
    const y0 = s.currentObject!.y;
    s = tick(s, 16);
    expect(s.currentObject!.y).toBeGreaterThan(y0);
  });

  it('fast drop moves faster', () => {
    let s1 = createInitialState();
    s1 = spawnObject(s1);
    let s2 = createInitialState();
    s2 = spawnObject(s2);
    s2 = setFastDrop(s2, true);
    s1 = tick(s1, 16);
    s2 = tick(s2, 16);
    expect(s2.currentObject!.y).toBeGreaterThan(s1.currentObject!.y);
  });
});
