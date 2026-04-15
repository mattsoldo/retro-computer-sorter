import { describe, it, expect } from 'vitest';
import { getPlaceValueBin, formatSpec, describeLeadingDigit } from '../../game/placeValue';

describe('getPlaceValueBin', () => {
  it.each([
    [1, 'ones'], [9, 'ones'],
    [10, 'tens'], [99, 'tens'],
    [100, 'hundreds'], [128, 'hundreds'], [999, 'hundreds'],
    [1000, 'thousands'], [4096, 'thousands'], [9999, 'thousands'],
    [10000, 'ten-thousands'], [65536, 'ten-thousands'], [99999, 'ten-thousands'],
    [100000, 'hundred-thousands'], [524288, 'hundred-thousands'], [999999, 'hundred-thousands'],
    [1000000, 'millions'], [1048576, 'millions'], [3333360, 'millions'],
  ])('getPlaceValueBin(%i) === %s', (n, expected) => {
    expect(getPlaceValueBin(n as number)).toBe(expected);
  });

  it('throws on 0', () => expect(() => getPlaceValueBin(0)).toThrow());
  it('throws on negative', () => expect(() => getPlaceValueBin(-5)).toThrow());
  it('throws on non-integer', () => expect(() => getPlaceValueBin(1.5)).toThrow());
});

describe('formatSpec', () => {
  it('adds commas', () => {
    expect(formatSpec(1000)).toBe('1,000');
    expect(formatSpec(1048576)).toBe('1,048,576');
    expect(formatSpec(7)).toBe('7');
  });
});

describe('describeLeadingDigit', () => {
  it('describes place values', () => {
    expect(describeLeadingDigit(5)).toBe('ones');
    expect(describeLeadingDigit(500)).toBe('hundreds');
    expect(describeLeadingDigit(1_048_576)).toBe('millions');
  });
});
