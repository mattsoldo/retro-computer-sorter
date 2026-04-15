import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HighScoreScreen from '../../components/HighScoreScreen';
import { resetHighScores } from '../../game/highScores';

describe('HighScoreScreen', () => {
  beforeEach(() => {
    localStorage.clear();
    resetHighScores();
  });

  it('highlights the newly submitted entry when the score ties an existing score', async () => {
    const user = userEvent.setup();

    render(
      <HighScoreScreen
        highlightScore={987_654}
        onPlay={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    await user.type(screen.getByPlaceholderText('AAA'), 'abc');
    await user.click(screen.getByRole('button', { name: 'SUBMIT' }));

    const highlightedRows = document.querySelectorAll('.score-row.highlight');
    expect(highlightedRows).toHaveLength(1);
    expect(highlightedRows[0]).toHaveTextContent('ABC');
    expect(highlightedRows[0]).not.toHaveTextContent('SONIC');
  });
});
