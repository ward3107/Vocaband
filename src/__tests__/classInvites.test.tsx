import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ShareClassLinkModal from '../components/ShareClassLinkModal';
import JoinGameModal from '../components/JoinGameModal';
import { classEntryT } from '../locales/class-entry';

vi.mock('../hooks/useLanguage', () => ({
  useLanguage: () => ({ language: 'en', dir: 'ltr', isRTL: false }),
}));
const writeText = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  writeText.mockResolvedValue(undefined);
});
afterEach(cleanup);

describe('teacher invitations', () => {
  it('lets teachers choose Hebrew instructions without changing the English dashboard', () => {
    render(<ShareClassLinkModal open onClose={vi.fn()} className="ז׳ 1" code="ABCD2345" />);
    fireEvent.click(screen.getByRole('button', { name: 'עברית' }));
    const link = screen.getByRole('link', { name: /וואטסאפ|WhatsApp/ });
    const message = new URL(link.getAttribute('href')!).searchParams.get('text')!;
    expect(message).toContain('מזינים את הקוד האישי שקיבלתם מהמורה');
    expect(message).toContain('class=ABCD2345');
  });
  it('shares Hebrew-class instructions in Hebrew even when the UI is English', () => {
    render(<ShareClassLinkModal open onClose={vi.fn()} className="ז׳ 1" code="ABCD2345" language="he" assignmentId="task-he" />);
    const link = screen.getByRole('link', { name: /וואטסאפ|WhatsApp/ });
    const message = new URL(link.getAttribute('href')!).searchParams.get('text')!;
    expect(message).toContain('מזינים את הקוד האישי שקיבלתם מהמורה');
    const destination = new URL(message.split('\n')[1]);
    expect(destination.searchParams.get('className')).toBe('ז׳ 1');
    expect(destination.searchParams.get('assignment')).toBe('task-he');
    expect(link.closest('[dir]')?.getAttribute('dir')).toBe('rtl');
  });
  it('includes all student steps and preserves the assignment in WhatsApp', () => {
    render(
      <ShareClassLinkModal
        open
        onClose={vi.fn()}
        className="Year 7"
        code="ABCD2345"
        assignmentId="task-42"
      />
    );
    const whatsapp = screen.getByRole('link', { name: /WhatsApp/ });
    const text = new URL(whatsapp.getAttribute('href')!).searchParams.get('text')!;
    expect(text).toContain('assignment=task-42');
    expect(text).toContain('personal PIN');
    expect(text).toContain('Choose your name or student code');
  });
  it('opens the roster from the preparation step and closes the invitation', () => {
    const onClose = vi.fn();
    const onOpenRoster = vi.fn();
    render(
      <ShareClassLinkModal
        open
        onClose={onClose}
        onOpenRoster={onOpenRoster}
        className="Year 7"
        code="ABCD2345"
      />
    );
    fireEvent.click(
      screen.getAllByRole('button', { name: classEntryT.en.manage, hidden: true })[0]
    );
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onOpenRoster).toHaveBeenCalledTimes(1);
  });
  it('gives a usable manual-copy fallback when clipboard permission is denied', async () => {
    writeText.mockRejectedValue(new Error('denied'));
    render(<ShareClassLinkModal open onClose={vi.fn()} className="Year 7" code="ABCD2345" />);
    fireEvent.click(screen.getByRole('button', { name: classEntryT.en.copyLink }));
    expect(await screen.findByText(classEntryT.en.copyFailed)).toBeTruthy();
    expect(
      (screen.getByRole('textbox', { name: classEntryT.en.copyLink }) as HTMLInputElement).value
    ).toContain('class=ABCD2345');
  });
});

describe('game code entry', () => {
  it('does not silently truncate an eight-character class code into a game code', () => {
    render(<JoinGameModal onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Game code from your teacher'), {
      target: { value: 'ABCD2345' },
    });
    expect(screen.getByText(classEntryT.en.gameClassMistake)).toBeTruthy();
    expect(
      screen.getByRole('link', { name: classEntryT.en.openClass }).getAttribute('href')
    ).toContain('class=ABCD2345');
    expect(screen.queryByRole('button', { name: classEntryT.en.joinGame })).toBeNull();
  });
  it('preserves a pasted game URL rather than stripping and truncating the URL text', () => {
    render(<JoinGameModal onClose={vi.fn()} initialCode="https://vocaband.com/?session=ABCD23" />);
    expect(
      screen.getByRole('button', { name: classEntryT.en.joinGame }).hasAttribute('disabled')
    ).toBe(false);
  });
  it('keeps a personal class invite and assignment intact if pasted in the game dialog', () => {
    const id = '5f7b1234-1111-2222-3333-123456789abc';
    render(
      <JoinGameModal
        onClose={vi.fn()}
        initialCode={`https://vocaband.com/student?class=ABCD23&s=${id}&assignment=task-7`}
      />
    );
    const link = new URL(
      screen.getByRole('link', { name: classEntryT.en.openClass }).getAttribute('href')!
    );
    expect(link.searchParams.get('class')).toBe('ABCD23');
    expect(link.searchParams.get('s')).toBe(id);
    expect(link.searchParams.get('assignment')).toBe('task-7');
  });
  it('closes with Escape through the shared accessible modal shell', () => {
    const onClose = vi.fn();
    render(<JoinGameModal onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
