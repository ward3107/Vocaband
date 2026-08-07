import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { QuickPlayHelpButton } from '../components/QuickPlayHelpButton';

afterEach(cleanup);

function makeProps(overrides = {}) {
  return {
    language: 'en' as const,
    handRaised: false,
    onRaiseHand: vi.fn(),
    onReplayAudio: vi.fn(),
    onForceReconnect: vi.fn(),
    onToggleTranslation: vi.fn(),
    ...overrides,
  };
}

describe('QuickPlayHelpButton', () => {
  it('renders the button with aria-label', () => {
    render(<QuickPlayHelpButton {...makeProps()} />);
    expect(screen.getByRole('button', { name: /get help/i })).toBeTruthy();
  });

  it('opens the menu on click', () => {
    render(<QuickPlayHelpButton {...makeProps()} />);
    fireEvent.click(screen.getByRole('button', { name: /get help/i }));
    expect(screen.getByText(/how can i help/i)).toBeTruthy();
  });

  it('fires onReplayAudio when the audio option is tapped', () => {
    const props = makeProps();
    render(<QuickPlayHelpButton {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /get help/i }));
    fireEvent.click(screen.getByText(/can't hear the word/i));
    expect(props.onReplayAudio).toHaveBeenCalledOnce();
  });

  it('fires onForceReconnect when frozen option is tapped', () => {
    const props = makeProps();
    render(<QuickPlayHelpButton {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /get help/i }));
    fireEvent.click(screen.getByText(/game looks frozen/i));
    expect(props.onForceReconnect).toHaveBeenCalledOnce();
  });

  it('fires onToggleTranslation when read option is tapped', () => {
    const props = makeProps();
    render(<QuickPlayHelpButton {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /get help/i }));
    fireEvent.click(screen.getByText(/can't read this/i));
    expect(props.onToggleTranslation).toHaveBeenCalledOnce();
  });

  it('fires onRaiseHand when show-teacher is tapped', () => {
    const props = makeProps();
    render(<QuickPlayHelpButton {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /get help/i }));
    fireEvent.click(screen.getByText(/show my teacher/i));
    expect(props.onRaiseHand).toHaveBeenCalledOnce();
  });

  it('renders the ✓ waiting pill inside the menu when handRaised', () => {
    render(<QuickPlayHelpButton {...makeProps({ handRaised: true })} />);
    fireEvent.click(screen.getByRole('button', { name: /get help/i }));
    expect(screen.getByText(/waiting for teacher/i)).toBeTruthy();
  });
});
