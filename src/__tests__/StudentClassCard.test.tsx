import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ live: null as unknown, status: 'ready', load: vi.fn(), refresh: vi.fn() }));
vi.mock('../hooks/useLanguage', () => ({ useLanguage: () => ({ language: 'he' }) }));
vi.mock('../hooks/useClassLiveSession', () => ({ useClassLiveSession: () => ({ live: mocks.live, status: mocks.status, refresh: mocks.refresh }) }));
vi.mock('../utils/classLiveSession', async importOriginal => ({ ...await importOriginal<typeof import('../utils/classLiveSession')>(), loadMyClassLiveGame: mocks.load }));
vi.mock('../utils/primeAudio', () => ({ primeAudio: vi.fn() }));
import StudentClassCard from '../components/dashboard/StudentClassCard';
import { ClassLessonEndedError } from '../utils/classLiveSession';
const props = () => ({ className: 'ז׳ 1', classId: 'a', uid: 'student', onJoin: vi.fn(), onJoinLesson: vi.fn() });
beforeEach(() => { vi.clearAllMocks(); mocks.live = null; mocks.status = 'ready'; });
afterEach(cleanup);
describe('student lesson card', () => {
  it('explains waiting and leaves code entry available as a secondary action', () => {
    const p = props(); render(<StudentClassCard {...p} />);
    expect(screen.getByRole('status').textContent).toContain('המורה עדיין לא');
    expect(screen.queryByRole('button', { name: 'הצטרפות לשיעור' })).toBeNull();
    fireEvent.click(screen.getByText('קיבלת קוד משחק או QR?'));
    fireEvent.click(screen.getByRole('button', { name: 'כניסה עם קוד משחק' }));
    expect(p.onJoin).toHaveBeenCalled();
  });
  it('rechecks the current lesson when joining and explains a lesson that ended', async () => {
    mocks.live = { class_name: 'ז׳ 1' };
    mocks.load.mockRejectedValue(new ClassLessonEndedError());
    const p = props(); render(<StudentClassCard {...p} />);
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'הצטרפות לשיעור' })));
    expect(screen.getByRole('alert').textContent).toContain('השיעור הזה הסתיים');
    expect(p.onJoinLesson).not.toHaveBeenCalled();
    expect(mocks.refresh).toHaveBeenCalled();
  });
  it('distinguishes a connection failure from no active lesson', () => {
    mocks.status = 'error'; render(<StudentClassCard {...props()} />);
    expect(screen.getByRole('status').textContent).toContain('לא הצלחנו לבדוק');
    expect(screen.queryByText(/המורה עדיין לא/)).toBeNull();
  });
});
