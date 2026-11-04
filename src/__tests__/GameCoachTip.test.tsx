import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { LanguageProvider } from '../hooks/useLanguage';
import GameCoachTip from '../components/game/GameCoachTip';

afterEach(cleanup);

describe('GameCoachTip', () => {
  it('guides the first action, gets out of the way, and can be reopened', () => {
    const { rerender } = render(<LanguageProvider><GameCoachTip mode="classic" currentIndex={0} feedback={null} /></LanguageProvider>);
    expect(screen.getByRole('complementary', { name: 'How to play' })).toBeTruthy();
    rerender(<LanguageProvider><GameCoachTip mode="classic" currentIndex={1} feedback={null} /></LanguageProvider>);
    expect(screen.queryByRole('complementary')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'How to play' }));
    expect(screen.getByRole('complementary', { name: 'How to play' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Hide tip' }));
    expect(screen.queryByRole('complementary')).toBeNull();
  });
});
