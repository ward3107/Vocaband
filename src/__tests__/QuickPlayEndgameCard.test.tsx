import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import QuickPlayEndgameCard from '../components/QuickPlayEndgameCard';

afterEach(cleanup);

describe('QuickPlayEndgameCard', () => {
  it('clearly separates choosing another mode from leaving Quick Play', () => {
    const onPlayAnotherMode = vi.fn();
    const onExitQuickPlay = vi.fn();

    render(
      <QuickPlayEndgameCard
        leaderboard={[]}
        mistakes={[]}
        gameWords={[]}
        targetLanguage="hebrew"
        isDark={false}
        disabled={false}
        speakWord={vi.fn()}
        onPlayAnotherMode={onPlayAnotherMode}
        onExitQuickPlay={onExitQuickPlay}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /play another mode/i }));
    expect(onPlayAnotherMode).toHaveBeenCalledOnce();
    expect(onExitQuickPlay).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /exit quick play/i }));
    expect(onExitQuickPlay).toHaveBeenCalledOnce();
  });
});
