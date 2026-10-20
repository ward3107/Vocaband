import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import StudentWhatsAppInviteModal from '../components/StudentWhatsAppInviteModal';
import ClassRosterModal from '../components/ClassRosterModal';
import RosterModalV2 from '../components/roster/v2/RosterModalV2';
import { classEntryT } from '../locales/class-entry';
import { studentInviteT } from '../locales/student-invite';

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), writeText: vi.fn() }));
vi.mock('../core/supabase', () => ({
  supabase: { rpc: (...args: unknown[]) => mocks.rpc(...args) },
}));
vi.mock('../hooks/useLanguage', () => ({
  useLanguage: () => ({ language: 'en', dir: 'ltr', isRTL: false }),
}));
vi.mock('../hooks/useIsMobile', () => ({ useIsMobile: () => false }));
vi.mock('../hooks/useFeatureFlags', () => ({ useFeatureFlag: () => ({ isOn: () => false }) }));
vi.mock('../utils/audit', () => ({ logAudit: vi.fn() }));

const mayaId = '5f7b1234-1111-2222-3333-123456789abc';
const aliId = '6a8c1234-1111-2222-3333-123456789abc';
const props = {
  className: 'Year 7',
  classCode: 'ABCD2345',
  studentId: mayaId,
  studentName: 'Maya',
  pin: 'PQRS78',
  language: 'en' as const,
  onClose: vi.fn(),
};
function whatsappMessage(label = studentInviteT.en.share) {
  const link = screen.getByRole('link', { name: label });
  const url = new URL(link.getAttribute('href')!);
  expect(url.origin).toBe('https://wa.me');
  return url.searchParams.get('text')!;
}

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: mocks.writeText },
  });
  mocks.writeText.mockResolvedValue(undefined);
  mocks.rpc.mockResolvedValue({
    data: [
      { id: mayaId, display_name: 'Maya', roster_pin: 'PQRS78' },
      { id: aliId, display_name: 'Ali', roster_pin: 'WXYZ89' },
    ],
    error: null,
  });
});
afterEach(cleanup);

describe('personal WhatsApp invitation', () => {
  it.each(['en', 'he', 'ar'] as const)(
    'prepares a usable invitation in %s without putting credentials in the class link',
    (language) => {
      render(<StudentWhatsAppInviteModal {...props} language={language} />);
      const message = whatsappMessage(studentInviteT[language].share);
      expect(message).toContain('PQRS78');
      expect(message).toContain(`${studentInviteT[language].classCode}: ABCD2345`);
      const link = new URL(message.split('\n')[1]);
      expect(link.pathname).toBe('/student');
      expect(Object.fromEntries(link.searchParams)).toEqual({
        class: 'ABCD2345',
        className: 'Year 7',
        s: mayaId,
      });
      expect(link.toString()).not.toContain('PQRS78');
      expect(screen.getByRole('dialog').getAttribute('dir')).toBe(
        language === 'en' ? 'ltr' : 'rtl'
      );
      expect(
        screen.getByRole('link', { name: studentInviteT[language].share }).getAttribute('rel')
      ).toContain('noreferrer');
    }
  );

  it('lets the teacher send just the link or just the PIN and restore the combined message', () => {
    render(<StudentWhatsAppInviteModal {...props} />);
    fireEvent.click(screen.getByRole('radio', { name: studentInviteT.en.link }));
    expect(whatsappMessage()).toContain(`s=${mayaId}`);
    expect(whatsappMessage()).not.toContain('PQRS78');
    fireEvent.click(screen.getByRole('radio', { name: studentInviteT.en.pin }));
    expect(whatsappMessage()).toContain('PQRS78');
    expect(whatsappMessage()).toContain('ABCD2345');
    expect(whatsappMessage()).not.toContain('s=');
    expect(whatsappMessage()).not.toContain('https://');
    fireEvent.click(screen.getByRole('radio', { name: studentInviteT.en.both }));
    expect(whatsappMessage()).toContain('PQRS78');
    expect(whatsappMessage()).toContain(`s=${mayaId}`);
  });

  it('updates both the message language and its RTL preview from the language picker', () => {
    render(<StudentWhatsAppInviteModal {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'עברית' }));
    const message = whatsappMessage(studentInviteT.he.share);
    expect(message).toContain('🔑 הקוד האישי: PQRS78');
    expect(message).toContain(studentInviteT.he.bothSteps);
    expect(
      (screen.getByRole('textbox', { name: studentInviteT.he.preview }) as HTMLTextAreaElement)
        .value
    ).toBe(message);
  });

  it('keeps a selectable message when copying fails and copies exactly the visible message otherwise', async () => {
    render(<StudentWhatsAppInviteModal {...props} />);
    mocks.writeText.mockRejectedValueOnce(new Error('denied'));
    fireEvent.click(screen.getByRole('button', { name: studentInviteT.en.copy }));
    await screen.findByText(studentInviteT.en.copyFailed);
    const preview = screen.getByRole('textbox', {
      name: studentInviteT.en.preview,
    }) as HTMLTextAreaElement;
    expect(preview.readOnly).toBe(true);
    expect(preview.value).toBe(whatsappMessage());
    fireEvent.click(screen.getByRole('button', { name: studentInviteT.en.copy }));
    await screen.findByText(classEntryT.en.copied);
    expect(mocks.writeText).toHaveBeenLastCalledWith(preview.value);
  });

  it('offers only a link when this student has no PIN', () => {
    render(<StudentWhatsAppInviteModal {...props} pin={null} />);
    expect(
      (screen.getByRole('radio', { name: studentInviteT.en.both }) as HTMLInputElement).disabled
    ).toBe(true);
    expect(
      (screen.getByRole('radio', { name: studentInviteT.en.pin }) as HTMLInputElement).disabled
    ).toBe(true);
    expect(
      (screen.getByRole('radio', { name: studentInviteT.en.link }) as HTMLInputElement).checked
    ).toBe(true);
    expect(whatsappMessage()).not.toContain('null');
    expect(whatsappMessage()).toContain('s=');
  });
});

describe.each([
  ['English roster', RosterModalV2],
  ['legacy roster', ClassRosterModal],
] as const)('%s WhatsApp actions', (_name, Roster) => {
  it('shares only the chosen student and closes the invitation without closing the roster', async () => {
    const onClose = vi.fn();
    render(<Roster open onClose={onClose} classCode="ABCD2345" className="Year 7" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Send on WhatsApp — Maya' }));
    await screen.findByRole('dialog', { name: 'Send a personal invitation · Maya' });
    expect(whatsappMessage()).toContain('PQRS78');
    expect(whatsappMessage()).not.toContain('WXYZ89');
    expect(whatsappMessage()).not.toContain(aliId);
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Send on WhatsApp — Ali' }));
    await screen.findByRole('dialog', { name: 'Send a personal invitation · Ali' });
    expect(whatsappMessage()).toContain('WXYZ89');
    expect(whatsappMessage()).not.toContain('PQRS78');
    expect(whatsappMessage()).toContain(`s=${aliId}`);
  });
});

it('defaults personal invitations from a Hebrew class to Hebrew inside the English dashboard', async () => {
  render(
    <ClassRosterModal
      open
      onClose={vi.fn()}
      classCode="ABCD2345"
      className="עברית ז׳"
      inviteLanguage="he"
    />
  );
  fireEvent.click(await screen.findByRole('button', { name: 'שליחה בוואטסאפ — Maya' }));
  await screen.findByRole('dialog', { name: 'שליחת הזמנה אישית · Maya' });
  expect(whatsappMessage(studentInviteT.he.share)).toContain('🔑 הקוד האישי: PQRS78');
});
