import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import GameScreen from '../../components/GameScreen';
import type { BinState, GameState, RetroObject } from '../../game/types';

const object: RetroObject = {
  id: 'test-object',
  name: 'Test Computer',
  year: 1985,
  category: 'computer',
  spec: 4096,
  specLabel: 'bytes',
  speech: 'number of bytes',
  placeValue: 'thousands',
  factoid: 'A test fact.',
};

const ORDER: BinState['placeValue'][] = [
  'millions',
  'hundred-thousands',
  'ten-thousands',
  'thousands',
  'hundreds',
  'tens',
  'ones',
];

function makeBins(unlockTenThousands: boolean): BinState[] {
  return ORDER.map(placeValue => ({
    placeValue,
    label: placeValue,
    shortLabel: placeValue,
    range: placeValue,
    count: 0,
    unlocked: ['ones', 'tens', 'hundreds', 'thousands'].includes(placeValue)
      || (unlockTenThousands && placeValue === 'ten-thousands'),
  }));
}

function makeState(unlockTenThousands: boolean): GameState {
  return {
    status: 'playing',
    score: 0,
    lives: 3,
    combo: 0,
    level: unlockTenThousands ? 2 : 1,
    totalCorrect: 0,
    bins: makeBins(unlockTenThousands),
    currentObject: {
      object,
      column: 3,
      y: 0,
      isFastDropping: false,
    },
    lastDropResult: null,
    lastDropTimer: 0,
    sortedItems: [],
  };
}

let tickCalls = 0;

vi.mock('../../game/audio', () => ({
  playCorrect: vi.fn(),
  playWrong: vi.fn(),
  playCombo: vi.fn(),
  playLevelUp: vi.fn(),
  playGameOver: vi.fn(),
  playUnlock: vi.fn(),
  unlockAudio: vi.fn(),
  speakSpec: vi.fn(),
  speakText: vi.fn(),
}));

vi.mock('../../game/gameEngine', () => ({
  createInitialState: vi.fn(() => makeState(false)),
  spawnObject: vi.fn((state: GameState) => state),
  tick: vi.fn((state: GameState) => {
    tickCalls += 1;
    return tickCalls === 1 ? makeState(true) : state;
  }),
  moveLeft: vi.fn((state: GameState) => state),
  moveRight: vi.fn((state: GameState) => state),
  setFastDrop: vi.fn((state: GameState) => state),
  getUnlockedBinsSorted: vi.fn((state: GameState) => state.bins.filter(bin => bin.unlocked)),
  getAllBinsSorted: vi.fn((state: GameState) => state.bins),
}));

describe('GameScreen unlock popup', () => {
  beforeEach(() => {
    tickCalls = 0;
    const mockContext = {
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      rect: vi.fn(),
      clip: vi.fn(),
      stroke: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      fill: vi.fn(),
      closePath: vi.fn(),
      arcTo: vi.fn(),
      fillText: vi.fn(),
      strokeRect: vi.fn(),
      clearRect: vi.fn(),
      globalAlpha: 1,
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      font: '',
      textAlign: 'center',
      textBaseline: 'middle',
    } as unknown as CanvasRenderingContext2D;
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => mockContext);
  });

  it('ignores non-Enter keys and dismisses on Enter', async () => {
    let rafCallback: FrameRequestCallback | null = null;
    vi.stubGlobal('requestAnimationFrame', vi.fn((cb: FrameRequestCallback) => {
      rafCallback = cb;
      return 1;
    }));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());

    render(<GameScreen onGameOver={vi.fn()} onQuit={vi.fn()} />);

    await act(async () => {
      rafCallback?.(16);
    });

    expect(await screen.findByText(/new place value/i)).toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    });
    expect(screen.getByText(/new place value/i)).toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    });
    expect(screen.queryByText(/new place value/i)).not.toBeInTheDocument();
  });
});
