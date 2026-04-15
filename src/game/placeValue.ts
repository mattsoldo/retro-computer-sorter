import type { PlaceValueBin } from './types';

/**
 * Returns which place value bin a positive integer belongs to
 * based on its leading (most significant) digit position.
 */
export function getPlaceValueBin(n: number): PlaceValueBin {
  if (!Number.isInteger(n) || n < 1) {
    throw new Error(`Invalid spec value: ${n}`);
  }
  if (n < 10)        return 'ones';
  if (n < 100)       return 'tens';
  if (n < 1_000)     return 'hundreds';
  if (n < 10_000)    return 'thousands';
  if (n < 100_000)   return 'ten-thousands';
  if (n < 1_000_000) return 'hundred-thousands';
  return 'millions';
}

/**
 * Formats a number with commas for display.
 */
export function formatSpec(n: number): string {
  return n.toLocaleString('en-US');
}

/**
 * Returns a human-readable place value name for a number.
 */
export function describeLeadingDigit(n: number): string {
  const bin = getPlaceValueBin(n);
  const map: Record<PlaceValueBin, string> = {
    ones:               'ones',
    tens:               'tens',
    hundreds:           'hundreds',
    thousands:          'thousands',
    'ten-thousands':    'ten-thousands',
    'hundred-thousands':'hundred-thousands',
    millions:           'millions',
  };
  return map[bin];
}
