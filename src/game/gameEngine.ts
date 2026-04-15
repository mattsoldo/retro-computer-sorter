import type { GameState, FallingObject, BinState, PlaceValueBin, SortedItemRecord } from './types';
import { UNLOCK_TIERS, INITIAL_LIVES, INITIAL_FALL_SPEED, FAST_DROP_SPEED, SPEED_INCREMENT,
         CORRECT_PER_UNLOCK, SCORE_BASE, SCORE_COMBO_MULTIPLIER,
         BIN_HEIGHT, OBJECT_SIZE, FALL_AREA_HEIGHT,
         BIN_DEFINITIONS } from './constants';
import { pickNextObject } from './objects';

// Suppress unused const warnings — values re-exported for clarity
void BIN_HEIGHT;

function buildInitialBins(): BinState[] {
  const startUnlocked = new Set<PlaceValueBin>(UNLOCK_TIERS[0]);
  return (Object.keys(BIN_DEFINITIONS) as PlaceValueBin[]).map(pv => ({
    placeValue: pv,
    label: BIN_DEFINITIONS[pv].label,
    shortLabel: BIN_DEFINITIONS[pv].shortLabel,
    range: BIN_DEFINITIONS[pv].range,
    count: 0,
    unlocked: startUnlocked.has(pv),
  }));
}

export function createInitialState(): GameState {
  const bins = buildInitialBins();
  return {
    status: 'playing',
    score: 0,
    lives: INITIAL_LIVES,
    combo: 0,
    level: 1,
    totalCorrect: 0,
    bins,
    currentObject: null,
    lastDropResult: null,
    lastDropTimer: 0,
    sortedItems: [],
  };
}

export function getUnlockedBins(state: GameState): PlaceValueBin[] {
  return state.bins.filter(b => b.unlocked).map(b => b.placeValue);
}

export function getUnlockedBinsSorted(state: GameState): BinState[] {
  // Largest place value on the left (col 0), smallest on the right — matches positional notation
  const ORDER: PlaceValueBin[] = ['millions','hundred-thousands','ten-thousands','thousands','hundreds','tens','ones'];
  return ORDER
    .map(pv => state.bins.find(b => b.placeValue === pv)!)
    .filter(b => b?.unlocked);
}

/** Spawn a new object at a random column */
export function spawnObject(state: GameState, recentIds: string[] = []): GameState {
  const unlocked = getUnlockedBins(state);
  const object = pickNextObject(unlocked, recentIds);
  const sortedBins = getUnlockedBinsSorted(state);
  const startColumn = Math.floor(Math.random() * sortedBins.length);
  const falling: FallingObject = {
    object,
    column: startColumn,
    y: -OBJECT_SIZE,
    isFastDropping: false,
  };
  return { ...state, currentObject: falling };
}

/** Move left — clamps to 0 */
export function moveLeft(state: GameState): GameState {
  if (!state.currentObject) return state;
  const min = 0;
  return {
    ...state,
    currentObject: {
      ...state.currentObject,
      column: Math.max(min, state.currentObject.column - 1),
    },
  };
}

/** Move right — clamps to unlocked bin count - 1 */
export function moveRight(state: GameState): GameState {
  if (!state.currentObject) return state;
  const max = getUnlockedBinsSorted(state).length - 1;
  return {
    ...state,
    currentObject: {
      ...state.currentObject,
      column: Math.min(max, state.currentObject.column + 1),
    },
  };
}

/** Toggle fast drop */
export function setFastDrop(state: GameState, fast: boolean): GameState {
  if (!state.currentObject) return state;
  return {
    ...state,
    currentObject: { ...state.currentObject, isFastDropping: fast },
  };
}

const TARGET_FRAME_MS = 1000 / 60; // 16.67ms — our canonical "one frame"

/** Called each animation frame — returns updated state.
 *  Uses delta-time normalisation so the game runs at the same
 *  perceived speed regardless of actual frame rate. */
