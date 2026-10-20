import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import StudentClassEntryView from '../views/StudentClassEntryView';
import { LAST_CLASS_KEY, rememberClass } from '../utils/classJoin';
import { classEntryT } from '../locales/class-entry';
import { modalBackStack } from '../utils/modalBackStack';

const mocks = vi.hoisted(() => ({ pinProps: vi.fn(), language: 'en' as 'en' | 'he' | 'ar' }));
vi.mock('../hooks/useLanguage', () => ({
  ALL_LANGUAGES: ['en', 'he', 'ar'],
  languageNames: { en: 'English', he: 'עברית', ar: 'العربية' },
  useLanguage: () => ({
    language: mocks.language,
    dir: mocks.language === 'en' ? 'ltr' : 'rtl',
    setLanguage: vi.fn(),
  }),
}));
vi.mock('../components/StudentLangButton', () => ({ default: () => <span>Language</span> }));
vi.mock('../components/StudentPinLoginCard', () => ({
  default: (props: {
    classCode: string;
    prefilledStudentId?: string | null;
    onSuccess: () => void;
  }) => {
    mocks.pinProps(props);
    return <button onClick={props.onSuccess}>Verified PIN login</button>;
  },
}));
vi.mock('../components/JoinGameModal', () => ({
  default: ({ initialCode }: { initialCode?: string }) => <div>Game: {initialCode}</div>,
}));

const props = () => ({
  setView: vi.fn(),
  error: null,
  studentLoginClassCode: '',
  setStudentLoginClassCode: vi.fn(),
  onTier2Login: vi.fn(),
  cookieBannerOverlay: null,
});
beforeEach(() => {
  vi.clearAllMocks();
  mocks.language = 'en';
  localStorage.clear();
  window.history.replaceState({}, '', '/student');
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('guided student class entry', () => {
  it.each(['en', 'he', 'ar'] as const)('explains the next action in %s', (language) => {
    mocks.language = language;
    render(<StudentClassEntryView {...props()} />);
    expect(screen.getByRole('heading', { name: classEntryT[language].title })).toBeTruthy();
    expect(screen.getByLabelText(classEntryT[language].codeLabel)).toBeTruthy();
    expect(screen.queryByText('Verified PIN login')).toBeNull();
  });
  it('opens a personal invite directly at the existing PIN card without asking for the class code again', () => {
    const studentId = '5f7b1234-1111-2222-3333-123456789abc';
    window.history.replaceState(
      {},
      '',
      `/student?class=ABCD2345&className=Year+7&s=${studentId}&assignment=task-1`
    );
    const p = props();
    render(<StudentClassEntryView {...p} />);
    expect(screen.queryByLabelText(classEntryT.en.codeLabel)).toBeNull();
    expect(screen.getByRole('heading', { name: 'Year 7' })).toBeTruthy();
    expect(mocks.pinProps).toHaveBeenLastCalledWith(
      expect.objectContaining({
        classCode: 'ABCD2345',
        prefilledStudentId: studentId,
        onTier2Login: p.onTier2Login,
      })
    );
    expect(window.location.search).toContain('assignment=task-1');
    expect(localStorage.getItem(LAST_CLASS_KEY)).toBeNull();
    fireEvent.click(screen.getByText('Verified PIN login'));
    expect(JSON.parse(localStorage.getItem(LAST_CLASS_KEY)!)).toEqual({
      code: 'ABCD2345',
      name: 'Year 7',
    });
    expect(p.setView).not.toHaveBeenCalled();
  });
  it('does not fetch the roster while the student is still entering a class code', () => {
    const p = props();
    render(<StudentClassEntryView {...p} />);
    fireEvent.change(screen.getByLabelText(classEntryT.en.codeLabel), { target: { value: 'ABC' } });
    expect(mocks.pinProps).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText(classEntryT.en.codeLabel), {
      target: { value: 'vocaband.com/student?class=abcd2345' },
    });
    fireEvent.click(screen.getByRole('button', { name: classEntryT.en.continue }));
    expect(p.setStudentLoginClassCode).toHaveBeenCalledWith('ABCD2345');
    expect(mocks.pinProps).toHaveBeenLastCalledWith(
      expect.objectContaining({ classCode: 'ABCD2345' })
    );
  });
  it('offers the correct game path rather than using a six-character code as a classroom', () => {
    render(<StudentClassEntryView {...props()} />);
    fireEvent.change(screen.getByLabelText(classEntryT.en.codeLabel), {
      target: { value: 'ABCD23' },
    });
    fireEvent.click(screen.getByRole('button', { name: classEntryT.en.continue }));
    expect(screen.getByText(classEntryT.en.gameHint)).toBeTruthy();
    expect(mocks.pinProps).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: classEntryT.en.joinGame }));
    expect(screen.getByText('Game: ABCD23')).toBeTruthy();
  });
  it('lets another child choose a different class without retaining a personal invite id', () => {
    window.history.replaceState(
      {},
      '',
      '/student?class=ABCD2345&s=5f7b1234-1111-2222-3333-123456789abc'
    );
    render(<StudentClassEntryView {...props()} />);
    fireEvent.click(screen.getByRole('button', { name: classEntryT.en.change }));
    fireEvent.change(screen.getByLabelText(classEntryT.en.codeLabel), {
      target: { value: 'WXYZ2345' },
    });
    fireEvent.click(screen.getByRole('button', { name: classEntryT.en.continue }));
    expect(mocks.pinProps).toHaveBeenLastCalledWith(
      expect.objectContaining({ classCode: 'WXYZ2345', prefilledStudentId: null })
    );
  });
  it('preserves older six-character classroom links and permits explicit class-code confirmation', () => {
    render(<StudentClassEntryView {...props()} />);
    fireEvent.change(screen.getByLabelText(classEntryT.en.codeLabel), {
      target: { value: 'ABCD23' },
    });
    fireEvent.click(screen.getByRole('button', { name: classEntryT.en.continue }));
    fireEvent.click(screen.getByRole('button', { name: classEntryT.en.classCodeInstead }));
    expect(mocks.pinProps).toHaveBeenLastCalledWith(
      expect.objectContaining({ classCode: 'ABCD23' })
    );
  });
  it('treats remembered class data as a shortcut and still requires the existing PIN flow', () => {
    rememberClass('ABCD2345', 'Last class');
    render(<StudentClassEntryView {...props()} />);
    expect(mocks.pinProps).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Last class' }));
    expect(screen.getByText('Verified PIN login')).toBeTruthy();
  });
  it('Back returns one step, preserves the class code, and does not reselect a personal invite', () => {
    window.history.replaceState(
      {},
      '',
      '/student?class=ABCD2345&s=5f7b1234-1111-2222-3333-123456789abc'
    );
    render(<StudentClassEntryView {...props()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect((screen.getByLabelText(classEntryT.en.codeLabel) as HTMLInputElement).value).toBe(
      'ABCD2345'
    );
    expect(modalBackStack.size).toBe(0);
    fireEvent.click(screen.getByRole('button', { name: classEntryT.en.continue }));
    expect(mocks.pinProps).toHaveBeenLastCalledWith(
      expect.objectContaining({ prefilledStudentId: null })
    );
  });
  it('does not prevent login when storage is blocked', () => {
    window.history.replaceState({}, '', '/student?class=ABCD2345');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    render(<StudentClassEntryView {...props()} />);
    expect(() => fireEvent.click(screen.getByText('Verified PIN login'))).not.toThrow();
  });
});
