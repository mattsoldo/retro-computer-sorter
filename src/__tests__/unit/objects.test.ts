import { describe, it, expect } from 'vitest';
import { RETRO_OBJECTS, getObjectsForBins, pickNextObject } from '../../game/objects';
import { getPlaceValueBin } from '../../game/placeValue';
import type { PlaceValueBin } from '../../game/types';

describe('RETRO_OBJECTS database', () => {
  it('every object has a valid positive integer spec', () => {
    for (const obj of RETRO_OBJECTS) {
      expect(Number.isInteger(obj.spec)).toBe(true);
      expect(obj.spec).toBeGreaterThanOrEqual(1);
    }
  });

  it('every object\'s placeValue matches getPlaceValueBin(spec)', () => {
    for (const obj of RETRO_OBJECTS) {
      expect(obj.placeValue).toBe(getPlaceValueBin(obj.spec));
    }
  });

  it('has no duplicate IDs', () => {
    const ids = RETRO_OBJECTS.map(o => o.id);
    const uniq = new Set(ids);
    expect(uniq.size).toBe(ids.length);
  });

  it('represents all 7 place value bins', () => {
    const bins: PlaceValueBin[] = [
      'ones','tens','hundreds','thousands','ten-thousands','hundred-thousands','millions',
    ];
    for (const bin of bins) {
      const count = RETRO_OBJECTS.filter(o => o.placeValue === bin).length;
      expect(count, `bin ${bin} count`).toBeGreaterThanOrEqual(3);
    }
  });

  it('every object has non-empty name, specLabel and factoid', () => {
    for (const obj of RETRO_OBJECTS) {
      expect(obj.name.length).toBeGreaterThan(0);
      expect(obj.specLabel.length).toBeGreaterThan(0);
      expect(obj.factoid.length).toBeGreaterThan(0);
    }
  });
});

describe('getObjectsForBins', () => {
  it('returns only objects with matching place values', () => {
    const filtered = getObjectsForBins(['hundreds']);
    for (const obj of filtered) expect(obj.placeValue).toBe('hundreds');
    expect(filtered.length).toBeGreaterThan(0);
  });
  it('returns empty array for no bins', () => {
    expect(getObjectsForBins([])).toEqual([]);
  });
});

describe('pickNextObject', () => {
  it('returns an object in one of the unlocked bins', () => {
    const unlocked = ['hundreds','thousands','ten-thousands'];
    for (let i = 0; i < 20; i++) {
      const obj = pickNextObject(unlocked);
      expect(unlocked).toContain(obj.placeValue);
    }
  });
  it('avoids recent ids when pool is large enough', () => {
    const unlocked = ['hundreds','thousands','ten-thousands'];
    const pool = getObjectsForBins(unlocked);
    const recent = pool.slice(0, 3).map(o => o.id);
    for (let i = 0; i < 20; i++) {
      const obj = pickNextObject(unlocked, recent);
      expect(recent).not.toContain(obj.id);
    }
  });
});
