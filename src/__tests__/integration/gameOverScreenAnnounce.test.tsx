import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GameOverScreen from '../../components/GameOverScreen';
import type { BinState } from '../../game/types';

const { speakText } = vi.hoisted(() => ({
  speakText: vi.fn<(text: string, onEnd?: () => void) => void>(),
}));

vi.mock('../../game/audio', () => ({
  speakText,
}));

function makeBin(placeValue: BinState['placeValue'], count: number, unlocked = true): BinState {
  return {
    placeValue,
    label: placeValue,
    shortLabel: placeValue,
    range: placeValue,
    count,
    unlocked,
  };
}

describe('GameOverScreen announce timing', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('keeps the current highlight active until speech completion', () => {
    render(
      <GameOverScreen
        score={1234}
        bins={[
          makeBin('millions', 0),
          makeBin('hundred-thousands', 0),
          makeBin('ten-thousands', 0),
          makeBin('thousands', 5),
          makeBin('hundreds', 6),
          makeBin('tens', 7),
          makeBin('ones', 8),
        ]}
        sortedItems={[]}
        onPlay={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    act(() => {
      vi.advanceTimersByTime(700);
    });

    expect(speakText).toHaveBeenCalledWith('five thousand', expect.any(Function));
    expect(screen.getByText('five thousand')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(screen.getByText('five thousand')).toBeInTheDocument();
    expect(speakText).toHaveBeenCalledTimes(1);

    act(() => {
      const onEnd = speakText.mock.calls[0][1];
      onEnd?.();
    });

    expect(speakText).toHaveBeenCalledWith('six hundred', expect.any(Function));
    expect(screen.getByText('six hundred')).toBeInTheDocument();
  });
});
