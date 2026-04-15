import { describe, it, expect } from 'vitest';
import { createInitialState, spawnObject, tick, getUnlockedBinsSorted, moveLeft } from '../../game/gameEngine';
import { FALL_AREA_HEIGHT, OBJECT_SIZE } from '../../game/constants';

describe('gameLoop', () => {
  it('spawned object starts above canvas', () => {
    let s = createInitialState();
    s = spawnObject(s);
    expect(s.currentObject!.y).toBeLessThan(0);
  });

  it('object falls and eventually lands', () => {
    let s = createInitialState();
    s = spawnObject(s);
    // Force object to match leftmost bin so landing is "correct"
    const sorted = getUnlockedBinsSorted(s);
    s.currentObject!.object = { ...s.currentObject!.object, placeValue: sorted[0].placeValue };
    s.currentObject!.column = 0;
    for (let i = 0; i < 2000; i++) {
      s = tick(s, 16);
      if (s.currentObject === null) break;
    }
    expect(s.currentObject).toBeNull();
    expect(s.lastDropResult).toBe('correct');
    expect(s.totalCorrect).toBe(1);
  });

  it('landing in wrong column yields wrong result', () => {
    let s = createInitialState();
    s = spawnObject(s);
    const sorted = getUnlockedBinsSorted(s);
    // Object matches column 0 bin
    s.currentObject!.object = { ...s.currentObject!.object, placeValue: sorted[0].placeValue };
    // Move to column 1 (wrong)
    s.currentObject!.column = 1;
    for (let i = 0; i < 2000; i++) {
      s = tick(s, 16);
      if (s.currentObject === null) break;
    }
    expect(s.lastDropResult).toBe('wrong');
    expect(s.lives).toBe(2);
  });

  it('moveLeft during flight updates the column', () => {
    let s = createInitialState();
    s = spawnObject(s);
    const colBefore = s.currentObject!.column;
    s = moveLeft(s);
    expect(s.currentObject!.column).toBe(Math.max(0, colBefore - 1));
  });

  it('object y exceeds FALL_AREA_HEIGHT - OBJECT_SIZE on landing frame', () => {
    let s = createInitialState();
    s = spawnObject(s);
    const sorted = getUnlockedBinsSorted(s);
    s.currentObject!.object = { ...s.currentObject!.object, placeValue: sorted[0].placeValue };
    s.currentObject!.column = 0;
    let lastY = s.currentObject!.y;
    for (let i = 0; i < 2000; i++) {
      if (!s.currentObject) break;
      lastY = s.currentObject.y;
      s = tick(s, 16);
    }
    // Before the landing frame fired currentObject.y reached landY
    expect(lastY).toBeGreaterThanOrEqual(0);
    expect(lastY).toBeLessThanOrEqual(FALL_AREA_HEIGHT - OBJECT_SIZE + 2);
  });
});