export function tick(state: GameState, deltaMs: number): GameState {
  if (state.status !== 'playing') return state;

  // Cap delta to 100 ms so a backgrounded / throttled tab never
  // causes a massive single-frame position jump when it wakes up.
  const dt = Math.min(deltaMs, 100);
  // 1.0 = exactly one 60 fps frame; 2.0 = two frames elapsed, etc.
  const frameNorm = dt / TARGET_FRAME_MS;

  // Always tick the spawn-delay timer so the rAF loop can trigger a spawn
  const nextLastDropTimer = state.lastDropTimer > 0
    ? Math.max(0, state.lastDropTimer - frameNorm)
    : 0;

  // Nothing to move yet — just keep time ticking
  if (!state.currentObject) {
    return { ...state, lastDropTimer: nextLastDropTimer };
  }

  const speedPerFrame = state.currentObject.isFastDropping
    ? FAST_DROP_SPEED
    : INITIAL_FALL_SPEED + (state.level - 1) * SPEED_INCREMENT;

  const newY = state.currentObject.y + speedPerFrame * frameNorm;
  const landY = FALL_AREA_HEIGHT - OBJECT_SIZE;

  if (newY >= landY) {
    return handleLanding({ ...state, currentObject: { ...state.currentObject, y: landY } });
  }

  // Decrement bin flash timers (also frame-normalised)
  const bins = state.bins.map(b => {
    if (b.flashTimer && b.flashTimer > 0) {
      const t = Math.max(0, b.flashTimer - frameNorm);
      return { ...b, flashTimer: t, lastResult: t > 0 ? b.lastResult : undefined };
    }
    return b;
  });

  return {
    ...state,
    bins,
    currentObject: { ...state.currentObject, y: newY },
    lastDropTimer: nextLastDropTimer,
  };
}

/** Handle object reaching the bottom — check correct bin */
export function handleLanding(state: GameState): GameState {
  if (!state.currentObject) return state;

  const sortedBins = getUnlockedBinsSorted(state);
  const landedBin = sortedBins[state.currentObject.column];
  const isCorrect = landedBin?.placeValue === state.currentObject.object.placeValue;

  let newScore = state.score;
  let newLives = state.lives;
  let newCombo = state.combo;
  let newCorrect = state.totalCorrect;
  let newSortedItems: SortedItemRecord[] = state.sortedItems;

  if (isCorrect) {
    newCombo += 1;
    newCorrect += 1;
    newScore += SCORE_BASE + (newCombo > 1 ? (newCombo - 1) * SCORE_COMBO_MULTIPLIER : 0);
    newSortedItems = [
      ...state.sortedItems,
      { object: state.currentObject.object, bin: landedBin.placeValue },
    ];
  } else {
    newLives -= 1;
    newCombo = 0;
  }

  // Update bin counts
  const newBins = state.bins.map(b => {
    if (b.placeValue === landedBin?.placeValue) {
      return {
        ...b,
        count: isCorrect ? b.count + 1 : b.count,
        lastResult: (isCorrect ? 'correct' : 'wrong') as 'correct' | 'wrong',
        flashTimer: 45,
      };
    }
    return b;
  });

  // Check unlocks
  const unlockedBins = checkUnlocks(newBins, newCorrect);

  // Level progression
  const newLevel = Math.floor(newCorrect / 10) + 1;

  const newStatus = newLives <= 0 ? 'gameOver' : 'playing';

  return {
    ...state,
    score: newScore,
    lives: newLives,
    combo: newCombo,
    level: newLevel,
    totalCorrect: newCorrect,
    bins: unlockedBins,
    currentObject: null,
    sortedItems: newSortedItems,
    lastDropResult: isCorrect ? 'correct' : 'wrong',
    // Correct drop: longer pause so the player can read the item card factoid.
    // Wrong drop: short pause — no factoid, just respawn quickly.
    lastDropTimer: isCorrect ? 180 : 60,
    status: newStatus,
  };
}

function checkUnlocks(bins: BinState[], totalCorrect: number): BinState[] {
  const newBins = [...bins];
  let tier = 0;
  for (let i = 0; i < UNLOCK_TIERS.length; i++) {
    if (totalCorrect >= i * CORRECT_PER_UNLOCK) tier = i;
  }
  const allUnlocked = new Set(UNLOCK_TIERS.slice(0, tier + 1).flat());
  return newBins.map(b => ({ ...b, unlocked: allUnlocked.has(b.placeValue) }));
}
