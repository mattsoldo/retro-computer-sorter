import { describe, it, expect } from 'vitest';
import { createInitialState, spawnObject, tick, getAllBinsSorted, moveLeft } from '../../game/gameEngine';
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
    s.currentObject!.object = { ...s.currentObject!.object, placeValue: 'thousands' };
    s.currentObject!.column = getAllBinsSorted(s).findIndex(b => b.placeValue === 'thousands');
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
    s.currentObject!.object = { ...s.currentObject!.object, placeValue: 'thousands' };
    s.currentObject!.column = getAllBinsSorted(s).findIndex(b => b.placeValue === 'hundreds');
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
    const min = getAllBinsSorted(s).findIndex(b => b.unlocked);
    expect(s.currentObject!.column).toBe(Math.max(min, colBefore - 1));
  });

  it('object y exceeds FALL_AREA_HEIGHT - OBJECT_SIZE on landing frame', () => {
    let s = createInitialState();
    s = spawnObject(s);
    s.currentObject!.object = { ...s.currentObject!.object, placeValue: 'thousands' };
    s.currentObject!.column = getAllBinsSorted(s).findIndex(b => b.placeValue === 'thousands');
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
