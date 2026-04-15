export type PlaceValueBin =
  | 'ones'
  | 'tens'
  | 'hundreds'
  | 'thousands'
  | 'ten-thousands'
  | 'hundred-thousands'
  | 'millions';

export type ObjectCategory = 'computer' | 'monitor' | 'cartridge' | 'chip' | 'arcade';

export interface RetroObject {
  id: string;
  name: string;
  year: number;
  category: ObjectCategory;
  spec: number;          // the number shown to the player
  specLabel: string;     // e.g. "65,536 bytes RAM"
  placeValue: PlaceValueBin;
  factoid: string;       // fun fact shown after correct drop
  imageUrl?: string;     // Wikimedia Commons image for the spec panel
}

export interface FallingObject {
  object: RetroObject;
  column: number;        // 0 = leftmost active bin column
  y: number;             // pixels from top of canvas
  isFastDropping: boolean;
}

export interface BinState {
  placeValue: PlaceValueBin;
  label: string;         // "Hundreds"
  shortLabel: string;    // "100s"
  range: string;         // "100 – 999"
  count: number;
  unlocked: boolean;
  lastResult?: 'correct' | 'wrong'; // for flash animation
  flashTimer?: number;
}

export interface HighScoreEntry {
  name: string;
  score: number;
  date: string;
}

export type GameStatus = 'start' | 'playing' | 'paused' | 'gameOver';

export interface GameState {
  status: GameStatus;
  score: number;
  lives: number;
  combo: number;
  level: number;
  totalCorrect: number;
  bins: BinState[];
  currentObject: FallingObject | null;
  lastDropResult: 'correct' | 'wrong' | null;
  lastDropTimer: number; // frames since last drop (for flash)
}
