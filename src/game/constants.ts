import type { PlaceValueBin } from './types';

export const CANVAS_WIDTH = 700;
export const CANVAS_HEIGHT = 520;
export const BIN_HEIGHT = 100;
export const OBJECT_SIZE = 72;
export const COLUMN_WIDTH = 100;
export const FALL_AREA_HEIGHT = CANVAS_HEIGHT - BIN_HEIGHT;

export const INITIAL_LIVES = 3;
export const INITIAL_FALL_SPEED = 1.2;   // pixels per frame
export const FAST_DROP_SPEED = 8;
export const SPEED_INCREMENT = 0.15;     // added per level
export const CORRECT_PER_UNLOCK = 8;     // correct drops to unlock next bin tier
export const SCORE_BASE = 100;
export const SCORE_COMBO_MULTIPLIER = 50;

export const BIN_DEFINITIONS: Record<PlaceValueBin, {
  label: string;
  shortLabel: string;
  range: string;
  color: string;
  textColor: string;
}> = {
  ones:              { label: 'Ones',              shortLabel: '1s',    range: '1 – 9',             color: '#1a472a', textColor: '#90ee90' },
  tens:              { label: 'Tens',              shortLabel: '10s',   range: '10 – 99',           color: '#1a3a6e', textColor: '#7ec8e3' },
  hundreds:          { label: 'Hundreds',          shortLabel: '100s',  range: '100 – 999',         color: '#4a1a6e', textColor: '#d8a0ff' },
  thousands:         { label: 'Thousands',         shortLabel: '1,000s',range: '1,000 – 9,999',     color: '#6e3a1a', textColor: '#ffbb88' },
  'ten-thousands':   { label: 'Ten-Thousands',     shortLabel: '10Ks',  range: '10,000 – 99,999',   color: '#6e1a3a', textColor: '#ffaabb' },
  'hundred-thousands':{ label: 'Hundred-Thousands',shortLabel: '100Ks', range: '100,000 – 999,999', color: '#1a5a5a', textColor: '#88ffee' },
  millions:          { label: 'Millions',          shortLabel: '1Ms',   range: '1,000,000+',        color: '#5a5a00', textColor: '#ffff88' },
};

// Progressive unlock tiers
export const UNLOCK_TIERS: PlaceValueBin[][] = [
  ['ones', 'tens', 'hundreds', 'thousands'],          // tier 0 — start here
  ['ten-thousands', 'hundred-thousands'],             // tier 1 — unlock after 8 correct
  ['millions'],                                       // tier 2 — unlock after 16 correct
];

export const CATEGORY_COLORS: Record<string, string> = {
  computer:   '#7ec8e3',
  monitor:    '#90ee90',
  cartridge:  '#ffbb88',
  chip:       '#d8a0ff',
  arcade:     '#ffaabb',
};
